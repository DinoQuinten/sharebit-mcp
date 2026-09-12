import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CODEX_PLUGIN, CODEX_MARKETPLACE, HOSTS, MCP_SPEC, genericSnippet, registerHost } from "../src/register.js";

test("generic snippet is a stdio mcpServers entry", () => {
  const parsed = JSON.parse(genericSnippet());
  assert.equal(parsed.mcpServers.sharebit.command, "npx");
  assert.deepEqual(parsed.mcpServers.sharebit.args, ["-y", MCP_SPEC]);
});

test("opencode registration writes the plugin file", () => {
  const directory = mkdtempSync(join(tmpdir(), "sharebit-opencode-"));
  try {
    const result = registerHost("opencode", { env: { SHAREBIT_OPENCODE_DIR: directory } });
    assert.equal(result.ok, true);
    const target = join(directory, "sharebit.ts");
    assert.ok(existsSync(target), "plugin file was not written");
    const source = readFileSync(target, "utf8");
    assert.match(source, /@opencode-ai\/plugin/);
    assert.match(source, /sharebit_create/);
    assert.match(source, /sharebit_list/);
    assert.match(source, /sharebit_read/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("opencode dry-run reports without writing", () => {
  const directory = mkdtempSync(join(tmpdir(), "sharebit-opencode-"));
  try {
    const result = registerHost("opencode", {
      dryRun: true,
      env: { SHAREBIT_OPENCODE_DIR: directory },
    });
    assert.match(result.message, /Would install/);
    assert.equal(existsSync(join(directory, "sharebit.ts")), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
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

test("codex dry-run describes marketplace and plugin registration", () => {
  const result = registerHost("codex", { dryRun: true });
  assert.equal(result.ok, true);
  assert.match(result.message, /Would register ShareBit with Codex/);
  assert.deepEqual(result.commands, [
    ["plugin", "marketplace", "add", CODEX_MARKETPLACE],
    ["plugin", "add", CODEX_PLUGIN],
  ]);
});

test("codex registration installs the marketplace before the plugin", () => {
  const calls = [];
  const result = registerHost("codex", {
    run: (command, args) => {
      calls.push([command, args]);
      return { status: 0, error: null, stderr: "" };
    },
  });
  assert.equal(result.ok, true);
  assert.deepEqual(calls, [
    ["codex", ["plugin", "marketplace", "list", "--json"]],
    ["codex", ["plugin", "marketplace", "add", CODEX_MARKETPLACE]],
    ["codex", ["plugin", "add", CODEX_PLUGIN]],
  ]);
});

test("codex registration does not add an already configured ShareBit marketplace", () => {
  const calls = [];
  const result = registerHost("codex", {
    run: (command, args) => {
      calls.push([command, args]);
      if (args[2] === "list") return { status: 0, error: null, stdout: JSON.stringify({ marketplaces: [{ name: "sharebit" }] }) };
      return { status: 0, error: null, stderr: "" };
    },
  });
  assert.equal(result.ok, true);
  assert.deepEqual(calls, [
    ["codex", ["plugin", "marketplace", "list", "--json"]],
    ["codex", ["plugin", "add", CODEX_PLUGIN]],
  ]);
});

test("exposes the supported host list", () => {
  assert.deepEqual(HOSTS, ["opencode", "claude-code", "codex", "generic"]);
});
