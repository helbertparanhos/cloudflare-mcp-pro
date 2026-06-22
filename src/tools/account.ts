import { z } from "zod";
import { CloudflareClient, jsonContent } from "../client.js";
import { fetchAllSchema } from "../types.js";

export const verifyTokenSchema = z.object({});

export async function verifyToken(
  _args: z.infer<typeof verifyTokenSchema>,
  client: CloudflareClient
) {
  const { result } = await client.request("/user/tokens/verify");
  return jsonContent(result);
}

export const listAccountsSchema = z.object({
  page: z.number().int().positive().optional().describe("Page number (default 1)."),
  per_page: z
    .number()
    .int()
    .positive()
    .max(50)
    .optional()
    .describe("Results per page (max 50)."),
  fetch_all: fetchAllSchema,
});

export async function listAccounts(
  args: z.infer<typeof listAccountsSchema>,
  client: CloudflareClient
) {
  const query = { page: args.page, per_page: args.per_page };
  if (args.fetch_all) {
    return jsonContent({ result: await client.requestAllPages("/accounts", { query }) });
  }
  const { result, info } = await client.request("/accounts", { query });
  return jsonContent({ result, result_info: info });
}
