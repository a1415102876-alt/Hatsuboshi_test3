import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const sideQuestApiSource = readFileSync(new URL("../tasks/side-quest-api.js", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const sidePoolSource = readFileSync(new URL("../tasks/side-pool.js", import.meta.url), "utf8");
const tasksSource = readFileSync(new URL("../tasks/sandbox-tasks.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

function loadHatsuSideQuestApi() {
  const sandbox = { globalThis: {}, console };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(sidePoolSource, sandbox, { filename: "side-pool.js" });
  vm.runInNewContext(sideQuestApiSource, sandbox, { filename: "side-quest-api.js" });
  return sandbox.globalThis.HatsuSideQuestApi;
}

function loadHatsuTasks() {
  const sandbox = { globalThis: {}, console };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(sidePoolSource, sandbox, { filename: "side-pool.js" });
  vm.runInNewContext(sideQuestApiSource, sandbox, { filename: "side-quest-api.js" });
  vm.runInNewContext(tasksSource, sandbox, { filename: "sandbox-tasks.js" });
  return sandbox.globalThis.HatsuTasks;
}

function finishScoutFlow(HatsuTasks, state) {
  HatsuTasks.activateScoutQuestForIdol(state, state.idol);
  HatsuTasks.onScoutInviteComplete(state);
  HatsuTasks.applyQuestCompletionsFromReply(state, "【初星任务完成】scout_temari");
}

function finishKotoneScoutFlow(HatsuTasks, state) {
  HatsuTasks.activateScoutQuestForIdol(state, state.idol);
  HatsuTasks.onScoutInviteComplete(state);
  HatsuTasks.applyQuestCompletionsFromReply(state, "【初星任务完成】scout_kotone");
}

function finishSakiScoutFlow(HatsuTasks, state) {
  HatsuTasks.activateScoutQuestForIdol(state, state.idol);
  HatsuTasks.onScoutInviteComplete(state);
  HatsuTasks.applyQuestCompletionsFromReply(state, "【初星任务完成】scout_saki");
}

function finishMisuzuScoutFlow(HatsuTasks, state) {
  HatsuTasks.activateScoutQuestForIdol(state, state.idol);
  HatsuTasks.onScoutInviteComplete(state);
  HatsuTasks.applyQuestCompletionsFromReply(state, "【初星任务完成】scout_misuzu");
}

function finishLiljaScoutFlow(HatsuTasks, state) {
  HatsuTasks.activateScoutQuestForIdol(state, state.idol);
  HatsuTasks.onScoutInviteComplete(state);
  HatsuTasks.applyQuestCompletionsFromReply(state, "【初星任务完成】scout_lilja");
}

function loadSideQuestPool() {
  const sandbox = { globalThis: {}, console };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(sidePoolSource, sandbox, { filename: "side-pool.js" });
  return sandbox.globalThis.HatsuSideQuestPool;
}

function baseSandboxState() {
  return {
    launchMode: "sandbox",
    idol: "月村手毬",
    sandbox: { openingComplete: true, inviteComplete: false },
    stamina: 100,
    stress: 0,
    trust: 0,
    Vo: 120,
    Da: 100,
    Vi: 80
  };
}

test("sandbox tasks module defines scout and temari personal quests", () => {
  const HatsuTasks = loadHatsuTasks();
  const state = baseSandboxState();
  HatsuTasks.ensureTasksShape(state);
  assert.equal(state.tasks.main.scout_temari.status, "locked");
  assert.equal(state.tasks.main.temari_main_01.status, "locked");
  assert.equal(state.tasks.main.temari_main_02.status, "locked");
  assert.equal(state.tasks.main.temari_main_03.status, "locked");
});


test("sandbox tasks exposes Asari lesson categories and relationship milestones", () => {
  const HatsuTasks = loadHatsuTasks();
  const state = baseSandboxState();
  finishScoutFlow(HatsuTasks, state);
  const snapshot = HatsuTasks.getTaskPanelSnapshot(state);
  const categories = snapshot.main.map((item) => item.category);
  assert.ok(categories.includes("relationship"));
  assert.ok(categories.includes("conflict"));
  assert.ok(categories.includes("ability"));
  assert.ok(categories.includes("work"));
  assert.ok(categories.includes("final"));
  assert.ok(snapshot.main.some((item) => item.title.includes("好感度 20")));
  assert.ok(snapshot.main.some((item) => item.title.includes("First Live")));
});

test("relationship lessons use sandbox free mode affinity instead of legacy trust", () => {
  const HatsuTasks = loadHatsuTasks();
  const state = baseSandboxState();
  state.trust = 3;
  state.freeMode = { postLiveDay: 2, relationships: { "月村手毬": { 好感度: 45, 更新日: 2 } } };
  finishScoutFlow(HatsuTasks, state);
  HatsuTasks.syncSandboxQuestProgress(state);
  const snapshot = HatsuTasks.getTaskPanelSnapshot(state);
  const relationship40 = snapshot.main.find((item) => item.id === "relationship_40");
  assert.equal(relationship40.status, "completed");
  const relationship60 = snapshot.main.find((item) => item.id === "relationship_60");
  assert.equal(relationship60.status, "active");
  assert.match(relationship60.progressHint, /好感度 45\/60/);
});

test("commission rewards raise current idol sandbox affinity", () => {
  const HatsuTasks = loadHatsuTasks();
  const state = baseSandboxState();
  state.freeMode = { postLiveDay: 1, relationships: { "月村手毬": { 好感度: 10, 更新日: 1 } } };
  finishScoutFlow(HatsuTasks, state);
  HatsuTasks.syncSideQuestDay(state);
  const result = HatsuTasks.applySideQuestTier(state, 0, "pass");
  assert.equal(result.ok, true);
  assert.equal(result.reward.trust, 5);
  assert.equal(state.freeMode.relationships["月村手毬"].好感度, 15);
  assert.equal(state.trust, 0);
});
test("sandbox task wallet migrates fame for commission rewards", () => {
  const HatsuTasks = loadHatsuTasks();
  const state = baseSandboxState();
  state.tasks = { wallet: { money: 12 }, main: {}, side: {}, campus: {} };
  HatsuTasks.ensureTasksShape(state);
  assert.equal(state.tasks.wallet.money, 12);
  assert.equal(state.tasks.wallet.fame, 0);
});
test("scout invite complete does not auto-activate scout without idol selection", () => {
  const HatsuTasks = loadHatsuTasks();
  const state = baseSandboxState();
  HatsuTasks.ensureTasksShape(state);
  const completed = HatsuTasks.onScoutInviteComplete(state);
  assert.equal(completed.length, 0);
  assert.equal(state.tasks.main.scout_temari.status, "locked");
  assert.equal(state.tasks.main.scout_kotone.status, "locked");
});

test("scout quest activates only for selected idol", () => {
  const HatsuTasks = loadHatsuTasks();
  const state = baseKotoneSandboxState();
  HatsuTasks.ensureTasksShape(state);
  HatsuTasks.activateScoutQuestForIdol(state, "藤田琴音");
  assert.equal(state.tasks.main.scout_kotone.status, "active");
  assert.equal(state.tasks.main.scout_temari.status, "locked");
  assert.equal(state.sandbox.scoutTargetIdol, "藤田琴音");
});

test("task panel hides inactive scout quests until idol is chosen", () => {
  const HatsuTasks = loadHatsuTasks();
  const state = baseKotoneSandboxState();
  HatsuTasks.ensureTasksShape(state);
  let snapshot = HatsuTasks.getTaskPanelSnapshot(state);
  assert.equal(snapshot.main.some((item) => item.id === "scout_kotone"), false);
  assert.equal(snapshot.main.some((item) => item.id === "scout_temari"), false);
  HatsuTasks.activateScoutQuestForIdol(state, "藤田琴音");
  snapshot = HatsuTasks.getTaskPanelSnapshot(state);
  assert.equal(snapshot.main.some((item) => item.id === "scout_kotone"), true);
  assert.equal(snapshot.main.some((item) => item.id === "scout_temari"), false);
});

test("task panel suppresses leaked next scout before second idol is chosen", () => {
  const HatsuTasks = loadHatsuTasks();
  const state = baseKotoneSandboxState();
  finishKotoneScoutFlow(HatsuTasks, state);
  state.sandbox.inviteComplete = true;
  state.tasks.main.scout_temari.status = "active";
  const snapshot = HatsuTasks.getTaskPanelSnapshot(state);
  assert.equal(snapshot.secondIdol.unlocked, false);
  assert.equal(snapshot.main.some((item) => item.id === "scout_temari"), false);
  assert.equal(state.tasks.main.scout_temari.status, "locked");
});
test("scout temari completes when AI outputs quest completion tag", () => {
  const HatsuTasks = loadHatsuTasks();
  const state = baseSandboxState();
  state.freeMode = { world: { macro_phase: "scout" } };
  HatsuTasks.ensureTasksShape(state);
  HatsuTasks.activateScoutQuestForIdol(state, "月村手毬");
  HatsuTasks.onScoutInviteComplete(state);
  const text = "【初星正文开始】<story><narration>她点头答应。</narration></story>【初星任务完成】scout_temari【初星正文结束】";
  const completed = HatsuTasks.applyQuestCompletionsFromReply(state, text);
  assert.equal(completed.length, 1);
  assert.equal(completed[0], "scout_temari");
  assert.equal(state.tasks.main.scout_temari.status, "completed");
  assert.equal(state.tasks.main.temari_main_01.status, "active");
  assert.equal(state.tasks.main.temari_main_02.status, "active");
  assert.equal(state.tasks.main.temari_main_03.status, "active");
  assert.equal(state.tasks.baseline.Vo, 120);
  assert.equal(state.tasks.baseline.Vi, 80);
  assert.equal(state.freeMode.world.macro_phase, "first_live");
});

test("legacy sandbox saves reconcile scout phase after a completed signing quest", () => {
  const HatsuTasks = loadHatsuTasks();
  const state = baseSandboxState();
  state.freeMode = { world: { macro_phase: "scout" } };
  HatsuTasks.ensureTasksShape(state);
  state.tasks.main.scout_temari.status = "completed";

  HatsuTasks.ensureTasksShape(state);

  assert.equal(state.freeMode.world.macro_phase, "first_live");
});

test("sandbox remains in scout phase before any signing quest completes", () => {
  const HatsuTasks = loadHatsuTasks();
  const state = baseSandboxState();
  state.freeMode = { world: { macro_phase: "scout" } };

  HatsuTasks.ensureTasksShape(state);

  assert.equal(state.freeMode.world.macro_phase, "scout");
});

test("scout location talk does not auto-complete without AI tag", () => {
  const HatsuTasks = loadHatsuTasks();
  const state = baseSandboxState();
  HatsuTasks.ensureTasksShape(state);
  HatsuTasks.activateScoutQuestForIdol(state, "月村手毬");
  HatsuTasks.onScoutInviteComplete(state);
  const completed = HatsuTasks.completeScoutTemariOnLocationTalk(state);
  assert.equal(completed.length, 0);
  assert.equal(state.tasks.main.scout_temari.status, "active");
});

test("parses quest completion tags from AI reply", () => {
  const HatsuTasks = loadHatsuTasks();
  const state = baseSandboxState();
  finishScoutFlow(HatsuTasks, state);
  const text = "【初星正文开始】<story><narration>和好。</narration></story>【初星任务完成】temari_main_02【初星正文结束】";
  const completed = HatsuTasks.applyQuestCompletionsFromReply(state, text);
  assert.equal(completed.length, 1);
  assert.equal(completed[0], "temari_main_02");
  assert.equal(state.tasks.main.temari_main_02.status, "completed");
});

test("temari main 01 completes on stamina vo and outstage flag", () => {
  const HatsuTasks = loadHatsuTasks();
  const state = baseSandboxState();
  finishScoutFlow(HatsuTasks, state);
  state.stamina = 90;
  state.Vo = 165;
  state.tasks.main.temari_main_01.flags.outstage_full_song = true;
  const completed = HatsuTasks.evaluateNumericMainQuests(state);
  assert.equal(completed.length, 1);
  assert.equal(completed[0], "temari_main_01");
});

test("temari main 03 completes on vi stress diet flags", () => {
  const HatsuTasks = loadHatsuTasks();
  const state = baseSandboxState();
  finishScoutFlow(HatsuTasks, state);
  state.Vi = 120;
  state.stress = 20;
  state.tasks.main.temari_main_03.flags.diet_plan_active = true;
  state.tasks.main.temari_main_03.flags.healthy_meal_count = 2;
  const completed = HatsuTasks.evaluateNumericMainQuests(state);
  assert.equal(completed.length, 1);
  assert.equal(completed[0], "temari_main_03");
});

test("campus daily limit tracks lesson and training in sandbox", () => {
  const HatsuTasks = loadHatsuTasks();
  const state = baseSandboxState();
  state.freeMode = { postLiveDay: 2, clockMinutes: 480 };
  finishScoutFlow(HatsuTasks, state);

  assert.equal(HatsuTasks.getCampusRemaining(state), 3);
  const first = HatsuTasks.recordCampusAction(state, { kind: "lesson", locationId: "idol_classroom", minutes: 60 });
  assert.equal(first.ok, true);
  assert.equal(first.usedCount, 1);
  assert.equal(HatsuTasks.getCampusRemaining(state), 2);

  HatsuTasks.recordCampusAction(state, { kind: "training", locationId: "gymnasium", minutes: 60 });
  HatsuTasks.recordCampusAction(state, { kind: "training", locationId: "special_education", minutes: 60 });
  assert.equal(HatsuTasks.getCampusRemaining(state), 0);
  assert.equal(HatsuTasks.isCampusDailyLimitReached(state), true);

  const blocked = HatsuTasks.recordCampusAction(state, { kind: "lesson", locationId: "producer_classroom", minutes: 60 });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.reason, "limit");
});

test("campus counter resets when postLiveDay changes", () => {
  const HatsuTasks = loadHatsuTasks();
  const state = baseSandboxState();
  state.freeMode = { postLiveDay: 1, clockMinutes: 480 };
  finishScoutFlow(HatsuTasks, state);
  HatsuTasks.recordCampusAction(state, { kind: "lesson", locationId: "idol_classroom", minutes: 60 });
  HatsuTasks.recordCampusAction(state, { kind: "lesson", locationId: "idol_classroom", minutes: 60 });
  assert.equal(HatsuTasks.getCampusRemaining(state), 1);

  state.freeMode.postLiveDay = 2;
  HatsuTasks.syncCampusDay(state);
  assert.equal(state.tasks.campus.usedCount, 0);
  assert.equal(HatsuTasks.getCampusRemaining(state), 3);
  assert.equal(state.tasks.campus.dayKey, "2");
});

test("app.js wires campus daily limit for sandbox", () => {
  assert.match(appSource, /isSandboxCampusExhausted/);
  assert.match(appSource, /recordCampusAction/);
  assert.match(appSource, /canOpenHybridFacilityAt/);
  assert.match(appSource, /showSandboxCampusLimitToast/);
});

test("app.js wires sandbox task hooks", () => {
  assert.match(appSource, /processSandboxQuestFromReply/);
  assert.match(appSource, /getTaskPanelSnapshot/);
  assert.match(appSource, /markOutstageFullSong/);
  assert.match(appSource, /HatsuTasks/);
  assert.match(appSource, /openSideQuestOverlay/);
  assert.match(appSource, /applySideQuestTier/);
  assert.match(appSource, /buildSandboxScoutWrapUpPrompt/);
  assert.match(appSource, /scoutCompletionPendingInReply/);
  assert.match(appSource, /completeScoutFromReplyAndBeginWrapUp/);
  assert.match(appSource, /buildSandboxMainQuestPromptBlock/);
  assert.match(appSource, /processSandboxMainQuestMapChoice/);
  assert.match(appSource, /sendSecondaryPrompt|secondaryAiReply/);
  assert.match(appSource, /handleSecondaryAiReply/);
  assert.match(html, /tasks\/side-quest-api\.js/);
  assert.doesNotMatch(html, /sideQuestApiPanel/);
  assert.match(html, /worldEngineSettingsView/);
  assert.match(html, /worldEngineCommissionRegenBtn/);
  assert.match(appSource, /openTaskPanelOverlay/);
  assert.match(appSource, /renderTaskPanelOverlay/);
  assert.match(html, /taskPanelOverlay/);
  assert.match(html, /freeModeTaskPanelBtn/);
  assert.match(html, /tasks\/side-pool\.js/);
  assert.match(html, /tasks\/sandbox-tasks\.js/);
  assert.match(html, /sideQuestOverlay/);
});

test("side quest pool picks three deterministic slots per day", () => {
  const pool = loadSideQuestPool();
  const dayOne = pool.pickDailyQuests("1", "月村手毬", 3, 0);
  const dayOneAgain = pool.pickDailyQuests("1", "月村手毬", 3, 0);
  const dayTwo = pool.pickDailyQuests("2", "月村手毬", 3, 0);
  assert.equal(dayOne.length, 3);
  assert.ok(dayOne.every((slot) => slot.locationId && slot.locationName));
  assert.deepEqual(dayOne.map((slot) => slot.poolId), dayOneAgain.map((slot) => slot.poolId));
  assert.notDeepEqual(dayOne.map((slot) => slot.poolId), dayTwo.map((slot) => slot.poolId));
});

test("side quest pool scales commercial gigs by fame tier", () => {
  const pool = loadSideQuestPool();
  const street = pool.pickDailyQuests("1", "月村手毬", 3, 0);
  const prime = pool.pickDailyQuests("1", "月村手毬", 3, 80);
  assert.ok(street.every((slot) => !["variety_guest_slot", "tv_variety_music_show"].includes(slot.poolId)));
  assert.ok(prime.some((slot) => ["variety_guest_slot", "tv_variety_music_show", "music_festival_guest", "national_chain_stage"].includes(slot.poolId)));
  assert.ok(prime.every((slot) => slot.locationId && slot.locationName));
  assert.equal(pool.getSideQuestFameTier(0).id, "street");
  assert.equal(pool.getSideQuestFameTier(80).id, "prime");
});

test("side quest target can be set and clears after settlement", () => {
  const HatsuTasks = loadHatsuTasks();
  const state = baseSandboxState();
  state.freeMode = { postLiveDay: 1, clockMinutes: 480 };
  finishScoutFlow(HatsuTasks, state);
  HatsuTasks.syncSideQuestDay(state);
  const target = HatsuTasks.setActiveSideQuest(state, 0);
  assert.equal(target.ok, true);
  assert.equal(state.tasks.side.activeSlotIndex, 0);
  assert.equal(HatsuTasks.getActiveSideQuest(state).slotIndex, 0);
  assert.equal(
    HatsuTasks.getActiveSideQuestAtLocation(state, target.slot.locationId).slotIndex,
    0
  );
  const result = HatsuTasks.applySideQuestTier(state, 0, "pass");
  assert.equal(result.ok, true);
  assert.equal(state.tasks.side.activeSlotIndex, null);
});

test("accepted commissions freeze owner and reject another responsible idol", () => {
  const HatsuTasks = loadHatsuTasks();
  const state = baseSandboxState();
  state.freeMode = { postLiveDay: 1, clockMinutes: 480 };
  state.sandbox = { responsibleIdol: "月村手毬" };
  finishScoutFlow(HatsuTasks, state);
  HatsuTasks.syncSideQuestDay(state);

  const accepted = HatsuTasks.setActiveSideQuest(state, 0);
  assert.equal(accepted.ok, true);
  assert.equal(accepted.slot.ownerIdol, "月村手毬");
  state.idol = "藤田琴音";
  state.sandbox.responsibleIdol = "藤田琴音";
  const walletBefore = { ...state.tasks.wallet };

  assert.equal(HatsuTasks.getActiveSideQuestAtLocation(state, accepted.slot.locationId), null);
  const blocked = HatsuTasks.applySideQuestTier(state, 0, "pass");
  assert.equal(blocked.ok, false);
  assert.equal(blocked.reason, "owner_mismatch");
  assert.equal(state.tasks.wallet.money, walletBefore.money);
  assert.equal(state.tasks.wallet.fame, walletBefore.fame);
  assert.equal(state.tasks.side.slots[0].status, "open");
  assert.equal(state.tasks.side.slots[0].ownerIdol, "月村手毬");
});

test("side quests refresh when postLiveDay changes", () => {
  const HatsuTasks = loadHatsuTasks();
  const state = baseSandboxState();
  state.freeMode = { postLiveDay: 1, clockMinutes: 480 };
  finishScoutFlow(HatsuTasks, state);
  HatsuTasks.syncSideQuestDay(state);
  const firstIds = state.tasks.side.slots.map((slot) => slot.poolId);

  state.freeMode.postLiveDay = 2;
  HatsuTasks.syncSideQuestDay(state);
  const secondIds = state.tasks.side.slots.map((slot) => slot.poolId);
  assert.equal(state.tasks.side.slots.length, 3);
  assert.equal(state.tasks.side.slots.every((slot) => slot.status === "open"), true);
  assert.notDeepEqual(firstIds, secondIds);
});

test("side quest fail tier still grants consolation money", () => {
  const HatsuTasks = loadHatsuTasks();
  const state = baseSandboxState();
  state.freeMode = { postLiveDay: 1, clockMinutes: 480 };
  finishScoutFlow(HatsuTasks, state);
  HatsuTasks.syncSideQuestDay(state);
  const result = HatsuTasks.applySideQuestTier(state, 0, "fail");
  assert.equal(result.ok, true);
  assert.equal(result.reward.money, 80);
  assert.equal(result.reward.fame, 1);
  assert.equal(state.tasks.wallet.money, 80);
  assert.equal(state.tasks.wallet.fame, 1);
  assert.equal(state.tasks.side.slots[0].status, "done");
  assert.equal(state.tasks.side.slots[0].resultTier, "fail");
});

test("diet side quest pass tier records healthy meal for main quest 03", () => {
  const HatsuTasks = loadHatsuTasks();
  const state = baseSandboxState();
  state.freeMode = { postLiveDay: 1, clockMinutes: 480 };
  finishScoutFlow(HatsuTasks, state);
  HatsuTasks.syncSideQuestDay(state);
  const dietSlotIndex = state.tasks.side.slots.findIndex((slot) => slot.tag === "diet");
  assert.notEqual(dietSlotIndex, -1);
  const result = HatsuTasks.applySideQuestTier(state, dietSlotIndex, "pass");
  assert.equal(result.ok, true);
  assert.equal(result.healthyMealRecorded, true);
  assert.equal(state.tasks.main.temari_main_03.flags.healthy_meal_count, 1);
});

test("map choice at dining hall can activate diet plan and healthy meal hooks", () => {
  const HatsuTasks = loadHatsuTasks();
  const state = baseSandboxState();
  finishScoutFlow(HatsuTasks, state);

  const dietPlan = HatsuTasks.processSandboxMainQuestMapChoice(state, "dining_hall", "和营养师一起制定饮食方案");
  assert.ok(dietPlan.notices.includes("已制定饮食方案"));
  assert.equal(state.tasks.main.temari_main_03.flags.diet_plan_active, true);

  const healthyMeal = HatsuTasks.processSandboxMainQuestMapChoice(state, "dining_hall", "点一份健康餐沙拉");
  assert.ok(healthyMeal.notices.includes("已记录一次健康餐"));
  assert.equal(state.tasks.main.temari_main_03.flags.healthy_meal_count, 1);
});

test("map choice at outstage with sing keywords marks full song flag", () => {
  const HatsuTasks = loadHatsuTasks();
  const state = baseSandboxState();
  finishScoutFlow(HatsuTasks, state);

  const result = HatsuTasks.processSandboxMainQuestMapChoice(state, "outstage", "让手毬试唱完整一首");
  assert.ok(result.notices.includes("已记录野外舞台完整试唱"));
  assert.equal(state.tasks.main.temari_main_01.flags.outstage_full_song, true);
});

test("parses quest flag tags from AI reply", () => {
  const HatsuTasks = loadHatsuTasks();
  const state = baseSandboxState();
  finishScoutFlow(HatsuTasks, state);
  const text = "正文【初星任务标记】diet_plan_active【初星正文结束】";
  const result = HatsuTasks.applyQuestFlagsFromReply(state, text);
  assert.ok(result.notices.includes("已制定饮食方案"));
  assert.equal(state.tasks.main.temari_main_03.flags.diet_plan_active, true);
});

test("sandbox main quest prompt mentions SyngUp at dining hall for main 02", () => {
  const HatsuTasks = loadHatsuTasks();
  const state = baseSandboxState();
  state.sandbox = { openingComplete: true, inviteComplete: true };
  finishScoutFlow(HatsuTasks, state);
  const block = HatsuTasks.buildSandboxMainQuestPromptBlock(state, "dining_hall");
  assert.match(block, /SyngUp/);
  assert.match(block, /秦谷美铃/);
});

test("main quest progress hints reference GKMS episodes", () => {
  const HatsuTasks = loadHatsuTasks();
  const state = baseSandboxState();
  finishScoutFlow(HatsuTasks, state);
  const snapshot = HatsuTasks.getTaskPanelSnapshot(state);
  const main01 = snapshot.main.find((item) => item.id === "temari_main_01");
  const main02 = snapshot.main.find((item) => item.id === "temari_main_02");
  const main03 = snapshot.main.find((item) => item.id === "temari_main_03");
  assert.match(main01.progressHint, /GKMS 5\/6\/9/);
  assert.match(main02.progressHint, /GKMS 8～10/);
  assert.match(main03.progressHint, /GKMS 1～3/);
  assert.equal(main01.step, 0);
});

test("side quest api parses daily json block", () => {
  const api = loadHatsuSideQuestApi();
  const text = `【初星支线开始】
{"quests":[{"title":"商场中庭舞台","desc":"接受购物中心邀请完成两首短曲。","tag":"stage","locationId":"shopping_mall"},{"title":"地方电台短访","desc":"到地方电台录制宣传短访。","tag":"syngup","locationId":"local_radio"},{"title":"商店街食祭站台","desc":"为街区食祭摊位完成试吃口播。","tag":"diet","locationId":"shopping_street"}]}
【初星支线结束】`;
  const parsed = api.parseSideQuestDailyResponse(text, "3", "月村手毬");
  assert.equal(parsed.quests.length, 3);
  assert.equal(parsed.quests[0].tag, "stage");
  assert.equal(parsed.quests[0].locationId, "shopping_mall");
});


test("side quest api prompt frames generated slots as commission work", () => {
  const api = loadHatsuSideQuestApi();
  const prompt = api.buildSideQuestDailyPrompt(baseSandboxState(), "4");
  assert.match(prompt, /委托系统/);
  assert.match(prompt, /商业委托/);
  assert.match(prompt, /知名度/);
  assert.match(prompt, /商业街舞台暖场|街区商演出道期/);
  assert.match(prompt, /禁止写成以下类型/);
  const highFameState = baseSandboxState();
  highFameState.tasks = { wallet: { money: 0, fame: 75 } };
  const highPrompt = api.buildSideQuestDailyPrompt(highFameState, "4");
  assert.match(highPrompt, /头部商业档期|综艺节目/);
});
test("side quest api parses tier hint json block", () => {
  const api = loadHatsuSideQuestApi();
  const text = `【初星档位开始】
{"fail":"场面乱了只能安慰收场","pass_low":"勉强把流程走完","pass":"标准完成委托","perfect":"超常发挥赢得称赞"}
【初星档位结束】`;
  const hints = api.parseSideQuestTierResponse(text);
  assert.ok(hints.fail.includes("安慰"));
  assert.ok(hints.perfect.includes("超常"));
});

test("queue side quest refresh uses api mode when secondary enabled", () => {
  const HatsuTasks = loadHatsuTasks();
  const state = baseSandboxState();
  state.sandbox = { openingComplete: true, inviteComplete: true };
  HatsuTasks.ensureTasksShape(state);
  state.tasks.secondaryApi.enabled = true;
  state.tasks.secondaryApi.baseUrl = "https://api.example.com/v1";
  state.tasks.secondaryApi.model = "test-model";
  const mode = HatsuTasks.queueSideQuestRefresh(state);
  assert.equal(mode, "api");
  assert.equal(state.tasks.side.genStatus, "pending");
  assert.equal(state.tasks.side.slots.length, 3);
});

function baseKotoneSandboxState() {
  return {
    launchMode: "sandbox",
    idol: "藤田琴音",
    sandbox: { openingComplete: true, inviteComplete: false },
    stamina: 100,
    stress: 0,
    trust: 0,
    Vo: 90,
    Da: 90,
    Vi: 120
  };
}

function baseSakiSandboxState() {
  return {
    launchMode: "sandbox",
    idol: "花海咲季",
    sandbox: { openingComplete: true, inviteComplete: false },
    stamina: 100,
    stress: 0,
    trust: 0,
    Vo: 105,
    Da: 120,
    Vi: 100
  };
}

function baseMisuzuSandboxState() {
  return {
    launchMode: "sandbox",
    idol: "秦谷美铃",
    sandbox: { openingComplete: true, inviteComplete: false },
    stamina: 100,
    stress: 0,
    trust: 0,
    Vo: 100,
    Da: 100,
    Vi: 115
  };
}

function baseLiljaSandboxState() {
  return {
    launchMode: "sandbox",
    idol: "葛城莉莉娅",
    sandbox: { openingComplete: true, inviteComplete: false },
    stamina: 100,
    stress: 0,
    trust: 0,
    Vo: 80,
    Da: 100,
    Vi: 115
  };
}

test("sandbox selectable idols include kotone with scout and personal quests", () => {
  const HatsuTasks = loadHatsuTasks();
  assert.ok(HatsuTasks.SANDBOX_SELECTABLE_IDOLS.includes("藤田琴音"));
  assert.equal(HatsuTasks.SANDBOX_IDOL_QUEST_PACKS["藤田琴音"].scoutId, "scout_kotone");
  assert.equal(HatsuTasks.SANDBOX_IDOL_QUEST_PACKS["藤田琴音"].personalIds, HatsuTasks.KOTONE_PERSONAL_IDS);
});

test("kotone scout completes and unlocks only kotone personal quests", () => {
  const HatsuTasks = loadHatsuTasks();
  const state = baseKotoneSandboxState();
  HatsuTasks.ensureTasksShape(state);
  finishKotoneScoutFlow(HatsuTasks, state);
  assert.equal(state.tasks.main.scout_kotone.status, "completed");
  assert.equal(state.tasks.main.kotone_main_01.status, "active");
  assert.equal(state.tasks.main.kotone_main_02.status, "active");
  assert.equal(state.tasks.main.kotone_main_03.status, "active");
  assert.equal(state.tasks.main.temari_main_01.status, "locked");
  assert.equal(state.tasks.baseline.Vo, 90);
  assert.equal(state.tasks.baseline.Vi, 120);
});

test("kotone main quests track part-time cancel, praise count, and rest recovery", () => {
  const HatsuTasks = loadHatsuTasks();
  const state = baseKotoneSandboxState();
  finishKotoneScoutFlow(HatsuTasks, state);
  state.tasks.main.kotone_main_01.flags.part_time_cancelled = true;
  state.tasks.wallet.fame = 30;
  state.tasks.wallet.money = 1000;
  const main01 = HatsuTasks.evaluateNumericMainQuests(state);
  assert.ok(main01.includes("kotone_main_01"));

  state.tasks.main.kotone_main_02.flags.praise_count = 20;
  const main02 = HatsuTasks.evaluateNumericMainQuests(state);
  assert.ok(main02.includes("kotone_main_02"));

  state.tasks.main.kotone_main_03.flags.rest_sessions = 2;
  state.stamina = 95;
  const main03 = HatsuTasks.evaluateNumericMainQuests(state);
  assert.ok(main03.includes("kotone_main_03"));
});

test("kotone rest action records rest sessions for main quest 03", () => {
  const HatsuTasks = loadHatsuTasks();
  const state = baseKotoneSandboxState();
  finishKotoneScoutFlow(HatsuTasks, state);
  state.stamina = 95;
  HatsuTasks.onSandboxRestSettled(state);
  HatsuTasks.onSandboxRestSettled(state);
  assert.equal(state.tasks.main.kotone_main_03.flags.rest_sessions, 2);
  assert.equal(state.tasks.main.kotone_main_03.status, "completed");
});

test("kotone praise and part-time flags parse from AI reply", () => {
  const HatsuTasks = loadHatsuTasks();
  const state = baseKotoneSandboxState();
  finishKotoneScoutFlow(HatsuTasks, state);
  const flags = HatsuTasks.applyQuestFlagsFromReply(state, "【初星任务标记】praise_kotone【初星任务标记】part_time_cancelled");
  assert.ok(flags.notices.includes("已记录一次对琴音的夸奖"));
  assert.ok(flags.notices.includes("已确认琴音取消快餐店打工"));
  assert.equal(state.tasks.main.kotone_main_02.flags.praise_count, 1);
  assert.equal(state.tasks.main.kotone_main_01.flags.part_time_cancelled, true);
});

test("sandbox selectable idols include saki with scout and personal quests", () => {
  const HatsuTasks = loadHatsuTasks();
  assert.ok(HatsuTasks.SANDBOX_SELECTABLE_IDOLS.includes("花海咲季"));
  assert.equal(HatsuTasks.SANDBOX_IDOL_QUEST_PACKS["花海咲季"].scoutId, "scout_saki");
  assert.equal(HatsuTasks.SANDBOX_IDOL_QUEST_PACKS["花海咲季"].personalIds, HatsuTasks.SAKI_PERSONAL_IDS);
  assert.equal(HatsuTasks.MAIN_QUEST_META.saki_main_01.title, "解决担当面对的矛盾：天才的停滞感");
});

test("saki scout completes and unlocks only saki personal quests", () => {
  const HatsuTasks = loadHatsuTasks();
  const state = baseSakiSandboxState();
  HatsuTasks.ensureTasksShape(state);
  finishSakiScoutFlow(HatsuTasks, state);
  assert.equal(state.tasks.main.scout_saki.status, "completed");
  assert.equal(state.tasks.main.saki_main_01.status, "active");
  assert.equal(state.tasks.main.saki_main_02.status, "active");
  assert.equal(state.tasks.main.saki_main_03.status, "active");
  assert.equal(state.tasks.main.temari_main_01.status, "locked");
  assert.equal(state.tasks.main.kotone_main_01.status, "locked");
  assert.equal(state.tasks.baseline.Vo, 105);
  assert.equal(state.tasks.baseline.Vi, 100);
});

test("saki main quest prompt frames rivalry and sister identity", () => {
  const HatsuTasks = loadHatsuTasks();
  const state = baseSakiSandboxState();
  finishSakiScoutFlow(HatsuTasks, state);
  state.sandbox.inviteComplete = true;
  const prompt = HatsuTasks.buildSandboxMainQuestPromptBlock(state, "playground");
  assert.match(prompt, /天才的停滞感/);
  assert.match(prompt, /最强姐姐的谎言/);
  assert.match(prompt, /把私欲升华为胜利/);
  assert.match(prompt, /【初星任务完成】saki_main_01/);
  assert.match(prompt, /【初星任务完成】saki_main_02/);
  assert.match(prompt, /【初星任务完成】saki_main_03/);
});
test("sandbox selectable idols include misuzu with scout and personal quests", () => {
  const HatsuTasks = loadHatsuTasks();
  assert.ok(HatsuTasks.SANDBOX_SELECTABLE_IDOLS.includes("秦谷美铃"));
  assert.equal(HatsuTasks.SANDBOX_IDOL_QUEST_PACKS["秦谷美铃"].scoutId, "scout_misuzu");
  assert.equal(HatsuTasks.SANDBOX_IDOL_QUEST_PACKS["秦谷美铃"].personalIds, HatsuTasks.MISUZU_PERSONAL_IDS);
  assert.equal(HatsuTasks.MAIN_QUEST_META.misuzu_main_01.title, "解决担当面对的矛盾：慢步调的野心");
});


test("sandbox selectable idols include hiro with scout and personal quests", () => {
  const HatsuTasks = loadHatsuTasks();
  const hiro = "筱泽广";
  assert.ok(HatsuTasks.SANDBOX_SELECTABLE_IDOLS.includes(hiro));
  assert.equal(HatsuTasks.SANDBOX_IDOL_QUEST_PACKS[hiro].scoutId, "scout_hiro");
  assert.deepEqual(HatsuTasks.SANDBOX_IDOL_QUEST_PACKS[hiro].personalIds, HatsuTasks.HIRO_PERSONAL_IDS);
  assert.equal(HatsuTasks.MAIN_QUEST_META.hiro_main_01.category, "conflict");
});

test("sandbox selectable idols include lilja with scout and personal quests", () => {
  const HatsuTasks = loadHatsuTasks();
  assert.ok(HatsuTasks.SANDBOX_SELECTABLE_IDOLS.includes("葛城莉莉娅"));
  assert.equal(HatsuTasks.SANDBOX_IDOL_QUEST_PACKS["葛城莉莉娅"].scoutId, "scout_lilja");
  assert.deepEqual(HatsuTasks.SANDBOX_IDOL_QUEST_PACKS["葛城莉莉娅"].personalIds, HatsuTasks.LILJA_PERSONAL_IDS);
  assert.equal(HatsuTasks.MAIN_QUEST_META.scout_lilja.title, "担当物色：葛城莉莉娅");
  assert.equal(HatsuTasks.MAIN_QUEST_META.lilja_main_01.title, "解决担当面对的矛盾：自信的起点");
});

test("lilja scout completes and unlocks only lilja personal quests", () => {
  const HatsuTasks = loadHatsuTasks();
  const state = baseLiljaSandboxState();
  HatsuTasks.ensureTasksShape(state);
  finishLiljaScoutFlow(HatsuTasks, state);
  assert.equal(state.tasks.main.scout_lilja.status, "completed");
  assert.equal(state.tasks.main.lilja_main_01.status, "active");
  assert.equal(state.tasks.main.lilja_main_02.status, "active");
  assert.equal(state.tasks.main.lilja_main_03.status, "active");
  assert.equal(state.tasks.main.temari_main_01.status, "locked");
  assert.equal(state.tasks.main.kotone_main_01.status, "locked");
  assert.equal(state.tasks.main.saki_main_01.status, "locked");
  assert.equal(state.tasks.main.misuzu_main_01.status, "locked");
  assert.equal(state.tasks.main.hiro_main_01.status, "locked");
  assert.equal(state.tasks.baseline.Vo, 80);
  assert.equal(state.tasks.baseline.Vi, 115);
});

test("lilja main quest prompt frames the three confidence steps", () => {
  const HatsuTasks = loadHatsuTasks();
  const state = baseLiljaSandboxState();
  finishLiljaScoutFlow(HatsuTasks, state);
  state.sandbox.inviteComplete = true;
  const prompt = HatsuTasks.buildSandboxMainQuestPromptBlock(state, "idol_classroom");
  assert.match(prompt, /自信的起点/);
  assert.match(prompt, /自信的表达/);
  assert.match(prompt, /自信的见证/);
  assert.match(prompt, /【初星任务完成】lilja_main_01/);
  assert.match(prompt, /【初星任务完成】lilja_main_02/);
  assert.match(prompt, /【初星任务完成】lilja_main_03/);
});

test("misuzu scout completes and unlocks only misuzu personal quests", () => {
  const HatsuTasks = loadHatsuTasks();
  const state = baseMisuzuSandboxState();
  HatsuTasks.ensureTasksShape(state);
  finishMisuzuScoutFlow(HatsuTasks, state);
  assert.equal(state.tasks.main.scout_misuzu.status, "completed");
  assert.equal(state.tasks.main.misuzu_main_01.status, "active");
  assert.equal(state.tasks.main.misuzu_main_02.status, "active");
  assert.equal(state.tasks.main.misuzu_main_03.status, "active");
  assert.equal(state.tasks.main.temari_main_01.status, "locked");
  assert.equal(state.tasks.main.kotone_main_01.status, "locked");
  assert.equal(state.tasks.main.saki_main_01.status, "locked");
  assert.equal(state.tasks.baseline.Vo, 100);
  assert.equal(state.tasks.baseline.Vi, 115);
});

test("misuzu main quest prompt frames slow ambition and SyngUp past", () => {
  const HatsuTasks = loadHatsuTasks();
  const state = baseMisuzuSandboxState();
  finishMisuzuScoutFlow(HatsuTasks, state);
  state.sandbox.inviteComplete = true;
  const prompt = HatsuTasks.buildSandboxMainQuestPromptBlock(state, "courtyard");
  assert.match(prompt, /慢步调的野心/);
  assert.match(prompt, /温柔里的独占欲/);
  assert.match(prompt, /比太阳更高的地方/);
  assert.match(prompt, /【初星任务完成】misuzu_main_01/);
  assert.match(prompt, /【初星任务完成】misuzu_main_02/);
  assert.match(prompt, /【初星任务完成】misuzu_main_03/);
});
test("second idol unlock appears after full mainline completion", () => {
  const HatsuTasks = loadHatsuTasks();
  const state = baseKotoneSandboxState();
  finishKotoneScoutFlow(HatsuTasks, state);
  state.sandbox.inviteComplete = true;
  state.freeMode = { relationships: { "藤田琴音": { 好感度: 100, 更新日: 1 } } };
  Object.keys(HatsuTasks.MAIN_QUEST_META).forEach((id) => {
    if (id === "scout_temari" || id.startsWith("temari_main")) return;
    if (state.tasks.main[id]) state.tasks.main[id].status = "completed";
  });
  HatsuTasks.syncProducedIdolsAndSecondUnlock(state);
  const snapshot = HatsuTasks.getTaskPanelSnapshot(state);
  assert.equal(snapshot.secondIdol.unlocked, true);
  assert.ok(snapshot.secondIdol.candidates.includes("月村手毬"));
  const begin = HatsuTasks.beginSecondIdolScout(state, "月村手毬");
  assert.equal(begin.ok, true);
  assert.equal(state.tasks.main.scout_temari.status, "active");
  assert.equal(state.sandbox.scoutTargetIdol, "月村手毬");
});

test("confirmed idol task state activates only that idol pack", () => {
  const HatsuTasks = loadHatsuTasks();
  const taskState = HatsuTasks.createConfirmedIdolTaskState("葛城莉莉娅");

  assert.equal(taskState.main.scout_lilja.status, "completed");
  assert.equal(taskState.main.lilja_main_01.status, "active");
  assert.equal(taskState.main.lilja_main_02.status, "active");
  assert.equal(taskState.main.temari_main_01.status, "locked");
  assert.equal(taskState.main.relationship_20.status, "active");
  assert.equal(taskState.main.first_live_success.status, "active");
});
