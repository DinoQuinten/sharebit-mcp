import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

test("ships a Codex plugin that starts the local ShareBit MCP client", () => {
  assert.ok(existsSync(new URL("../.codex-plugin/plugin.json", import.meta.url)));
  assert.ok(existsSync(new URL("../.mcp.json", import.meta.url)));
  assert.ok(existsSync(new URL("../skills/sharebit/SKILL.md", import.meta.url)));

  const manifest = JSON.parse(readFileSync(new URL("../.codex-plugin/plugin.json", import.meta.url), "utf8"));
  const mcp = JSON.parse(readFileSync(new URL("../.mcp.json", import.meta.url), "utf8"));
  assert.equal(manifest.name, "sharebit");
  assert.equal(manifest.mcpServers, "./.mcp.json");
  assert.deepEqual(mcp.sharebit, { command: "npx", args: ["-y", "github:DinoQuinten/sharebit-mcp"] });
});
