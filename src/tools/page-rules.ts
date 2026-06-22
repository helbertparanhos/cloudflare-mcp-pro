import { z } from "zod";
import { CloudflareClient, jsonContent } from "../client.js";
import { seg, zoneIdSchema } from "../types.js";

export const listPageRulesSchema = z.object({
  zone_id: zoneIdSchema,
  status: z.enum(["active", "disabled"]).optional().describe("Filter by status."),
});

export async function listPageRules(
  args: z.infer<typeof listPageRulesSchema>,
  client: CloudflareClient
) {
  const { result } = await client.request(`/zones/${args.zone_id}/pagerules`, {
    query: { status: args.status },
  });
  return jsonContent(result);
}

export const createPageRuleSchema = z.object({
  zone_id: zoneIdSchema,
  url_pattern: z
    .string()
    .describe("URL match pattern, e.g. *example.com/images/*."),
  actions: z
    .array(
      z.object({
        id: z
          .string()
          .describe("Action id, e.g. forwarding_url, cache_level, ssl, always_use_https."),
        value: z
          .any()
          .optional()
          .describe("Action value (shape depends on the action id)."),
      })
    )
    .describe("List of actions to apply when the pattern matches."),
  status: z
    .enum(["active", "disabled"])
    .optional()
    .describe("Rule status. Default 'active'."),
  priority: z.number().int().optional().describe("Rule priority (higher runs first)."),
});

export async function createPageRule(
  args: z.infer<typeof createPageRuleSchema>,
  client: CloudflareClient
) {
  const { result } = await client.request(`/zones/${args.zone_id}/pagerules`, {
    method: "POST",
    body: {
      targets: [
        {
          target: "url",
          constraint: { operator: "matches", value: args.url_pattern },
        },
      ],
      actions: args.actions,
      status: args.status ?? "active",
      priority: args.priority ?? 1,
    },
  });
  return jsonContent(result);
}

export const deletePageRuleSchema = z.object({
  zone_id: zoneIdSchema,
  rule_id: z.string().describe("Page rule ID (from list_page_rules)."),
});

export async function deletePageRule(
  args: z.infer<typeof deletePageRuleSchema>,
  client: CloudflareClient
) {
  const { result } = await client.request(
    `/zones/${args.zone_id}/pagerules/${seg(args.rule_id)}`,
    { method: "DELETE" }
  );
  return jsonContent(result ?? { id: args.rule_id, deleted: true });
}
