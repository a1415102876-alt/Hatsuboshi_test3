import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [app, index, loader, prototypeApi, prototypeJs] = await Promise.all([
  readFile(new URL("../app.js", import.meta.url), "utf8"),
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../st.html", import.meta.url), "utf8"),
  readFile(new URL("../nia-prototype-api.js", import.meta.url), "utf8"),
  readFile(new URL("../nia-prototype.js", import.meta.url), "utf8")
]);

function body(name, nextName) {
  const start = app.indexOf(`function ${name}`);
  assert.ok(start >= 0, `${name} should exist`);
  const end = nextName ? app.indexOf(`function ${nextName}`, start) : app.length;
  return app.slice(start, end > start ? end : app.length);
}

test("both entry points load the round transition core before app", () => {
  assert.ok(index.indexOf("nia-round-transition-core.js") < index.indexOf("app.js"));
  assert.ok(loader.indexOf("abs('nia-round-transition-core.js')") < loader.indexOf("abs('app.js')"));
});

test("NIA state persists a dedicated inter-round outing runtime", () => {
  assert.match(app, /const niaRoundTransitionCore = globalThis\.HatsuNiaRoundTransition \|\| \{\}/);
  assert.match(body("createDefaultNiaState", "normalizeNiaState"), /interRoundOuting:/);
  assert.match(body("normalizeNiaState"), /normalizeInterRoundOuting\(rawInterRoundOuting\)/);
});

test("completed first-round recap prepares the outing instead of ending progression", () => {
  const complete = body("completeNiaPostAuditionAfterPlayback", "retryNiaAuditionSegment");
  assert.match(complete, /prepareNiaInterRoundOuting\(\)/);
  assert.match(complete, /setNiaPrototypeVisible\(false\)/);
  assert.ok(complete.indexOf("setNiaPrototypeVisible(false)") < complete.indexOf("prepareNiaInterRoundOuting()"));
  assert.ok(complete.indexOf("prepareNiaInterRoundOuting()") < complete.indexOf("reconcileNiaFanMilestoneAfterSettlement()"));
});

test("the NIA action area exposes the fixed outing and its recovery states", () => {
  const render = body("renderActionButtons");
  assert.match(render, /开始\$\{outingRoundLabel\} · 外出放松/);
  assert.match(render, /继续\$\{outingRoundLabel\}外出/);
  assert.match(render, /重试外出收尾/);
});

test("continue resumes exploration while retry regenerates only the outing closing", () => {
  assert.match(app, /outing\.status === "exploring"\) resumeNiaInterRoundOutingIfNeeded\(\)/);
  assert.match(app, /outing\.status === "retryable_failed"\) finishNiaInterRoundOutingDay\(\)/);
});

test("refresh recovery keeps the ready inter-round outing on the training route", () => {
  const resume = body("resumeNiaInterRoundOutingIfNeeded", "resumeNiaScheduleShareIfNeeded");
  assert.match(resume, /outing\?\.status === "ready"/);
  assert.match(resume, /setNiaPrototypeVisible\(false\)/);
  assert.match(resume, /render\(\)/);
});

test("NIA outing filters destinations and provides an early-finish command", () => {
  assert.match(body("openFreeModeOutingOverlay", "closeFreeModeOutingOverlay"), /niaRoundTransitionCore\.DESTINATIONS/);
  assert.match(app, /function finishNiaInterRoundOutingDay\(/);
  assert.match(app, /结束今天的外出/);
  assert.match(index, /id="niaInterRoundOutingEndBtn"/);
});

test("water aquarium uses the supplied scene background", () => {
  assert.match(app, /"水族馆": "\.\/assets\/scenes\/Aquarium\.png"/);
});

test("sleep after outing enters the target round draft", () => {
  const sleep = body("completeNiaEveningAfterSleep", "sleepFromProducerApartment");
  assert.match(sleep, /enterNextRoundDraft/);
  assert.match(sleep, /nextNia\.round/);
});

test("advanced-round planning accepts five player-planned days numbered two through six", () => {
  assert.match(prototypeApi, /fixedOutingSummary/);
  assert.match(prototypeApi, /第2日至第6日/);
  assert.match(prototypeApi, /displayDayOffset/);
  assert.match(prototypeJs, /advancedRound = round >= 2/);
});

test("episode 16 completion prepares the third-round fixed outing", () => {
  const complete = body("completeNiaFanMilestoneAfterPlayback", "activateNiaEveningAfterDayCompletion");
  assert.match(complete, /nia-saki-round2-quartet-victory/);
  assert.match(complete, /fromRound: 2, toRound: 3/);
  assert.match(complete, /phase: "inter_round_outing"/);
});

test("legacy saves completed through episode 16 migrate into the third-round outing once", () => {
  const migrate = body("migrateCompletedRoundTwoSaveToThirdRound", "resumeNiaModeIfNeeded");
  const resume = body("resumeNiaModeIfNeeded", "resumeNiaInterRoundOutingIfNeeded");
  assert.match(migrate, /Number\(nia\.round\) === 2/);
  assert.match(migrate, /audition\.postAudition\?\.status === "completed"/);
  assert.match(migrate, /nia-saki-round2-quartet-victory/);
  assert.match(migrate, /milestone\.status === "completed"/);
  assert.match(migrate, /fromRound: 2, toRound: 3/);
  assert.match(migrate, /alreadyPrepared/);
  assert.match(migrate, /saveState\("nia\.round3_legacy_save_migrated"\)/);
  assert.match(resume, /migrateCompletedRoundTwoSaveToThirdRound\(\)/);
});
