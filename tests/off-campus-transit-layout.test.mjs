import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../app.js", import.meta.url), "utf8");

function readFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const next = source.indexOf("\n  function ", start + 1);
  return source.slice(start, next === -1 ? source.length : next);
}

function readTransitStation(id) {
  const match = source.match(new RegExp(`\\{\\s*id: "${id}",[\\s\\S]*?\\n    \\}`));
  assert.ok(match, `${id} station must exist`);
  const x = match[0].match(/x: (\d+)/);
  const y = match[0].match(/y: (\d+)/);
  assert.ok(x, `${id} station must have x`);
  assert.ok(y, `${id} station must have y`);
  return { x: Number(x[1]), y: Number(y[1]) };
}

test("home branch renders below the main off-campus transit line", () => {
  const mall = readTransitStation("shopping_mall");
  const sakiHome = readTransitStation("saki_home");
  const chinaHome = readTransitStation("china_home");

  assert.match(readFunction("renderOffCampusTransitMap"), /linePath\(\["shopping_mall", "saki_home", "china_home"\]\)/);
  assert.ok(sakiHome.y > mall.y, "saki home should render below the main transit line");
  assert.ok(chinaHome.y > mall.y, "china home should render below the main transit line");
  assert.equal(sakiHome.y, chinaHome.y, "home stations should share a horizontal branch");
  assert.ok(chinaHome.x > sakiHome.x, "china home should sit to the right of saki home");
});

test("Kuramoto home is an open residential station", () => {
  const station = source.match(/\{\s*id: "china_home",[\s\S]*?\n    \}/)?.[0] || "";
  assert.match(station, /name: "仓本家"/);
  assert.match(station, /status: "open"/);
  assert.doesNotMatch(station, /status: "locked"/);
});
