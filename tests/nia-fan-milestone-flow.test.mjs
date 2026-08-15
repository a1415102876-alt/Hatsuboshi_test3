import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [app, index, loader, startup] = await Promise.all([
  readFile(new URL('../app.js', import.meta.url), 'utf8'),
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../st.html', import.meta.url), 'utf8'),
  readFile(new URL('../shujuku-original-startup.html', import.meta.url), 'utf8')
]);

function functionBody(name, nextName) {
  const start = app.indexOf(`function ${name}`);
  const end = nextName ? app.indexOf(`function ${nextName}`, start) : app.length;
  assert.ok(start >= 0, `${name} should exist`);
  return app.slice(start, end > start ? end : app.length);
}

test('direct and embedded loaders register milestone core and API before app', () => {
  const coreIndex = index.indexOf('nia-fan-milestone-core.js');
  const apiIndex = index.indexOf('nia-fan-milestone-api.js');
  const appIndex = index.indexOf('app.js');
  assert.ok(coreIndex >= 0 && coreIndex < appIndex);
  assert.ok(apiIndex >= 0 && apiIndex < appIndex);

  assert.match(loader, /fetch\(abs\('nia-fan-milestone-core\.js'\), \{ cache: 'no-store' \}\)/);
  assert.match(loader, /fetch\(.*nia-fan-milestone-api\.js.*\{ cache: 'no-store' \}\)/s);
  assert.match(loader, /HatsuNiaFanMilestoneApi\?\.buildNiaFanMilestonePrompt/);
  assert.ok(loader.indexOf("nia-fan-milestone-core.js") < loader.indexOf("abs('app.js')"));
  assert.ok(loader.indexOf("nia-fan-milestone-api.js") < loader.indexOf("abs('app.js')"));
  assert.match(startup, /st\.html\?v=20260804-4/);
});

test('NIA state initializes and normalizes the fan milestone', () => {
  assert.match(app, /const niaFanMilestoneCore = globalThis\.HatsuNiaFanMilestone \|\| \{\}/);
  const defaults = functionBody('createDefaultNiaState', 'normalizeNiaState');
  assert.match(defaults, /fanMilestoneEvent:/);
  const normalize = functionBody('normalizeNiaState', 'defaultSandboxFirstLiveChallenge');
  assert.match(normalize, /normalizeFanMilestone\(source\.fanMilestoneEvent, route\)/);
});

