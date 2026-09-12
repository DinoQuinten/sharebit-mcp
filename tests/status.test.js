import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyCredential } from "../src/status.js";

test("verifies the stored credential through the documented identity endpoint", async () => {
  const calls = [];
  const result = await verifyCredential(
    { origin: "https://sharebit.test", token: "secret" },
    async (url, options) => {
      calls.push([url, options]);
      return new Response("{}", { status: 200 });
    },
  );

  assert.deepEqual(calls, [["https://sharebit.test/api/v1/me", { headers: { authorization: "Bearer secret" } }]]);
  assert.equal(result.status, "connected");
});
