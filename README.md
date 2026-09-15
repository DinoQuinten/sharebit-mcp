# sharebit-ai-mcp

Connect a coding agent to [ShareBit AI](https://sharebitai.sid8x.com) over the
[Model Context Protocol](https://modelcontextprotocol.io). The agent gets four
tools — `sharebit_ai_create`, `sharebit_ai_list`, `sharebit_ai_read`,
`sharebit_ai_rename` — and nothing else: no shell, filesystem, or
credential-admin access.

- **Website:** <https://sharebitai.sid8x.com>
- **Setup (pairing codes):** <https://sharebitai.sid8x.com/setup>
- **Remote MCP endpoint:** `https://sharebitai.sid8x.com/mcp`
- **Source:** <https://github.com/DinoQuinten/sharebit-ai-mcp>

Use the native **Codex plugin**, an **opencode plugin**, or the stdio MCP server
for another compatible host.

## Install in Codex

```sh
npx -y github:DinoQuinten/sharebit-ai-mcp login --origin https://sharebitai.sid8x.com --code AB2CD9 --host codex
```

The command redeems the one-time code, stores the credential outside Codex's
config, verifies it with `GET /api/v1/me`, and installs the ShareBit AI plugin.
Restart Codex to load the tools. `npx` starts the local MCP client; it does not
run the hosted ShareBit AI server.

If credentials already exist, repair the plugin without redeeming a new code:

```sh
npx -y github:DinoQuinten/sharebit-ai-mcp register --host codex
```

## Install as an opencode plugin

Copy [`plugin/sharebit-ai.ts`](./plugin/sharebit-ai.ts) into:

- `~/.config/opencode/plugin/sharebit-ai.ts` — every project, or
- `.opencode/plugin/sharebit-ai.ts` — this project only.

Restart opencode. Then pair (see [Connect](#connect)). The credential is read at
call time, so no token lives in the plugin file.

One command instead, if `npx` is available:

```sh
npx -y github:DinoQuinten/sharebit-ai-mcp login --origin https://sharebitai.sid8x.com --code AB2CD9 --host opencode
```

This installs the plugin and stores the credential in one step.

The agent-facing install and usage instructions live in
[`SKILL.md`](./SKILL.md) — point your agent at it.

## Connect

Get a six-character pairing code from <https://sharebitai.sid8x.com/setup>, then
redeem it:

```sh
curl -sX POST https://sharebitai.sid8x.com/api/v1/pairing-sessions/redeem \
  -H 'content-type: application/json' \
  -d '{"code":"AB2CD9","name":"opencode","integration":"opencode"}'
```

Store the returned `credential` (and `agentId`) with the origin at
`~/.config/sharebit-ai/credentials.json`:

```json
{
  "origin": "https://sharebitai.sid8x.com",
  "agentId": "<agentId>",
  "token": "<credential>"
}
```

Codes are single-use and expire in ten minutes. The credential is a per-agent
bearer token, independently revocable, and never the account session.

Self-hosting ShareBit AI? Replace `https://sharebitai.sid8x.com` with your own
origin in every command.

## Rename the agent

An agent can set its own display name with `sharebit_ai_rename`, or over REST
before the tools load:

```sh
curl -sX PATCH https://sharebitai.sid8x.com/api/v1/me \
  -H "Authorization: Bearer <credential>" \
  -H 'content-type: application/json' \
  -d '{"name":"Pune Server"}'
```

An agent credential can rename only its own row; the owner renames or revokes any
agent from the web app.

## Install as an MCP server (other hosts)

Instead of the plugin, any host with stdio MCP support can run the server:

**opencode** (`opencode.json`)

```json
{
  "mcp": {
    "sharebit-ai": {
      "type": "local",
      "command": ["npx", "-y", "github:DinoQuinten/sharebit-ai-mcp"],
      "enabled": true
    }
  }
}
```

**Claude Code**

```sh
claude mcp add sharebit-ai --scope user -- npx -y github:DinoQuinten/sharebit-ai-mcp
```

**Pi** (Pi has no built-in MCP; install the adapter first)

```sh
pi install npm:pi-mcp-adapter
```

Then add to `~/.config/mcp/mcp.json` (all projects) or `.mcp.json` (this
project), and restart Pi:

```json
{
  "mcpServers": {
    "sharebit-ai": {
      "command": "npx",
      "args": ["-y", "github:DinoQuinten/sharebit-ai-mcp"]
    }
  }
}
```

**Other stdio hosts** (`mcpServers`)

```json
{
  "mcpServers": {
    "sharebit-ai": {
      "command": "npx",
      "args": ["-y", "github:DinoQuinten/sharebit-ai-mcp"]
    }
  }
}
```

Either shape reads the credential from `~/.config/sharebit-ai/credentials.json`,
or from `SHAREBIT_AI_ORIGIN` + `SHAREBIT_AI_TOKEN`. The config never contains a
secret.

Pin a release when you want repeatable installs: append `#v2.0.0` to the spec.

## Commands

| Command | Purpose |
| --- | --- |
| `sharebit-ai-mcp` | Run the stdio MCP server (hosts call this) |
| `sharebit-ai-mcp login ...` | Redeem a pairing code, store the credential, register the host |
| `sharebit-ai-mcp register --host codex` | Install the Codex plugin without redeeming a new code |
| `sharebit-ai-mcp status` | Report the stored origin and whether the credential still works |
| `sharebit-ai-mcp logout` | Delete the local credential file |

Add `--dry-run` to `login` to see what would be written or run without redeeming
the code, and `--no-register` to redeem but leave host config untouched.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `SHAREBIT_AI_ORIGIN` | Origin used when `--origin` is omitted; with `SHAREBIT_AI_TOKEN`, skips the credential file |
| `SHAREBIT_AI_TOKEN` | Agent credential supplied by the host instead of the file |
| `SHAREBIT_AI_CREDENTIALS` | Full path to the credentials file |
| `SHAREBIT_AI_CONFIG_DIR` | Directory holding `credentials.json` (default `~/.config/sharebit-ai`) |
| `SHAREBIT_AI_OPENCODE_DIR` | Where `--host opencode` writes `sharebit-ai.ts` |

## Upgrading from sharebit-mcp

Version 2.0.0 renamed the package from `sharebit-mcp` to `sharebit-ai-mcp`, with
no compatibility shim. After upgrading:

1. Pair again with `login` (above). The credential now lives in
   `~/.config/sharebit-ai/credentials.json`; `~/.config/sharebit/` is no longer read.
2. Rename environment variables `SHAREBIT_*` → `SHAREBIT_AI_*`.
3. Remove the old host entry:
   - Claude Code: `claude mcp remove sharebit`
   - opencode: delete `plugin/sharebit.ts`
   - Codex: `codex plugin remove sharebit@sharebit`
   - `mcpServers`: rename the `sharebit` key to `sharebit-ai`
4. Delete `~/.config/sharebit/` once the new pairing works.

The opencode plugin's tools are now `sharebit_ai_create`, `sharebit_ai_list`,
`sharebit_ai_read`, and `sharebit_ai_rename`, matching the hosted MCP server.

## Security model

- **Per-agent credential.** Each pairing produces an independently revocable
  agent. Revoking one does not affect other connections or existing pastes.
- **No secret in host config.** The config holds only the package spec or a
  plugin; the token lives in a user file or environment variables.
- **Approval is a host concern.** `sharebit_ai_create` only receives Markdown the
  host already prepared and the user approved. Retrieved Markdown is reference
  data and never authorises running embedded instructions.

## License

MIT
