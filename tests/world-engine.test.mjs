import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);

function loadWorldModules() {
  const files = [
    "world/cast-track.js",
    "world/events-pool.js",
    "world/buzz-pool.js",
    "world/campus-behavior.js",
    "world/injection.js",
    "world/daily-tick.js",
    "world/world-gen-api.js",
    "broadcast/prompts.js"
  ];
  const sandbox = { globalThis: {}, console };
  sandbox.globalThis = sandbox;
  for (const file of files) {
    const code = readFileSync(new URL(file, root), "utf8");
    vm.runInNewContext(code, sandbox, { filename: file });
  }
  return sandbox.globalThis.HatsuWorld;
}

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("world modules resolve cast track and daily broadcast", () => {
  const HatsuWorld = loadWorldModules();
  const state = {
    idol: "藤田琴音",
    firstLive: { completed: false, success: false },
    freeMode: {
      postLiveDay: 3,
      clockMinutes: 600,
      world: { macro_phase: "first_live", kotone_seina_proxy: "pending", school_events: [], broadcast: { today: null, history: [] } }
    }
  };
  const canonical = (name) => name;
  assert.equal(HatsuWorld.castTrack.getCastFirstLiveStatus("花海佑芽", state, canonical), "complete");
  assert.equal(HatsuWorld.castTrack.getCastFirstLiveStatus("藤田琴音", state, canonical), "user_producing");
  assert.equal(HatsuWorld.castTrack.getCastFirstLiveStatus("月村手毬", state, canonical), "none");

  const episode = HatsuWorld.dailyTick.rollDailyBroadcast(state, {
    idolNames: ["藤田琴音", "花海佑芽", "月村手毬"],
    canonicalIdolName: canonical
  });
  assert.ok(episode?.id);
  assert.equal(episode.host, "真诚优");
  assert.ok(episode.categoryId);
  assert.ok(episode.guests.length >= 1);
  assert.ok(episode.guests.length <= 3);
  assert.match(episode.outline, /主持：真诚优/);
  assert.match(episode.outline, /本期主题/);

  const summary = HatsuWorld.injection.composeWorldSummary(state, { scope: "produce" }, {
    idolNames: ["藤田琴音", "花海佑芽", "月村手毬"],
    canonicalIdolName: canonical
  });
  assert.match(summary, /学园公开层概况/);
  assert.match(summary, /背景偶像公开标签/);
});

test("sandbox scout phase ends after scout_temari completes", () => {
  const HatsuWorld = loadWorldModules();
  const campus = HatsuWorld.campusBehavior;
  const helpersScout = {
    isSandboxLaunch: () => true,
    isSandboxScoutPhase: () => true,
    canonicalIdolName: (name) => name,
    idolNames: ["月村手毬"],
    getDayKey: () => "scout+1",
    getPresenceSlotKey: () => "scout+1@480"
  };
  const helpersPostScout = {
    ...helpersScout,
    isSandboxScoutPhase: () => false
  };
  assert.equal(campus.getEffectivePhase({ launchMode: "sandbox" }, helpersScout), "scout");
  assert.equal(campus.getEffectivePhase({ launchMode: "sandbox" }, helpersPostScout), "first_live");

  const scoutCampus = campus.resolveCampusDay({ idol: "月村手毬", launchMode: "sandbox" }, helpersScout);
  const liveCampus = campus.resolveCampusDay({
    idol: "月村手毬",
    launchMode: "sandbox",
    freeMode: { postLiveDay: 1, clockMinutes: 600 }
  }, helpersPostScout);
  assert.equal(scoutCampus.phase, "scout");
  assert.equal(liveCampus.phase, "first_live");
  assert.ok(scoutCampus.slots["月村手毬"]?.interactable);
  assert.notEqual(liveCampus.slots["月村手毬"]?.source, "sandbox_scout");
});

test("China scout presence points to the Kuramoto bedroom", () => {
  const campus = loadWorldModules().campusBehavior;
  const helpers = {
    isSandboxLaunch: () => true,
    isSandboxScoutPhase: () => true,
    canonicalIdolName: (name) => name,
    getDayKey: () => "scout+1"
  };
  const resolved = campus.resolveCampusDay({ idol: "仓本千奈", launchMode: "sandbox" }, helpers);
  assert.equal(campus.getScoutTargetLocation("仓本千奈", helpers), "china_home");
  assert.equal(resolved.slots["仓本千奈"].locationId, "china_home");
  assert.equal(resolved.slots["仓本千奈"].facilityId, "bedroom");
  assert.equal(resolved.slots["仓本千奈"].interactable, true);
});

