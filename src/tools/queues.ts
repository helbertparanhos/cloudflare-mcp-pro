import { z } from "zod";
import { CloudflareClient, jsonContent } from "../client.js";
import { seg, accountIdSchema } from "../types.js";

export const listQueuesSchema = z.object({ account_id: accountIdSchema });

export async function listQueues(
  args: z.infer<typeof listQueuesSchema>,
  client: CloudflareClient
) {
  const accountId = client.requireAccountId(args.account_id);
  const { result } = await client.request(`/accounts/${accountId}/queues`);
  return jsonContent(result);
}

export const createQueueSchema = z.object({
  account_id: accountIdSchema,
  queue_name: z.string().describe("Name for the new queue."),
});

export async function createQueue(
  args: z.infer<typeof createQueueSchema>,
  client: CloudflareClient
) {
  const accountId = client.requireAccountId(args.account_id);
  const { result } = await client.request(`/accounts/${accountId}/queues`, {
    method: "POST",
    body: { queue_name: args.queue_name },
  });
  return jsonContent(result);
}

export const deleteQueueSchema = z.object({
  account_id: accountIdSchema,
  queue_id: z.string().describe("Queue ID (from list_queues)."),
});

export async function deleteQueue(
  args: z.infer<typeof deleteQueueSchema>,
  client: CloudflareClient
) {
  const accountId = client.requireAccountId(args.account_id);
  const { result } = await client.request(
    `/accounts/${accountId}/queues/${seg(args.queue_id)}`,
    { method: "DELETE" }
  );
  return jsonContent(result ?? { id: args.queue_id, deleted: true });
}
