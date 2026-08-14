import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const portraitSource = readFileSync(new URL("../appearance/portrait-wardrobe.js", import.meta.url), "utf8");
const expressionSource = readFileSync(new URL("../appearance/portrait-expression-presets.js", import.meta.url), "utf8");

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
        equipped: {
          producer: { assetId: "asset-1", characterKey: "producer", url: "/user/files/custom.png", source: "user", transform: { scale: 1.2, offsetX: 4, offsetY: -3 } },
          "idol:花海咲季": { assetId: "asset-saki", characterKey: "idol:花海咲季", url: "/user/files/custom-saki.png", source: "user", transform: { scale: 1.45, offsetX: 18, offsetY: -12 } }
        },
        bindings: { producer: { aliases: ["custom-coach"] } }
      }
    },
    idols: {
      "idol-a": { background: "./assets/idol-a.png" },
      "花海咲季": { background: "./assets/idols/hanami-saki.png" },
      "藤田琴音": { background: "./assets/idols/fujita-kotone.png" }
    },
    vnStandees: {
      "idol-a": "./assets/novel-standees/idol-a.png",
      "花海咲季": "./assets/novel-standees/hanami-saki.png",
      "亚纱里老师": "./assets/novel-standees/asari-sensei.png",
      "真诚优": "./assets/novel-standees/mashiro-yu.png",
  "贺阳燐羽": "./assets/novel-standees/kaya-rinha.png"
    },
    vnSpeakerAliases: {
      "亚纱里": "亚纱里老师",
      "根绪亚纱里": "亚纱里老师",
      "优": "真诚优",
      "优前辈": "真诚优",
      "Mashiro Yu": "真诚优",
      "燐羽": "贺阳燐羽",
      "贺阳": "贺阳燐羽"
    },
    canonicalIdolName: (name) => name === "alias-a" ? "idol-a" : name,
    resolveIdolStandeeSrc: (name) => ({
      "idol-a": "./assets/novel-standees/idol-a.png",
      "花海咲季": "./assets/novel-standees/hanami-saki.png",
      "藤田琴音": "./assets/novel-standees/fujita-kotone.png"
    }[name] || ""),
    portraitWardrobeState: { invalidUrls: new Set() },
    saveCalls: 0,
    saveState: () => { sandbox.saveCalls += 1; }
  };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  sandbox.document = { baseURI: "http://local.test/" };
  sandbox.HATSU_RESOLVE_ASSET_URL = (path) => `resolved:${path}`;
  vm.runInNewContext(expressionSource, sandbox);
  vm.runInNewContext(portraitSource, sandbox);
  vm.runInNewContext([
    readFunction("getBuiltinPortraitMap"),
    readFunction("resolvePortraitForSpeaker"),
    readFunction("resolvePortraitForSpeakerVisualCue"),
    readFunction("applyResolvedPortraitToImage"),
    readFunction("handlePortraitImageError"),
    "this.api = { getBuiltinPortraitMap, resolvePortraitForSpeaker, resolvePortraitForSpeakerVisualCue, applyResolvedPortraitToImage, handlePortraitImageError };"
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
  for (const speaker of ["亚纱里老师", "亚纱里", "根绪亚纱里"]) {
    const resolved = sandbox.api.resolvePortraitForSpeaker(speaker);
    assert.equal(resolved.characterKey, "npc:亚纱里老师");
    assert.equal(resolved.url, "./assets/novel-standees/asari-sensei.png");
    assert.equal(resolved.source, "builtin");
  }
  assert.match(appSource, /"亚纱里":\s*"亚纱里老师"/);
  assert.match(appSource, /"根绪亚纱里":\s*"亚纱里老师"/);
  assert.equal(sandbox.api.resolvePortraitForSpeaker("未知老师").url, "");
});

test("Kanae has a built-in NPC standee", () => {
  assert.match(appSource, /"冰渡香名江": "\.\/assets\/novel-standees\/Hiwatari-Kanae\.png"/);
  assert.equal(existsSync(new URL("../assets/novel-standees/Hiwatari-Kanae.png", import.meta.url)), true);
});

test("Mashiro Yu speaker names share the approved built-in standee", () => {
  const sandbox = loadIntegration();
  for (const speaker of ["真诚优", "优", "优前辈", "Mashiro Yu"]) {
    const resolved = sandbox.api.resolvePortraitForSpeaker(speaker);
    assert.equal(resolved.characterKey, "npc:真诚优");
    assert.equal(resolved.url, "./assets/novel-standees/mashiro-yu.png");
    assert.equal(resolved.source, "builtin");
  }
  assert.equal(sandbox.api.resolvePortraitForSpeaker("优秀学生").url, "");
  assert.equal(existsSync(new URL("../assets/novel-standees/mashiro-yu.png", import.meta.url)), true);
});

