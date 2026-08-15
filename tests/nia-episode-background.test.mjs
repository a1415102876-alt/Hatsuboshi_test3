import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const kotoneRoute = readFileSync(new URL("../nia/routes/fujita-kotone.js", import.meta.url), "utf8");

test("Kotone episode 12 uses the Saki bedroom scene and resolves it against the asset base", () => {
  assert.match(kotoneRoute, /episode: 12[\s\S]*background: "\.\/assets\/scenes\/Saki_Bedroom\.png"/);
  assert.match(app, /const rawBgUrl = getSceneBackground\(\);[\s\S]*new URL\(rawBgUrl, window\.HATSU_ASSET_BASE \|\| document\.baseURI\)/);
});
