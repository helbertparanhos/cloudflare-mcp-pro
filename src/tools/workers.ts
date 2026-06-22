import { z } from "zod";
import { CloudflareClient, jsonContent } from "../client.js";
import { accountIdSchema, zoneIdSchema, seg } from "../types.js";

export const listWorkersSchema = z.object({ account_id: accountIdSchema });

export async function listWorkers(
  args: z.infer<typeof listWorkersSchema>,
  client: CloudflareClient
) {
  const accountId = client.requireAccountId(args.account_id);
  const { result } = await client.request(
    `/accounts/${accountId}/workers/scripts`
  );
  return jsonContent(result);
}

export const getWorkerSchema = z.object({
  account_id: accountIdSchema,
  script_name: z.string().describe("The Worker script name."),
});

export async function getWorker(
  args: z.infer<typeof getWorkerSchema>,
  client: CloudflareClient
) {
  const accountId = client.requireAccountId(args.account_id);
  // /settings returns a JSON envelope with the script's bindings/metadata
  // (not the raw source — that lives at .../content and would need requestText).
  const { result } = await client.request(
    `/accounts/${accountId}/workers/scripts/${seg(args.script_name)}/settings`
  );
  return jsonContent(result);
}

export const deployWorkerSchema = z.object({
  account_id: accountIdSchema,
  script_name: z.string().describe("The Worker script name to create/update."),
  script: z.string().describe("The Worker source code (ES module format)."),
  main_module: z
    .string()
    .optional()
    .describe("Entry module filename. Default 'worker.js'."),
  compatibility_date: z
    .string()
    .optional()
    .describe("Compatibility date, e.g. 2024-01-01."),
});

export async function deployWorker(
  args: z.infer<typeof deployWorkerSchema>,
  client: CloudflareClient
) {
  const accountId = client.requireAccountId(args.account_id);
  const mainModule = args.main_module ?? "worker.js";
  const metadata = {
    main_module: mainModule,
    compatibility_date: args.compatibility_date ?? "2024-01-01",
  };

  const form = new FormData();
  form.append("metadata", JSON.stringify(metadata));
  form.append(
    mainModule,
    new Blob([args.script], { type: "application/javascript+module" }),
    mainModule
  );

  // FormData sets its own multipart Content-Type with boundary; pass via raw
  // with an empty contentType so fetch fills in the boundary.
  const { result } = await client.request(
    `/accounts/${accountId}/workers/scripts/${seg(args.script_name)}`,
    {
      method: "PUT",
      raw: { data: form as unknown as BodyInit, contentType: "" },
    }
  );
  return jsonContent(result);
}

export const deleteWorkerSchema = z.object({
  account_id: accountIdSchema,
  script_name: z.string().describe("The Worker script name to delete."),
});

export async function deleteWorker(
  args: z.infer<typeof deleteWorkerSchema>,
  client: CloudflareClient
) {
  const accountId = client.requireAccountId(args.account_id);
  const { result } = await client.request(
    `/accounts/${accountId}/workers/scripts/${seg(args.script_name)}`,
    { method: "DELETE" }
  );
  return jsonContent(result ?? { deleted: true });
}

// ── Routes (zone-scoped: which URLs run a Worker) ──────────────────────────

export const listWorkerRoutesSchema = z.object({ zone_id: zoneIdSchema });

export async function listWorkerRoutes(
  args: z.infer<typeof listWorkerRoutesSchema>,
  client: CloudflareClient
) {
  const { result } = await client.request(
    `/zones/${args.zone_id}/workers/routes`
  );
  return jsonContent(result);
}

export const createWorkerRouteSchema = z.object({
  zone_id: zoneIdSchema,
  pattern: z.string().describe("Route pattern, e.g. example.com/api/*."),
  script: z
    .string()
    .optional()
    .describe("Worker script name to run on this route. Omit to disable on the pattern."),
});

export async function createWorkerRoute(
  args: z.infer<typeof createWorkerRouteSchema>,
  client: CloudflareClient
) {
  const { result } = await client.request(
    `/zones/${args.zone_id}/workers/routes`,
    { method: "POST", body: { pattern: args.pattern, script: args.script } }
  );
  return jsonContent(result);
}

export const deleteWorkerRouteSchema = z.object({
  zone_id: zoneIdSchema,
  route_id: z.string().describe("Route ID (from list_worker_routes)."),
});

export async function deleteWorkerRoute(
  args: z.infer<typeof deleteWorkerRouteSchema>,
  client: CloudflareClient
) {
  const { result } = await client.request(
    `/zones/${args.zone_id}/workers/routes/${seg(args.route_id)}`,
    { method: "DELETE" }
  );
  return jsonContent(result ?? { id: args.route_id, deleted: true });
}

// ── Secrets ────────────────────────────────────────────────────────────────

export const putWorkerSecretSchema = z.object({
  account_id: accountIdSchema,
  script_name: z.string().describe("The Worker script name."),
  name: z.string().describe("Secret binding name (env var name in the Worker)."),
  text: z.string().describe("The secret value."),
});

export async function putWorkerSecret(
  args: z.infer<typeof putWorkerSecretSchema>,
  client: CloudflareClient
) {
  const accountId = client.requireAccountId(args.account_id);
  const { result } = await client.request(
    `/accounts/${accountId}/workers/scripts/${seg(args.script_name)}/secrets`,
    { method: "PUT", body: { name: args.name, text: args.text, type: "secret_text" } }
  );
  return jsonContent(result ?? { name: args.name, written: true });
}

export const deleteWorkerSecretSchema = z.object({
  account_id: accountIdSchema,
  script_name: z.string().describe("The Worker script name."),
  name: z.string().describe("Secret binding name to delete."),
});

export async function deleteWorkerSecret(
  args: z.infer<typeof deleteWorkerSecretSchema>,
  client: CloudflareClient
) {
  const accountId = client.requireAccountId(args.account_id);
  const { result } = await client.request(
    `/accounts/${accountId}/workers/scripts/${seg(args.script_name)}/secrets/${seg(args.name)}`,
    { method: "DELETE" }
  );
  return jsonContent(result ?? { name: args.name, deleted: true });
}

// ── Cron triggers ────────────────────────────────────────────────────────────

export const updateWorkerCronSchema = z.object({
  account_id: accountIdSchema,
  script_name: z.string().describe("The Worker script name."),
  crons: z
    .array(z.string())
    .describe("List of cron expressions, e.g. ['*/5 * * * *']. Empty array clears triggers."),
});

export async function updateWorkerCron(
  args: z.infer<typeof updateWorkerCronSchema>,
  client: CloudflareClient
) {
  const accountId = client.requireAccountId(args.account_id);
  const { result } = await client.request(
    `/accounts/${accountId}/workers/scripts/${seg(args.script_name)}/schedules`,
    { method: "PUT", body: args.crons.map((cron) => ({ cron })) }
  );
  return jsonContent(result);
}
