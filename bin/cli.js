#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { runProxy } from "../src/proxy.js";
import { credentialsPath, resolveCredentials } from "../src/credentials.js";
import { clearCredential, redeem, saveCredential } from "../src/redeem.js";
import { HOSTS, genericSnippet, registerHost } from "../src/register.js";
import { USAGE, camelFlags, parseArgs } from "../src/args.js";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

function printResult(result) {
  if (result.message) console.log(result.message);
  if (result.command) console.log(`\n  ${result.command}\n`);
  if (result.snippet) console.log(`\n${result.snippet}\n`);
}

async function runServer() {
  const credentials = resolveCredentials();
  if (!credentials) {
    console.error(
      "sharebit-mcp: no credential found. Run `sharebit-mcp login --code <CODE> --origin <URL>` " +
        "or set SHAREBIT_ORIGIN and SHAREBIT_TOKEN.",
    );
    process.exit(1);
  }
  await runProxy({ credentials });
}

async function login(opts) {
  const origin = opts.origin ?? process.env.SHAREBIT_ORIGIN;

  if (opts.dryRun) {
    console.log("[dry-run] No pairing code redeemed and no files changed.");
    console.log(`[dry-run] Credential would be stored at ${credentialsPath()}.`);
    printResult(registerHost(opts.host ?? "generic", { dryRun: true }));
    return;
  }

  const result = await redeem({
    origin,
    code: opts.code,
    name: opts.name,
    integration: opts.integration ?? opts.host,
  });
  const file = saveCredential(result);
  console.log(`Connected as "${result.agentName}" (${result.integration}).`);
  console.log(`Credential stored at ${file}`);

  if (opts.noRegister) {
    console.log("\nSkipped host registration (--no-register). Add this to your host manually:");
    printResult({ snippet: genericSnippet() });
    return;
  }

  const host = opts.host ?? (HOSTS.includes(result.integration) ? result.integration : "generic");
  console.log("");
  printResult(registerHost(host, { dryRun: false }));
}

async function status() {
  const credentials = resolveCredentials();
  if (!credentials) {
    console.error("sharebit-mcp: not connected. Run `sharebit-mcp login --code <CODE> --origin <URL>`.");
    process.exit(1);
  }
  console.log(`Origin:     ${credentials.origin}`);
  console.log(`Credential: from ${credentials.source}`);
  try {
    const response = await fetch(`${credentials.origin}/api/v1/pastes?limit=1`, {
      headers: { authorization: `Bearer ${credentials.token}` },
    });
    if (response.ok) console.log("Status:     connected");
    else if (response.status === 401) {
      console.log("Status:     rejected (run login again)");
      process.exitCode = 1;
    } else console.log(`Status:     unexpected (${response.status})`);
  } catch (error) {
    console.log(`Status:     unreachable (${error instanceof Error ? error.message : String(error)})`);
    process.exitCode = 1;
  }
}

function logout() {
  const { file, removed } = clearCredential();
  console.log(removed ? `Removed ${file}` : `No credential file at ${file}`);
  console.log("The agent stays registered on the ShareBit server until you revoke it from Connected.");
}

async function main() {
  const { command, flags } = parseArgs(process.argv.slice(2));
  const opts = camelFlags(flags);

  if (opts.help || command === "help") {
    process.stdout.write(USAGE);
    return;
  }
  if (opts.version || command === "version") {
    console.log(pkg.version);
    return;
  }

  if (!command || command === "serve" || command === "mcp") {
    await runServer();
    return;
  }
  if (command === "login") {
    await login(opts);
    return;
  }
  if (command === "logout") {
    logout();
    return;
  }
  if (command === "status") {
    await status();
    return;
  }

  console.error(`Unknown command: ${command}\n`);
  process.stdout.write(USAGE);
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(`sharebit-mcp: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
