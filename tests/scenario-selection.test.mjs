import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const html = readFileSync(new URL("index.html", root), "utf8");
const app = readFileSync(new URL("app.js", root), "utf8");
const css = readFileSync(new URL("style.css", root), "utf8");

test("N.I.A is selected as a produce scenario instead of a home mode", () => {
  assert.doesNotMatch(html, /id="launchNiaBtn"/);
  assert.match(html, /id="scenarioPanel"/);
  assert.match(html, /data-scenario="hatsu"/);
  assert.match(html, /data-scenario="nia"/);
  assert.match(app, /produceScenario:\s*""/);
  assert.match(app, /function openScenarioSelectionPanel\(/);
  assert.match(app, /function confirmProduceScenario\(/);
});

test("N.I.A is locked for idols without an implemented route", () => {
  assert.match(app, /function isNiaRouteAvailable\(idolName = selectedIdol \|\| state\.idol\)/);
  assert.match(app, /const niaLocked = requestedScenarioId === "nia" && !isNiaRouteAvailable\(selectedIdol\)/);
  assert.match(app, /if \(selectedProduceScenario === "nia" && !isNiaRouteAvailable\(selectedIdol\)\)/);
  assert.match(app, /目前只有花海咲季可以进入 N\.I\.A 育成/);
  assert.match(app, /state\.produceScenario = ""/);
});

test("scenario previews use supplied logos, reserved backgrounds, slogans and CTA labels", () => {
  assert.ok(existsSync(new URL("assets/scenarios/hajime-logo.png", root)));
  assert.ok(existsSync(new URL("assets/scenarios/nia-logo.png", root)));
  assert.match(app, /assets\/scenarios\/hajime-background\.png/);
  assert.match(app, /assets\/scenarios\/nia-background\.png/);
  assert.doesNotMatch(app, /assets\/scenarios\/(?:hajime|nia)-background\.jpg/);
  assert.match(app, /定期公演《初》——那是只有初星学园偶像科中/);
  assert.match(app, /成绩优异者才能站上的舞台。/);
  assert.match(app, /磨砺自身，如今，她们即将绽放光芒——/);
  assert.match(app, /《NEXT IDOL AUDITION》——简称“N\.I\.A”/);
  assert.match(app, /角逐肩负下一代使命的偶像顶点的战斗拉开序幕！/);
  assert.match(app, /聚集粉丝，如今，迈向荣耀的舞台——/);
  assert.match(app, /进入「初」剧本/);
  assert.match(app, /进入「N\.I\.A」剧本/);
  assert.match(css, /\.scenario-preview-logo/);
  assert.match(css, /\.scenario-slogan/);
  assert.match(css, /\.scenario-preview\s*\{[\s\S]{0,500}justify-content:\s*flex-start[\s\S]{0,300}align-items:\s*center/);
  assert.match(css, /\.scenario-preview\s*\{[\s\S]{0,700}text-align:\s*center/);
  assert.match(css, /\.select-visual\.is-scenario-preview \.select-visual-bg::after/);
  assert.doesNotMatch(app, /rgba\(4,26,34,\.84\)|rgba\(38,15,31,\.82\)/);
  assert.match(html, /id="scenarioBackBtn"[\s\S]{0,180}icon-chevron-left/);
  assert.match(css, /\.scenario-back-btn\s*\{[\s\S]{0,400}min-height:\s*44px/);
});

test("produce flow goes from idol to scenario to profile and dispatches the selected route", () => {
  assert.match(app, /confirmIdolBtn[\s\S]{0,300}openScenarioSelectionPanel/);
  assert.match(app, /confirmScenarioBtn[\s\S]{0,300}confirmProduceScenario/);
  assert.match(app, /function openNiaInheritancePanel\(/);
  assert.match(app, /state\.produceScenario === "nia"[\s\S]{0,500}openNiaInheritancePanel/);
  assert.match(app, /state\.produceScenario === "hatsu"[\s\S]{0,500}startOpeningStory\("签署合约"\)/);
});

test("leaving scenario selection removes its CTA and restores the selected idol artwork", () => {
  const resetScenarioPreview = app.match(/function resetScenarioPreview\(\) \{[\s\S]*?\n  \}/)?.[0] || "";
  const openProducerSetupPanel = app.match(/function openProducerSetupPanel\(\) \{[\s\S]*?\n  \}/)?.[0] || "";

  assert.match(resetScenarioPreview, /scenarioConfirmContainer/);
  assert.match(resetScenarioPreview, /style\.display = "none"/);
  assert.match(resetScenarioPreview, /classList\.remove\("is-visible"\)/);
  assert.match(openProducerSetupPanel, /resetScenarioPreview\(\)[\s\S]*applySelectStageBackground\(selectedIdol\)/);
});

test("idol selection artwork resolves dynamic select backgrounds from the configured asset base", () => {
  const start = app.indexOf("function applySelectStageBackground");
  const end = app.indexOf("\n  function ", start + 1);
  const applySelectStageBackground = app.slice(start, end);

  assert.match(applySelectStageBackground, /new URL\(/);
  assert.match(applySelectStageBackground, /assets\/select-bg\/\$\{idolCode\}\$\{ext\}/);
  assert.match(applySelectStageBackground, /window\.HATSU_ASSET_BASE \|\| document\.baseURI/);
});

test("scenario logos reserve at least twice the previous desktop display size", () => {
  assert.match(css, /\.scenario-preview-logo\s*\{[\s\S]{0,300}width:\s*min\(840px,\s*145%\)[\s\S]{0,180}max-height:\s*480px/);
  assert.match(css, /\.select-visual\.is-scenario-nia \.scenario-preview-logo\s*\{[\s\S]{0,180}width:\s*min\(1000px,\s*160%\)[\s\S]{0,120}max-height:\s*380px/);
});

test("N.I.A contract confirmation uses the inheritance panel before transition", () => {
  const handlerStart = app.lastIndexOf('document.getElementById("producerStartBtn")');
  const handlerEnd = app.indexOf('document.getElementById("sandboxApiTestBtn")', handlerStart);
  const producerStartHandler = app.slice(handlerStart, handlerEnd);

  assert.match(producerStartHandler, /state\.produceScenario === "nia"/);
  assert.match(producerStartHandler, /openNiaInheritancePanel/);
  assert.match(app, /function completeNiaProducerSetup\(/);
  assert.match(app, /triggerNiaEntryTransition\(\(\) => startNiaOpeningStory\("确认前情并签署 N\.I\.A 合约"\)\)/);
});
