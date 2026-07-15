import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const moduleUrl = new URL("../sandbox/idol-roster.js", import.meta.url);

function loadRoster() {
  assert.equal(existsSync(moduleUrl), true, "sandbox/idol-roster.js must exist");
  const source = readFileSync(moduleUrl, "utf8");
  const sandbox = { globalThis: {}, console };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(source, sandbox, { filename: "idol-roster.js" });
  return sandbox.globalThis.HatsuIdolRoster;
}

function makeTaskMain(label) {
  return { relationship_20: { id: "relationship_20", status: label, flags: {} } };
}

function makeState(idol = "藤田琴音") {
  return {
    idol,
    Vo: 100,
    Da: 110,
    Vi: 120,
    growth: { Vo: 1, Da: 2, Vi: 3 },
    threshold: { Vo: 200, Da: 200, Vi: 200 },
    cap: { Vo: 999, Da: 999, Vi: 999 },
    sp: { Vo: false, Da: true, Vi: false },
    stamina: 90,
    stress: 10,
    trust: 0,
    liveReady: false,
    affinity: { openingComplete: true, unlocked: [20], pending: [], viewed: [20] },
    firstLive: { completed: false, success: false, result: null },
    sandbox: {
      assignedIdols: [],
      responsibleIdol: "",
      idolProfiles: {},
      producedIdols: [],
      scoutTargetIdol: null,
      firstLiveChallenge: { status: "available", history: [] }
    },
    tasks: {
      wallet: { money: 50, fame: 3 },
      inventory: { tea: 1 },
      main: makeTaskMain("active"),
      baseline: { Vo: 100, Vi: 120 },
      side: { slots: [] },
      campus: { dayKey: "campus+1", usedCount: 1 }
    },
    freeMode: {
      postLiveDay: 4,
      clockMinutes: 720,
      relationships: {
        "藤田琴音": { 好感度: 80, 更新日: 4 },
        "葛城莉莉娅": { 好感度: 20, 更新日: 3 }
      },
      world: { macro_phase: "first_live" }
    }
  };
}

function createProfile(name) {
  const lilja = name === "葛城莉莉娅";
  return {
    schemaVersion: 1,
    idol: name,
    Vo: lilja ? 70 : 100,
    Da: lilja ? 80 : 110,
    Vi: lilja ? 90 : 120,
    growth: { Vo: 1, Da: 1, Vi: 1 },
    threshold: { Vo: 200, Da: 200, Vi: 200 },
    cap: { Vo: 999, Da: 999, Vi: 999 },
    sp: { Vo: false, Da: false, Vi: false },
    stamina: 100,
    stress: 0,
    trust: 0,
    liveReady: false,
    affinity: { openingComplete: true, unlocked: [], pending: [], viewed: [] },
    firstLive: { completed: false, success: false, result: null },
    firstLiveChallenge: { status: "available", history: [] },
    taskMain: makeTaskMain("locked"),
    taskBaseline: null
  };
}

test("responsible idol switching preserves independent profiles and global state", () => {
  const roster = loadRoster();
  const state = makeState();

  roster.confirmAssignedIdol(state, "藤田琴音", { createProfile });
  state.Vo = 321;
  state.stamina = 76;
  state.tasks.main.relationship_20.status = "completed";
  state.tasks.wallet.money = 500;
  roster.confirmAssignedIdol(state, "葛城莉莉娅", { createProfile });

  assert.equal(state.idol, "葛城莉莉娅");
  assert.equal(state.Vo, 70);
  state.Vo = 123;
  state.stamina = 55;
  roster.switchResponsibleIdol(state, "藤田琴音");

  assert.equal(state.Vo, 321);
  assert.equal(state.stamina, 76);
  assert.equal(state.tasks.main.relationship_20.status, "completed");
  assert.equal(state.tasks.wallet.money, 500);
  assert.equal(state.freeMode.clockMinutes, 720);
  assert.notEqual(state.sandbox.idolProfiles["藤田琴音"], state.sandbox.idolProfiles["葛城莉莉娅"]);

  roster.switchResponsibleIdol(state, "葛城莉莉娅");
  assert.equal(state.Vo, 123);
  assert.equal(state.stamina, 55);
});

test("legacy migration excludes an unconfirmed overwritten scout target", () => {
  const roster = loadRoster();
  const state = makeState("葛城莉莉娅");
  state.sandbox = {
    producedIdols: ["藤田琴音"],
    scoutTargetIdol: "葛城莉莉娅",
    firstLiveChallenge: { status: "available", history: [] }
  };

  roster.normalizeRosterState(state, {
    validIdols: ["藤田琴音", "葛城莉莉娅"],
    confirmedIdols: ["藤田琴音"],
    createProfile
  });

  assert.deepEqual(Array.from(state.sandbox.assignedIdols), ["藤田琴音"]);
  assert.equal(state.sandbox.responsibleIdol, "藤田琴音");
  assert.equal(state.idol, "藤田琴音");
  assert.equal(state.sandbox.scoutTargetIdol, "葛城莉莉娅");
});

test("roster normalization is idempotent and keeps a valid saved profile", () => {
  const roster = loadRoster();
  const state = makeState();
  state.sandbox.assignedIdols = ["藤田琴音", "藤田琴音"];
  state.sandbox.responsibleIdol = "藤田琴音";
  state.sandbox.idolProfiles = { "藤田琴音": { ...createProfile("藤田琴音"), Vo: 444 } };

  const options = {
    validIdols: ["藤田琴音", "葛城莉莉娅"],
    confirmedIdols: ["藤田琴音"],
    createProfile
  };
  roster.normalizeRosterState(state, options);
  roster.normalizeRosterState(state, options);

  assert.deepEqual(Array.from(state.sandbox.assignedIdols), ["藤田琴音"]);
  assert.equal(state.Vo, 444);
  assert.equal(state.sandbox.idolProfiles["藤田琴音"].Vo, 444);
});
