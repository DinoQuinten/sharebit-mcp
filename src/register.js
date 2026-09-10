import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

/**
 * Wire the installed package into a host's own MCP config. The goal is that a
 * user runs one `login` command and never edits JSON by hand. Where a host
 * exposes a CLI (`claude mcp add`) we defer to it; where it does not (opencode)
 * we merge the config; where there is no universal path (generic) we print the
 * entry to paste.
 */

export const MCP_SPEC = "github:DinoQuinten/sharebit-mcp";
export const MCP_COMMAND = ["npx", "-y", MCP_SPEC];
export const HOSTS = ["opencode", "claude-code", "generic"];

export function genericSnippet() {
  return JSON.stringify(
    { mcpServers: { sharebit: { command: "npx", args: ["-y", MCP_SPEC] } } },
    null,
    2,
  );
}

export function opencodeEntry() {
  return { type: "local", command: MCP_COMMAND, enabled: true };
}

export function opencodeSnippet() {
  return JSON.stringify({ mcp: { sharebit: opencodeEntry() } }, null, 2);
}

function opencodeCandidates() {
  const home = homedir();
  return [
    { path: join(process.cwd(), "opencode.json"), scope: "project" },
    { path: join(process.cwd(), "opencode.jsonc"), scope: "project" },
    { path: join(home, ".config", "opencode", "opencode.json"), scope: "global" },
    { path: join(home, ".config", "opencode", "opencode.jsonc"), scope: "global" },
  ];
}

function registerOpencode({ dryRun }) {
  const existing = opencodeCandidates().find((candidate) => existsSync(candidate.path));

  if (existing && existing.path.endsWith(".jsonc")) {
    return {
      ok: false,
      manual: true,
      target: existing.path,
      snippet: opencodeSnippet(),
      message:
        `${existing.path} is JSONC, so it is not edited automatically. ` +
        `Add this under the top-level "mcp" key, then restart opencode:`,
    };
  }

  const target = existing?.path ?? opencodeCandidates()[2].path;
  const scope = existing?.scope ?? "global";

  if (dryRun) {
    return { ok: true, target, scope, message: `Would register ShareBit in ${target} (${scope}).` };
  }

  let config = {};
  if (existsSync(target)) {
    try {
      config = JSON.parse(readFileSync(target, "utf8") || "{}");
    } catch (error) {
      return {
        ok: false,
        manual: true,
        target,
        snippet: opencodeSnippet(),
        message: `Could not parse ${target}: ${error instanceof Error ? error.message : String(error)}. Add this under "mcp" manually:`,
      };
    }
  }

  config.mcp = config.mcp && typeof config.mcp === "object" ? config.mcp : {};
  config.mcp.sharebit = opencodeEntry();

  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(config, null, 2)}\n`);
  return {
    ok: true,
    target,
    scope,
    message: `Registered ShareBit in ${target} (${scope}). Restart opencode to load it.`,
  };
}

function registerClaudeCode({ dryRun }) {
  const args = ["mcp", "add", "sharebit", "--scope", "user", "--", ...MCP_COMMAND];
  const printable = `claude ${args.join(" ")}`;

  if (dryRun) {
    return { ok: true, message: `Would run: ${printable}` };
  }

  const available = spawnSync("claude", ["--version"], { shell: process.platform === "win32", encoding: "utf8" });
  if (available.error || available.status !== 0) {
    return {
      ok: false,
      manual: true,
      message: `Claude Code CLI not found on PATH. Run this, then restart Claude Code:`,
      command: printable,
    };
  }

  const added = spawnSync("claude", args, {
    shell: process.platform === "win32",
    encoding: "utf8",
  });
  if (added.status !== 0) {
    return {
      ok: false,
      manual: true,
      message: `Claude Code rejected the registration. Run this manually:`,
      command: printable,
    };
  }
  return { ok: true, message: "Registered ShareBit with Claude Code (user scope). Restart Claude Code to load it." };
}

export function registerHost(host, { dryRun = false } = {}) {
  switch (host) {
    case "opencode":
      return registerOpencode({ dryRun });
    case "claude-code":
      return registerClaudeCode({ dryRun });
    case "generic":
      return {
        ok: true,
        manual: true,
        message: "Add this to your host's MCP config (mcpServers), then restart it:",
        snippet: genericSnippet(),
      };
    default:
      return {
        ok: false,
        manual: true,
        message: `Unknown host "${host}". Supported hosts: ${HOSTS.join(", ")}.`,
        snippet: genericSnippet(),
      };
  }
}