test("app.js wires world engine, broadcast app and prompt injection", () => {
  assert.match(appSource, /freeMode\.world/);
  assert.match(appSource, /isSandboxScoutActive/);
  assert.match(appSource, /isSandboxScoutPhase/);
  assert.match(appSource, /buildSandboxScoutExplorePrompt/);
  assert.match(html, /id="mapLocationPresenceList"/);
  assert.match(appSource, /runFreeModeWorldDailyTick/);
  assert.match(appSource, /sendBroadcastPromptToHost/);
  assert.match(appSource, /handleBroadcastAiReply/);
  assert.match(appSource, /id: "broadcast"/);
  assert.match(appSource, /id: "sns"/);
  assert.match(appSource, /openPhoneSnsApp/);
  assert.match(appSource, /renderSnsApp/);
  assert.match(html, /id="phoneBroadcastApp"/);
  assert.match(html, /id="phoneSnsApp"/);
  assert.match(html, /world\/cast-track\.js/);
  assert.match(html, /world\/campus-behavior\.js/);
  assert.match(html, /world\/buzz-pool\.js/);
  assert.match(html, /world\/world-gen-api\.js/);
  assert.match(html, /broadcast\/prompts\.js/);
});

test("buzz pool rolls daily posts with heat metadata", () => {
  const HatsuWorld = loadWorldModules();
  const state = {
    idol: "藤田琴音",
    firstLive: { completed: true, success: true },
    freeMode: {
      unlocked: true,
      postLiveDay: 2,
      clockMinutes: 600,
      world: {
        macro_phase: "first_live",
        broadcast: { today: { title: "测试广播", guests: ["花海咲季"] } },
        buzz: { items: [], buzzDayKey: "", hotTopic: "" }
      }
    }
  };
  const helpers = {
    idolNames: ["藤田琴音", "月村手毬", "花海咲季"],
    canonicalIdolName: (name) => name,
    getDayKey: () => "live+2"
  };
  const items = HatsuWorld.dailyTick.rollDailyBuzz(state, helpers);
  assert.ok(Array.isArray(items));
  assert.ok(items.length >= 2);
  assert.ok(state.freeMode.world.buzz.hotTopic);
});

test("campus behavior resolves scout opening presence for sandbox", () => {
  const HatsuWorld = loadWorldModules();
  const state = {
    idol: "月村手毬",
    launchMode: "sandbox",
    freeMode: {
      postLiveDay: 1,
      clockMinutes: 480,
      world: { macro_phase: "scout", broadcast: { today: null, history: [] }, buzz: { items: [] } }
    }
  };
  const helpers = {
    idolNames: Object.keys(HatsuWorld.campusBehavior.SCOUT_OPENING_PRESENCE).concat(Object.keys(HatsuWorld.campusBehavior.SCOUT_BACKGROUND_PRESENCE)),
    canonicalIdolName: (name) => name,
    getPresenceSlotKey: () => "1@480",
    getDayKey: () => "scout+1",
    isSandboxLaunch: () => true,
    isSandboxScoutPhase: () => true
  };

  const presence = HatsuWorld.dailyTick.refreshWorldPresence(state, helpers);
  const campus = state.freeMode.world.campus;

  assert.equal(campus?.phase, "scout");
  assert.equal(presence["月村手毬"], "special_education");
  assert.equal(presence["藤田琴音"], "student_store");
  assert.equal(presence["十王星南"], "club_room");
  assert.equal(presence["雨夜燕"], "club_room");
  assert.equal(presence["花海咲季"], "playground");
  assert.equal(campus.slots["月村手毬"].interactable, true);
  assert.equal(campus.slots["藤田琴音"].interactable, false);
  assert.match(campus.slots["月村手毬"].publicLabel, /加练/);

  const lines = HatsuWorld.campusBehavior.getLocationBehaviorLines("special_education", state);
  assert.ok(lines.some((line) => line.includes("月村手毬")));

  const promptLines = HatsuWorld.campusBehavior.buildMapPresencePromptLines("special_education", state, helpers);
  assert.match(promptLines, /月村手毬/);
  assert.match(promptLines, /可接触/);
  assert.match(promptLines, /物色目标/);

  const emptyLines = HatsuWorld.campusBehavior.buildMapPresencePromptLines("auditorium", state, helpers);
  assert.match(emptyLines, /没有已确认到场/);
});

