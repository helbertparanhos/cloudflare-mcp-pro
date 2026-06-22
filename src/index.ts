#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { CloudflareClient } from "./client.js";
import { tools, buildHandlers } from "./tools/index.js";

const server = new Server(
  { name: "cloudflare-mcp-pro", version: "1.1.0" },
  { capabilities: { tools: {} } }
);

// The client is created lazily so the server can start (and list tools) even
// before a token is configured; the error surfaces on first tool call.
let client: CloudflareClient | undefined;
let handlers: ReturnType<typeof buildHandlers> | undefined;

function ensureHandlers() {
  if (!handlers) {
    client = new CloudflareClient();
    handlers = buildHandlers(client);
  }
  return handlers;
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const map = ensureHandlers();
    const handler = map[name];
    if (!handler) {
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
    return await handler(args ?? {});
  } catch (error: any) {
    if (error instanceof McpError) throw error;
    if (error instanceof z.ZodError) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid arguments for ${name}: ${error.errors
          .map((e) => `${e.path.join(".")} ${e.message}`)
          .join("; ")}`
      );
    }
    throw new McpError(ErrorCode.InternalError, `${name} failed: ${error.message}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr so it doesn't corrupt the stdio JSON-RPC stream.
  console.error("cloudflare-mcp-pro running on stdio");
}

main().catch((err) => {
  console.error("Fatal error starting cloudflare-mcp-pro:", err);
  process.exit(1);
});
