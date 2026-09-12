import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

/**
 * Wire the installed package into a host.
 *
 * opencode gets a generated local plugin (auto-loaded, no config edit, no npx).
 * Claude Code gets its own `claude mcp add` registration. Everything else gets
 * a stdio MCP entry to paste. Where a host exposes a CLI we defer to it; where
 * it does not we write the file; where there is no universal path we print.
 */

export const MCP_SPEC = "github:DinoQuinten/sharebit-mcp";
export const MCP_COMMAND = ["npx", "-y", MCP_SPEC];
export const CODEX_MARKETPLACE = "DinoQuinten/sharebit-mcp";
export const CODEX_PLUGIN = "sharebit@sharebit";
export const HOSTS = ["opencode", "claude-code", "codex", "generic"];

const PLUGIN_TEMPLATE = new URL("../plugin/sharebit.ts", import.meta.url);

export function genericSnippet() {
  return JSON.stringify(
    { mcpServers: { sharebit: { command: "npx", args: ["-y", MCP_SPEC] } } },
    null,
    2,
  );
}

/** opencode auto-loads plugins from `<config>/plugin`; some versions use `plugins`. */
export function opencodePluginDir(env = process.env) {
  if (env.SHAREBIT_OPENCODE_DIR) return env.SHAREBIT_OPENCODE_DIR;
  const base = join(homedir(), ".config", "opencode");
  if (existsSync(join(base, "plugins"))) return join(base, "plugins");
  return join(base, "plugin");
}

function registerOpencode({ dryRun, env }) {
  const directory = opencodePluginDir(env);
  const target = join(directory, "sharebit.ts");

  if (dryRun) {
    return { ok: true, target, message: `Would install the ShareBit opencode plugin at ${target}.` };
  }

  mkdirSync(directory, { recursive: true });
  writeFileSync(target, readFileSync(PLUGIN_TEMPLATE, "utf8"));
  return {
    ok: true,
    target,
    message: `Installed the ShareBit opencode plugin at ${target}. Restart opencode to load it.`,
  };
}

function registerClaudeCode({ dryRun }) {
  const args = ["mcp", "add", "sharebit", "--scope", "user", "--", ...MCP_COMMAND];
  const printable = `claude ${args.join(" ")}`;

  if (dryRun) return { ok: true, message: `Would run: ${printable}` };

  const available = spawnSync("claude", ["--version"], { shell: process.platform === "win32", encoding: "utf8" });
  if (available.error || available.status !== 0) {
    return {
      ok: false,
      manual: true,
      message: "Claude Code CLI not found on PATH. Run this, then restart Claude Code:",
      command: printable,
    };
  }

  const added = spawnSync("claude", args, { shell: process.platform === "win32", encoding: "utf8" });
  if (added.status !== 0) {
    return {
      ok: false,
      manual: true,
      message: "Claude Code rejected the registration. Run this manually:",
      command: printable,
    };
  }
  return { ok: true, message: "Registered ShareBit with Claude Code (user scope). Restart Claude Code to load it." };
}

function runCodex(command, args) {
  return spawnSync(command, args, {
    shell: process.platform === "win32",
    encoding: "utf8",
    timeout: 10_000,
  });
}

function registerCodex({ dryRun, run = runCodex }) {
  const commands = [
    ["plugin", "marketplace", "add", CODEX_MARKETPLACE],
    ["plugin", "add", CODEX_PLUGIN],
  ];
  if (dryRun) return { ok: true, message: "Would register ShareBit with Codex.", commands };

  const listed = run("codex", ["plugin", "marketplace", "list", "--json"]);
  let marketplaceExists = false;
  if (!listed.error && listed.status === 0) {
    try {
      const parsed = JSON.parse(listed.stdout || "{}");
      marketplaceExists = Array.isArray(parsed.marketplaces) && parsed.marketplaces.some((item) => item?.name === "sharebit");
    } catch {
      // A non-JSON response is treated as unknown; the add command gives the user a clear recovery path.
    }
  }

  for (const args of marketplaceExists ? [commands[1]] : commands) {
    const result = run("codex", args);
    if (result.error || result.status !== 0) {
      return {
        ok: false,
        manual: true,
        message: "Codex could not register ShareBit automatically. Run these commands, then restart Codex:",
        commands,
      };
    }
  }
  return { ok: true, message: "Registered ShareBit with Codex. Restart Codex to load the tools." };
}

export function registerHost(host, { dryRun = false, env = process.env, run } = {}) {
  switch (host) {
    case "opencode":
      return registerOpencode({ dryRun, env });
    case "claude-code":
      return registerClaudeCode({ dryRun });
    case "codex":
      return registerCodex({ dryRun, run });
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
