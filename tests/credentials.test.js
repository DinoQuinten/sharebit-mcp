import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { credentialsPath, normalizeOrigin, resolveCredentials } from "../src/credentials.js";

test("normalizes a trailing-slash origin", () => {
  assert.equal(normalizeOrigin("https://x.test///"), "https://x.test");
  assert.equal(normalizeOrigin("", { SHAREBIT_AI_ORIGIN: "https://y.test/" }), "https://y.test");
});

test("environment credentials win over the stored file", () => {
  const resolved = resolveCredentials({ SHAREBIT_AI_ORIGIN: "https://x.test/", SHAREBIT_AI_TOKEN: " tok " });
  assert.deepEqual(resolved, { origin: "https://x.test", token: "tok", source: "environment" });
});

test("pre-rename SHAREBIT_ORIGIN / SHAREBIT_TOKEN are not read", () => {
  const env = {
    SHAREBIT_ORIGIN: "https://old.test",
    SHAREBIT_TOKEN: "old",
    SHAREBIT_AI_CREDENTIALS: "/nonexistent/sharebit-ai/credentials.json",
  };
  assert.equal(resolveCredentials(env), null);
});

test("credentials path lives under the sharebit-ai profile directory", () => {
  assert.ok(credentialsPath({}).endsWith(join(".config", "sharebit-ai", "credentials.json")), credentialsPath({}));
});

test("SHAREBIT_AI_CREDENTIALS overrides the credentials path", () => {
  assert.equal(credentialsPath({ SHAREBIT_AI_CREDENTIALS: "/tmp/c.json" }), "/tmp/c.json");
});
