import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const appSource = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
const cssSource = fs.readFileSync(new URL("../style.css", import.meta.url), "utf8");

test("stat meters use mini icons, CSS progress rings, and the rating sprite sheet", () => {
  assert.match(appSource, /Vo:\s*"UI\/Vo_Mini\.png"/);
  assert.match(appSource, /Da:\s*"UI\/Da_Mini\.png"/);
  assert.match(appSource, /Vi:\s*"UI\/Vi_mini\.png"/);
  assert.match(appSource, /const ratingSpriteImage = "UI\/rating-sprite-sheet\.png"/);
  assert.match(appSource, /const ratingSpriteOffsets = \{/);
  assert.match(appSource, /"B":\s*\[8\.9, -3\.0\]/);
  assert.match(appSource, /class="meter-rank"/);
  assert.match(appSource, /--rank-image:url\('\$\{ratingSpriteUrl\}'\)/);
  assert.match(appSource, /--rank-shift-x:\$\{rankShiftX\}%;--rank-shift-y:\$\{rankShiftY\}%/);
  assert.match(appSource, /class="meter-mini-icon"/);
  assert.match(appSource, /const meterProgress = pct \* 0\.75/);
  assert.match(appSource, /card\.style\.setProperty\("--meter-progress", String\(meterProgress\)\)/);
  assert.match(appSource, /<svg class="meter-ring" viewBox="0 0 112 112"/);
  assert.match(appSource, /class="meter-ring-outline"[^>]+pathLength="100"/);
  assert.match(appSource, /class="meter-ring-track"[^>]+pathLength="100"/);
  assert.match(appSource, /class="meter-ring-progress"[^>]+pathLength="100"/);
  assert.match(cssSource, /background-image:\s*var\(--rank-image\)/);
  assert.match(cssSource, /\.meter-ring-outline\s*\{[^}]*stroke:\s*rgba\(255, 255, 255, 0\.9\)[^}]*stroke-width:\s*20[^}]*stroke-dasharray:\s*75 25/s);
  assert.match(cssSource, /\.meter-ring-track\s*\{[^}]*stroke-dasharray:\s*75 25/s);
  assert.match(cssSource, /\.meter-ring-progress\s*\{[^}]*stroke-dasharray:\s*var\(--meter-progress\) 100/s);
  assert.match(cssSource, /stroke-linecap:\s*round/);
  assert.match(cssSource, /\.meter-ring\s*\{[^}]*transform-origin:\s*center[^}]*rotate\(135deg\)/s);
  assert.match(cssSource, /\.meter-rank\s*\{[^}]*inset:\s*10px[^}]*translate\(var\(--rank-shift-x\), var\(--rank-shift-y\)\)/s);
  assert.doesNotMatch(cssSource, /\.meter-arc\s*\{[^}]*conic-gradient/s);
  assert.match(cssSource, /background-size:\s*400% 400%/);
});
