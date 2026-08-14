import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const [app, index, loader] = await Promise.all([
  readFile(new URL('../app.js', import.meta.url), 'utf8'),
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../st.html', import.meta.url), 'utf8')
]);

function functionBody(name, nextName) {
  const start = app.indexOf(`function ${name}`);
  const end = nextName ? app.indexOf(`function ${nextName}`, start) : app.length;
  assert.ok(start >= 0, `${name} should exist`);
  return app.slice(start, end > start ? end : app.length);
}

test('direct and embedded entry points load NIA evening before app', () => {
  const directCore = index.indexOf('nia-evening-core.js');
  const directApp = index.indexOf('app.js');
  assert.ok(directCore >= 0 && directCore < directApp);
  const embeddedCore = loader.indexOf("abs('nia-evening-core.js')");
  const embeddedApp = loader.indexOf("abs('app.js')");
  assert.ok(embeddedCore >= 0 && embeddedCore < embeddedApp);
});

test('NIA state normalizes a persistent evening runtime', () => {
  assert.match(app, /const niaEveningCore = globalThis\.HatsuNiaEvening \|\| \{\}/);
  const create = functionBody('createDefaultNiaState', 'normalizeNiaState');
  assert.match(create, /evening:/);
  const normalize = functionBody('normalizeNiaState');
  assert.match(normalize, /evening:\s*typeof niaEveningCore\.normalizeEvening/);
  assert.match(normalize, /niaEveningCore\.normalizeEvening\(source\.evening\)/);
});

test('every NIA plan-day settlement activates the shared evening coordinator', () => {
  const paths = [
    ['completeCurrentNiaOrdinaryActionAfterPlayback', 'shouldShowLaunchStage'],
    ['completeNiaCampusActivityAfterPlayback', 'handleNiaOpeningAiReply'],
    ['completeNiaProducerWorkAfterPlayback', 'stopNiaLivePlayback'],
    ['confirmNiaSnsBusinessResult', 'resumeNiaSnsBusinessIfNeeded'],
    ['confirmNiaLiveBusinessResult', 'handleNiaLiveResultConfirm'],
    ['confirmNiaRadioResult', 'resumeNiaRadioBusinessIfNeeded']
  ];
  for (const [name, next] of paths) {
    const body = functionBody(name, next);
    assert.match(body, /const completedDayIndex = training\.actionIndex/, `${name} must capture the completed day`);
    assert.match(body, /activateNiaEveningAfterDayCompletion\(completedDayIndex\)/, `${name} must activate evening`);
  }
});

test('evening activation is idempotent and persists before route recovery', () => {
  const body = functionBody('activateNiaEveningAfterDayCompletion');
  assert.match(body, /niaEveningCore\.activateEvening/);
  assert.match(body, /completedDayIndex/);
  assert.match(body, /saveState\("nia\.evening\.active"\)/);
});

test('shared apartment reads NIA day clock and companion through adapters', () => {
  const active = functionBody('isNiaEveningActive', 'getApartmentClockMinutes');
  assert.match(active, /niaEveningCore\.isEveningActive/);
  const clock = functionBody('getApartmentClockMinutes', 'formatApartmentClock');
  assert.match(clock, /normalizeNiaState\(state\.nia\)\.evening\.clockMinutes/);
  const label = functionBody('formatApartmentDayLabel', 'isProducerApartmentNightVisual');
  assert.match(label, /N\.I\.A Day/);
  const companion = functionBody('getApartmentCompanionIdol', 'setApartmentCompanionIdol');
  assert.match(companion, /normalizeNiaState\(state\.nia\)\.evening\.companionIdol/);
  const setter = functionBody('setApartmentCompanionIdol', 'resolveIdolStandeeSrc');
  assert.match(setter, /niaEveningCore\.setEveningCompanion/);
});

test('NIA apartment time advancement never calls free-mode advancement', () => {
  const body = functionBody('advanceApartmentTime', 'handleApartmentCompanionChoiceSelection');
  assert.match(body, /niaEveningCore\.advanceEveningClock/);
  assert.match(body, /return advanceFreeModeTime\(minutes\)/);
  const choice = functionBody('handleApartmentCompanionChoiceSelection', 'handleApartmentCompanionCustomChoice');
  const custom = functionBody('handleApartmentCompanionCustomChoice', 'appendApartmentCompanionControlButtons');
  assert.match(choice, /advanceApartmentTime\(chosenMinutes\)/);
  assert.match(custom, /advanceApartmentTime\(chosenMinutes\)/);
});

