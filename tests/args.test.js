import { test } from "node:test";
import assert from "node:assert/strict";
import { camelFlags, parseArgs } from "../src/args.js";

test("parses a command and space-separated flags", () => {
  const { command, flags } = parseArgs(["login", "--code", "AB2CD9", "--origin", "https://x.test"]);
  assert.equal(command, "login");
  assert.equal(flags.code, "AB2CD9");
  assert.equal(flags.origin, "https://x.test");
});

test("supports --flag=value and boolean flags", () => {
  const { flags } = parseArgs(["login", "--code=AB2CD9", "--dry-run"]);
  assert.equal(flags.code, "AB2CD9");
  assert.equal(flags["dry-run"], true);
});

test("throws when a value flag has no value", () => {
  assert.throws(() => parseArgs(["login", "--code"]), /Missing value for --code/);
});

test("maps aliases and camel-cases hyphenated flags", () => {
  const { flags } = parseArgs(["-h", "--no-register"]);
  const opts = camelFlags(flags);
  assert.equal(opts.help, true);
  assert.equal(opts.noRegister, true);
  assert.equal(opts.dryRun, false);
});

test("defaults the command to null when no positional is given", () => {
  assert.equal(parseArgs(["--help"]).command, null);
});
