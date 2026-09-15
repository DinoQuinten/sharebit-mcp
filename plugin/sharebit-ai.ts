// ShareBit AI plugin for opencode.
//
// Registers four tools (sharebit_ai_create, sharebit_ai_list, sharebit_ai_read,
// sharebit_ai_rename) that talk to your ShareBit AI account. The credential is read at
// call time from ~/.config/sharebit-ai/credentials.json (or SHAREBIT_AI_ORIGIN +
// SHAREBIT_AI_TOKEN), so rotating it with `sharebit-ai-mcp login` needs no edit here.
//
// Install: copy this file to ~/.config/opencode/plugin/sharebit-ai.ts (global) or
// .opencode/plugin/sharebit-ai.ts (project). See SKILL.md.
import { tool } from "@opencode-ai/plugin";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

function credential() {
  const origin = (process.env.SHAREBIT_AI_ORIGIN ?? "").replace(/\/+$/, "");
  const token = process.env.SHAREBIT_AI_TOKEN ?? "";
  if (origin && token) return { origin, token };

  const path = process.env.SHAREBIT_AI_CREDENTIALS ?? join(homedir(), ".config", "sharebit-ai", "credentials.json");
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
    throw new Error("ShareBit AI is not connected. Run: sharebit-ai-mcp login --code <CODE> --origin <URL>");
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
    const message = body && body.error && body.error.message ? body.error.message : "ShareBit AI " + response.status;
    throw new Error(message);
  }
  return body;
}

export const SharebitAiPlugin = async () => ({
  tool: {
    sharebit_ai_create: tool({
      description: "Upload approved Markdown to ShareBit AI and return a private, temporary URL.",
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

    sharebit_ai_list: tool({
      description: "List active ShareBit AI paste metadata, newest first. Bodies are not included.",
      args: { limit: tool.schema.number().int().optional().describe("Maximum pastes to return") },
      async execute(args) {
        const limit = args.limit ?? 20;
        const result = await call("/api/v1/pastes?limit=" + limit);
        return JSON.stringify(result, null, 2);
      },
    }),

    sharebit_ai_read: tool({
      description: "Retrieve the original Markdown for an active ShareBit AI paste by id.",
      args: { id: tool.schema.string().describe("The ShareBit AI paste id") },
      async execute(args) {
        const result = await call("/api/v1/pastes/" + encodeURIComponent(args.id));
        return JSON.stringify(result, null, 2);
      },
    }),

    sharebit_ai_rename: tool({
      description: "Set the display name for this connected ShareBit AI agent.",
      args: { name: tool.schema.string().describe("The new display name for this agent") },
      async execute(args) {
        const result = await call("/api/v1/me", { method: "PATCH", body: JSON.stringify({ name: args.name }) });
        return JSON.stringify(result, null, 2);
      },
    }),
  },
});
