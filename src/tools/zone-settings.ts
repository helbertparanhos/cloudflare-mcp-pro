import { z } from "zod";
import { CloudflareClient, jsonContent } from "../client.js";
import { seg, zoneIdSchema } from "../types.js";

export const getZoneSettingSchema = z.object({
  zone_id: zoneIdSchema,
  setting: z
    .string()
    .describe(
      "Setting id, e.g. ssl, always_use_https, min_tls_version, brotli, http3, security_level."
    ),
});

export async function getZoneSetting(
  args: z.infer<typeof getZoneSettingSchema>,
  client: CloudflareClient
) {
  const { result } = await client.request(
    `/zones/${args.zone_id}/settings/${seg(args.setting)}`
  );
  return jsonContent(result);
}

export const updateZoneSettingSchema = z.object({
  zone_id: zoneIdSchema,
  setting: z
    .string()
    .describe("Setting id to change, e.g. ssl, always_use_https, min_tls_version."),
  value: z
    .union([z.string(), z.number(), z.boolean()])
    .describe(
      "New value. Type depends on the setting (e.g. ssl='full', always_use_https='on', min_tls_version='1.2')."
    ),
});

export async function updateZoneSetting(
  args: z.infer<typeof updateZoneSettingSchema>,
  client: CloudflareClient
) {
  const { result } = await client.request(
    `/zones/${args.zone_id}/settings/${seg(args.setting)}`,
    { method: "PATCH", body: { value: args.value } }
  );
  return jsonContent(result);
}
