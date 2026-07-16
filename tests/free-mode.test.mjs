import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

function readFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const next = source.indexOf("\n  function ", start + 1);
  return source.slice(start, next === -1 ? source.length : next);
}

test("free mode unlocks after First Live completion with entry overlay and world map", () => {
  assert.match(source, /postLiveDay: 1/);
  assert.match(source, /clockMinutes: FREE_MODE_DAY_START_MINUTES/);
  assert.match(source, /presence: \{\}/);
  assert.match(source, /relationships: \{\}/);
  assert.match(source, /npcRelationships: \{\}/);
  assert.match(source, /function completeFirstLivePostFlow\(/);
  assert.match(readFunction("completeFirstLivePostFlow"), /openFreeModeEntryOverlay\(\)/);
  assert.match(html, /id="freeModeEntryOverlay"/);
  assert.match(html, /id="freeModeStage"/);
  assert.match(html, /id="worldMapHotspots"/);
  assert.match(html, /id="freeModeStatusBadge"/);
  assert.match(html, /id="vnFreeModeClock"/);
  assert.match(readFunction("updateFreeModeHeader"), /vnFreeModeClock/);
  assert.match(html, /id="freeModeTimeOverlay"/);
  assert.match(html, /id="freeModeAdvanceDayBtn"/);
  assert.match(readFunction("updateFreeModeTimeOverlayUI"), /formatFreeModeClock\(\)/);
  assert.doesNotMatch(readFunction("updateFreeModeTimeOverlayUI"), /overlay\.hidden/);
  assert.match(readFunction("applyFreeModeManualTimeAdvance"), /advanceFreeModeTime/);
  assert.match(readFunction("handleFreeModeAdvanceDay"), /advanceFreeModeToNextDay/);
  assert.match(readFunction("advanceFreeModeToNextDay"), /runFreeModeWorldDailyTick/);
  assert.match(html, /id="producerApartmentStage"/);
  assert.match(html, /id="apartmentSleepBtn"/);
  assert.match(html, /id="apartmentDaySummaryBtn"/);
  assert.match(html, /id="apartmentInviteBtn"/);
  assert.match(html, /id="apartmentInviteOverlay"/);
  assert.match(source, /function getApartmentNsfwEligibleIdols\(/);
  assert.match(source, /function startApartmentNsfwInvite\(/);
  assert.match(readFunction("getApartmentNsfwEligibleIdols"), /INTIMACY_NSFW_UNLOCK_TRUST/);
  assert.match(readFunction("startApartmentNsfwInvite"), /apartmentInvite:\s*true/);
  assert.match(source, /function isProducerApartmentActive\(/);
  assert.match(source, /Producer_Apartment\.png/);
  assert.match(source, /eveningJournal/);
  assert.match(html, /id="freeModePhoneBtn"/);
  assert.doesNotMatch(html, /id="freeModeBackBtn"/);
});

test("world map locations and free mode time rules are wired", () => {
  assert.match(source, /const WORLD_MAP_LOCATIONS = \[/);
  assert.match(source, /id: "dining_hall"/);
  assert.match(source, /id: "student_store"/);
  assert.match(source, /WORLD_MAP_LOCATION_SCENES/);
  assert.match(readFunction("getSceneBackground"), /getMapLocationSceneBackground/);
  assert.match(source, /FREE_MODE_DAY_END_MINUTES = 22 \* 60/);
  assert.match(source, /FREE_MODE_LATE_END_MINUTES = 23 \* 60/);
  assert.match(source, /function openEveningGoHomePrompt\(/);
  assert.match(source, /function handleEveningGoHomeChoice\(/);
  assert.match(source, /function canBringAssignedIdolHome\(/);
  assert.match(readFunction("canBringAssignedIdolHome"), /INTIMACY_NSFW_UNLOCK_TRUST/);
  assert.match(readFunction("getEveningGoHomeOptions"), /带担当回家/);
  assert.match(readFunction("isFreeModeTravelAllowed"), /getFreeModeTravelEndMinutes\(\)/);
  assert.match(readFunction("advanceFreeModeTime"), /maybeTriggerEveningGoHomePrompt/);
  assert.doesNotMatch(readFunction("syncProducerApartmentState"), /enterProducerApartmentIfNeeded/);
  assert.match(readFunction("advanceFreeModeTime"), /FREE_MODE_MAP_CHOICE_MINUTES/);
  assert.match(source, /FREE_MODE_MAP_ARRIVAL_MINUTES = 15/);
  assert.match(source, /FREE_MODE_MAP_CHOICE_MINUTES = 15/);
  assert.match(source, /FREE_MODE_PRESENCE_CHANCE = 0\.2/);
  assert.match(readFunction("beginMapLocationExploreSession"), /advanceFreeModeTime\(FREE_MODE_MAP_ARRIVAL_MINUTES\)/);
  assert.match(readFunction("handleMapLocationChoiceSelection"), /advanceFreeModeTime\(chosenMinutes\)/);
  assert.match(source, /FREE_MODE_MAP_DUSK_START_MINUTES = 17 \* 60/);
  assert.match(source, /Gakuen_Dawn\.png/);
  assert.match(source, /Gakuen_Night\.png/);
  assert.doesNotMatch(source, /Gakuen_Midnight\.png/);
  assert.match(readFunction("getWorldMapImageForClock"), /WORLD_MAP_IMAGE_NIGHT/);
  assert.match(readFunction("renderFreeModeStage"), /updateWorldMapImage\(\)/);
  assert.match(readFunction("rollFreeModePresence"), /refreshWorldPresenceFromRules/);
  assert.match(source, /dataset\.action === "world_map"/);
});

test("manual time advancement refreshes the producer apartment state", () => {
  const calls = [];
  const sandbox = {
    state: { freeMode: { clockMinutes: 21 * 60 + 20, activeLocationId: "producer_apartment" } },
    isFreeModeActive: () => true,
    isFreeModeTravelAllowed: () => true,
    isMapLocationExploreActive: () => false,
    parseFreeModeManualAdvanceMinutes: () => 40,
    ensureFreeModeTimeDefaults: () => {},
    getFreeModeTravelEndMinutes: () => 22 * 60,
    advanceFreeModeTime(minutes) {
      calls.push(["advance", minutes]);
      sandbox.state.freeMode.clockMinutes += minutes;
      return { hitDayEnd: true };
    },
    saveState: () => calls.push("save"),
    scanStorytellerNotificationAtCheckpoint: () => calls.push("scan"),
    renderFreeModeStage: () => calls.push("render-map"),
    renderProducerApartmentStage: () => calls.push("render-apartment"),
    updateFreeModeTimeOverlayUI: () => calls.push("render-time-overlay"),
    showToast: () => calls.push("toast"),
    formatFreeModeClock: () => "22:00",
    maybeTriggerEveningGoHomePrompt: () => calls.push("evening-prompt")
  };
  vm.runInNewContext(`${readFunction("applyFreeModeManualTimeAdvance")}; this.advance = applyFreeModeManualTimeAdvance;`, sandbox);

  sandbox.advance(40);

  assert.equal(sandbox.state.freeMode.clockMinutes, 22 * 60);
  assert.ok(calls.indexOf("render-map") > calls.findIndex((call) => Array.isArray(call) && call[0] === "advance"));
  assert.ok(calls.indexOf("render-apartment") > calls.findIndex((call) => Array.isArray(call) && call[0] === "advance"));
});


test("sandbox scout prompt handles wrong location as clue search", () => {
  const sandbox = {
    FREE_MODE_OUTING_LOCATION_ID: "free_outing",
    state: { idol: "月村手毬", boundCharacter: { name: "初星学园" } },
    globalThis: {},
    getWorldMapLocation(id) {
      return id === "special_education"
        ? { id, name: "特教栋", description: "训练室很多。" }
        : { id, name: "中庭", description: "安静的中庭。" };
    },
    buildMapLocationPresenceLine() {
      return "物色目标 月村手毬 今天不在这里；背景偶像仅供远观。";
    },
    getSandboxScoutTargetAtLocation(locationId) {
      return locationId === "special_education" ? "月村手毬" : "";
    },
    getHatsuWorldHelpers() { return {}; },
    formatCampusDayLabel() { return "学园第 1 天"; },
    formatFreeModeClock() { return "8:15"; },
    composeWorldSummaryBlock() { return ""; },
    buildProducerPromptSection() { return "制作人设定：温柔耐心"; },
    summarizeMapExploreContext() { return "（暂无上文）"; },
    buildMapExplorePlayRules() { return "连续选项探索。"; },
    galgameRenderContract() { return "渲染规则。"; },
    buildMapExploreChoiceOutputBlock() { return "输出规则。"; },
    isChinaHomeScoutBedroomActive() { return false; },
    getActiveFreeModeOutingFacility() { return null; }
  };
  sandbox.globalThis = sandbox;
  sandbox.HatsuTasks = { getScoutQuestId: () => "scout_temari" };
  sandbox.HatsuWorld = {
    campusBehavior: { getScoutTargetLocation: () => "special_education" }
  };
  vm.runInNewContext(`${readFunction("buildSandboxScoutExplorePrompt")}`, sandbox);

  const wrongLocationPrompt = sandbox.buildSandboxScoutExplorePrompt("courtyard");
  assert.match(wrongLocationPrompt, /不在这里/);
  assert.match(wrongLocationPrompt, /不要写制作人与 月村手毬 初次接触/);
  assert.match(wrongLocationPrompt, /前往 特教栋/);
  assert.match(wrongLocationPrompt, /不得输出【初星任务完成】scout_temari或 quest_complete/);
  assert.doesNotMatch(wrongLocationPrompt, /同意签约时/);

  const rightLocationPrompt = sandbox.buildSandboxScoutExplorePrompt("special_education");
  assert.match(rightLocationPrompt, /与 月村手毬 初次接触/);
  assert.match(rightLocationPrompt, /同意签约时/);
});
test("map location explore uses choice flow with return to map", () => {
  assert.match(source, /action === "map_location"/);
  assert.match(readFunction("beginMapLocationExploreSession"), /getMapExplorePrompt/);
  assert.match(readFunction("bindWorldMapHotspotInteractions"), /handleWorldMapHotspotClick\(location\.id\)/);
  assert.match(readFunction("confirmMapLocationEntry"), /isSandboxScoutTalkAvailable/);
  assert.match(readFunction("buildSandboxScoutExplorePrompt"), /物色搭话/);
  assert.match(html, /id="mapLocationEnterWithIdolBtn"/);
  assert.match(html, /和担当一起来/);
  assert.match(html, /id="mapLocationEnterAloneBtn"/);
  assert.match(html, /自己来/);
  assert.match(readFunction("buildMapLocationExplorePrompt"), /buildMapLocationVisitModeLine/);
  assert.match(readFunction("buildMapLocationExplorePrompt"), /buildFreeModeRelationshipPromptBlock/);
  assert.match(readFunction("buildMapLocationExplorePrompt"), /buildMapExploreChoiceOutputBlock/);
  assert.match(html, /id="mapLocationPresenceAvatars"/);
  assert.match(readFunction("openMapLocationOverlay"), /renderMapLocationPresence/);
  assert.match(readFunction("renderMapLocationPresence"), /map-location-presence-avatar/);
  assert.match(readFunction("renderWorldMapIdolMarkers"), /profile\.avatar/);
  assert.match(readFunction("returnToFreeModeMap"), /activeLocationId = null/);
  assert.match(readFunction("handleMapLocationChoiceSelection"), /requestNextMapLocationOptions\(mapDispatch,/);
  assert.match(readFunction("handleApartmentCompanionChoiceSelection"), /requestNextApartmentCompanionOptions\(\)/);
  assert.doesNotMatch(readFunction("handleApartmentCompanionChoiceSelection"), /closeApartmentCompanionSession\(\)/);
  assert.match(source, /function requestNextMapLocationOptions\(/);
  assert.match(readFunction("requestNextMapLocationOptions"), /continuation: true/);
  assert.doesNotMatch(readFunction("appendMapLocationControlButtons"), /继续探索/);
  assert.doesNotMatch(source, /function buildMapLocationAfterChoicePrompt\(/);
  assert.match(readFunction("buildMapLocationExplorePrompt"), /不要写选项被选中后的收尾/);
  assert.match(readFunction("buildMapLocationExplorePrompt"), /<time1>/);
  assert.match(readFunction("handleMapLocationChoiceSelection"), /resolveMapOptionMinutes/);
  assert.match(source, /function buildMapLocationExplorePrompt\(/);
  assert.match(source, /function buildMapLocationReturnPrompt\(/);
  assert.match(readFunction("handleMapLocationReturn"), /getMapExploreReturnPrompt/);
});

test("school entrance supports off-campus outing with preset destinations", () => {
  assert.match(html, /id="mapLocationOutingBtn"/);
  assert.match(html, /id="freeModeOutingOverlay"/);
  assert.match(html, /id="freeModeOutingDestinationList"/);
  assert.match(html, /id="offCampusTransitMap"/);
  assert.match(source, /const OFF_CAMPUS_TRANSIT_STATIONS = \[/);
  assert.match(source, /id: "shopping_street"/);
  assert.match(source, /id: "shopping_mall"/);
  assert.match(source, /id: "aquarium"/);
  assert.match(source, /id: "sports_center"/);
  assert.match(source, /id: "saki_home"/);
  assert.match(source, /id: "china_home"/);
  assert.doesNotMatch(source, /name: "游戏厅", description/);
  assert.doesNotMatch(source, /name: "拉面店", description/);
  assert.match(source, /"拉面店", "琴音打工的快餐店"/);
  assert.match(source, /"甜品店", "游戏厅"/);
  assert.match(readFunction("isSandboxOffCampusExitAtEntrance"), /school_entrance/);
  assert.match(readFunction("isSandboxOffCampusExitAtEntrance"), /isSandboxLaunch/);
  assert.match(readFunction("isSandboxOffCampusExitAtEntrance"), /isSandboxScoutActive/);
  assert.match(readFunction("handleWorldMapHotspotClick"), /openFreeModeOutingOverlay/);
  assert.match(readFunction("handleWorldMapHotspotClick"), /openMapLocationOverlay/);
  assert.match(readFunction("openMapLocationOverlay"), /mapLocationOutingBtn/);
  assert.match(readFunction("openMapLocationOverlay"), /isSandboxOffCampusExitAtEntrance/);
  assert.match(readFunction("openFreeModeOutingOverlay"), /renderOffCampusTransitMap/);
  assert.match(readFunction("openFreeModeOutingOverlay"), /FREE_MODE_OUTING_DESTINATIONS\.forEach/);
  assert.match(readFunction("renderOffCampusTransitMap"), /off-campus-line-main/);
  assert.match(readFunction("renderOffCampusTransitMap"), /is-locked/);
  assert.match(readFunction("confirmFreeModeOutingDestination"), /startFreeModeOuting/);
  assert.match(readFunction("startFreeModeOuting"), /FREE_MODE_OUTING_LOCATION_ID/);
  assert.match(readFunction("beginMapLocationExploreSession"), /isOffCampus/);
  assert.match(readFunction("beginMapLocationExploreSession"), /getMapExplorePrompt/);
  assert.match(readFunction("buildFreeModeOutingExplorePrompt"), /校外外出探索/);
  assert.match(readFunction("buildFreeModeOutingExplorePrompt"), /与育成日程外出完全不同/);
  assert.match(readFunction("buildFreeModeOutingExplorePrompt"), /连续多轮选择 option/);
  assert.match(readFunction("buildFreeModeOutingExplorePrompt"), /buildFreeModeRelationshipPromptBlock/);
  assert.doesNotMatch(readFunction("confirmFreeModeOutingDestination"), /settleAction\("outing"/);
});

test("China scout can leave campus only to enter the Kuramoto bedroom", () => {
  assert.match(source, /function isChinaHomeScoutActive\(/);
  assert.match(readFunction("isSandboxOffCampusExitAtEntrance"), /isChinaHomeScoutActive/);
  assert.match(readFunction("confirmFreeModeOutingDestination"), /isChinaHomeScoutActive/);
  assert.match(readFunction("confirmFreeModeOutingDestination"), /venue\.id !== "china_home"/);
  assert.match(readFunction("confirmFreeModeOutingDestination"), /facilityId: "bedroom"/);
  assert.match(readFunction("confirmFreeModeOutingDestination"), /selectedIdol: "仓本千奈"/);
  assert.match(readFunction("buildFreeModeOutingExplorePrompt"), /buildSandboxScoutExplorePrompt/);
  assert.match(readFunction("handleFreeModeOutingIdolAction"), /isChinaHomeScoutBedroomActive/);
  assert.match(readFunction("handleFreeModeOutingIdolAction"), /startFreeModeOutingFacilityExplore/);
});

test("sandbox First Live rules normalize challenge state and calculate tiered average rates", () => {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(`${readFunction("defaultSandboxFirstLiveChallenge")}; ${readFunction("normalizeSandboxFirstLiveChallenge")}; ${readFunction("getSandboxFirstLiveContributionRate")}; ${readFunction("calculateSandboxFirstLiveSuccessRate")}; this.api = { defaultSandboxFirstLiveChallenge, normalizeSandboxFirstLiveChallenge, getSandboxFirstLiveContributionRate, calculateSandboxFirstLiveSuccessRate };`, sandbox);
  const api = sandbox.api;
  assert.deepEqual(JSON.parse(JSON.stringify(api.defaultSandboxFirstLiveChallenge())), {
    schemaVersion: 1, status: "available", attemptCount: 0, lastAttemptDay: null,
    nextAvailableDay: null, activeAttempt: null, history: []
  });
  assert.equal(api.getSandboxFirstLiveContributionRate(399), 0);
  assert.equal(api.getSandboxFirstLiveContributionRate(400), 0.5);
  assert.equal(api.getSandboxFirstLiveContributionRate(499), 0.5);
  assert.equal(api.getSandboxFirstLiveContributionRate(500), 0.8);
  assert.equal(api.getSandboxFirstLiveContributionRate(599), 0.8);
  assert.equal(api.getSandboxFirstLiveContributionRate(600), 1);
  assert.equal(api.calculateSandboxFirstLiveSuccessRate({ Vo: 650, Da: 550, Vi: 450 }), 0.7667);
  const migrated = api.normalizeSandboxFirstLiveChallenge({ status: "garbage", attemptCount: -2, history: [{ attemptId: "x" }] });
  assert.equal(migrated.status, "available");
  assert.equal(migrated.attemptCount, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(migrated.history)), []);
});

test("sandbox First Live can start through 19:00 but not after", () => {
  const sandbox = {};
  vm.runInNewContext(`
    const FIRST_LIVE_START_DEADLINE_MINUTES = 19 * 60;
    ${readFunction("canStartSandboxFirstLiveAt")}
    this.canStart = canStartSandboxFirstLiveAt;
  `, sandbox);

  assert.equal(sandbox.canStart(8 * 60), true);
  assert.equal(sandbox.canStart(19 * 60), true);
  assert.equal(sandbox.canStart(19 * 60 + 1), false);

  assert.match(readFunction("prepareSandboxFirstLiveAttempt"), /canStartSandboxFirstLiveAt/);
  assert.match(readFunction("getSandboxFirstLiveChallengeStatusText"), /canStartSandboxFirstLiveAt/);
  assert.match(readFunction("updateMapLocationEntryActions"), /canStartSandboxFirstLiveAt/);
  assert.doesNotMatch(readFunction("prepareSandboxFirstLiveAttempt"), /too_early/);
});

test("sandbox map exposes stage and dormitory with dedicated entry actions", () => {
  assert.match(source, /id: "campus_stage"/);
  assert.match(source, /id: "student_dormitory"/);
  assert.match(readFunction("getHybridFacilityKind"), /student_dormitory/);
  assert.match(readFunction("getHybridFacilityKind"), /campus_stage/);
  assert.match(readFunction("updateMapLocationEntryActions"), /firstLive|student_dormitory|rest/);
  assert.match(html, /mapLocationEnterFacilityBtn/);
});

test("dormitory and campus stage use their dedicated scene backgrounds", () => {
  assert.equal(existsSync(new URL("../assets/scenes/Dorm.png", import.meta.url)), true);
  assert.equal(existsSync(new URL("../assets/scenes/Big_Stage.png", import.meta.url)), true);
  assert.match(source, /student_dormitory:\s*"\.\/assets\/scenes\/Dorm\.png"/);
  assert.match(source, /campus_stage:\s*"\.\/assets\/scenes\/Big_Stage\.png"/);
  assert.match(source, /id:\s*"student_dormitory"[^\n]+image:\s*"\.\/assets\/scenes\/Dorm\.png"/);
  assert.match(source, /id:\s*"campus_stage"[^\n]+image:\s*"\.\/assets\/scenes\/Big_Stage\.png"/);
  assert.match(readFunction("getSceneBackground"), /WORLD_MAP_LOCATION_SCENES\[state\.freeMode\.facilityLocationId\]/);
});

test("student dormitory rest is available throughout map hours and uses two hours", () => {
  assert.match(source, /STUDENT_DORMITORY_REST_MINUTES|DORMITORY_REST_MINUTES/);
  assert.match(readFunction("openHybridFacility"), /rest/);
  assert.match(readFunction("openHybridFacility"), /getHybridFacilityActionMinutes|120|STUDENT_DORMITORY_REST_MINUTES/);
  assert.match(readFunction("openHybridFacility"), /stamina/);

  const runOpen = ({ clockMinutes, stamina }) => {
    const calls = [];
    const sandbox = {
      state: { stamina, freeMode: { clockMinutes, facilityKind: null, facilityLocationId: null } },
      isHybridCampusMode: () => true,
      isFreeModeActive: () => true,
      isFreeModeTravelAllowed: () => true,
      isSandboxCampusExhausted: () => calls.push("campus-limit-read"),
      showSandboxCampusLimitToast: () => calls.push("campus-limit-toast"),
      getWorldMapLocation: () => ({ id: "student_dormitory", name: "学生宿舍" }),
      showToast: (...args) => calls.push(["toast", ...args]),
      saveState: () => calls.push("save"),
      render: () => calls.push("render"),
      HYBRID_FACILITY_ACTION_MINUTES: 60,
      STUDENT_DORMITORY_REST_MINUTES: 120
    };
    vm.runInNewContext(`${readFunction("getHybridFacilityActionMinutes")}; ${readFunction("openHybridFacility")}; this.open = openHybridFacility;`, sandbox);
    sandbox.open("rest", "student_dormitory");
    return { state: sandbox.state, calls };
  };

  const morning = runOpen({ clockMinutes: 8 * 60, stamina: 40 });
  assert.equal(morning.state.freeMode.facilityKind, "rest");
  assert.equal(morning.calls.includes("save"), true);

  const full = runOpen({ clockMinutes: 20 * 60, stamina: 100 });
  assert.equal(full.state.freeMode.facilityKind, null);
  assert.equal(full.calls.includes("save"), false);

  const ready = runOpen({ clockMinutes: 20 * 60, stamina: 40 });
  assert.equal(ready.state.freeMode.facilityKind, "rest");
  assert.equal(ready.state.freeMode.facilityLocationId, "student_dormitory");
  assert.equal(ready.calls.includes("save"), true);
  assert.equal(ready.calls.includes("campus-limit-read"), false);
});

test("sandbox First Live settlement freezes one roll and never re-rolls on replay", () => {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(`${readFunction("getSandboxFirstLiveContributionRate")}; ${readFunction("calculateSandboxFirstLiveSuccessRate")}; ${readFunction("buildSandboxFirstLiveSettlement")}; this.api = { buildSandboxFirstLiveSettlement };`, sandbox);
  const first = sandbox.api.buildSandboxFirstLiveSettlement({ Vo: 650, Da: 550, Vi: 450 }, 0.75);
  const replay = sandbox.api.buildSandboxFirstLiveSettlement(first.snapshot, first.roll);
  assert.equal(first.roll, 0.75);
  assert.equal(first.successRate, 0.7667);
  assert.equal(first.success, true);
  assert.deepEqual(JSON.parse(JSON.stringify(replay)), JSON.parse(JSON.stringify(first)));
});

test("sandbox First Live confirmation requires a lease before challenge mutation", () => {
  assert.match(source, /function prepareSandboxFirstLiveAttempt\(/);
  assert.match(readFunction("prepareSandboxFirstLiveAttempt"), /tryAcquirePrimaryModelChannel/);
  assert.match(readFunction("prepareSandboxFirstLiveAttempt"), /sandbox_first_live/);
  assert.match(readFunction("prepareSandboxFirstLiveAttempt"), /Math\.random/);
  assert.ok(readFunction("prepareSandboxFirstLiveAttempt").indexOf("tryAcquirePrimaryModelChannel") < readFunction("prepareSandboxFirstLiveAttempt").indexOf("Math.random"));
  assert.match(readFunction("prepareSandboxFirstLiveAttempt"), /180|FIRST_LIVE_ACTION_MINUTES/);
});

test("sandbox First Live prompt and parser require both live blocks", () => {
  const sandbox = { state: { idol: "月村手毬", freeMode: { postLiveDay: 2 } } };
  vm.runInNewContext(`${readFunction("buildSandboxFirstLivePrompt")}; ${readFunction("extractSandboxFirstLiveNarrative")}; this.api = { buildSandboxFirstLivePrompt, extractSandboxFirstLiveNarrative };`, sandbox);
  const prompt = sandbox.api.buildSandboxFirstLivePrompt({
    attemptDay: 2,
    snapshot: { Vo: 650, Da: 550, Vi: 450 },
    contributionRates: { Vo: 1, Da: 0.8, Vi: 0.5 },
    successRate: 0.7667,
    roll: 0.2,
    success: true
  });
  assert.match(prompt, /live_pre/);
  assert.match(prompt, /live_post/);
  const valid = sandbox.api.extractSandboxFirstLiveNarrative("【live_pre开始】登台前的准备与觉悟足够长。 【live_pre结束】\n【live_post开始】演出后的复盘与情绪变化足够长。 【live_post结束】");
  assert.equal(valid.pre.includes("登台前"), true);
  assert.equal(valid.post.includes("演出后"), true);
  assert.equal(sandbox.api.extractSandboxFirstLiveNarrative("【live_pre开始】只有前半段。 【live_pre结束】"), null);
});

test("ordinary replies do not crash the sandbox First Live route when no harness turn exists", () => {
  const sandbox = {
    state: { harness: { activeTurn: null } },
    pendingAiRequestId: "request-current",
    activeInboundPrimaryChannelLeaseId: "lease-current",
    isPrimaryModelLeaseCurrent: () => true
  };
  vm.runInNewContext(`${readFunction("isCurrentSandboxFirstLiveReply")}; this.isCurrentReply = isCurrentSandboxFirstLiveReply;`, sandbox);

  assert.equal(sandbox.isCurrentReply("request-current"), false);
});

test("sandbox First Live accepted reply opens the pre-live stage before the post-live stage", () => {
  const body = readFunction("handleSandboxFirstLiveReply");
  assert.match(body, /attempt\.narrative\s*=\s*\{[\s\S]*pre:\s*narrative\.pre[\s\S]*post:\s*narrative\.post/);
  assert.match(body, /presentationStage\s*=\s*"pre"/);
  assert.match(body, /type:\s*"sandboxFirstLivePre"/);
  assert.match(body, /state\.lastStory\s*=\s*narrative\.pre/);
  assert.match(body, /openEventOverlay\([\s\S]*narrative\.pre/);
});

test("sandbox First Live presentation reuses Live Theater without a second model request", () => {
  const startBody = readFunction("startSandboxFirstLivePresentation");
  const postBody = readFunction("showSandboxFirstLivePostStage");
  assert.match(startBody, /idolLiveVideos\[state\.idol\]/);
  assert.match(startBody, /playLiveVideo\(videoUrl, showPostStage\)/);
  assert.match(startBody, /showPostStage\(\)/);
  assert.doesNotMatch(startBody, /requestHostPromptSend|startFirstLivePostStage|Math\.random|advanceFreeModeTime/);
  assert.match(postBody, /type:\s*"sandboxFirstLivePost"/);
  assert.match(postBody, /narrative\.post/);
});

test("sandbox First Live recovery keeps turn identity but rotates request id", () => {
  assert.match(readFunction("retryHarnessNarrativeRecovery"), /sandbox_first_live_recovery/);
  assert.match(readFunction("retryHarnessNarrativeRecovery"), /turnId: turn\.turnId/);
  assert.match(readFunction("retryHarnessNarrativeRecovery"), /requestId = createRequestId/);
  assert.match(readFunction("resolveHarnessRecoveryPrompt"), /generationPrompt/);
  assert.doesNotMatch(readFunction("retryHarnessNarrativeRecovery"), /buildSandboxFirstLivePrompt/);
});

test("sandbox First Live UI exposes time and challenge status gates", () => {
  assert.match(source, /function getSandboxFirstLiveChallengeStatusText\(/);
  assert.match(readFunction("updateMapLocationEntryActions"), /canStartSandboxFirstLiveAt/);
  assert.match(readFunction("updateMapLocationEntryActions"), /recovery_required/);
  assert.match(readFunction("renderActionButtons"), /getSandboxFirstLiveChallengeStatusText/);
});

test("map arrival freezes the pre-travel presence only for the first arrival prompt", () => {
  const begin = readFunction("beginMapLocationExploreSession");
  const presence = readFunction("buildMapLocationPresenceLine");
  const relationships = readFunction("getMapExploreRelationshipIdols");
  assert.match(begin, /arrivalPresenceIds/);
  assert.match(begin, /getIdolsPresentAtLocation\(locationId\)/);
  assert.ok(begin.indexOf("arrivalPresenceIds") < begin.indexOf("advanceFreeModeTime"));
  assert.match(begin, /mapStepKind: "arrival"[\s\S]*arrivalPresenceIds/);
  assert.match(presence, /options/);
  assert.match(presence, /mapStepKind === "arrival"/);
  assert.match(relationships, /mapStepKind === "arrival"/);
  assert.match(relationships, /arrivalPresenceIds/);
});

test("apartment companion custom choice routes from the shared VN input", () => {
  const calls = [];
  const sandbox = {
    document: { getElementById: () => ({ value: "  今天辛苦了，想再聊一会儿  " }) },
    isNsfwIntimacyActive: () => false,
    isMapLocationExploreActive: () => false,
    isApartmentCompanionSessionActive: () => true,
    isChoicePromptMode: () => true,
    handleNsfwIntimacyCustomChoice: () => calls.push("nsfw"),
    handleMapLocationCustomChoice: () => calls.push("map"),
    handleApartmentCompanionCustomChoice: (text) => calls.push(["apartment", text]),
    showToast: () => calls.push("toast")
  };
  vm.runInNewContext(`${readFunction("handleVnCustomChoiceSubmit")}; this.submit = handleVnCustomChoiceSubmit;`, sandbox);

  sandbox.submit();

  assert.deepEqual(calls, [["apartment", "  今天辛苦了，想再聊一会儿  "]]);
});

test("apartment companion custom choice advances ten minutes and requests the entered continuation", () => {
  const calls = [];
  const sandbox = {
    state: {
      pendingActionContext: { action: "apartment_companion", actionContext: { companionIdol: "藤田琴音" } },
      lastStory: "此前的公寓对话",
      selectedChoiceText: "old",
      selectedChoiceRating: "old",
      pendingOptionTexts: ["1", "2", "3", "4"],
      pendingOptionMinutes: [10, 10, 10, 10],
      eventMode: "choice_prompt",
      choiceStep: 1
    },
    advanceFreeModeTime: (minutes) => calls.push(["advance", minutes]),
    appendEveningJournalActivity: (title, detail) => calls.push(["journal", title, detail]),
    saveState: () => calls.push("save"),
    scanStorytellerNotificationAtCheckpoint: (trigger, options) => calls.push(["scan", trigger, options]),
    render: () => calls.push("render"),
    renderProducerApartmentStage: () => calls.push("render-apartment"),
    closeVnChoicesOverlay: () => calls.push("close-choices"),
    requestNextApartmentCompanionOptions: (text) => calls.push(["request-next", text]),
    showToast: (...args) => calls.push(["toast", ...args])
  };
  vm.runInNewContext(`${readFunction("handleApartmentCompanionCustomChoice")}; this.choose = handleApartmentCompanionCustomChoice;`, sandbox);

  sandbox.choose("  今天辛苦了，想再聊一会儿  ");

  assert.ok(sandbox.state.lastStory.includes("今天辛苦了，想再聊一会儿"));
  assert.equal(sandbox.state.pendingOptionTexts.length, 0);
  assert.equal(sandbox.state.pendingOptionMinutes.length, 0);
  assert.deepEqual(calls[0], ["advance", 10]);
  assert.ok(calls.some((call) => Array.isArray(call) && call[0] === "journal" && call[2].includes("今天辛苦了")));
  assert.ok(calls.some((call) => Array.isArray(call) && call[0] === "scan" && call[1] === "time_advance"));
  assert.deepEqual(calls.at(-1), ["request-next", "今天辛苦了，想再聊一会儿"]);
  assert.equal(calls.some((call) => Array.isArray(call) && call[0] === "toast"), false);
});

test("apartment companion custom choice rejects blank input without state writes", () => {
  const calls = [];
  const sandbox = {
    state: { lastStory: "unchanged" },
    showToast: (...args) => calls.push(args),
    advanceFreeModeTime: () => calls.push("forbidden")
  };
  vm.runInNewContext(`${readFunction("handleApartmentCompanionCustomChoice")}; this.choose = handleApartmentCompanionCustomChoice;`, sandbox);

  sandbox.choose("   ");

  assert.equal(sandbox.state.lastStory, "unchanged");
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "还没有内容");
});

test("apartment companion continuation prompt includes the current custom action", () => {
  const sandbox = {
    state: {
      idol: "藤田琴音",
      boundCharacter: { name: "藤田琴音" },
      freeMode: { clockMinutes: 1200 }
    },
    idols: { 藤田琴音: { styles: { companion: "嘴硬但认真回应" } } },
    FREE_MODE_MAP_NIGHT_START_MINUTES: 1200,
    canonicalIdolName: (name) => name,
    getAffinityStageLine: () => "好感阶段",
    getFreeModeRelationshipScore: () => 50,
    getCurrentAffinityIdolName: () => "藤田琴音",
    formatFreeModeDayLabel: () => "学园第 2 天",
    formatFreeModeClock: () => "20:00",
    buildProducerPromptSection: () => "制作人设定",
    summarizeMapExploreContext: () => "此前摘要",
    galgameRenderContract: () => "输出契约",
    buildChoiceHardRules: () => "选项规则"
  };
  vm.runInNewContext(`${readFunction("buildApartmentCompanionChatPrompt")}; this.build = buildApartmentCompanionChatPrompt;`, sandbox);

  const prompt = sandbox.build("藤田琴音", "训练复盘", {
    continuation: true,
    producerAction: "今天辛苦了，想再聊一会儿"
  });

  assert.match(prompt, /制作人本轮自定义输入：今天辛苦了，想再聊一会儿/);
  assert.match(prompt, /优先回应这次输入/);
});

test("map option time tags parse with 15 minute fallback", () => {
  const sandbox = {
    FREE_MODE_MAP_CHOICE_MINUTES: 15,
    FREE_MODE_MAP_MINUTES_MAX: 120,
    clamp: (value, min, max) => Math.min(max, Math.max(min, value)),
    cleanReplyText: (value) => String(value || "").replace(/<[^>]+>/g, "").trim()
  };
  vm.runInNewContext(`
${readFunction("stripAiThinkingBlocks")}
${readFunction("parseMapOptionMinutes")}
${readFunction("resolveMapOptionMinutes")}
${readFunction("extractChoicePayload")}
`, sandbox);
  const source = `【初星正文开始】
<story><narration>讲堂里很安静。</narration></story>
<option1>在后排观察</option1>
<time1>10</time1>
<option2>去和偶像搭话</option2>
<time2>45分钟</time2>
<option3>查看公告板</option3>
<option4>离开去找人</option4>
<time4>200</time4>
【初星正文结束】`;

  const payload = sandbox.extractChoicePayload(source);
  assert.equal(payload.optionMinutes[0], 10);
  assert.equal(payload.optionMinutes[1], 45);
  assert.equal(payload.optionMinutes[2], null);
  assert.equal(payload.optionMinutes[3], 120);
  assert.equal(sandbox.resolveMapOptionMinutes(null), 15);
  assert.equal(sandbox.resolveMapOptionMinutes(30), 30);
});


test("choice reply source prefers a complete option payload over stale raw text", () => {
  const sandbox = {
    FREE_MODE_MAP_CHOICE_MINUTES: 15,
    FREE_MODE_MAP_MINUTES_MAX: 120,
    clamp: (value, min, max) => Math.min(max, Math.max(min, value)),
    cleanReplyText: (value) => String(value || "").replace(/<[^>]+>/g, "").trim(),
    state: {
      eventMode: "choice_prompt",
      pendingActionContext: { action: "map_location" }
    }
  };
  vm.runInNewContext(`
${readFunction("decodeAiReplySource")}
${readFunction("collectAiReplyCandidates")}
${readFunction("stripAiThinkingBlocks")}
${readFunction("isChoicePromptAction")}
${readFunction("isChoicePromptMode")}
${readFunction("parseMapOptionMinutes")}
${readFunction("extractChoicePayload")}
${readFunction("selectAiReplySource")}
`, sandbox);
  const staleRawText = "正在等待角色卡 AI 生成本次小剧情...";
  const completeReply = `【初星正文开始】
<story><narration>食堂里传来餐盘轻碰的声音。</narration></story>
<option1>看看今日菜单</option1>
<time1>15</time1>
<option2>坐到窗边</option2>
<time2>20</time2>
<option3>向琴音推荐甜点</option3>
<time3>25</time3>
<option4>返回大厅</option4>
<time4>10</time4>
【初星正文结束】`;

  assert.equal(sandbox.selectAiReplySource(completeReply, staleRawText, ""), completeReply);
  assert.equal(sandbox.selectAiReplySource("", staleRawText, completeReply), completeReply);
});

test("free mode relationship updates parse and clamp by idol", () => {
  const sandbox = {
    clamp: (value, min, max) => Math.min(max, Math.max(min, value)),
    canonicalIdolName: (value) => String(value || "").trim(),
    idols: {
      "花海咲季": {},
      "月村手毬": {}
    },
    state: {
      day: 1,
      freeMode: {
        postLiveDay: 2,
        relationships: {
          "花海咲季": { 好感度: 99, 更新日: 1 }
        }
      }
    }
  };
  vm.runInNewContext(`
${readFunction("stripAiThinkingBlocks")}
${readFunction("clampFreeModeRelationshipScore")}
${readFunction("normalizeFreeModeRelationshipEntry")}
${readFunction("ensureFreeModeRelationships")}
${readFunction("getFreeModeRelationship")}
${readFunction("extractFreeModeRelationshipUpdate")}
${readFunction("parseFreeModeRelationshipDelta")}
${readFunction("applyFreeModeRelationshipUpdate")}
`, sandbox);
  const reply = `【初星正文开始】
<story>一起确认了下一步。</story>
<option1>继续</option1><time1>15</time1>
<option2>观察</option2><time2>15</time2>
<option3>聊天</option3><time3>15</time3>
<option4>离开</option4><time4>15</time4>
<relationship_update>{"花海咲季":5,"月村手毬":{"好感度":-2},"不存在的偶像":10}</relationship_update>
【初星正文结束】`;

  const update = sandbox.extractFreeModeRelationshipUpdate(reply);
  assert.equal(update["月村手毬"].好感度, -2);
  const applied = sandbox.applyFreeModeRelationshipUpdate(update);
  assert.equal(applied["花海咲季"].好感度, 100);
  assert.equal(applied["花海咲季"].delta, 5);
  assert.equal(applied["月村手毬"].好感度, 0);
  assert.equal(applied["月村手毬"].delta, -2);
  assert.equal(sandbox.state.freeMode.relationships["花海咲季"].更新日, 2);
  assert.equal(sandbox.state.freeMode.relationships["不存在的偶像"], undefined);
  const legacyUpdate = sandbox.extractFreeModeRelationshipUpdate(`【好感度更新开始】{"花海咲季":1}【好感度更新结束】`);
  assert.equal(legacyUpdate["花海咲季"], 1);
});
test("free mode relationship updates support idols and npc relationships", () => {
  const sandbox = {
    clamp: (value, min, max) => Math.min(max, Math.max(min, value)),
    canonicalIdolName: (value) => String(value || "").trim(),
    idols: {
      "花海咲季": {},
      "月村手毬": {}
    },
    residentNpcProfiles: {
      "亚纱里老师": { publicLabel: "制作人科指导教师" }
    },
    state: {
      day: 1,
      freeMode: {
        postLiveDay: 3,
        relationships: { "花海咲季": { 好感度: 20, 更新日: 1 } },
        npcRelationships: { "亚纱里老师": { 好感度: 8, 更新日: 1 } }
      }
    }
  };
  vm.runInNewContext(`
${readFunction("stripAiThinkingBlocks")}
${readFunction("clampFreeModeRelationshipScore")}
${readFunction("normalizeFreeModeRelationshipEntry")}
${readFunction("ensureFreeModeRelationships")}
${readFunction("getFreeModeRelationship")}
${readFunction("canonicalNpcName")}
${readFunction("ensureFreeModeNpcRelationships")}
${readFunction("getFreeModeNpcRelationship")}
${readFunction("extractFreeModeRelationshipUpdate")}
${readFunction("parseFreeModeRelationshipDelta")}
${readFunction("applyFreeModeRelationshipUpdate")}
`, sandbox);
  const reply = `<relationship_update>{"idols":{"花海咲季":4},"npcs":{"亚纱里老师":3}}</relationship_update>`;
  const applied = sandbox.applyFreeModeRelationshipUpdate(sandbox.extractFreeModeRelationshipUpdate(reply));
  assert.equal(applied.idols["花海咲季"].好感度, 24);
  assert.equal(applied.npcs["亚纱里老师"].好感度, 11);
  assert.equal(sandbox.state.freeMode.relationships["花海咲季"].更新日, 3);
  assert.equal(sandbox.state.freeMode.npcRelationships["亚纱里老师"].更新日, 3);
});

test("affinity overlay exposes secondary relationships and relationship network tabs", () => {
  assert.match(html, /id="affinityTabSecondary"/);
  assert.match(html, /id="affinityTabNetwork"/);
  assert.match(html, /id="affinitySecondaryList"/);
  assert.match(html, /id="affinityNetworkList"/);
  assert.match(source, /function buildSecondaryRelationshipRows\(/);
  assert.match(source, /function buildRelationshipNetworkRows\(/);
  assert.match(readFunction("renderAffinityOverlay"), /renderAffinitySecondaryPanel\(\)/);
  assert.match(readFunction("renderAffinityOverlay"), /renderAffinityNetworkPanel\(\)/);
});
test("world map image switches by free mode clock", () => {
  const sandbox = {
    FREE_MODE_DAY_START_MINUTES: 8 * 60,
    FREE_MODE_MAP_DUSK_START_MINUTES: 17 * 60,
    FREE_MODE_MAP_NIGHT_START_MINUTES: 20 * 60,
    WORLD_MAP_IMAGE_DAY: "./assets/MAP/Gakuen.png",
    WORLD_MAP_IMAGE_DUSK: "./assets/MAP/Gakuen_Dawn.png",
    WORLD_MAP_IMAGE_NIGHT: "./assets/MAP/Gakuen_Night.png",
    state: { freeMode: { clockMinutes: 8 * 60 } }
  };
  vm.runInNewContext(`
${readFunction("getWorldMapTimePhase")}
${readFunction("getWorldMapImageForClock")}
`, sandbox);

  assert.equal(sandbox.getWorldMapTimePhase(10 * 60), "day");
  assert.equal(sandbox.getWorldMapImageForClock(10 * 60), "./assets/MAP/Gakuen.png");
  assert.equal(sandbox.getWorldMapTimePhase(18 * 60), "dusk");
  assert.equal(sandbox.getWorldMapImageForClock(18 * 60), "./assets/MAP/Gakuen_Dawn.png");
  assert.equal(sandbox.getWorldMapTimePhase(21 * 60), "night");
  assert.equal(sandbox.getWorldMapImageForClock(21 * 60), "./assets/MAP/Gakuen_Night.png");
});

test("world map layout editor supports drag save and export", () => {
  assert.match(html, /id="worldMapLayoutEditor"/);
  assert.match(html, /id="worldMapLayoutEditBtn"/);
  assert.match(readFunction("exportWorldMapLayout"), /world-map-layout\.json/);
  assert.match(readFunction("bindWorldMapHotspotInteractions"), /worldMapLayoutState\.editorActive/);
  assert.match(source, /devOpenMapLayoutEditorBtn/);
});
