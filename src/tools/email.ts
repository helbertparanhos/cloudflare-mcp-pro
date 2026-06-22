import { z } from "zod";
import { CloudflareClient, jsonContent } from "../client.js";
import { zoneIdSchema, accountIdSchema } from "../types.js";

export const listEmailRulesSchema = z.object({ zone_id: zoneIdSchema });

export async function listEmailRules(
  args: z.infer<typeof listEmailRulesSchema>,
  client: CloudflareClient
) {
  const { result } = await client.request(
    `/zones/${args.zone_id}/email/routing/rules`
  );
  return jsonContent(result);
}

export const createEmailRuleSchema = z.object({
  zone_id: zoneIdSchema,
  match_to: z
    .string()
    .describe("Source address to match, e.g. hello@example.com."),
  forward_to: z
    .string()
    .describe("Verified destination address to forward matched mail to."),
  name: z.string().optional().describe("Optional rule name."),
  enabled: z.boolean().optional().describe("Whether the rule is active. Default true."),
});

export async function createEmailRule(
  args: z.infer<typeof createEmailRuleSchema>,
  client: CloudflareClient
) {
  const { result } = await client.request(
    `/zones/${args.zone_id}/email/routing/rules`,
    {
      method: "POST",
      body: {
        name: args.name,
        enabled: args.enabled ?? true,
        matchers: [{ type: "literal", field: "to", value: args.match_to }],
        actions: [{ type: "forward", value: [args.forward_to] }],
      },
    }
  );
  return jsonContent(result);
}

export const listEmailDestinationsSchema = z.object({
  account_id: accountIdSchema,
});

export async function listEmailDestinations(
  args: z.infer<typeof listEmailDestinationsSchema>,
  client: CloudflareClient
) {
  const accountId = client.requireAccountId(args.account_id);
  const { result } = await client.request(
    `/accounts/${accountId}/email/routing/addresses`
  );
  return jsonContent(result);
}
