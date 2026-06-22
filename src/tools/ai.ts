import { z } from "zod";
import { CloudflareClient, jsonContent } from "../client.js";
import { accountIdSchema } from "../types.js";

export const listAiModelsSchema = z.object({
  account_id: accountIdSchema,
  search: z.string().optional().describe("Filter models by name/task substring."),
  task: z.string().optional().describe("Filter by task, e.g. 'Text Generation'."),
});

export async function listAiModels(
  args: z.infer<typeof listAiModelsSchema>,
  client: CloudflareClient
) {
  const accountId = client.requireAccountId(args.account_id);
  const { result } = await client.request(
    `/accounts/${accountId}/ai/models/search`,
    { query: { search: args.search, task: args.task } }
  );
  return jsonContent(result);
}

export const runAiSchema = z.object({
  account_id: accountIdSchema,
  model: z
    .string()
    // Model ids contain '/' by design (e.g. @cf/meta/...), so we can't encode
    // the segment. Restrict to the legal id charset to block path traversal
    // (?, #, %, whitespace) before it reaches the /ai/run/{model} path.
    .regex(
      /^@?[\w.-]+(\/[\w.-]+)*$/,
      "invalid model id (allowed: letters, digits, '@', '.', '-', '_', '/')"
    )
    .describe("Model id, e.g. @cf/meta/llama-3.1-8b-instruct or @cf/baai/bge-base-en-v1.5."),
  input: z
    .record(z.any())
    .describe(
      "Model inputs as a JSON object. For text generation use { prompt } or { messages: [...] }; for embeddings use { text }."
    ),
});

export async function runAi(
  args: z.infer<typeof runAiSchema>,
  client: CloudflareClient
) {
  const accountId = client.requireAccountId(args.account_id);
  // Works for models that return JSON (text generation, embeddings, classification).
  // Binary-output models (image generation) are not supported by this tool.
  const { result } = await client.request(
    `/accounts/${accountId}/ai/run/${args.model}`,
    { method: "POST", body: args.input }
  );
  return jsonContent(result);
}
