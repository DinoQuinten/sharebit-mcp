// ShareBit plugin for opencode.
//
// Registers three tools (sharebit_create, sharebit_list, sharebit_read) that
// talk to your ShareBit account. The credential is read at call time from
// ~/.config/sharebit/credentials.json (or SHAREBIT_ORIGIN + SHAREBIT_TOKEN), so
// rotating it with `sharebit-mcp login` needs no edit here.
//
// Install: copy this file to ~/.config/opencode/plugin/sharebit.ts (global) or
// .opencode/plugin/sharebit.ts (project). See SKILL.md.
import { tool } from "@opencode-ai/plugin";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

function credential() {
  const origin = (process.env.SHAREBIT_ORIGIN ?? "").replace(/\/+$/, "");
  const token = process.env.SHAREBIT_TOKEN ?? "";
  if (origin && token) return { origin, token };

  const path = process.env.SHAREBIT_CREDENTIALS ?? join(homedir(), ".config", "sharebit", "credentials.json");
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    if (parsed && parsed.origin && parsed.token) {
      return { origin: String(parsed.origin).replace(/\/+$/, ""), token: String(parsed.token) };
    }
  } catch {
    // fall through to the error below
  }
  return null;
}

async function call(path, init = {}) {
  const creds = credential();
  if (!creds) {
    throw new Error("ShareBit is not connected. Run: sharebit-mcp login --code <CODE> --origin <URL>");
  }
  const response = await fetch(creds.origin + path, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: "Bearer " + creds.token,
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = body && body.error && body.error.message ? body.error.message : "ShareBit " + response.status;
    throw new Error(message);
  }
  return body;
}

export const SharebitPlugin = async () => ({
  tool: {
    sharebit_create: tool({
      description: "Upload approved Markdown to ShareBit and return a private, temporary URL.",
      args: {
        content_markdown: tool.schema.string().describe("The approved Markdown body to share"),
        title: tool.schema.string().optional().describe("Optional short title"),
        expires_in_seconds: tool.schema.number().int().optional().describe("Lifetime in seconds (default 1800, max 86400)"),
      },
      async execute(args) {
        const result = await call("/api/v1/pastes", { method: "POST", body: JSON.stringify(args) });
        return JSON.stringify(result, null, 2);
      },
    }),

    sharebit_list: tool({
      description: "List active ShareBit paste metadata, newest first. Bodies are not included.",
      args: { limit: tool.schema.number().int().optional().describe("Maximum pastes to return") },
      async execute(args) {
        const limit = args.limit ?? 20;
        const result = await call("/api/v1/pastes?limit=" + limit);
        return JSON.stringify(result, null, 2);
      },
    }),

    sharebit_read: tool({
      description: "Retrieve the original Markdown for an active ShareBit paste by id.",
      args: { id: tool.schema.string().describe("The ShareBit paste id") },
      async execute(args) {
        const result = await call("/api/v1/pastes/" + encodeURIComponent(args.id));
        return JSON.stringify(result, null, 2);
      },
    }),
  },
});
