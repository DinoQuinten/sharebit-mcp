// End-to-end probe: drives the real `login` command and the stdio MCP proxy
// against a running ShareBit server, proving the whole chain works.
//
//   SHAREBIT_TEST_URL=http://localhost:3000 node scripts/e2e.mjs
//
// Requires a server started with `bun run dev` and SHAREBIT_MODE=dev.
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const origin = (process.env.SHAREBIT_TEST_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const cli = fileURLToPath(new URL("../bin/cli.js", import.meta.url));
const workDir = mkdtempSync(join(tmpdir(), "sharebit-e2e-"));
const credentialFile = join(workDir, "credentials.json");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function api(path, { method = "GET", token, body } = {}) {
  const response = await fetch(`${origin}${path}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${method} ${path} -> ${response.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

try {
  const session = await api("/api/v1/dev/session", { method: "POST" });
  const pairing = await api("/api/v1/pairing-sessions", {
    method: "POST",
    token: session.token,
    body: { integration: "generic", suggested_name: "e2e probe" },
  });
  assert(typeof pairing.code === "string", "no pairing code issued");
  console.log(`1. issued pairing code ${pairing.code}`);

  const login = spawnSync(
    process.execPath,
    [cli, "login", "--origin", origin, "--code", pairing.code, "--host", "generic", "--no-register"],
    { env: { ...process.env, SHAREBIT_CREDENTIALS: credentialFile }, encoding: "utf8" },
  );
  if (login.status !== 0) throw new Error(`login failed: ${login.stderr || login.stdout}`);
  const stored = JSON.parse(readFileSync(credentialFile, "utf8"));
  assert(stored.token && stored.origin === origin, "credential file is wrong");
  console.log(`2. login stored a credential (agent ${stored.agentId})`);

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [cli],
    stderr: "inherit",
    env: { ...process.env, SHAREBIT_ORIGIN: stored.origin, SHAREBIT_TOKEN: stored.token },
  });
  const client = new Client({ name: "sharebit-e2e", version: "0" });
  await client.connect(transport);

  const { tools } = await client.listTools();
  const names = tools.map((tool) => tool.name).sort();
  assert(
    JSON.stringify(names) === JSON.stringify(["sharebit_create", "sharebit_list", "sharebit_read"]),
    `unexpected tools: ${names.join(", ")}`,
  );
  console.log(`3. tools/list -> ${names.join(", ")}`);

  const created = await client.callTool({
    name: "sharebit_create",
    arguments: { content_markdown: "# e2e\n\nprobe body", title: "e2e probe", expires_in_seconds: 300 },
  });
  const paste = created.structuredContent ?? JSON.parse(created.content[0].text);
  assert(paste.id && paste.url, "create returned no id/url");
  console.log(`4. sharebit_create -> ${paste.id} ${paste.url}`);

  const listed = await client.callTool({ name: "sharebit_list", arguments: { limit: 5 } });
  const page = listed.structuredContent ?? JSON.parse(listed.content[0].text);
  const ids = (page.items ?? []).map((item) => item.id);
  assert(ids.includes(paste.id), "created paste missing from list");
  console.log(`5. sharebit_list -> ${ids.length} item(s), probe present`);

  await client.close();
  console.log("\nE2E PASS: pairing -> credential -> tools/list -> create -> list");
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