test("Rinha speaker names share the supplied built-in standee", () => {
  const sandbox = loadIntegration();
  for (const speaker of ["贺阳燐羽", "燐羽", "贺阳"]) {
    const resolved = sandbox.api.resolvePortraitForSpeaker(speaker);
    assert.equal(resolved.characterKey, "npc:贺阳燐羽");
  assert.equal(resolved.url, "./assets/novel-standees/kaya-rinha.png");
    assert.equal(resolved.source, "builtin");
  }
  assert.equal(existsSync(new URL("../assets/novel-standees/kaya-rinha.png", import.meta.url)), true);
  assert.match(appSource, /"贺阳燐羽": "\.\/assets\/novel-standees\/kaya-rinha\.png"/);
  assert.match(appSource, /"燐羽": "贺阳燐羽"/);
  assert.match(appSource, /"贺阳": "贺阳燐羽"/);
  assert.equal(sandbox.api.resolvePortraitForSpeaker("姬崎莉波").url, "");
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

test("expression preset image errors fall back to the normal portrait", () => {
  const sandbox = loadIntegration();
  const image = fakeImage();
  sandbox.api.applyResolvedPortraitToImage(image, {
    speaker: "花海咲季(被夸陶醉)",
    characterKey: "idol:花海咲季",
    source: "preset",
    url: "./assets/novel-standees/Saki_Standees_Altered/praise_delighted.png",
    fallbackUrl: "./assets/novel-standees/hanami-saki.png",
    transform: { scale: 1, offsetX: 0, offsetY: 0 }
  });
  assert.equal(sandbox.api.handlePortraitImageError(image, "花海咲季(被夸陶醉)"), true);
  assert.equal(image.src, "./assets/novel-standees/hanami-saki.png");
});

test("expression presets ignore custom portrait transforms and fall back to the built-in standee", () => {
  const sandbox = loadIntegration();
  const visual = sandbox.api.resolvePortraitForSpeakerVisualCue("花海咲季(被夸陶醉)");
  assert.equal(visual.portrait.url, "resolved:./assets/novel-standees/Saki_Standees_Altered/praise_delighted.png");
  assert.equal(visual.portrait.fallbackUrl, "./assets/novel-standees/hanami-saki.png");
  assert.deepEqual({ ...visual.portrait.transform }, { scale: 1, offsetX: 0, offsetY: 0 });
});

test("Kotone expression presets resolve through VN with the base standee as fallback", () => {
  const sandbox = loadIntegration();
  const visual = sandbox.api.resolvePortraitForSpeakerVisualCue("藤田琴音(俏皮推销)");
  assert.equal(visual.speaker, "藤田琴音");
  assert.equal(visual.portrait.url, "resolved:./assets/novel-standees/Kotone_Standees_Altered/playful_sales_pitch.png");
  assert.equal(visual.portrait.fallbackUrl, "./assets/novel-standees/fujita-kotone.png");
});

test("VN uses expression-aware portraits while apartment standees use the base resolver", () => {
  const vn = readFunction("renderVnSlide");
  const apartment = readFunction("renderProducerApartmentStage");
  assert.match(vn, /getDefaultSpeakerVisualCue\?\.\(slide\.speaker\)/);
  assert.match(vn, /resolvePortraitForSpeakerVisualCue\(visualSpeaker\)/);
  assert.match(vn, /nameplateEl\.textContent\s*=\s*visual\.speaker/);
  assert.match(vn, /canonicalIdolName\(visual\.speaker\)/);
  assert.match(vn, /applyResolvedPortraitToImage/);
  assert.match(apartment, /resolvePortraitForSpeaker\(companion\)/);
  assert.match(apartment, /applyResolvedPortraitToImage/);
});

test("dynamic idol VN standees resolve through the host asset resolver", () => {
  const resolver = readFunction("resolveIdolStandeeSrc");

  assert.match(resolver, /HATSU_RESOLVE_ASSET_URL/);
  assert.match(resolver, /assets\/novel-standees\/\$\{baseName\}/);
  assert.match(resolver, /window\.HATSU_ASSET_BASE \|\| document\.baseURI/);
  assert.match(resolver, /new URL\(profile\.background, document\.baseURI\)\.pathname/);
});

test("portrait fallback is armed before assigning an image source", () => {
  const apply = readFunction("applyResolvedPortraitToImage");

  assert.ok(apply.indexOf("img.onerror =") < apply.indexOf("img.src ="));
});

test("base portrait resolver remains limited to apartment, outing, and N.I.A live render sites", () => {
  const calls = appSource.match(/resolvePortraitForSpeaker\((?!speaker\))/g) || [];
  assert.equal(calls.length, 3);
  assert.match(readFunction("renderNiaLiveBusiness"), /resolvePortraitForSpeaker/);
  assert.doesNotMatch(readFunction("renderPhoneHome"), /resolvePortraitForSpeaker/);
  assert.doesNotMatch(readFunction("renderWorldMap"), /resolvePortraitForSpeaker/);
});
