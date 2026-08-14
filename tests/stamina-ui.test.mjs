import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const appSource = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
const htmlSource = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const cssSource = fs.readFileSync(new URL("../style.css", import.meta.url), "utf8");

test("stamina HUD uses the supplied art with a dynamic fill and current/max value", () => {
  assert.match(htmlSource, /class="stamina-art" src="\.\/UI\/stamina\.png"/);
  assert.match(htmlSource, /id="staminaFill"/);
  assert.match(htmlSource, /id="staminaValue"/);
  assert.match(htmlSource, /<small>\/100<\/small>/);
  assert.match(appSource, /getElementById\("staminaFill"\)\.style\.width = `\$\{clamp\(state\.stamina, 0, 100\)\}%`/);
  assert.match(cssSource, /\.stamina-art/);
  assert.match(cssSource, /\.stamina-track/);
  assert.match(cssSource, /\.stamina-fill/);
});