test('one reconciliation helper is used after every NIA fan settlement', () => {
  assert.match(app, /function reconcileNiaFanMilestoneAfterSettlement\(/);
  const producer = functionBody('completeNiaProducerWorkAfterPlayback', 'normalizeNiaBusinessContext');
  const live = functionBody('confirmNiaLiveBusinessResult', 'handleNiaLiveResultConfirm');
  const radio = functionBody('confirmNiaRadioResult', 'resumeNiaRadioBusinessIfNeeded');
  const audition = functionBody('confirmNiaAuditionResult', 'isNiaPostAuditionChoiceActive');
  [producer, live, radio, audition].forEach((body) => {
    assert.match(body, /reconcileNiaFanMilestoneAfterSettlement\(/);
  });
  assert.ok(live.indexOf('saveState("nia.live.progression")') < live.indexOf('reconcileNiaFanMilestoneAfterSettlement'));
  assert.ok(radio.indexOf('saveState("nia.radio.progression")') < radio.indexOf('reconcileNiaFanMilestoneAfterSettlement'));
  assert.ok(audition.indexOf('saveState("nia.audition.progression")') < audition.indexOf('reconcileNiaFanMilestoneAfterSettlement'));
});

test('second-round final schedule days reconcile episodes 14 and 15 before evening resumes', () => {
  const activate = functionBody('activateNiaEveningAfterDayCompletion', 'activateNiaInterRoundEvening');
  assert.match(activate, /reconcileFanMilestone/);
  assert.match(activate, /getNiaFanMilestoneContext/);
  const evening = functionBody('resumeNiaEveningIfNeeded', 'resumeBlockingNiaEvening');
  assert.ok(evening.indexOf('isNiaFanMilestoneBlocking()') < evening.indexOf('isNiaEveningActive()'));
  assert.match(app, /definition\.trigger === "round2_audition_eve"[\s\S]*N\.I\.A · 第二轮选拔前夜/);
  assert.match(app, /definition\.trigger === "round2_day5_complete"[\s\S]*N\.I\.A · 第二轮强敌登场/);
});

test('episode 16 reconciles only after the second-round audition recap completes', () => {
  const context = functionBody('getNiaFanMilestoneContext', 'failNiaFanMilestone');
  assert.match(context, /secondRoundAuditionCompleted:/);
  assert.match(context, /auditionRound === 2/);
  assert.match(context, /audition\.progressionApplied/);
  assert.match(context, /audition\.postAudition\?\.status === "completed"/);
  assert.match(app, /definition\.trigger === "round2_audition_complete"[\s\S]*N\.I\.A · QUARTET 胜利之后/);

  const completeRecap = functionBody('completeNiaPostAuditionAfterPlayback', 'retryNiaAuditionSegment');
  assert.ok(completeRecap.indexOf('syncNiaAuditionState(session.runtime, session.context)') < completeRecap.indexOf('reconcileNiaFanMilestoneAfterSettlement()'));
  assert.ok(completeRecap.indexOf('saveState("nia.audition.recap_completed")') < completeRecap.indexOf('reconcileNiaFanMilestoneAfterSettlement()'));
});

test('episode 17 uses the first round-three business completion before evening', () => {
  const context = functionBody('getNiaFanMilestoneContext', 'failNiaFanMilestone');
  assert.match(context, /firstBusinessIndex/);
  assert.match(context, /String\(day\?\.type \|\| ""\) === "营业"/);
  assert.match(context, /thirdRoundFirstBusinessCompleted:/);
  assert.match(context, /Number\(nia\.round\) === 3/);
  assert.match(context, /training\.actionIndex > firstBusinessIndex/);
  assert.match(app, /definition\.trigger === "round3_first_business_complete"[\s\S]*N\.I\.A · FINALE 约定/);

  const activate = functionBody('activateNiaEveningAfterDayCompletion', 'activateNiaInterRoundEvening');
  assert.ok(activate.indexOf('activateEvening') < activate.indexOf('reconcileFanMilestone'));
  assert.match(activate, /getNiaFanMilestoneContext\(nextNia\)/);

  const request = functionBody('requestNiaFanMilestoneStory', 'isCurrentNiaFanMilestoneReply');
  assert.match(request, /latestBusinessResult:/);
});

test('episode 18 uses the completed third-round schedule before FINALE', () => {
  assert.match(app, /thirdRoundScheduleCompleted: Number\(nia\.round\) === 3/);
  assert.match(app, /definition\.trigger === "round3_schedule_complete"[\s\S]*FINALE 前夜/);
});

test('episodes 19 and 20 use the completed FINALE recap and remain in the milestone queue', () => {
  const context = functionBody('getNiaFanMilestoneContext', 'failNiaFanMilestone');
  assert.match(context, /thirdRoundFinaleCompleted:/);
  assert.match(context, /auditionRound === 3/);
  assert.match(context, /audition\.progressionApplied/);
  assert.match(context, /audition\.postAudition\?\.status === "completed"/);
  assert.match(app, /nia-saki-finale-sisters-aftermath[\s\S]*N\.I\.A · 姐妹的下一场胜负/);
  assert.match(app, /nia-saki-finale-partner-epilogue[\s\S]*N\.I\.A · 命中注定的搭档/);

  const completeRecap = functionBody('completeNiaPostAuditionAfterPlayback', 'retryNiaAuditionSegment');
  assert.ok(completeRecap.indexOf('saveState("nia.audition.recap_completed")') < completeRecap.indexOf('reconcileNiaFanMilestoneAfterSettlement()'));
});

test('milestone owns a strict primary-model request and releases failed leases', () => {
  const fail = functionBody('failNiaFanMilestone', 'requestNiaFanMilestoneStory');
  assert.match(fail, /releasePrimaryModelChannel\(/);
  assert.match(fail, /retryable_failed/);

  const request = functionBody('requestNiaFanMilestoneStory', 'handleNiaFanMilestoneAiReply');
  assert.match(request, /beginFanMilestoneGeneration/);
  assert.match(request, /ownerKind:\s*"nia_fan_milestone"/);
  assert.match(request, /buildNiaFanMilestonePrompt/);
  assert.match(request, /auditionResult:/);
  assert.match(request, /auditionRecapSummary:/);
  assert.match(request, /requestHostPromptSend/);

  const reply = functionBody('handleNiaFanMilestoneAiReply', 'completeNiaFanMilestoneAfterPlayback');
  assert.match(reply, /parseNiaFanMilestonePayload/);
  assert.match(reply, /applyFanMilestoneStory/);
  assert.match(reply, /releasePrimaryModelChannel\(/);
  assert.match(reply, /type:\s*"niaFanMilestone"/);
});

test('VN completion is the only path that unlocks the milestone', () => {
  const complete = functionBody('completeNiaFanMilestoneAfterPlayback', 'resumeNiaFanMilestoneIfNeeded');
  assert.match(complete, /completeFanMilestone/);
  assert.match(complete, /setNiaPrototypeVisible\(!completedRoundTwoAudition\)/);
  assert.match(app, /activeStoryNode\?\.type === "niaFanMilestone"[\s\S]*completeNiaFanMilestoneAfterPlayback\(\)/);
  assert.match(app, /activeStoryNode\?\.type === "niaFanMilestone"[\s\S]*showToast\("剧情尚未结束"/);
  const skip = functionBody('skipAllVnDialogue', 'escapeDebugHtml');
  assert.match(skip, /activeStoryNode\?\.type === "niaFanMilestone"/);
  assert.match(skip, /showToast\("无法跳过"/);
});

test('unfinished milestone recovery has priority over every NIA route', () => {
  const resumeMode = functionBody('resumeNiaModeIfNeeded', 'getNiaPrototypeMountTarget');
  assert.ok(resumeMode.indexOf('resumeNiaFanMilestoneIfNeeded()') < resumeMode.indexOf('resumeNiaAuditionIfNeeded()'));
  assert.ok(resumeMode.indexOf('resumeNiaFanMilestoneIfNeeded()') < resumeMode.indexOf('resumeNiaRadioBusinessIfNeeded()'));
  const resume = functionBody('resumeNiaFanMilestoneIfNeeded', 'resumeNiaModeIfNeeded');
  assert.match(resume, /recoverInterruptedFanMilestone/);
  assert.match(resume, /status === "pending"/);
  assert.match(resume, /status === "playing"/);
  assert.match(resume, /status === "retryable_failed"/);
  assert.match(resume, /reconcileFanMilestone/);
  assert.match(app, /!resumeNiaFanMilestoneIfNeeded\(\)[\s\S]*!resumeNiaRadioBusinessIfNeeded\(\)/);
});

test('normal NIA actions short-circuit to an unfinished milestone', () => {
  assert.match(app, /function isNiaFanMilestoneBlocking\(\)/);
  assert.match(app, /function resumeBlockingNiaFanMilestone\(\)/);
  const ordinary = functionBody('settleAction', 'isPromptRelevantWorldNpc');
  assert.match(ordinary.slice(0, 500), /resumeBlockingNiaFanMilestone\(\)/, 'ordinary NIA actions must guard the milestone');
  ['startCurrentNiaProducerWorkAction', 'startCurrentNiaBusinessAction', 'startCurrentNiaAudition'].forEach((name) => {
    const body = functionBody(name);
    assert.match(body.slice(0, 1200), /resumeBlockingNiaFanMilestone\(\)/, `${name} must guard the milestone`);
  });
});

test('AI replies route milestone requests before ordinary narrative handling', () => {
  const body = functionBody('applyAiReply', 'sendAiReplyAck');
  assert.match(body, /isCurrentNiaFanMilestoneReply\(requestId\)/);
  assert.match(body, /handleNiaFanMilestoneAiReply\(source, requestId, isFinal\)/);
});
