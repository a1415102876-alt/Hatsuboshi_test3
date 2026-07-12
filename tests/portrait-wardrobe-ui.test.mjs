import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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
    "portraitWardrobeApplyBtn", "portraitWardrobeStatus", "portraitWardrobeAliasEditor",
    "portraitWardrobeAliasTags", "portraitWardrobeAliasInput", "portraitWardrobeAliasAddBtn", "portraitWardrobeAliasSaveBtn"
  ];
  ids.forEach((id) => assert.match(html, new RegExp(`id=["']${id}["']`), `${id} must exist`));
});

test("wardrobe user-facing labels are localized to Chinese", () => {
  [
    "立绘衣柜", "立绘 / 换装", "试衣预览", "立绘库", "重置位置",
    "选择 PNG / WebP / JPEG", "立绘名称", "触发名称", "保存名称",
    "输入正文中的发言者名称", "添加", "缩放", "水平位置", "垂直位置",
    "恢复默认", "归档"
  ].forEach((label) => assert.match(html, new RegExp(label), `${label} must exist`));
  assert.doesNotMatch(html, /LOOK ROOM|LOOK LIBRARY|SPEAKER NAMES|APPLY LOOK/);
});

test("alias add button and Enter use one submit function", () => {
  readFunction("submitProducerPortraitAliasInput");
  assert.match(appSource, /portraitWardrobeAliasAddBtn/);
  const eventStart = appSource.indexOf('document.getElementById("portraitWardrobeAliasInput")');
  const eventEnd = appSource.indexOf('document.getElementById("portraitWardrobeScale")', eventStart);
  const calls = appSource.slice(eventStart, eventEnd).match(/submitProducerPortraitAliasInput\(\)/g) || [];
  assert.equal(calls.length, 2);
});
test("wardrobe uses the approved responsive fitting-room background", () => {
  assert.equal(existsSync(new URL("../assets/scenes/Wardrobe_Fitting_Room.png", import.meta.url)), true);
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

function loadAliasController() {
  const sandbox = {
    globalThis: null,
    state: {
      producer: { name: "Profile Name" },
      appearance: { schemaVersion: 2, equipped: {}, bindings: { producer: { aliases: ["Coach"] } } }
    },
    idols: { "idol-a": {} },
    canonicalIdolName: (name) => name,
    portraitWardrobeState: { selectedCharacterKey: "producer", draftProducerAliases: ["Coach"] },
    saveReasons: [],
    saveState: (reason) => sandbox.saveReasons.push(reason),
    renderPortraitWardrobe() {}
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(readFileSync(new URL("../appearance/portrait-wardrobe.js", import.meta.url), "utf8"), sandbox);
  vm.runInNewContext([
    readFunction("getDefaultProducerPortraitAliases"),
    readFunction("addProducerPortraitAlias"),
    readFunction("removeProducerPortraitAlias"),
    readFunction("saveProducerPortraitAliases"),
    "this.aliases = { getDefaultProducerPortraitAliases, addProducerPortraitAlias, removeProducerPortraitAlias, saveProducerPortraitAliases };"
  ].join("\n"), sandbox);
  return sandbox;
}

test("producer alias editor validates conflicts and saves independently", () => {
  const sandbox = loadAliasController();
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.aliases.getDefaultProducerPortraitAliases())), ["\u5236\u4f5c\u4eba", "P", "producer", "producer-san", "Profile Name"]);
  assert.equal(sandbox.aliases.addProducerPortraitAlias("idol-a").error, "idol_conflict");
  assert.deepEqual(sandbox.portraitWardrobeState.draftProducerAliases, ["Coach"]);
  assert.equal(sandbox.aliases.addProducerPortraitAlias("Director").ok, true);
  assert.equal(sandbox.aliases.removeProducerPortraitAlias("Coach"), true);
  assert.equal(sandbox.aliases.saveProducerPortraitAliases(), true);
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.state.appearance.bindings.producer.aliases)), ["Director"]);
  assert.deepEqual(sandbox.saveReasons, ["portrait.aliases"]);
});

test("producer alias editor is hidden for idol wardrobe tabs", () => {
  const render = readFunction("renderPortraitWardrobe");
  assert.match(render, /portraitWardrobeAliasEditor/);
  assert.match(render, /characterKey\s*===\s*["']producer["']/);
});
