import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const appSource = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
const cssSource = fs.readFileSync(new URL("../style.css", import.meta.url), "utf8");

test("Vo, Da, and Vi training and lesson actions use the supplied image cards", () => {
  assert.match(appSource, /Vo:\s*"UI\/Vo\.png"/);
  assert.match(appSource, /Da:\s*"UI\/Da\.png"/);
  assert.match(appSource, /Vi:\s*"UI\/Vi\.png"/);
  assert.match(appSource, /Vo:\s*"UI\/Lesson_Vo\.png"/);
  assert.match(appSource, /Da:\s*"UI\/Lesson_Da\.png"/);
  assert.match(appSource, /Vi:\s*"UI\/Lesson_Vi\.png"/);
  assert.match(appSource, /"UI\/SP\.png"/);
  assert.match(appSource, /class="sp-badge-image"/);
  assert.match(appSource, /class="training-action-cost">-12</);
  assert.match(appSource, /class="training-action-label">\$\{label\}</);
  assert.match(cssSource, /\.training-action-image/);
  assert.match(cssSource, /\.training-action-cost/);
  assert.match(cssSource, /\.training-action-label/);
  assert.match(cssSource, /\.sp-badge-image/);
  assert.match(appSource, /class="lesson-action-image"/);
  assert.match(appSource, /class="lesson-action-label">\$\{label\}</);
  assert.match(cssSource, /\.lesson-action-image/);
  assert.match(cssSource, /\.lesson-action-label/);
});
