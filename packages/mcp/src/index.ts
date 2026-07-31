#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.ts";

/* stdout is the MCP transport — anything written there that is not a protocol
   message corrupts the stream, so diagnostics go to stderr. */
async function main(): Promise<void> {
  const server = createServer();
  await server.connect(new StdioServerTransport());
}

main().catch((err: unknown) => {
  process.stderr.write(`qr-mcp failed to start: ${String(err)}\n`);
  process.exit(1);
});
