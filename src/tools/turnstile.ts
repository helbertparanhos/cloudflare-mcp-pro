import { z } from "zod";
import { CloudflareClient, jsonContent } from "../client.js";
import { accountIdSchema } from "../types.js";

export const listTurnstileWidgetsSchema = z.object({
  account_id: accountIdSchema,
});

export async function listTurnstileWidgets(
  args: z.infer<typeof listTurnstileWidgetsSchema>,
  client: CloudflareClient
) {
  const accountId = client.requireAccountId(args.account_id);
  const { result } = await client.request(
    `/accounts/${accountId}/challenges/widgets`
  );
  return jsonContent(result);
}

export const createTurnstileWidgetSchema = z.object({
  account_id: accountIdSchema,
  name: z.string().describe("Human-readable widget name."),
  domains: z
    .array(z.string())
    .describe("Allowed domains for the widget, e.g. ['example.com']."),
  mode: z
    .enum(["managed", "non-interactive", "invisible"])
    .optional()
    .describe("Widget mode. Default 'managed'."),
});

export async function createTurnstileWidget(
  args: z.infer<typeof createTurnstileWidgetSchema>,
  client: CloudflareClient
) {
  const accountId = client.requireAccountId(args.account_id);
  const { result } = await client.request(
    `/accounts/${accountId}/challenges/widgets`,
    {
      method: "POST",
      body: {
        name: args.name,
        domains: args.domains,
        mode: args.mode ?? "managed",
      },
    }
  );
  return jsonContent(result);
}
