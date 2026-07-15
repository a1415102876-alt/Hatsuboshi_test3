import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");

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

function getDayKey({ sandbox = false, hybrid = false, unlocked = false, day = 1, postLiveDay = 1 } = {}) {
  const context = {
    state: { day, freeMode: { postLiveDay } },
    isSandboxLaunch: () => sandbox,
    isHybridCampusMode: () => hybrid,
    isFreeModeUnlocked: () => unlocked,
    HatsuWorld: { dailyTick: { getDayKey: (state) => `live+${state.freeMode.postLiveDay}` } }
  };
  context.globalThis = context;
  vm.runInNewContext(`${readFunction("getWorldFeedDayKey")}; this.getDayKey = getWorldFeedDayKey;`, context);
  return context.getDayKey(context.state);
}

test("sandbox and hybrid campus day keys follow postLiveDay instead of produce day", () => {
  assert.equal(getDayKey({ sandbox: true, day: 1, postLiveDay: 2 }), "campus+2");
  assert.equal(getDayKey({ hybrid: true, day: 1, postLiveDay: 4 }), "campus+4");
});

test("produce and unlocked free mode retain their existing day key schemes", () => {
  assert.equal(getDayKey({ day: 3, postLiveDay: 8 }), "produce+3");
  assert.equal(getDayKey({ unlocked: true, day: 22, postLiveDay: 5 }), "live+5");
});