test('shared apartment overlays display the active apartment day and clock', () => {
  const summary = functionBody('renderFreeModeEveningSummaryView', 'openFreeModeEveningSummary');
  assert.match(summary, /formatApartmentClock\(\)/);
  assert.match(summary, /formatApartmentDayLabel\(\)/);
  assert.doesNotMatch(summary, /state\.freeMode\?\.postLiveDay/);

  const invite = functionBody('openApartmentInviteOverlay', 'closeApartmentInviteOverlay');
  assert.match(invite, /formatApartmentDayLabel\(\)/);
  assert.match(invite, /formatApartmentClock\(\)/);

  const chat = functionBody('startApartmentCompanionChatFlow', 'startApartmentCompanionIntimacyFlow');
  assert.match(chat, /formatApartmentDayLabel\(\)/);
  assert.match(chat, /formatApartmentClock\(\)/);
  assert.match(chat, /if \(!isNiaEveningActive\(\)\)/);

  const confirm = functionBody('confirmCompanionTopic', 'confirmRestNote');
  assert.match(confirm, /isProducerApartmentActive\(\)/);
  assert.match(confirm, /getApartmentCompanionIdol\(\)/);
});

test('apartment chat prompt identifies the NIA evening timeline', () => {
  const prompt = functionBody('buildApartmentCompanionChatPrompt', 'beginApartmentCompanionChat');
  assert.match(prompt, /isNiaEveningActive\(\)/);
  assert.match(prompt, /N\.I\.A 五日计划/);
  assert.match(prompt, /formatApartmentDayLabel\(\)/);
  assert.match(prompt, /formatApartmentClock\(\)/);
});

test('NIA apartment affinity reads育成 trust while sandbox keeps independent relationships', () => {
  const score = functionBody('getApartmentAffinityScore', 'getApartmentNsfwEligibleIdols');
  assert.match(score, /isNiaEveningActive\(\)/);
  assert.match(score, /state\.trust/);
  assert.match(score, /getFreeModeRelationshipScore/);

  const eligible = functionBody('getApartmentNsfwEligibleIdols', 'buildNsfwIntimacyAffinityLine');
  assert.match(eligible, /getApartmentAffinityScore/);
  assert.match(eligible, /isNiaEveningActive\(\)/);

  const prompt = functionBody('buildApartmentCompanionChatPrompt', 'beginApartmentCompanionChat');
  assert.match(prompt, /getApartmentAffinityScore\(targetIdol\)/);
  assert.doesNotMatch(prompt, /getFreeModeRelationshipScore\(targetIdol\)/);

  const sandbox = {
    niaActive: true,
    state: {
      idol: '花海咲季',
      trust: 96,
      freeMode: { relationships: { '花海咲季': { 好感度: 0 } } }
    },
    idols: { '花海咲季': {}, '月村手毬': {} },
    INTIMACY_NSFW_UNLOCK_TRUST: 100,
    isNiaEveningActive: () => sandbox.niaActive,
    canonicalIdolName: (name) => String(name || '').trim(),
    getFreeModeRelationshipScore: (name) => sandbox.state.freeMode.relationships[name]?.好感度 || 0,
    applyFreeModeRelationshipUpdate: () => ({ sandbox: true }),
    clamp: (value, min, max) => Math.min(max, Math.max(min, value)),
    refreshAffinityUnlocks: () => {},
    recordEveningJournalRelationships: () => {}
  };
  vm.runInNewContext([
    functionBody('getCurrentAffinityIdolName', 'canOpenAffinityOverlay'),
    score,
    functionBody('parseFreeModeRelationshipDelta', 'applyFreeModeRelationshipUpdate'),
    functionBody('applyApartmentRelationshipUpdate', 'decodeAiReplySource')
  ].join('\n'), sandbox);

  assert.equal(sandbox.getApartmentAffinityScore('花海咲季'), 96);
  const applied = sandbox.applyApartmentRelationshipUpdate({
    idols: { '花海咲季': 10, '月村手毬': 5 }
  });
  assert.equal(sandbox.state.trust, 100);
  assert.equal(applied.idols['花海咲季'].delta, 5);
  assert.equal(applied.idols['花海咲季'].好感度, 100);
  assert.equal(applied.idols['月村手毬'], undefined);
  assert.equal(sandbox.state.freeMode.relationships['花海咲季'].好感度, 0);

  sandbox.niaActive = false;
  assert.equal(sandbox.applyApartmentRelationshipUpdate({}).sandbox, true);
});

test('apartment eligibility intimacy validation and reply settlement use the active-mode affinity boundary', () => {
  assert.match(functionBody('canBringAssignedIdolHome', 'getEveningGoHomeOptions'), /getApartmentAffinityScore/);
  assert.match(functionBody('confirmApartmentGoHomeWithIdol', 'handleApartmentGoHomeAlone'), /getApartmentAffinityScore/);
  assert.match(functionBody('startApartmentCompanionIntimacyFlow', 'buildApartmentCompanionChatPrompt'), /getApartmentAffinityScore/);
  assert.match(functionBody('startApartmentNsfwInvite', 'completeNiaEveningAfterSleep'), /getApartmentAffinityScore/);

  const applyReply = functionBody('applyAiReply', 'shouldAcceptAiReply');
  const routeStart = applyReply.indexOf('if (state.pendingActionContext?.action === \"apartment_companion\")');
  const replyRoute = applyReply.slice(routeStart, applyReply.indexOf('if (state.pendingActionContext?.action === \"map_location\")', routeStart));
  assert.match(replyRoute, /applyApartmentRelationshipUpdate/);
  assert.doesNotMatch(replyRoute, /applyFreeModeRelationshipUpdate/);
});

