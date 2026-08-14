import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const htmlSource = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("producer profile includes gender in state, form, save flow, and prompts", () => {
  assert.match(appSource, /producer:\s*\{[\s\S]*gender:\s*""/);
  assert.match(appSource, /state\.producer = \{[\s\S]*gender:\s*""/);
  assert.match(appSource, /- 性别：\$\{state\.producer\.gender \|\| "由 AI 自行发挥"\}/);
  assert.match(appSource, /prodGenderInput/);
  assert.match(appSource, /modalProdGender/);
  assert.match(htmlSource, /id="prodGenderInput"/);
});

test("extra producer background placeholder no longer suggests old graduate", () => {
  const settingsLine = htmlSource.match(/<textarea id="prodSettingsInput"[\s\S]*?<\/textarea>/)?.[0] || "";
  assert.doesNotMatch(settingsLine, /老毕业生/);
});
