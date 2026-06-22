import { z } from "zod";
import { CloudflareClient, jsonContent } from "../client.js";
import { seg, accountIdSchema } from "../types.js";

export const listTunnelsSchema = z.object({
  account_id: accountIdSchema,
  is_deleted: z
    .boolean()
    .optional()
    .describe("Include deleted tunnels. Default false (active only)."),
});

export async function listTunnels(
  args: z.infer<typeof listTunnelsSchema>,
  client: CloudflareClient
) {
  const accountId = client.requireAccountId(args.account_id);
  const { result } = await client.request(
    `/accounts/${accountId}/cfd_tunnel`,
    { query: { is_deleted: args.is_deleted } }
  );
  return jsonContent(result);
}

export const getTunnelSchema = z.object({
  account_id: accountIdSchema,
  tunnel_id: z.string().describe("Tunnel ID (from list_tunnels)."),
});

export async function getTunnel(
  args: z.infer<typeof getTunnelSchema>,
  client: CloudflareClient
) {
  const accountId = client.requireAccountId(args.account_id);
  const { result } = await client.request(
    `/accounts/${accountId}/cfd_tunnel/${seg(args.tunnel_id)}`
  );
  return jsonContent(result);
}
