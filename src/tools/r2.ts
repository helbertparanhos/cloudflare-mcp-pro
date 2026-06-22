import { z } from "zod";
import { CloudflareClient, jsonContent } from "../client.js";
import { seg, accountIdSchema } from "../types.js";

export const listR2BucketsSchema = z.object({
  account_id: accountIdSchema,
  name_contains: z.string().optional().describe("Filter buckets by name substring."),
});

export async function listR2Buckets(
  args: z.infer<typeof listR2BucketsSchema>,
  client: CloudflareClient
) {
  const accountId = client.requireAccountId(args.account_id);
  const { result } = await client.request(`/accounts/${accountId}/r2/buckets`, {
    query: { name_contains: args.name_contains },
  });
  return jsonContent(result);
}

export const createR2BucketSchema = z.object({
  account_id: accountIdSchema,
  name: z.string().describe("Bucket name (lowercase, hyphens allowed)."),
  location_hint: z
    .enum(["apac", "eeur", "enam", "weur", "wnam"])
    .optional()
    .describe("Optional region hint for the bucket location."),
});

export async function createR2Bucket(
  args: z.infer<typeof createR2BucketSchema>,
  client: CloudflareClient
) {
  const accountId = client.requireAccountId(args.account_id);
  const { result } = await client.request(`/accounts/${accountId}/r2/buckets`, {
    method: "POST",
    body: { name: args.name, locationHint: args.location_hint },
  });
  return jsonContent(result ?? { name: args.name, created: true });
}

export const deleteR2BucketSchema = z.object({
  account_id: accountIdSchema,
  name: z.string().describe("Bucket name to delete (must be empty)."),
});

export async function deleteR2Bucket(
  args: z.infer<typeof deleteR2BucketSchema>,
  client: CloudflareClient
) {
  const accountId = client.requireAccountId(args.account_id);
  const { result } = await client.request(
    `/accounts/${accountId}/r2/buckets/${seg(args.name)}`,
    { method: "DELETE" }
  );
  return jsonContent(result ?? { name: args.name, deleted: true });
}
