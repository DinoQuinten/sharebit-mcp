import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const skill = readFileSync(new URL("../SKILL.md", import.meta.url), "utf8");

test("treats natural ShareBit share commands as preview requests", () => {
  assert.match(skill, /standalone `sharebit`/i);
  assert.match(skill, /“share it”/i);
  assert.match(skill, /“share this”/i);
  assert.match(skill, /“share it on\s+the web”/i);
  assert.match(skill, /incidental mentions.*not.*share request/is);
});

test("requires approval after the preview before upload", () => {
  assert.match(skill, /show a preview/i);
  assert.match(skill, /separate explicit approval/i);
});
