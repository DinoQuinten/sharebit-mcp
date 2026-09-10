import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Credential storage for the ShareBit MCP server.
 *
 * The same file the documented generic client writes
 * (`~/.config/sharebit/credentials.json`), so `sharebit-connect` and this
 * package stay interchangeable. The credential is a per-agent bearer token,
 * never the account owner's session.
 */

export function credentialsPath(env = process.env) {
  if (env.SHAREBIT_CREDENTIALS) return env.SHAREBIT_CREDENTIALS;
  const directory = env.SHAREBIT_CONFIG_DIR || join(homedir(), ".config", "sharebit");
  return join(directory, "credentials.json");
}

export function readStored(env = process.env) {
  try {
    const raw = readFileSync(credentialsPath(), "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.origin === "string" && typeof parsed.token === "string") {
      return { origin: normalizeOrigin(parsed.origin, env), token: parsed.token, agentId: parsed.agentId };
    }
    return null;
  } catch {
    return null;
  }
}

export function normalizeOrigin(origin, env = process.env) {
  const fallback = typeof env.SHAREBIT_ORIGIN === "string" ? env.SHAREBIT_ORIGIN : "";
  const value = (origin || fallback).trim();
  return value.replace(/\/+$/, "");
}

/**
 * Resolve the credential to use for the MCP proxy. Environment variables win so
 * a host can inject the token without touching the stored file; otherwise the
 * file written by `login` is used.
 */
export function resolveCredentials(env = process.env) {
  const origin = normalizeOrigin(env.SHAREBIT_ORIGIN);
  const token = typeof env.SHAREBIT_TOKEN === "string" ? env.SHAREBIT_TOKEN.trim() : "";
  if (origin && token) return { origin, token, source: "environment" };

  const stored = readStored(env);
  if (stored) return { origin: stored.origin, token: stored.token, agentId: stored.agentId, source: "file" };
  return null;
}
