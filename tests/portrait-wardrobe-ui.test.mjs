import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../style.css", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");

function readFunction(name) {
  const start = appSource.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `${name} must exist`);
  const bodyStart = appSource.indexOf("{", appSource.indexOf(")", start));
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = bodyStart; index < appSource.length; index += 1) {
    const character = appSource[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'" || character === "`") quote = character;
    else if (character === "{") depth += 1;
    else if (character === "}" && --depth === 0) return appSource.slice(start, index + 1);
  }
  throw new Error(`Could not parse ${name}`);
}

test("apartment wardrobe exposes every required control id", () => {
  const ids = [
    "apartmentWardrobeBtn", "portraitWardrobeOverlay", "portraitWardrobeCloseBtn",
    "portraitWardrobeCharacters", "portraitWardrobeStage", "portraitWardrobePreview",
    "portraitWardrobeAssets", "portraitWardrobeFileInput", "portraitWardrobeNameInput",
    "portraitWardrobeScale", "portraitWardrobeOffsetX", "portraitWardrobeOffsetY",
    "portraitWardrobeResetBtn", "portraitWardrobeRestoreBtn", "portraitWardrobeArchiveBtn",
    "portraitWardrobeApplyBtn", "portraitWardrobeStatus"
  ];
  ids.forEach((id) => assert.match(html, new RegExp(`id=["']${id}["']`), `${id} must exist`));
});

test("wardrobe uses the approved responsive fitting-room background", () => {
  assert.match(css, /Wardrobe_Fitting_Room\.png/);
  assert.match(css, /background-position:\s*center 48%/);
  assert.match(css, /@media\s*\(max-width:\s*700px\)[\s\S]*background-position:\s*49% center/);
  assert.match(css, /--portrait-scale/);
  assert.match(css, /min-height:\s*455px/);
  assert.match(css, /min-height:\s*340px/);
});

test("wardrobe character options include producer and assigned known idols only", () => {
  const sandbox = {
    state: { idol: "idol-a", sandbox: { producedIdols: ["idol-b", "idol-a", "unknown"] } },
    idols: { "idol-a": {}, "idol-b": {}, "idol-c": {} },
    canonicalIdolName: (name) => name
  };
  vm.runInNewContext(`${readFunction("getWardrobeCharacterOptions")}; this.run = getWardrobeCharacterOptions;`, sandbox);
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.run())), [
    { characterKey: "producer", label: "\u5236\u4f5c\u4eba", type: "producer" },
    { characterKey: "idol:idol-a", label: "idol-a", type: "idol" },
    { characterKey: "idol:idol-b", label: "idol-b", type: "idol" }
  ]);
});

test("wardrobe has explicit open restore archive and latest-index archive flow", () => {
  ["openPortraitWardrobe", "renderPortraitWardrobe", "setPortraitWardrobeCharacter", "restoreBuiltinPortrait", "archiveSelectedPortrait", "requestPortraitLibraryRefresh"].forEach((name) => readFunction(name));
  const archiveSource = readFunction("archiveSelectedPortrait");
  assert.match(archiveSource, /readLibrary/);
  assert.doesNotMatch(archiveSource, /delete/i);
  assert.match(appSource, /archive_read_back/);
  assert.match(appSource, /archived\s*!==\s*true/);
});

test("portrait data module loads before the app", () => {
  assert.ok(html.indexOf("appearance/portrait-wardrobe.js") < html.indexOf("./app.js"));
});
