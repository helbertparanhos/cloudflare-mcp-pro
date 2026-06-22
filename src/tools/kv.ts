import { z } from "zod";
import { CloudflareClient, jsonContent } from "../client.js";
import { seg, accountIdSchema, fetchAllSchema } from "../types.js";

export const listKvNamespacesSchema = z.object({
  account_id: accountIdSchema,
  page: z.number().int().positive().optional(),
  per_page: z.number().int().positive().max(100).optional(),
  fetch_all: fetchAllSchema,
});

export async function listKvNamespaces(
  args: z.infer<typeof listKvNamespacesSchema>,
  client: CloudflareClient
) {
  const accountId = client.requireAccountId(args.account_id);
  const path = `/accounts/${accountId}/storage/kv/namespaces`;
  const query = { page: args.page, per_page: args.per_page };
  if (args.fetch_all) {
    return jsonContent({ result: await client.requestAllPages(path, { query }) });
  }
  const { result, info } = await client.request(path, { query });
  return jsonContent({ result, result_info: info });
}

export const createKvNamespaceSchema = z.object({
  account_id: accountIdSchema,
  title: z.string().describe("Human-readable namespace title."),
});

export async function createKvNamespace(
  args: z.infer<typeof createKvNamespaceSchema>,
  client: CloudflareClient
) {
  const accountId = client.requireAccountId(args.account_id);
  const { result } = await client.request(
    `/accounts/${accountId}/storage/kv/namespaces`,
    { method: "POST", body: { title: args.title } }
  );
  return jsonContent(result);
}

export const kvListKeysSchema = z.object({
  account_id: accountIdSchema,
  namespace_id: z.string().describe("KV namespace ID."),
  prefix: z.string().optional().describe("Filter keys by prefix."),
  limit: z.number().int().positive().max(1000).optional().describe("Max keys (default 1000)."),
});

export async function kvListKeys(
  args: z.infer<typeof kvListKeysSchema>,
  client: CloudflareClient
) {
  const accountId = client.requireAccountId(args.account_id);
  const { result, info } = await client.request(
    `/accounts/${accountId}/storage/kv/namespaces/${seg(args.namespace_id)}/keys`,
    { query: { prefix: args.prefix, limit: args.limit } }
  );
  return jsonContent({ result, result_info: info });
}

export const kvGetSchema = z.object({
  account_id: accountIdSchema,
  namespace_id: z.string().describe("KV namespace ID."),
  key: z.string().describe("The key to read."),
});

export async function kvGet(
  args: z.infer<typeof kvGetSchema>,
  client: CloudflareClient
) {
  const accountId = client.requireAccountId(args.account_id);
  // Value endpoint returns the raw stored value, not a JSON envelope.
  const value = await client.requestText(
    `/accounts/${accountId}/storage/kv/namespaces/${seg(args.namespace_id)}/values/${encodeURIComponent(
      args.key
    )}`
  );
  return jsonContent({ key: args.key, value });
}

export const kvPutSchema = z.object({
  account_id: accountIdSchema,
  namespace_id: z.string().describe("KV namespace ID."),
  key: z.string().describe("The key to write."),
  value: z.string().describe("The value to store."),
  expiration_ttl: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Seconds until the key expires."),
});

export async function kvPut(
  args: z.infer<typeof kvPutSchema>,
  client: CloudflareClient
) {
  const accountId = client.requireAccountId(args.account_id);
  const { result } = await client.request(
    `/accounts/${accountId}/storage/kv/namespaces/${seg(args.namespace_id)}/values/${encodeURIComponent(
      args.key
    )}`,
    {
      method: "PUT",
      query: { expiration_ttl: args.expiration_ttl },
      raw: { data: args.value, contentType: "text/plain" },
    }
  );
  return jsonContent(result ?? { key: args.key, written: true });
}

export const kvDeleteSchema = z.object({
  account_id: accountIdSchema,
  namespace_id: z.string().describe("KV namespace ID."),
  key: z.string().describe("The key to delete."),
});

export async function kvDelete(
  args: z.infer<typeof kvDeleteSchema>,
  client: CloudflareClient
) {
  const accountId = client.requireAccountId(args.account_id);
  const { result } = await client.request(
    `/accounts/${accountId}/storage/kv/namespaces/${seg(args.namespace_id)}/values/${encodeURIComponent(
      args.key
    )}`,
    { method: "DELETE" }
  );
  return jsonContent(result ?? { key: args.key, deleted: true });
}
