import { z } from "zod";
import { CloudflareClient, jsonContent } from "../client.js";
import { zoneIdSchema } from "../types.js";

export const listCertificatePacksSchema = z.object({
  zone_id: zoneIdSchema,
  status: z
    .enum(["all", "pending", "active", "expired"])
    .optional()
    .describe("Filter by certificate pack status. Default 'all'."),
});

export async function listCertificatePacks(
  args: z.infer<typeof listCertificatePacksSchema>,
  client: CloudflareClient
) {
  const { result } = await client.request(
    `/zones/${args.zone_id}/ssl/certificate_packs`,
    { query: { status: args.status } }
  );
  return jsonContent(result);
}

export const getSslVerificationSchema = z.object({ zone_id: zoneIdSchema });

export async function getSslVerification(
  args: z.infer<typeof getSslVerificationSchema>,
  client: CloudflareClient
) {
  const { result } = await client.request(
    `/zones/${args.zone_id}/ssl/verification`
  );
  return jsonContent(result);
}

export const orderCertificatePackSchema = z.object({
  zone_id: zoneIdSchema,
  hosts: z
    .array(z.string())
    .describe("Hostnames to cover, e.g. ['example.com', '*.example.com']."),
  certificate_authority: z
    .enum(["google", "lets_encrypt", "ssl_com"])
    .optional()
    .describe("Certificate authority. Default 'google'."),
  validation_method: z
    .enum(["txt", "http", "email"])
    .optional()
    .describe("Domain control validation method. Default 'txt'."),
  validity_days: z
    .union([z.literal(14), z.literal(30), z.literal(90), z.literal(365)])
    .optional()
    .describe("Certificate validity in days. Default 90."),
});

export async function orderCertificatePack(
  args: z.infer<typeof orderCertificatePackSchema>,
  client: CloudflareClient
) {
  const { result } = await client.request(
    `/zones/${args.zone_id}/ssl/certificate_packs/order`,
    {
      method: "POST",
      body: {
        type: "advanced",
        hosts: args.hosts,
        certificate_authority: args.certificate_authority ?? "google",
        validation_method: args.validation_method ?? "txt",
        validity_days: args.validity_days ?? 90,
      },
    }
  );
  return jsonContent(result);
}
