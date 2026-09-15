export const USAGE = `sharebit-ai-mcp — connect a coding agent to ShareBit AI over MCP

Usage:
  sharebit-ai-mcp login --code <CODE> --origin <URL> [--name <NAME>] [--host <HOST>] [--dry-run]
  sharebit-ai-mcp register --host <HOST> [--dry-run]
  sharebit-ai-mcp status
  sharebit-ai-mcp logout
  sharebit-ai-mcp                       Run the stdio MCP server (invoked by your MCP host)

Options:
  --origin <URL>    ShareBit AI origin, e.g. https://sharebitai.sid8x.com (or SHAREBIT_AI_ORIGIN)
  --code <CODE>     Six-character one-time pairing code from the ShareBit AI setup page
  --name <NAME>     Agent display name (defaults to the integration label)
  --host <HOST>     Auto-register the host: opencode | claude-code | codex | generic
  --integration <I> ShareBit AI integration label (defaults to the host)
  --dry-run         Show what would be written or run, change nothing
  --no-register     Redeem and store the credential, but do not touch host config
  -h, --help        Show this help
  -v, --version     Show the package version
`;

const FLAG_ALIASES = { h: "help", v: "version" };
const BOOLEAN_FLAGS = new Set(["help", "version", "dry-run", "no-register"]);

export function parseArgs(argv) {
  const flags = {};
  const positional = [];

  for (let index = 0; index < argv.length; index++) {
    const token = argv[index];
    if (!token.startsWith("-")) {
      positional.push(token);
      continue;
    }
    const withoutDashes = token.replace(/^-+/, "");
    const eq = withoutDashes.indexOf("=");
    let name = eq === -1 ? withoutDashes : withoutDashes.slice(0, eq);
    name = FLAG_ALIASES[name] ?? name;
    const inlineValue = eq === -1 ? undefined : withoutDashes.slice(eq + 1);

    if (BOOLEAN_FLAGS.has(name)) {
      flags[name] = inlineValue === undefined ? true : inlineValue !== "false";
      continue;
    }
    const value = inlineValue ?? argv[++index];
    if (value === undefined) throw new Error(`Missing value for --${name}`);
    flags[name] = value;
  }

  return { command: positional[0] ?? null, positional, flags };
}

export function camelFlags(flags) {
  return {
    origin: flags.origin,
    code: flags.code,
    name: flags.name,
    host: flags.host,
    integration: flags.integration,
    dryRun: Boolean(flags["dry-run"]),
    noRegister: Boolean(flags["no-register"]),
    help: Boolean(flags.help),
    version: Boolean(flags.version),
  };
}
