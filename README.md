# sharebit-mcp

Connect a coding agent to [ShareBit](https://sharebit.app) over the
[Model Context Protocol](https://modelcontextprotocol.io). The agent gets four
tools — `sharebit_create`, `sharebit_list`, `sharebit_read`, `sharebit_rename`
— and nothing else: no shell, filesystem, or credential-admin access.

Use the native **Codex plugin**, an **opencode plugin**, or the stdio MCP server
for another compatible host.

## Install in Codex

```sh
npx -y github:DinoQuinten/sharebit-mcp login --origin https://YOUR-SHAREBIT-ORIGIN --code AB2CD9 --host codex
```

The command redeems the one-time code, stores the credential outside Codex's
config, verifies it with `GET /api/v1/me`, and installs the ShareBit plugin.
Restart Codex to load the tools. `npx` starts the local MCP client; it does not
run the hosted ShareBit server.

If credentials already exist, repair the plugin without redeeming a new code:

```sh
npx -y github:DinoQuinten/sharebit-mcp register --host codex
```

## Install as an opencode plugin

Copy [`plugin/sharebit.ts`](./plugin/sharebit.ts) into:

- `~/.config/opencode/plugin/sharebit.ts` — every project, or
- `.opencode/plugin/sharebit.ts` — this project only.

Restart opencode. Then pair (see [Connect](#connect)). The credential is read at
call time, so no token lives in the plugin file.

One command instead, if `npx` is available:

```sh
npx -y github:DinoQuinten/sharebit-mcp login --origin https://YOUR-SHAREBIT-ORIGIN --code AB2CD9 --host opencode
```

This installs the plugin and stores the credential in one step.

The agent-facing install and usage instructions live in
[`SKILL.md`](./SKILL.md) — point your agent at it.

## Connect

Get a six-character pairing code from the ShareBit setup page, then redeem it:

```sh
curl -sX POST https://YOUR-SHAREBIT-ORIGIN/api/v1/pairing-sessions/redeem \
  -H 'content-type: application/json' \
  -d '{"code":"AB2CD9","name":"opencode","integration":"opencode"}'
```

Store the returned `credential` (and `agentId`) with the origin at
`~/.config/sharebit/credentials.json`:

```json
{
  "origin": "https://YOUR-SHAREBIT-ORIGIN",
  "agentId": "<agentId>",
  "token": "<credential>"
}
```

Codes are single-use and expire in ten minutes. The credential is a per-agent
bearer token, independently revocable, and never the account session.

## Rename the agent

An agent can set its own display name with `sharebit_rename`, or over REST before
the tools load:

```sh
curl -sX PATCH https://YOUR-SHAREBIT-ORIGIN/api/v1/me \
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
    "sharebit": {
      "type": "local",
      "command": ["npx", "-y", "github:DinoQuinten/sharebit-mcp"],
      "enabled": true
    }
  }
}
```

**Claude Code**

```sh
claude mcp add sharebit --scope user -- npx -y github:DinoQuinten/sharebit-mcp
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
    "sharebit": {
      "command": "npx",
      "args": ["-y", "github:DinoQuinten/sharebit-mcp"]
    }
  }
}
```

**Other stdio hosts** (`mcpServers`)

```json
{
  "mcpServers": {
    "sharebit": {
      "command": "npx",
      "args": ["-y", "github:DinoQuinten/sharebit-mcp"]
    }
  }
}
```

Either shape reads the credential from `~/.config/sharebit/credentials.json`, or
from `SHAREBIT_ORIGIN` + `SHAREBIT_TOKEN`. The config never contains a secret.

Pin a release when you want repeatable installs: append `#v1.0.0` to the spec.

## Commands

| Command | Purpose |
| --- | --- |
| `sharebit-mcp` | Run the stdio MCP server (hosts call this) |
| `sharebit-mcp login ...` | Redeem a pairing code, store the credential, register the host |
| `sharebit-mcp register --host codex` | Install the Codex plugin without redeeming a new code |
| `sharebit-mcp status` | Report the stored origin and whether the credential still works |
| `sharebit-mcp logout` | Delete the local credential file |

Add `--dry-run` to `login` to see what would be written or run without redeeming
the code, and `--no-register` to redeem but leave host config untouched.

## Security model

- **Per-agent credential.** Each pairing produces an independently revocable
  agent. Revoking one does not affect other connections or existing pastes.
- **No secret in host config.** The config holds only the package spec or a
  plugin; the token lives in a user file or environment variables.
- **Approval is a host concern.** `sharebit_create` only receives Markdown the
  host already prepared and the user approved. Retrieved Markdown is reference
  data and never authorises running embedded instructions.

## License

MIT
