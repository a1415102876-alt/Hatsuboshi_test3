import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const normalize = (value) => JSON.parse(JSON.stringify(value));

function loadStylesApi() {
  const sandbox = { globalThis: {} };
  sandbox.globalThis = sandbox;
  const source = readFileSync(new URL("../world/storyteller/styles.js", import.meta.url), "utf8");
  vm.runInNewContext(source, sandbox, { filename: "world/storyteller/styles.js" });
  return sandbox.HatsuWorldStorytellerStyles;
}

test("style config defaults to 60 heroic 40 romance and disabled kaibunsho", () => {
  const api = loadStylesApi();
  assert.deepEqual(normalize(api.defaultStyleMix()), { heroic: 60, romance: 40, kaibunsho: 0 });
  assert.deepEqual(normalize(api.defaultStyleConfig("live+1")), {
    schemaVersion: 1,
    activeMix: { heroic: 60, romance: 40, kaibunsho: 0 },
    pendingMix: { heroic: 60, romance: 40, kaibunsho: 0 },
    styleMixRevision: 0,
    activeFromDayKey: "live+1",
    pendingActivationDayKey: "",
    legacyUntilDayChange: false
  });
});

test("old saves defer default style activation until the next day", () => {
  const api = loadStylesApi();
  const migrated = normalize(api.normalizeStyleConfig(null, {
    currentDayKey: "live+4",
    nextDayKey: "live+5",
    existingSave: true
  }));
  assert.equal(migrated.legacyUntilDayChange, true);
  assert.equal(migrated.activeFromDayKey, "");
  assert.equal(migrated.pendingActivationDayKey, "live+5");
  assert.deepEqual(migrated.pendingMix, { heroic: 60, romance: 40, kaibunsho: 0 });
});

test("invalid percentages normalize to the last valid mix", () => {
  const api = loadStylesApi();
  const previous = api.defaultStyleConfig("live+2");
  previous.pendingMix = { heroic: 35, romance: 65, kaibunsho: 0 };
  const normalized = normalize(api.normalizeStyleConfig({
    ...previous,
    pendingMix: { heroic: 63, romance: 50, kaibunsho: 9 }
  }, { currentDayKey: "live+2", previous }));
  assert.deepEqual(normalized.pendingMix, { heroic: 35, romance: 65, kaibunsho: 0 });
});

test("style normalization strips unknown fields and bounds streak state", () => {
  const api = loadStylesApi();
  const config = normalize(api.normalizeStyleConfig({
    schemaVersion: 99,
    activeMix: { heroic: 55, romance: 45, kaibunsho: 0 },
    pendingMix: { heroic: 50, romance: 50, kaibunsho: 0 },
    styleMixRevision: 4,
    activeFromDayKey: "x".repeat(300),
    pendingActivationDayKey: "live+8",
    prompt: "SECRET"
  }));
  assert.equal(config.schemaVersion, 1);
  assert.equal(config.activeFromDayKey.length, 120);
  assert.equal(JSON.stringify(config).includes("SECRET"), false);
  assert.deepEqual(normalize(api.normalizeStyleStreak({
    styleId: "heroic",
    committedCount: 999,
    penaltyArmed: true,
    body: "NARRATIVE"
  })), { styleId: "heroic", committedCount: 99, penaltyArmed: true });
  assert.deepEqual(normalize(api.normalizeStyleStreak({
    styleId: "kaibunsho",
    committedCount: 2,
    penaltyArmed: true
  })), { styleId: "", committedCount: 0, penaltyArmed: false });
});

test("a changed pending mix activates once on its target day", () => {
  const api = loadStylesApi();
  const pending = api.setPendingMix(api.defaultStyleConfig("live+2"), {
    heroic: 35,
    romance: 65,
    kaibunsho: 0
  }, "live+3");
  const early = api.activatePendingMix(pending, "live+2");
  const first = api.activatePendingMix(early.config, "live+3");
  const second = api.activatePendingMix(first.config, "live+3");
  assert.equal(early.activated, false);
  assert.equal(first.activated, true);
  assert.equal(first.config.styleMixRevision, 1);
  assert.deepEqual(normalize(first.config.activeMix), { heroic: 35, romance: 65, kaibunsho: 0 });
  assert.equal(second.activated, false);
  assert.equal(second.config.styleMixRevision, 1);
});

