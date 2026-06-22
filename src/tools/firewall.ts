import { z } from "zod";
import { CloudflareClient, jsonContent } from "../client.js";
import { seg, zoneIdSchema } from "../types.js";

export const listFirewallRulesetsSchema = z.object({
  zone_id: zoneIdSchema,
});

export async function listFirewallRulesets(
  args: z.infer<typeof listFirewallRulesetsSchema>,
  client: CloudflareClient
) {
  const { result } = await client.request(`/zones/${args.zone_id}/rulesets`);
  return jsonContent(result);
}

export const getRulesetSchema = z.object({
  zone_id: zoneIdSchema,
  ruleset_id: z.string().describe("Ruleset ID (from list_firewall_rulesets)."),
});

export async function getRuleset(
  args: z.infer<typeof getRulesetSchema>,
  client: CloudflareClient
) {
  const { result } = await client.request(
    `/zones/${args.zone_id}/rulesets/${seg(args.ruleset_id)}`
  );
  return jsonContent(result);
}
