import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const portraitSource = readFileSync(new URL("../appearance/portrait-wardrobe.js", import.meta.url), "utf8");

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

function loadIntegration() {
  const sandbox = {
    globalThis: null,
    state: {
      producer: { name: "producer-name" },
      appearance: {
        equipped: { producer: { assetId: "asset-1", characterKey: "producer", url: "/user/files/custom.png", source: "user", transform: { scale: 1.2, offsetX: 4, offsetY: -3 } } },
        bindings: { producer: { aliases: ["custom-coach"] } }
      }
    },
    idols: { "idol-a": { background: "./assets/idol-a.png" } },
    vnStandees: {
      "idol-a": "./assets/novel-standees/idol-a.png",
      "亚纱里老师": "./assets/novel-standees/asari-sensei.png"
    },
    canonicalIdolName: (name) => name === "alias-a" ? "idol-a" : name,
    resolveIdolStandeeSrc: (name) => name === "idol-a" ? "./assets/novel-standees/idol-a.png" : "",
    portraitWardrobeState: { invalidUrls: new Set() },
    saveCalls: 0,
    saveState: () => { sandbox.saveCalls += 1; }
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(portraitSource, sandbox);
  vm.runInNewContext([
    readFunction("getBuiltinPortraitMap"),
    readFunction("resolvePortraitForSpeaker"),
    readFunction("applyResolvedPortraitToImage"),
    readFunction("handlePortraitImageError"),
    "this.api = { getBuiltinPortraitMap, resolvePortraitForSpeaker, applyResolvedPortraitToImage, handlePortraitImageError };"
  ].join("\n"), sandbox);
  return sandbox;
}

function fakeImage() {
  const properties = new Map();
  return {
    src: "",
    dataset: {},
    style: { setProperty: (key, value) => properties.set(key, value) },
    properties
  };
}

test("speaker resolver maps producer aliases and canonical idol names", () => {
  const sandbox = loadIntegration();
  assert.equal(sandbox.api.resolvePortraitForSpeaker("P").url, "/user/files/custom.png");
  assert.equal(sandbox.api.resolvePortraitForSpeaker("producer-name").url, "/user/files/custom.png");
  assert.equal(sandbox.api.resolvePortraitForSpeaker("CUSTOM-COACH").url, "/user/files/custom.png");
  assert.equal(sandbox.api.resolvePortraitForSpeaker("alias-a").url, "./assets/novel-standees/idol-a.png");
  assert.equal(sandbox.api.resolvePortraitForSpeaker("unknown").url, "");
});

test("speaker resolver preserves built-in VN portraits for non-idol NPCs", () => {
  const sandbox = loadIntegration();
  const resolved = sandbox.api.resolvePortraitForSpeaker("亚纱里老师");
  assert.equal(resolved.characterKey, "npc:亚纱里老师");
  assert.equal(resolved.url, "./assets/novel-standees/asari-sensei.png");
  assert.equal(resolved.source, "builtin");
  assert.equal(sandbox.api.resolvePortraitForSpeaker("未知老师").url, "");
});

test("resolved portrait applies source transform and fallback metadata", () => {
  const sandbox = loadIntegration();
  const image = fakeImage();
  sandbox.api.applyResolvedPortraitToImage(image, sandbox.api.resolvePortraitForSpeaker("P"));
  assert.equal(image.src, "/user/files/custom.png");
  assert.equal(image.properties.get("--portrait-scale"), "1.2");
  assert.equal(image.properties.get("--portrait-x"), "4px");
  assert.equal(image.properties.get("--portrait-y"), "-3px");
  assert.equal(image.dataset.portraitFallbackUrl, "./assets/novel-standees/producer.png");
});

test("image error falls back once without saving or mutating library", () => {
  const sandbox = loadIntegration();
  const image = fakeImage();
  sandbox.api.applyResolvedPortraitToImage(image, sandbox.api.resolvePortraitForSpeaker("P"));
  assert.equal(sandbox.api.handlePortraitImageError(image, "P"), true);
  assert.equal(image.src, "./assets/novel-standees/producer.png");
  assert.equal(sandbox.portraitWardrobeState.invalidUrls.has("/user/files/custom.png"), true);
  assert.equal(sandbox.api.handlePortraitImageError(image, "P"), false);
  assert.equal(sandbox.saveCalls, 0);
});

test("VN and apartment standees use the unified portrait resolver", () => {
  const vn = readFunction("renderVnSlide");
  const apartment = readFunction("renderProducerApartmentStage");
  assert.match(vn, /resolvePortraitForSpeaker\(slide\.speaker\)/);
  assert.match(vn, /applyResolvedPortraitToImage/);
  assert.match(apartment, /resolvePortraitForSpeaker\(companion\)/);
  assert.match(apartment, /applyResolvedPortraitToImage/);
});

test("portrait resolver remains limited to two approved render sites", () => {
  const calls = appSource.match(/resolvePortraitForSpeaker\((?!speaker\))/g) || [];
  assert.equal(calls.length, 2);
  assert.doesNotMatch(readFunction("renderPhoneHome"), /resolvePortraitForSpeaker/);
  assert.doesNotMatch(readFunction("renderWorldMap"), /resolvePortraitForSpeaker/);
});
