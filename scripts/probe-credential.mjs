// Writes a fresh dev credential to the path in argv[2], for plugin probing.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const origin = (process.env.SHAREBIT_AI_TEST_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const target = process.argv[2];
if (!target) throw new Error("usage: node probe-credential.mjs <credentials.json>");

const session = await (await fetch(`${origin}/api/v1/dev/session`, { method: "POST" })).json();
const pairing = await (
  await fetch(`${origin}/api/v1/pairing-sessions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${session.token}` },
    body: JSON.stringify({ integration: "opencode", suggested_name: "plugin probe" }),
  })
).json();
const redeemed = await (
  await fetch(`${origin}/api/v1/pairing-sessions/redeem`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: pairing.code, integration: "opencode", name: "plugin probe" }),
  })
).json();

mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, JSON.stringify({ origin, agentId: redeemed.agentId, token: redeemed.credential }, null, 2));
console.log("wrote credential for agent", redeemed.agentId);
