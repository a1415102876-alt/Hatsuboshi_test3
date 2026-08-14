import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../app.js", import.meta.url), "utf8");

function readFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const next = source.indexOf("\n  function ", start + 1);
  return source.slice(start, next === -1 ? source.length : next);
}

test("produce outing scene background uses destination scene mapping", () => {
  const fn = readFunction("getSceneBackground");
  assert.match(fn, /action === "outing"/);
  assert.match(fn, /context\.actionContext\?\.destination/);
  assert.match(fn, /OUTING_DESTINATION_SCENES\[destination\]/);
});

test("off-campus destination background is not polluted by stale outing scene facility", () => {
  const sandbox = {
    FREE_MODE_OUTING_LOCATION_ID: "free_outing",
    DEFAULT_OUTING_SCENE: "./assets/scenes/default.png",
    WORLD_MAP_LOCATION_SCENES: {},
    OUTING_DESTINATION_SCENES: { "甜品店": "./assets/scenes/Dessert_Cafe.png" },
    isFreeModeOffCampusExplore: (actionContext) => actionContext?.locationId === "free_outing" || Boolean(actionContext?.isOffCampus),
    getActiveFreeModeOutingFacility: () => ({ image: "./assets/scenes/Shopping_Mall_Entrance.png" })
  };
  vm.runInNewContext(`${readFunction("getMapLocationSceneBackground")}`, sandbox);

  assert.equal(
    sandbox.getMapLocationSceneBackground({
      locationId: "free_outing",
      locationName: "甜品店",
      outingDestination: "甜品店",
      isOffCampus: true
    }),
    "./assets/scenes/Dessert_Cafe.png"
  );
});