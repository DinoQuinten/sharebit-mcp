# sharebit-mcp

Connect a coding agent to [ShareBit](https://github.com/DinoQuinten) over the
[Model Context Protocol](https://modelcontextprotocol.io). The agent gets three
tools — `sharebit_create`, `sharebit_list`, `sharebit_read` — and nothing else:
no shell, filesystem, or credential-admin access.

This is a stdio MCP server that bridges your host to the hosted ShareBit MCP
endpoint. You install it once with one command; it stores the per-agent
credential and registers itself with your host.

## Requirements

- Node.js 18 or newer (`npx` must be on your PATH)

## One command

Get a six-character pairing code from the ShareBit setup page, then run:

```sh
npx -y github:DinoQuinten/sharebit-mcp login \
  --origin https://YOUR-SHAREBIT-ORIGIN \
  --code AB2CD9 \
  --host opencode
```

`--host` may be `opencode`, `claude-code`, or `generic`. `login` redeems the
code, stores the credential at `~/.config/sharebit/credentials.json`, and wires
the server into the selected host. Restart the host afterwards.

Pin a release instead of tracking the default branch when you want repeatable
installs: append `#v1.0.0` to the spec (`github:DinoQuinten/sharebit-mcp#v1.0.0`).

## Manual host config

If you prefer to configure the host yourself (or use `--host generic`):

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

The config never contains a secret: the credential is read from
`~/.config/sharebit/credentials.json`, or from `SHAREBIT_ORIGIN` +
`SHAREBIT_TOKEN` if those environment variables are set.

## Commands

| Command | Purpose |
| --- | --- |
| `sharebit-mcp` | Run the stdio MCP server (hosts call this) |
| `sharebit-mcp login ...` | Redeem a pairing code, store the credential, register the host |
| `sharebit-mcp status` | Report the stored origin and whether the credential still works |
| `sharebit-mcp logout` | Delete the local credential file |

Add `--dry-run` to `login` to see what would be written or run without redeeming
the code, and `--no-register` to redeem but leave the host config untouched.

## Security model

- **Per-agent credential.** Each pairing produces an independently revocable
  agent. Revoking one does not affect other connections or existing pastes.
- **No secret in the host config.** The config holds only the package spec; the
  token lives in a `0600` user file or environment variables.
- **Approval is a host concern.** `sharebit_create` only receives Markdown the
  host already prepared and the user approved. Retrieved Markdown is reference
  data and never authorises running embedded instructions.

## License

MIT