test('apartment intimacy completion preserves NIA apartment state without writing sandbox state', () => {
  const end = functionBody('handleVnSlidesEnd', 'initVisualNovelPlayer');
  const inviteBranchStart = end.indexOf('actionContext?.apartmentInvite');
  assert.ok(inviteBranchStart >= 0, 'apartment invite completion branch should exist');
  const inviteBranch = end.slice(inviteBranchStart, inviteBranchStart + 900);
  assert.match(inviteBranch, /isNiaEveningActive\(\)/);
  assert.match(inviteBranch, /niaEveningCore\.enterEveningApartment/);
  assert.match(inviteBranch, /else if \(state\.freeMode\) \{\s*state\.freeMode\.atApartment = true;/);
});

test('active NIA evening replaces the next schedule action with one return-home action', () => {
  const renderActions = functionBody('renderActionButtons', 'renderActionHighlights');
  const eveningGuard = renderActions.indexOf('isNiaEveningActive()');
  const planLookup = renderActions.indexOf('getCurrentNiaPlanAction');
  assert.ok(eveningGuard >= 0 && eveningGuard < planLookup, 'evening action must take priority over the next plan day');
  assert.match(renderActions, /createActionButton\("回公寓", "nia_evening_go_home"/);
  assert.match(renderActions, /N\.I\.A 第 .* 日已结束 · 22:00/);

  const clickHandlerStart = app.indexOf('document.getElementById("actionButtons").addEventListener');
  assert.ok(clickHandlerStart >= 0);
  const clickHandler = app.slice(clickHandlerStart, clickHandlerStart + 3200);
  assert.match(clickHandler, /button\.dataset\.action === "nia_evening_go_home"/);
  assert.match(clickHandler, /openApartmentGoHomeOverlay\(\)/);
});

test('NIA evening recovery stays on training UI until return-home is clicked or restores apartment', () => {
  const resume = functionBody('resumeNiaEveningIfNeeded', 'resumeNiaModeIfNeeded');
  assert.match(resume, /evening\.atApartment/);
  assert.match(resume, /renderProducerApartmentStage\(\)/);
  assert.match(resume, /setNiaPrototypeVisible\(false\)/);
  assert.match(resume, /render\(\)/);
  assert.doesNotMatch(resume, /openApartmentGoHomeOverlay\(\)/);
  assert.ok(
    resume.indexOf('closePhoneOverlay()') < resume.indexOf('setNiaPrototypeVisible(false)'),
    'phone cleanup must finish before the training screen hides the prototype'
  );
  const mode = functionBody('resumeNiaModeIfNeeded', 'resumeNiaScheduleShareIfNeeded');
  assert.ok(mode.indexOf('resumeNiaScheduleShareIfNeeded()') < mode.indexOf('resumeNiaEveningIfNeeded()'));
});

test('sleep completes NIA evening without advancing sandbox or training days', () => {
  const dispatch = functionBody('sleepFromProducerApartment', 'leaveProducerApartmentForCampus');
  assert.match(dispatch, /completeNiaEveningAfterSleep\(\)/);
  assert.match(dispatch, /advanceFreeModeToNextDay/);
  const complete = functionBody('completeNiaEveningAfterSleep', 'sleepFromProducerApartment');
  assert.match(complete, /niaEveningCore\.completeEvening/);
  assert.doesNotMatch(complete, /actionIndex\s*\+/);
  assert.doesNotMatch(complete, /advanceFreeModeToNextDay/);
  assert.match(complete, /setNiaPrototypeVisible\(false\)/);
  assert.doesNotMatch(complete, /setNiaPrototypeVisible\(true\)/);
  assert.match(complete, /render\(\)/);
});

test('sleep only enters the target-round draft from its completed inter-round outing', () => {
  const complete = functionBody('completeNiaEveningAfterSleep', 'sleepFromProducerApartment');
  assert.match(complete, /nia\.phase === "inter_round_outing"/);
  assert.match(complete, /nia\.interRoundOuting\?\.status === "completed"/);
  assert.match(complete, /fromRound\) === Number\(nia\.round/);
  assert.match(complete, /shouldEnterNextRound && typeof niaRoundTransitionCore\.enterNextRoundDraft/);
});
