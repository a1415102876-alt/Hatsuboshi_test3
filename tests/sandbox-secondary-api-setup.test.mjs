import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../style.css", import.meta.url), "utf8");

function readFunction(name) {
  const start = appSource.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const bodyStart = appSource.indexOf("{", start);
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = bodyStart; index < appSource.length; index += 1) {
    const char = appSource[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'" || char === "`") quote = char;
    else if (char === "{") depth += 1;
    else if (char === "}" && --depth === 0) return appSource.slice(start, index + 1);
  }
  throw new Error(`Could not parse ${name}`);
}

function producerSubmitBlock() {
  const start = appSource.indexOf('document.getElementById("producerStartBtn")');
  const end = appSource.indexOf('document.querySelectorAll("[data-modal]")', start);
  assert.ok(start >= 0 && end > start, "producer submit handler must exist");
  return appSource.slice(start, end);
}

test("sandbox launch exposes a dedicated optional secondary API setup panel", () => {
  for (const id of [
    "sandboxApiPanel", "sandboxApiEnabled", "sandboxApiBaseUrl", "sandboxApiModel",
    "sandboxApiKey", "sandboxApiStatus", "sandboxApiTestBtn", "sandboxApiSkipBtn",
    "sandboxApiContinueBtn"
  ]) assert.match(html, new RegExp(`id="${id}"`), `${id} must exist`);
  assert.match(css, /\.sandbox-api-form/);
  assert.match(css, /\.sandbox-api-actions/);
});

test("sandbox producer submission enters recoverable API setup before invite", () => {
  const submit = producerSubmitBlock();
  assert.match(submit, /apiSetupPending:\s*true/);
  assert.match(submit, /pendingIdol:\s*selectedIdol/);
  assert.match(submit, /openSandboxApiSetupPanel\(selectedIdol\)/);
  const sandboxBranch = submit.slice(submit.indexOf("if (isSandboxLaunch())"), submit.indexOf("state.launchMode = \"produce\""));
  assert.doesNotMatch(sandboxBranch, /startSandboxInviteStory/);
});

test("produce mode retains the original opening flow", () => {
  const submit = producerSubmitBlock();
  assert.match(submit, /state\.launchMode = "produce"/);
  assert.match(submit, /startOpeningStory\("签署合约"\)/);
});

test("sandbox API setup functions reuse existing save and test channels", () => {
  assert.match(readFunction("populateSandboxApiSetupForm"), /getSecondaryApiConfig\(\)/);
  assert.match(readFunction("openSandboxApiSetupPanel"), /apiSetupPending:\s*true/);
  assert.match(readFunction("restorePendingSandboxApiSetup"), /state\.sandbox\?\.pendingIdol/);
  assert.match(readFunction("continueSandboxApiSetup"), /saveSandboxApiSetupForm/);
  assert.match(readFunction("continueSandboxApiSetup"), /finishSandboxApiSetup/);
  assert.match(readFunction("skipSandboxApiSetup"), /enabledOverride|false/);
  assert.match(readFunction("testSandboxApiConnection"), /runSecondaryApiTest\(\)/);
  assert.doesNotMatch(readFunction("testSandboxApiConnection"), /finishSandboxApiSetup/);
});

test("setup completion clears pending state before starting the exact pending idol invite", () => {
  const body = readFunction("finishSandboxApiSetup");
  assert.match(body, /pendingIdol/);
  assert.match(body, /apiSetupPending:\s*false/);
  assert.match(body, /pendingIdol:\s*""/);
  assert.match(body, /startSandboxInviteStory\(idol\)/);
  assert.ok(body.indexOf("apiSetupPending: false") < body.indexOf("startSandboxInviteStory(idol)"));
});

test("skip preserves entered fields while only overriding enabled", () => {
  const read = readFunction("readSandboxApiSetupForm");
  for (const field of ["enabled", "baseUrl", "model", "apiKey"]) assert.match(read, new RegExp(field));
  const skip = readFunction("skipSandboxApiSetup");
  assert.match(skip, /saveSandboxApiSetupForm\(false\)/);
  assert.match(skip, /finishSandboxApiSetup\(\)/);
});

test("API test result updates setup status without blocking continuation", () => {
  assert.match(readFunction("updateSandboxApiTestStatus"), /sandboxApiStatus/);
  const replyStart = appSource.indexOf('if (meta.kind === "test")');
  const replyEnd = appSource.indexOf("if (!ok)", replyStart);
  const replyBranch = appSource.slice(replyStart, replyEnd);
  assert.match(replyBranch, /updateSandboxApiTestStatus/);
  assert.doesNotMatch(replyBranch, /sandboxApiContinueBtn[\s\S]*disabled/);
});

