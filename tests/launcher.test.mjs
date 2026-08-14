import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const launcherSource = readFileSync(new URL("../dist/hatsu-launcher/index.js", import.meta.url), "utf8");

test("floating launcher opens the local standalone frontend by default", () => {
  assert.match(launcherSource, /config\.frontendUrl \|\| "\/hatsu-produce-local\/index\.html"/);
  assert.doesNotMatch(launcherSource, /config\.frontendUrl \|\| "\/hatsu-produce-local\/st2\.html"/);
});
