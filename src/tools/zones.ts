import { z } from "zod";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { CloudflareClient, jsonContent } from "../client.js";
import { zoneIdSchema, accountIdSchema, fetchAllSchema } from "../types.js";

export const listZonesSchema = z.object({
  name: z.string().optional().describe("Filter by domain name (exact or substring)."),
  status: z
    .enum(["active", "pending", "initializing", "moved", "deleted", "deactivated"])
    .optional()
    .describe("Filter by zone status."),
  page: z.number().int().positive().optional(),
  per_page: z.number().int().positive().max(50).optional(),
  fetch_all: fetchAllSchema,
});

export async function listZones(
  args: z.infer<typeof listZonesSchema>,
  client: CloudflareClient
) {
  const query = {
    name: args.name,
    status: args.status,
    page: args.page,
    per_page: args.per_page,
  };
  if (args.fetch_all) {
    return jsonContent({ result: await client.requestAllPages("/zones", { query }) });
  }
  const { result, info } = await client.request("/zones", { query });
  return jsonContent({ result, result_info: info });
}

export const getZoneSchema = z.object({ zone_id: zoneIdSchema });

export async function getZone(
  args: z.infer<typeof getZoneSchema>,
  client: CloudflareClient
) {
  const { result } = await client.request(`/zones/${args.zone_id}`);
  return jsonContent(result);
}

export const createZoneSchema = z.object({
  name: z.string().describe("The domain name to add (e.g. example.com)."),
  account_id: accountIdSchema,
  type: z
    .enum(["full", "partial", "secondary"])
    .optional()
    .describe("Zone setup type. Default 'full'."),
});

export async function createZone(
  args: z.infer<typeof createZoneSchema>,
  client: CloudflareClient
) {
  const accountId = client.requireAccountId(args.account_id);
  const { result } = await client.request("/zones", {
    method: "POST",
    body: {
      name: args.name,
      account: { id: accountId },
      type: args.type ?? "full",
    },
  });
  return jsonContent(result);
}

export const deleteZoneSchema = z.object({ zone_id: zoneIdSchema });

export async function deleteZone(
  args: z.infer<typeof deleteZoneSchema>,
  client: CloudflareClient
) {
  const { result } = await client.request(`/zones/${args.zone_id}`, {
    method: "DELETE",
  });
  return jsonContent(result);
}

export const purgeCacheSchema = z.object({
  zone_id: zoneIdSchema,
  purge_everything: z
    .boolean()
    .optional()
    .describe("Purge the entire cache. Mutually exclusive with files/tags/hosts/prefixes."),
  files: z.array(z.string()).optional().describe("Specific URLs to purge."),
  tags: z.array(z.string()).optional().describe("Cache-Tags to purge (Enterprise)."),
  hosts: z.array(z.string()).optional().describe("Hostnames to purge (Enterprise)."),
  prefixes: z.array(z.string()).optional().describe("URL prefixes to purge (Enterprise)."),
});

export async function purgeCache(
  args: z.infer<typeof purgeCacheSchema>,
  client: CloudflareClient
) {
  const selective = {
    files: args.files,
    tags: args.tags,
    hosts: args.hosts,
    prefixes: args.prefixes,
  };
  const hasSelective = Object.values(selective).some((v) => v !== undefined);

  if (!args.purge_everything && !hasSelective) {
    throw new McpError(
      ErrorCode.InvalidParams,
      "purge_cache requires one of: purge_everything, files, tags, hosts, or prefixes."
    );
  }
  // Cloudflare rejects purge_everything combined with any selective field.
  if (args.purge_everything && hasSelective) {
    throw new McpError(
      ErrorCode.InvalidParams,
      "purge_cache: purge_everything cannot be combined with files/tags/hosts/prefixes. Choose one."
    );
  }

  const body: Record<string, unknown> = args.purge_everything
    ? { purge_everything: true }
    : Object.fromEntries(
        Object.entries(selective).filter(([, v]) => v !== undefined)
      );

  const { result } = await client.request(`/zones/${args.zone_id}/purge_cache`, {
    method: "POST",
    body,
  });
  return jsonContent(result);
}

// ISO 8601 datetime aligned to a whole hour, e.g. 2024-01-01T00:00:00Z.
const HOUR_ALIGNED_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:00:00Z$/;

export const getZoneAnalyticsSchema = z.object({
  zone_id: zoneIdSchema,
  since: z
    .string()
    .regex(
      HOUR_ALIGNED_ISO,
      "must be an hour-aligned ISO 8601 UTC datetime, e.g. 2024-01-01T00:00:00Z"
    )
    .describe(
      "Hour-aligned ISO 8601 UTC start, e.g. 2024-01-01T00:00:00Z. httpRequests1hGroups buckets are hourly."
    ),
  until: z
    .string()
    .regex(
      HOUR_ALIGNED_ISO,
      "must be an hour-aligned ISO 8601 UTC datetime, e.g. 2024-01-02T00:00:00Z"
    )
    .describe("Hour-aligned ISO 8601 UTC end, e.g. 2024-01-02T00:00:00Z."),
});

export async function getZoneAnalytics(
  args: z.infer<typeof getZoneAnalyticsSchema>,
  client: CloudflareClient
) {
  if (args.until <= args.since) {
    throw new McpError(
      ErrorCode.InvalidParams,
      "get_zone_analytics: 'until' must be after 'since'."
    );
  }
  const query = `
    query ZoneAnalytics($zoneTag: String!, $since: Time!, $until: Time!) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          httpRequests1hGroups(
            limit: 100
            filter: { datetime_geq: $since, datetime_leq: $until }
          ) {
            sum { requests bytes cachedRequests cachedBytes threats pageViews }
            dimensions { datetime }
          }
        }
      }
    }`;
  const data = await client.graphql(query, {
    zoneTag: args.zone_id,
    since: args.since,
    until: args.until,
  });
  return jsonContent(data);
}