test("saki scout target starts at playground and is interactable", () => {
  const HatsuWorld = loadWorldModules();
  const state = {
    idol: "花海咲季",
    launchMode: "sandbox",
    freeMode: {
      postLiveDay: 1,
      clockMinutes: 480,
      world: { macro_phase: "scout", broadcast: { today: null, history: [] }, buzz: { items: [] } }
    }
  };
  const helpers = {
    idolNames: Object.keys(HatsuWorld.campusBehavior.SCOUT_OPENING_PRESENCE).concat(Object.keys(HatsuWorld.campusBehavior.SCOUT_BACKGROUND_PRESENCE)),
    canonicalIdolName: (name) => name,
    getPresenceSlotKey: () => "1@480",
    getDayKey: () => "scout+1",
    isSandboxLaunch: () => true,
    isSandboxScoutPhase: () => true
  };

  const presence = HatsuWorld.dailyTick.refreshWorldPresence(state, helpers);
  const campus = state.freeMode.world.campus;
  assert.equal(presence["花海咲季"], "playground");
  assert.equal(campus.slots["花海咲季"].interactable, true);
  assert.equal(campus.slots["月村手毬"].interactable, false);

  const promptLines = HatsuWorld.campusBehavior.buildMapPresencePromptLines("playground", state, helpers);
  assert.match(promptLines, /花海咲季/);
  assert.match(promptLines, /可接触/);
});
test("lilja scout target starts at idol classroom and is interactable", () => {
  const HatsuWorld = loadWorldModules();
  const state = {
    idol: "葛城莉莉娅",
    launchMode: "sandbox",
    freeMode: {
      postLiveDay: 1,
      clockMinutes: 480,
      world: { macro_phase: "scout", broadcast: { today: null, history: [] }, buzz: { items: [] } }
    }
  };
  const helpers = {
    idolNames: Object.keys(HatsuWorld.campusBehavior.SCOUT_OPENING_PRESENCE).concat(Object.keys(HatsuWorld.campusBehavior.SCOUT_BACKGROUND_PRESENCE)),
    canonicalIdolName: (name) => name,
    getPresenceSlotKey: () => "1@480",
    getDayKey: () => "scout+1",
    isSandboxLaunch: () => true,
    isSandboxScoutPhase: () => true
  };

  const presence = HatsuWorld.dailyTick.refreshWorldPresence(state, helpers);
  const campus = state.freeMode.world.campus;
  assert.equal(presence["葛城莉莉娅"], "idol_classroom");
  assert.equal(campus.slots["葛城莉莉娅"].interactable, true);
  assert.equal(campus.slots["月村手毬"].interactable, false);

  const promptLines = HatsuWorld.campusBehavior.buildMapPresencePromptLines("idol_classroom", state, helpers);
  assert.match(promptLines, /葛城莉莉娅/);
  assert.match(promptLines, /可接触/);
});

