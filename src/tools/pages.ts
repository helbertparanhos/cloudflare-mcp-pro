import { z } from "zod";
import { CloudflareClient, jsonContent } from "../client.js";
import { seg, accountIdSchema } from "../types.js";

export const listPagesProjectsSchema = z.object({
  account_id: accountIdSchema,
});

export async function listPagesProjects(
  args: z.infer<typeof listPagesProjectsSchema>,
  client: CloudflareClient
) {
  const accountId = client.requireAccountId(args.account_id);
  const { result } = await client.request(
    `/accounts/${accountId}/pages/projects`
  );
  return jsonContent(result);
}

export const getPagesProjectSchema = z.object({
  account_id: accountIdSchema,
  project_name: z.string().describe("The Pages project name."),
});

export async function getPagesProject(
  args: z.infer<typeof getPagesProjectSchema>,
  client: CloudflareClient
) {
  const accountId = client.requireAccountId(args.account_id);
  const { result } = await client.request(
    `/accounts/${accountId}/pages/projects/${seg(args.project_name)}`
  );
  return jsonContent(result);
}
