export const USAGE = `sharebit-mcp — connect a coding agent to ShareBit over MCP

Usage:
  sharebit-mcp login --code <CODE> --origin <URL> [--name <NAME>] [--host <HOST>] [--dry-run]
  sharebit-mcp status
  sharebit-mcp logout
  sharebit-mcp                       Run the stdio MCP server (invoked by your MCP host)

Options:
  --origin <URL>    ShareBit origin, e.g. https://sharebit.example (or SHAREBIT_ORIGIN)
  --code <CODE>     Six-character one-time pairing code from the ShareBit setup page
  --name <NAME>     Agent display name (defaults to the integration label)
  --host <HOST>     Auto-register the host: opencode | claude-code | generic
  --integration <I> ShareBit integration label (defaults to the host)
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
