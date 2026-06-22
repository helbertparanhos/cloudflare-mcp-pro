import { z } from "zod";
import { CloudflareClient, jsonContent } from "../client.js";
import { seg, zoneIdSchema, fetchAllSchema } from "../types.js";

const modeSchema = z
  .enum(["block", "challenge", "whitelist", "js_challenge", "managed_challenge"])
  .describe("Action to take for matching requests.");

export const listAccessRulesSchema = z.object({
  zone_id: zoneIdSchema,
  mode: modeSchema.optional(),
  page: z.number().int().positive().optional(),
  per_page: z.number().int().positive().max(100).optional(),
  fetch_all: fetchAllSchema,
});

export async function listAccessRules(
  args: z.infer<typeof listAccessRulesSchema>,
  client: CloudflareClient
) {
  const path = `/zones/${args.zone_id}/firewall/access_rules/rules`;
  const query = { mode: args.mode, page: args.page, per_page: args.per_page };
  if (args.fetch_all) {
    return jsonContent({ result: await client.requestAllPages(path, { query }) });
  }
  const { result, info } = await client.request(path, { query });
  return jsonContent({ result, result_info: info });
}

export const createAccessRuleSchema = z.object({
  zone_id: zoneIdSchema,
  mode: modeSchema,
  target: z
    .enum(["ip", "ip_range", "asn", "country"])
    .describe("What the rule matches on."),
  value: z
    .string()
    .describe("Match value, e.g. '1.2.3.4', '1.2.3.0/24', 'AS13335', or 'US'."),
  notes: z.string().optional().describe("Optional note describing the rule."),
});

export async function createAccessRule(
  args: z.infer<typeof createAccessRuleSchema>,
  client: CloudflareClient
) {
  const { result } = await client.request(
    `/zones/${args.zone_id}/firewall/access_rules/rules`,
    {
      method: "POST",
      body: {
        mode: args.mode,
        configuration: { target: args.target, value: args.value },
        notes: args.notes,
      },
    }
  );
  return jsonContent(result);
}

export const deleteAccessRuleSchema = z.object({
  zone_id: zoneIdSchema,
  rule_id: z.string().describe("Access rule ID (from list_access_rules)."),
});

export async function deleteAccessRule(
  args: z.infer<typeof deleteAccessRuleSchema>,
  client: CloudflareClient
) {
  const { result } = await client.request(
    `/zones/${args.zone_id}/firewall/access_rules/rules/${seg(args.rule_id)}`,
    { method: "DELETE" }
  );
  return jsonContent(result ?? { id: args.rule_id, deleted: true });
}
