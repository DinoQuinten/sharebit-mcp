import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));

test("ships a Codex plugin that starts the local ShareBit AI MCP client", () => {
  assert.ok(existsSync(new URL("../.codex-plugin/plugin.json", import.meta.url)));
  assert.ok(existsSync(new URL("../.mcp.json", import.meta.url)));
  assert.ok(existsSync(new URL("../skills/sharebit-ai/SKILL.md", import.meta.url)));
  assert.ok(existsSync(new URL("../plugin/sharebit-ai.ts", import.meta.url)));

  const manifest = read("../.codex-plugin/plugin.json");
  const mcp = read("../.mcp.json");
  assert.equal(manifest.name, "sharebit-ai");
  assert.equal(manifest.interface.displayName, "ShareBit AI");
  assert.equal(manifest.homepage, "https://sharebitai.sid8x.com");
  assert.equal(manifest.repository, "https://github.com/DinoQuinten/sharebit-ai-mcp");
  assert.equal(manifest.mcpServers, "./.mcp.json");
  assert.deepEqual(mcp["sharebit-ai"], { command: "npx", args: ["-y", "github:DinoQuinten/sharebit-ai-mcp"] });
});

test("the Codex marketplace and plugin entry share the sharebit-ai name", () => {
  const marketplace = read("../.agents/plugins/marketplace.json");
  assert.equal(marketplace.name, "sharebit-ai");
  assert.equal(marketplace.plugins[0].name, "sharebit-ai");
});

test("package metadata points at the ShareBit AI domain and repository", () => {
  const pkg = read("../package.json");
  assert.equal(pkg.name, "sharebit-ai-mcp");
  assert.deepEqual(Object.keys(pkg.bin), ["sharebit-ai-mcp"]);
  assert.equal(pkg.homepage, "https://sharebitai.sid8x.com");
});
