import { z } from "zod";
import { CloudflareClient, jsonContent } from "../client.js";
import { seg, zoneIdSchema, fetchAllSchema } from "../types.js";

export const listCustomHostnamesSchema = z.object({
  zone_id: zoneIdSchema,
  hostname: z.string().optional().describe("Filter by hostname."),
  page: z.number().int().positive().optional(),
  per_page: z.number().int().positive().max(50).optional(),
  fetch_all: fetchAllSchema,
});

export async function listCustomHostnames(
  args: z.infer<typeof listCustomHostnamesSchema>,
  client: CloudflareClient
) {
  const path = `/zones/${args.zone_id}/custom_hostnames`;
  const query = {
    hostname: args.hostname,
    page: args.page,
    per_page: args.per_page,
  };
  if (args.fetch_all) {
    return jsonContent({ result: await client.requestAllPages(path, { query }) });
  }
  const { result, info } = await client.request(path, { query });
  return jsonContent({ result, result_info: info });
}

export const createCustomHostnameSchema = z.object({
  zone_id: zoneIdSchema,
  hostname: z.string().describe("The custom hostname to add, e.g. app.customer.com."),
  ssl_method: z
    .enum(["http", "txt", "email"])
    .optional()
    .describe("SSL validation method. Default 'http'."),
  ssl_type: z
    .enum(["dv"])
    .optional()
    .describe("Certificate type. Default 'dv'."),
});

export async function createCustomHostname(
  args: z.infer<typeof createCustomHostnameSchema>,
  client: CloudflareClient
) {
  const { result } = await client.request(
    `/zones/${args.zone_id}/custom_hostnames`,
    {
      method: "POST",
      body: {
        hostname: args.hostname,
        ssl: {
          method: args.ssl_method ?? "http",
          type: args.ssl_type ?? "dv",
        },
      },
    }
  );
  return jsonContent(result);
}

export const deleteCustomHostnameSchema = z.object({
  zone_id: zoneIdSchema,
  custom_hostname_id: z
    .string()
    .describe("Custom hostname ID (from list_custom_hostnames)."),
});

export async function deleteCustomHostname(
  args: z.infer<typeof deleteCustomHostnameSchema>,
  client: CloudflareClient
) {
  const { result } = await client.request(
    `/zones/${args.zone_id}/custom_hostnames/${seg(args.custom_hostname_id)}`,
    { method: "DELETE" }
  );
  return jsonContent(result ?? { id: args.custom_hostname_id, deleted: true });
}
