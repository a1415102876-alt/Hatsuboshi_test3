import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

function readFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const signatureEnd = source.indexOf(")", start);
  const bodyStart = source.indexOf("{", signatureEnd);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`Could not parse ${name}`);
}

test("N.I.A inheritance page offers optional relationship, promises, and memories", () => {
  assert.match(html, /id="niaInheritancePanel"/);
  assert.match(html, /id="niaInheritanceAffinity"/);
  assert.match(html, /现在的关系（选填）/);
  assert.match(html, /重要约定（选填）/);
  assert.match(html, /珍贵回忆（选填）/);
  assert.doesNotMatch(html, /id="nia(?:Relationship|Promises|Memories)Input"[^>]*required/);
  assert.match(html, /id="niaInheritanceConfirmBtn"/);
});

test("N.I.A affinity and continuity come from the selected route", () => {
  const ensure = readFunction("ensureNiaInheritedAffinity");
  const build = readFunction("buildNiaAffinityContext");
  assert.match(ensure, /getCurrentNiaRoute\(\)/);
  assert.match(ensure, /route\.inheritedAffinity\?\.value/);
  assert.match(build, /inherited\.relationship/);
  assert.match(build, /inherited\.promises/);
  assert.match(build, /inherited\.memories/);
  assert.match(build, /inherited\.affinityTag/);
});

test("final host dispatch appends the shared inheritance context once", () => {
  const wrapper = readFunction("withNiaAffinityContext");
  const request = readFunction("requestHostPromptSend");
  assert.match(wrapper, /prompt\.includes\("【N\.I\.A 继承关系】"\)/);
  assert.match(request, /ensureNiaInheritedAffinity\(\)/);
  assert.match(request, /withNiaAffinityContext\(rawPrompt\)/);
  assert.doesNotMatch(request, /AFF_SAKI_100/);
});

test("new routes require confirmation while started legacy saves are migrated", () => {
  const normalize = readFunction("normalizeNiaState");
  const opening = readFunction("startNiaOpeningStory");
  assert.match(normalize, /legacyRouteStarted/);
  assert.match(normalize, /confirmed:\s*Boolean\(inheritedSource\?\.confirmed\)/);
  assert.match(opening, /!state\.nia\.inheritedContext\.confirmed/);
  assert.match(opening, /openNiaInheritancePanel\(\)/);
});

test("confirmed inheritance is saved before N.I.A opening", () => {
  const complete = readFunction("completeNiaProducerSetup");
  assert.match(complete, /relationship\.slice\(0, 2000\)/);
  assert.match(complete, /promises\.slice\(0, 2000\)/);
  assert.match(complete, /memories\.slice\(0, 2000\)/);
  assert.match(complete, /confirmed:\s*true/);
  assert.doesNotMatch(complete, /if \(!relationship \|\| !promises \|\| !memories\)/);
  assert.match(complete, /saveState\("nia\.contract_signed"\)/);
  assert.match(complete, /startNiaOpeningStory\("确认前情并签署 N\.I\.A 合约"\)/);
});
