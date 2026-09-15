import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { resolveCredentials } from "./credentials.js";

export const PACKAGE_VERSION = "1.0.0";

/**
 * Bridge a stdio MCP host to the hosted ShareBit AI MCP server at `<origin>/mcp`.
 *
 * The tool list and schemas are owned by the server and forwarded verbatim, so
 * this package never drifts from the deployed tools. The per-agent bearer token
 * is attached here, which is why the host config carries no secret.
 */
export async function runProxy({ credentials, name = "sharebit-ai-mcp" } = {}) {
  const resolved = credentials ?? resolveCredentials();
  if (!resolved) {
    throw new Error(
      "No ShareBit AI credential found. Run `sharebit-ai-mcp login --code <CODE> --origin <URL>`, " +
        "or set SHAREBIT_AI_ORIGIN and SHAREBIT_AI_TOKEN.",
    );
  }

  const client = new Client({ name, version: PACKAGE_VERSION });
  const transport = new StreamableHTTPClientTransport(new URL(`${resolved.origin}/mcp`), {
    requestInit: { headers: { authorization: `Bearer ${resolved.token}` } },
  });

  try {
    await client.connect(transport);
  } catch (error) {
    throw new Error(
      `Could not connect to ${resolved.origin}/mcp: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const server = new Server(
    { name: "sharebit-ai", version: PACKAGE_VERSION },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => client.listTools());
  server.setRequestHandler(CallToolRequestSchema, async (request) => client.callTool(request.params));

  const stdio = new StdioServerTransport();
  await server.connect(stdio);

  return { client, server };
}
