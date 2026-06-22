import { z } from "zod";
import { CloudflareClient, jsonContent } from "../client.js";
import { seg, accountIdSchema, fetchAllSchema } from "../types.js";

export const listD1DatabasesSchema = z.object({
  account_id: accountIdSchema,
  name: z.string().optional().describe("Filter by database name."),
  page: z.number().int().positive().optional(),
  per_page: z.number().int().positive().max(100).optional(),
  fetch_all: fetchAllSchema,
});

export async function listD1Databases(
  args: z.infer<typeof listD1DatabasesSchema>,
  client: CloudflareClient
) {
  const accountId = client.requireAccountId(args.account_id);
  const path = `/accounts/${accountId}/d1/database`;
  const query = { name: args.name, page: args.page, per_page: args.per_page };
  if (args.fetch_all) {
    return jsonContent({ result: await client.requestAllPages(path, { query }) });
  }
  const { result, info } = await client.request(path, { query });
  return jsonContent({ result, result_info: info });
}

export const createD1DatabaseSchema = z.object({
  account_id: accountIdSchema,
  name: z.string().describe("Database name."),
  primary_location_hint: z
    .string()
    .optional()
    .describe("Optional primary location hint, e.g. wnam, weur."),
});

export async function createD1Database(
  args: z.infer<typeof createD1DatabaseSchema>,
  client: CloudflareClient
) {
  const accountId = client.requireAccountId(args.account_id);
  const { result } = await client.request(
    `/accounts/${accountId}/d1/database`,
    {
      method: "POST",
      body: {
        name: args.name,
        primary_location_hint: args.primary_location_hint,
      },
    }
  );
  return jsonContent(result);
}

export const queryD1Schema = z.object({
  account_id: accountIdSchema,
  database_id: z.string().describe("D1 database ID (from list_d1_databases)."),
  sql: z.string().describe("The SQL statement to execute."),
  params: z
    .array(z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional()
    .describe("Bound parameters for '?' placeholders in the SQL."),
});

export async function queryD1(
  args: z.infer<typeof queryD1Schema>,
  client: CloudflareClient
) {
  const accountId = client.requireAccountId(args.account_id);
  const { result } = await client.request(
    `/accounts/${accountId}/d1/database/${seg(args.database_id)}/query`,
    { method: "POST", body: { sql: args.sql, params: args.params ?? [] } }
  );
  return jsonContent(result);
}
