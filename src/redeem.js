import { chmodSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { credentialsPath, normalizeOrigin } from "./credentials.js";

/**
 * Redeem a one-time pairing code for a per-agent credential. Mirrors
 * `scripts/sharebit-connect.ts` and hits the same public endpoint, so no
 * account session or API key ever touches the setup flow.
 */
export async function redeem({ origin, code, name, integration }) {
  const base = normalizeOrigin(origin);
  if (!base) throw new Error("A ShareBit origin is required (--origin or SHAREBIT_ORIGIN)");
  if (!code || !code.trim()) throw new Error("A pairing code is required (--code)");

  let response;
  try {
    response = await fetch(`${base}/api/v1/pairing-sessions/redeem`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: code.trim(), name, integration }),
    });
  } catch (error) {
    throw new Error(`Could not reach ${base}: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Pairing failed (${response.status})${detail ? `: ${detail}` : ""}`);
  }

  const result = await response.json();
  if (!result || typeof result.credential !== "string") {
    throw new Error("Pairing succeeded but the server returned no credential");
  }
  return { ...result, origin: base };
}

export function saveCredential({ origin, agentId, credential }) {
  const file = credentialsPath();
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(
    file,
    JSON.stringify({ origin: normalizeOrigin(origin), agentId, token: credential }, null, 2),
  );
  try {
    chmodSync(file, 0o600);
  } catch {
    // Windows may not support POSIX modes; the file still lives in the profile.
  }
  return file;
}

export function clearCredential() {
  const file = credentialsPath();
  let removed = false;
  try {
    rmSync(file, { force: true });
    removed = true;
  } catch {
    removed = false;
  }
  return { file, removed };
}
