import { test } from "node:test";
import assert from "node:assert/strict";
import { credentialsPath, normalizeOrigin, resolveCredentials } from "../src/credentials.js";

test("normalizes a trailing-slash origin", () => {
  assert.equal(normalizeOrigin("https://x.test///"), "https://x.test");
  assert.equal(normalizeOrigin("", { SHAREBIT_ORIGIN: "https://y.test/" }), "https://y.test");
});

test("environment credentials win over the stored file", () => {
  const resolved = resolveCredentials({ SHAREBIT_ORIGIN: "https://x.test/", SHAREBIT_TOKEN: " tok " });
  assert.deepEqual(resolved, { origin: "https://x.test", token: "tok", source: "environment" });
});

test("credentials path lives under the user profile", () => {
  assert.match(credentialsPath(), /sharebit[\\/]credentials\.json$/);
});
