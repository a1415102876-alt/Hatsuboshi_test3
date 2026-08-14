import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const appJs = readFileSync(join(root, "app.js"), "utf8");
const html = readFileSync(join(root, "index.html"), "utf8");

assert.match(appJs, /gameMode:\s*"classic"/);
assert.match(appJs, /HYBRID_FACILITY_LESSON_LOCATIONS/);
assert.match(appJs, /HYBRID_FACILITY_TRAINING_LOCATIONS = \[[^\]]*"special_education"/);
assert.match(appJs, /HYBRID_FACILITY_LESSON_LOCATIONS = \["idol_classroom", "producer_classroom"\]/);
assert.match(appJs, /HYBRID_FACILITY_ACTION_MINUTES\s*=\s*60/);
assert.match(appJs, /function enterHybridCampus\(/);
assert.match(appJs, /function openHybridFacility\(/);
assert.match(appJs, /function isHybridFacilityActive\(/);
assert.match(appJs, /dataset\.action === "campus_map_return"/);
assert.match(html, /id="hybridCampusExitBtn"/);
assert.match(appJs, /function startSandboxAsariOpening\(/);

console.log("hybrid-campus.test.mjs passed");