test("misuzu scout target starts at courtyard and is interactable", () => {
  const HatsuWorld = loadWorldModules();
  const state = {
    idol: "秦谷美铃",
    launchMode: "sandbox",
    freeMode: {
      postLiveDay: 1,
      clockMinutes: 480,
      world: { macro_phase: "scout", broadcast: { today: null, history: [] }, buzz: { items: [] } }
    }
  };
  const helpers = {
    idolNames: Object.keys(HatsuWorld.campusBehavior.SCOUT_OPENING_PRESENCE).concat(Object.keys(HatsuWorld.campusBehavior.SCOUT_BACKGROUND_PRESENCE)),
    canonicalIdolName: (name) => name,
    getPresenceSlotKey: () => "1@480",
    getDayKey: () => "scout+1",
    isSandboxLaunch: () => true,
    isSandboxScoutPhase: () => true
  };

  const presence = HatsuWorld.dailyTick.refreshWorldPresence(state, helpers);
  const campus = state.freeMode.world.campus;
  assert.equal(presence["秦谷美铃"], "courtyard");
  assert.equal(campus.slots["秦谷美铃"].interactable, true);
  assert.equal(campus.slots["月村手毬"].interactable, false);

  const promptLines = HatsuWorld.campusBehavior.buildMapPresencePromptLines("courtyard", state, helpers);
  assert.match(promptLines, /秦谷美铃/);
  assert.match(promptLines, /可接触/);
});
test("campus profiles resolve weighted first_live presence", () => {
  const HatsuWorld = loadWorldModules();
  const profiles = HatsuWorld.campusBehavior.CAMPUS_PROFILES;
  assert.ok(profiles["十王星南"]?.slots?.afternoon);
  assert.equal(profiles["十王星南"].slots.afternoon.locationId, "club_room");
  assert.equal(profiles["雨夜燕"].slots.afternoon.locationId, "gymnasium");
  assert.equal(profiles["月村手毬"].slots.afternoon.locationId, "special_education");
  assert.equal(profiles["藤田琴音"].slots.midday.locationId, "student_store");
  assert.equal(profiles["紫云清夏"].globalPresence, "低");

  const helpers = {
    idolNames: Object.keys(profiles),
    canonicalIdolName: (name) => name,
    getPresenceSlotKey: (s) => `${s?.freeMode?.postLiveDay || 1}@${s?.freeMode?.clockMinutes || 480}`,
    getDayKey: (s) => `live+${s?.freeMode?.postLiveDay || 1}`
  };

  let seinaAfternoon = null;
  for (let day = 1; day <= 40; day += 1) {
    const state = {
      idol: "藤田琴音",
      firstLive: { completed: false, success: false },
      freeMode: {
        postLiveDay: day,
        clockMinutes: 15 * 60,
        world: { macro_phase: "first_live", broadcast: { today: null, history: [] }, buzz: { items: [] } }
      }
    };
    const campus = HatsuWorld.campusBehavior.resolveProfileCampus(state, helpers);
    assert.equal(campus.phase, "first_live");
    assert.equal(campus.timePhase, "afternoon");
    if (campus.slots["十王星南"]) {
      seinaAfternoon = campus.slots["十王星南"];
      break;
    }
  }
  assert.ok(seinaAfternoon, "星南应在部分 afternoon roll 中出现");
  assert.equal(seinaAfternoon.locationId, "club_room");
  assert.match(seinaAfternoon.publicLabel, /代理培育|公务/);

  const producingState = {
    idol: "藤田琴音",
    firstLive: { completed: false, success: false },
    freeMode: {
      postLiveDay: 7,
      clockMinutes: 12 * 60,
      world: { macro_phase: "first_live", kotone_seina_proxy: "pending", broadcast: { today: null, history: [] }, buzz: { items: [] } }
    }
  };
  HatsuWorld.dailyTick.refreshWorldPresence(producingState, helpers);
  assert.equal(producingState.freeMode.presence["藤田琴音"], "producer_classroom");
  assert.match(producingState.freeMode.world.campus?.slots?.["藤田琴音"]?.publicLabel, /制作人科/);
});

test("campus snapshot weights broadcast buzz and daily tick order", () => {
  const HatsuWorld = loadWorldModules();
  const idolNames = Object.keys(HatsuWorld.campusBehavior.CAMPUS_PROFILES);
  const helpers = {
    idolNames,
    canonicalIdolName: (name) => name,
    getPresenceSlotKey: (s) => `${s?.freeMode?.postLiveDay || 1}@${s?.freeMode?.clockMinutes || 480}`,
    getDayKey: (s) => `live+${s?.freeMode?.postLiveDay || 1}`
  };
  const state = {
    idol: "藤田琴音",
    firstLive: { completed: false, success: false },
    freeMode: {
      postLiveDay: 11,
      clockMinutes: 8 * 60,
      world: {
        macro_phase: "first_live",
        kotone_seina_proxy: "pending",
        broadcast: { today: null, history: [] },
        buzz: { items: [], buzzDayKey: "", hotTopic: "" }
      }
    }
  };

  HatsuWorld.dailyTick.runFreeModeDailyTick(state, helpers);

  assert.ok(state.freeMode.world.campus?.slots);
  assert.ok(Object.keys(state.freeMode.presence || {}).length > 0);
  assert.match(state.freeMode.world.broadcast.today?.outline || "", /今日校园动向/);

  const summary = HatsuWorld.injection.composeWorldSummary(state, { scope: "sns" }, helpers);
  assert.match(summary, /今日校园动向/);

  const campusState = {
    freeMode: {
      world: {
        campus: {
          slots: {
            "十王星南": { locationId: "club_room", publicLabel: "学生会晨间公务" },
            "雨夜燕": { locationId: "club_room", publicLabel: "副会长备稿" }
          }
        }
      }
    }
  };
  assert.equal(HatsuWorld.campusBehavior.getCampusAngleWeightMultiplier("student_council", campusState), 2.2);
  assert.equal(HatsuWorld.campusBehavior.getCampusAngleWeightMultiplier("cafeteria", campusState), 1);
  assert.ok(HatsuWorld.campusBehavior.getCampusPresenceWeightMultiplier("十王星南", campusState) > 1);
  assert.ok(HatsuWorld.campusBehavior.getCampusPresenceWeightMultiplier("月村手毬", campusState) < 1);
});