test("migration activation clears legacy mode without inventing a mix revision", () => {
  const api = loadStylesApi();
  const migrated = api.normalizeStyleConfig(null, {
    currentDayKey: "live+4",
    nextDayKey: "live+5",
    existingSave: true
  });
  const activated = api.activatePendingMix(migrated, "live+5");
  assert.equal(activated.activated, true);
  assert.equal(activated.config.legacyUntilDayChange, false);
  assert.equal(activated.config.activeFromDayKey, "live+5");
  assert.equal(activated.config.styleMixRevision, 0);
});

test("next style activation day preserves live campus and produce day-key namespaces", () => {
  const api = loadStylesApi();
  assert.equal(api.getNextDayKey("live+4"), "live+5");
  assert.equal(api.getNextDayKey("campus+9"), "campus+10");
  assert.equal(api.getNextDayKey("produce+21"), "produce+22");
  assert.equal(api.getNextDayKey("invalid"), "");
});

test("eligible style weights renormalize after legality and apply one armed penalty", () => {
  const api = loadStylesApi();
  const onlyHeroic = normalize(api.normalizeEligibleStyleWeights(
    { heroic: 20, romance: 80, kaibunsho: 0 },
    ["heroic"],
    { styleId: "", committedCount: 0, penaltyArmed: false }
  ));
  assert.deepEqual(onlyHeroic.weights, { heroic: 100 });
  const penalized = normalize(api.normalizeEligibleStyleWeights(
    { heroic: 60, romance: 40, kaibunsho: 0 },
    ["heroic", "romance"],
    { styleId: "heroic", committedCount: 2, penaltyArmed: true }
  ));
  assert.deepEqual(penalized.weights, { heroic: 42.8571, romance: 57.1429 });
  assert.equal(penalized.penaltyStyleId, "heroic");
  assert.equal(penalized.penaltyApplied, true);
});

test("zero configured weight does not force an unsupported fallback style", () => {
  const api = loadStylesApi();
  const result = normalize(api.normalizeEligibleStyleWeights(
    { heroic: 100, romance: 0, kaibunsho: 0 },
    ["romance"],
    api.defaultStyleStreak()
  ));
  assert.deepEqual(result.weights, {});
});

test("candidate creation consumes an armed penalty without changing the streak count", () => {
  const api = loadStylesApi();
  assert.deepEqual(normalize(api.consumeStylePenalty({
    styleId: "heroic", committedCount: 2, penaltyArmed: true
  })), { styleId: "heroic", committedCount: 2, penaltyArmed: false });
});

test("committed style history arms once at two and resets after a different style", () => {
  const api = loadStylesApi();
  const first = api.recordCommittedStyle(api.defaultStyleStreak(), "heroic");
  const second = api.recordCommittedStyle(first, "heroic");
  const consumed = api.consumeStylePenalty(second);
  const third = api.recordCommittedStyle(consumed, "heroic");
  const changed = api.recordCommittedStyle(third, "romance");
  assert.deepEqual(normalize(first), { styleId: "heroic", committedCount: 1, penaltyArmed: false });
  assert.deepEqual(normalize(second), { styleId: "heroic", committedCount: 2, penaltyArmed: true });
  assert.deepEqual(normalize(third), { styleId: "heroic", committedCount: 3, penaltyArmed: false });
  assert.deepEqual(normalize(changed), { styleId: "romance", committedCount: 1, penaltyArmed: false });
});

test("frontend and host blob loader load styles before dependent storyteller modules", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const st = readFileSync(new URL("../st.html", import.meta.url), "utf8");
  const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");
  assert.ok(html.indexOf("world/storyteller/styles.js") < html.indexOf("world/storyteller/plan.js"));
  assert.ok(st.indexOf('"world/storyteller/styles.js"') < st.indexOf('"world/storyteller/plan.js"'));
  assert.match(app, /styleConfig:\s*globalThis\.HatsuWorldStorytellerStyles/);
  assert.match(app, /styleStreak:\s*globalThis\.HatsuWorldStorytellerStyles/);
  assert.match(app, /normalizeStyleConfig/);
  assert.match(app, /normalizeStyleStreak/);
});
