import { test } from "node:test";
import assert from "node:assert/strict";
import { HOSTS, MCP_SPEC, genericSnippet, opencodeEntry, opencodeSnippet, registerHost } from "../src/register.js";

test("generic snippet is a stdio mcpServers entry", () => {
  const parsed = JSON.parse(genericSnippet());
  assert.equal(parsed.mcpServers.sharebit.command, "npx");
  assert.deepEqual(parsed.mcpServers.sharebit.args, ["-y", MCP_SPEC]);
});

test("opencode entry is a local, enabled server", () => {
  const entry = opencodeEntry();
  assert.equal(entry.type, "local");
  assert.equal(entry.enabled, true);
  assert.deepEqual(entry.command, ["npx", "-y", MCP_SPEC]);
  assert.equal(JSON.parse(opencodeSnippet()).mcp.sharebit.type, "local");
});

test("generic registerHost prints a snippet instead of editing files", () => {
  const result = registerHost("generic", { dryRun: false });
  assert.equal(result.manual, true);
  assert.ok(result.snippet.includes("mcpServers"));
});

test("unknown hosts fall back to the generic snippet", () => {
  const result = registerHost("nope");
  assert.equal(result.ok, false);
  assert.ok(result.snippet.includes("mcpServers"));
});

test("dry-run reports without writing", () => {
  const result = registerHost("opencode", { dryRun: true });
  assert.equal(result.ok, true);
  assert.match(result.message, /Would register/);
});

test("exposes the supported host list", () => {
  assert.deepEqual(HOSTS, ["opencode", "claude-code", "generic"]);
});
