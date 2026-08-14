import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../style.css", import.meta.url), "utf8");

test("apartment wardrobe trigger follows the right-side phone action", () => {
  const hotspots = html.match(/<div class="producer-apartment-hotspots"[\s\S]*?<\/div>/)?.[0] || "";
  const summaryIndex = hotspots.indexOf('id="apartmentDaySummaryBtn"');
  const phoneIndex = hotspots.indexOf('id="apartmentPhoneBtn"');
  const wardrobeIndex = hotspots.indexOf('id="apartmentWardrobeBtn"');

  assert.ok(summaryIndex >= 0 && summaryIndex < phoneIndex);
  assert.ok(phoneIndex < wardrobeIndex);
  assert.match(
    hotspots,
    /id="apartmentWardrobeBtn"[\s\S]*?<span class="apartment-hotspot-kicker">衣柜<\/span>[\s\S]*?<strong>立绘衣柜<\/strong>/
  );
  assert.match(
    css,
    /#apartmentWardrobeBtn\s*\{[^}]*right:\s*4%;[^}]*bottom:\s*calc\(10% \+ env\(safe-area-inset-bottom\)\)/
  );
});
