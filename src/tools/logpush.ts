import { z } from "zod";
import { CloudflareClient, jsonContent } from "../client.js";
import { zoneIdSchema, accountIdSchema } from "../types.js";

export const listLogpushJobsSchema = z.object({
  zone_id: zoneIdSchema.optional().describe("List zone-scoped jobs."),
  account_id: accountIdSchema.describe(
    "List account-scoped jobs (used when zone_id is omitted)."
  ),
});

export async function listLogpushJobs(
  args: z.infer<typeof listLogpushJobsSchema>,
  client: CloudflareClient
) {
  const path = args.zone_id
    ? `/zones/${args.zone_id}/logpush/jobs`
    : `/accounts/${client.requireAccountId(args.account_id)}/logpush/jobs`;
  const { result } = await client.request(path);
  return jsonContent(result);
}

export const createLogpushJobSchema = z.object({
  zone_id: zoneIdSchema.optional().describe("Create a zone-scoped job."),
  account_id: accountIdSchema.describe(
    "Create an account-scoped job (used when zone_id is omitted)."
  ),
  name: z.string().describe("Job name."),
  dataset: z
    .string()
    .describe("Dataset, e.g. http_requests, firewall_events, dns_logs."),
  destination_conf: z
    .string()
    .describe(
      "Destination URI, e.g. s3://bucket/path?region=us-east-1 or r2://... or an HTTPS endpoint."
    ),
  enabled: z.boolean().optional().describe("Whether the job starts enabled. Default true."),
  logpull_options: z
    .string()
    .optional()
    .describe("Optional fields/timestamp options, e.g. 'fields=...&timestamps=rfc3339'."),
});

export async function createLogpushJob(
  args: z.infer<typeof createLogpushJobSchema>,
  client: CloudflareClient
) {
  const path = args.zone_id
    ? `/zones/${args.zone_id}/logpush/jobs`
    : `/accounts/${client.requireAccountId(args.account_id)}/logpush/jobs`;
  const { result } = await client.request(path, {
    method: "POST",
    body: {
      name: args.name,
      dataset: args.dataset,
      destination_conf: args.destination_conf,
      enabled: args.enabled ?? true,
      logpull_options: args.logpull_options,
    },
  });
  return jsonContent(result);
}
