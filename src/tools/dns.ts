import { z } from "zod";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { CloudflareClient, jsonContent } from "../client.js";
import { seg, zoneIdSchema, dnsRecordTypeSchema, fetchAllSchema } from "../types.js";

export const listDnsRecordsSchema = z.object({
  zone_id: zoneIdSchema,
  type: dnsRecordTypeSchema.optional(),
  name: z.string().optional().describe("Filter by record name (FQDN)."),
  page: z.number().int().positive().optional(),
  per_page: z.number().int().positive().max(100).optional(),
  fetch_all: fetchAllSchema,
});

export async function listDnsRecords(
  args: z.infer<typeof listDnsRecordsSchema>,
  client: CloudflareClient
) {
  const path = `/zones/${args.zone_id}/dns_records`;
  const query = {
    type: args.type,
    name: args.name,
    page: args.page,
    per_page: args.per_page,
  };
  if (args.fetch_all) {
    return jsonContent({ result: await client.requestAllPages(path, { query }) });
  }
  const { result, info } = await client.request(path, { query });
  return jsonContent({ result, result_info: info });
}

export const createDnsRecordSchema = z.object({
  zone_id: zoneIdSchema,
  type: dnsRecordTypeSchema,
  name: z.string().describe("Record name (e.g. www.example.com or @ for root)."),
  content: z.string().describe("Record value (IP, target host, text, etc)."),
  ttl: z
    .number()
    .int()
    .optional()
    .describe("TTL in seconds. 1 = automatic. Default 1."),
  proxied: z
    .boolean()
    .optional()
    .describe("Whether traffic is proxied through Cloudflare (A/AAAA/CNAME only)."),
  priority: z
    .number()
    .int()
    .optional()
    .describe("Priority for MX/SRV records."),
  comment: z.string().optional().describe("Optional comment for the record."),
});

export async function createDnsRecord(
  args: z.infer<typeof createDnsRecordSchema>,
  client: CloudflareClient
) {
  const { zone_id, ttl, ...rest } = args;
  // Send only defined fields; force the documented ttl default of 1 when omitted
  // (a spread would write ttl: undefined and drop it from the payload).
  const body: Record<string, unknown> = { ttl: ttl ?? 1 };
  for (const [k, v] of Object.entries(rest)) {
    if (v !== undefined) body[k] = v;
  }
  const { result } = await client.request(`/zones/${zone_id}/dns_records`, {
    method: "POST",
    body,
  });
  return jsonContent(result);
}

export const updateDnsRecordSchema = z.object({
  zone_id: zoneIdSchema,
  record_id: z.string().describe("DNS record ID (from list_dns_records)."),
  type: dnsRecordTypeSchema.optional(),
  name: z.string().optional(),
  content: z.string().optional(),
  ttl: z.number().int().optional(),
  proxied: z.boolean().optional(),
  priority: z.number().int().optional(),
  comment: z.string().optional(),
});

export async function updateDnsRecord(
  args: z.infer<typeof updateDnsRecordSchema>,
  client: CloudflareClient
) {
  const { zone_id, record_id, ...patch } = args;
  const body = Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v !== undefined)
  );
  if (Object.keys(body).length === 0) {
    throw new McpError(
      ErrorCode.InvalidParams,
      "update_dns_record needs at least one field to change."
    );
  }
  const { result } = await client.request(
    `/zones/${zone_id}/dns_records/${seg(record_id)}`,
    { method: "PATCH", body }
  );
  return jsonContent(result);
}

export const deleteDnsRecordSchema = z.object({
  zone_id: zoneIdSchema,
  record_id: z.string().describe("DNS record ID to delete."),
});

export async function deleteDnsRecord(
  args: z.infer<typeof deleteDnsRecordSchema>,
  client: CloudflareClient
) {
  const { result } = await client.request(
    `/zones/${args.zone_id}/dns_records/${seg(args.record_id)}`,
    { method: "DELETE" }
  );
  return jsonContent(result);
}

export const getDnssecSchema = z.object({ zone_id: zoneIdSchema });

export async function getDnssec(
  args: z.infer<typeof getDnssecSchema>,
  client: CloudflareClient
) {
  const { result } = await client.request(`/zones/${args.zone_id}/dnssec`);
  return jsonContent(result);
}

export const editDnssecSchema = z.object({
  zone_id: zoneIdSchema,
  status: z
    .enum(["active", "disabled"])
    .describe("Set 'active' to enable DNSSEC, 'disabled' to turn it off."),
});

export async function editDnssec(
  args: z.infer<typeof editDnssecSchema>,
  client: CloudflareClient
) {
  const { result } = await client.request(`/zones/${args.zone_id}/dnssec`, {
    method: "PATCH",
    body: { status: args.status },
  });
  return jsonContent(result);
}

export const exportDnsRecordsSchema = z.object({ zone_id: zoneIdSchema });

export async function exportDnsRecords(
  args: z.infer<typeof exportDnsRecordsSchema>,
  client: CloudflareClient
) {
  // Returns a BIND-format zone file as plain text, not a JSON envelope.
  const bind = await client.requestText(
    `/zones/${args.zone_id}/dns_records/export`
  );
  return jsonContent({ zone_id: args.zone_id, bind_config: bind });
}
