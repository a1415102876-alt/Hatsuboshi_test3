import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const prototypeHtml = await readFile(new URL('../nia-prototype.html', import.meta.url), 'utf8');
const prototypeJs = await readFile(new URL('../nia-prototype.js', import.meta.url), 'utf8');

function readFunction(name) {
  const start = source.indexOf(`function ${name}`);
  const end = source.indexOf('\n  function ', start + 1);
  return source.slice(start, end);
}

test('Asari review returns to the approved tablet plan without starting training', () => {
  const completeReview = readFunction('completeNiaPlanReview');
  assert.match(source, /function startNiaTrainingFromCommittedPlan\(\)/);
  assert.doesNotMatch(completeReview, /startNiaTrainingFromCommittedPlan\(\)/);
  assert.match(completeReview, /phase:\s*"plan_ready"/);
  assert.match(completeReview, /setNiaPrototypeVisible\(true\)/);
  assert.match(completeReview, /postNiaStateSync\(\)/);
});

test('approved tablet plan explicitly requests schedule sharing through the host', () => {
  assert.match(prototypeHtml, /id="niaTrainingStartBtn"/);
  assert.match(prototypeHtml, /确认企划，开始育成/);
  assert.match(prototypeJs, /function requestNiaTrainingStart\(\)/);
  assert.match(prototypeJs, /type:\s*'niaTrainingStart'/);
  assert.match(prototypeJs, /#niaTrainingStartBtn/);
  assert.match(source, /function startNiaTrainingFromTablet\(\)/);
  assert.match(source, /data\.type === "niaTrainingStart"[\s\S]{0,160}startNiaTrainingFromTablet\(\)/);
  const tabletStart = readFunction('startNiaTrainingFromTablet');
  assert.match(tabletStart, /planStatus !== "committed"/);
  assert.match(tabletStart, /training\?\.active/);
  assert.match(tabletStart, /beginNiaScheduleShareFromTablet\(\)/);
  assert.doesNotMatch(tabletStart, /startNiaTrainingFromCommittedPlan\(\)/);
  assert.match(source, /function startNiaFirstDayAfterScheduleShare\(\)/);
});

test('committed NIA training still initializes the reused training view', () => {
  assert.match(source, /applyIdolPreset\("花海咲季", true\)/);
  assert.match(source, /training:\s*\{[\s\S]*active:\s*true[\s\S]*actionIndex:\s*0/);
});

test('NIA training renders one current plan action and preserves the normal fallback', () => {
  assert.match(source, /function isNiaTrainingActive\(\)/);
  assert.match(source, /getCurrentNiaPlanAction\(state\.nia\)/);
  assert.match(source, /createActionButton\([\s\S]*mapped\.icon/);
  assert.match(source, /const actions = isExtraRound\(\)/);
});

test('formal NIA training doubles the already calculated attribute gain', () => {
  assert.match(source, /applyNiaTrainingGainMultiplier/);
  assert.match(source, /calculateTrainingGain\(baseGain, tuning\.trainingMultiplier, spActive\)/);
  assert.match(source, /isNiaTrainingActive\(\)/);
});

test('formal NIA lessons double their base attribute gain', () => {
  const settleAction = readFunction('settleAction');
  assert.match(
    settleAction,
    /action === "lesson"[\s\S]*applyNiaTrainingGainMultiplier\(tuning\.lessonGain, isNiaTrainingActive\(\)\)/
  );
});

test('ordinary NIA actions bypass legacy round progression and advance after playback', () => {
  const settleAction = readFunction('settleAction');
  const closeEventOverlay = readFunction('closeEventOverlay');
  const finalizeWithoutAi = readFunction('finalizeProduceActionWithoutAi');
  const handleChoiceSelection = readFunction('handleChoiceSelection');

  assert.match(settleAction, /isCurrentNiaOrdinaryPlanAction\(action, attribute\)/);
  assert.match(settleAction, /if \(!niaOrdinaryAction\) advanceRound\(\)/);
  assert.match(handleChoiceSelection, /if \(!niaOrdinaryAction\) advanceRound\(\)/);
  assert.match(closeEventOverlay, /completeCurrentNiaOrdinaryActionAfterPlayback\(\)/);
  assert.match(finalizeWithoutAi, /completeCurrentNiaOrdinaryActionAfterPlayback\(\)/);
});

test('companion training campus activity is routed through the main API and settles after VN playback', () => {
  assert.match(source, /function startNiaCampusActivity\(locationId\)/);
  assert.match(source, /ownerKind: "nia_campus_activity"/);
  assert.match(source, /function isCurrentNiaCampusActivityReply\(requestId\)/);
  assert.match(source, /if \(isCurrentNiaCampusActivityReply\(requestId\)\)/);
  assert.match(source, /function completeNiaCampusActivityAfterPlayback\(\)/);
  assert.match(source, /completeCompanionTrainingCampusActivity\(/);
  const vnEnd = readFunction('handleVnSlidesEnd');
  const closeOverlay = readFunction('closeEventOverlay');
  assert.match(vnEnd, /nia_campus_activity/);
  assert.match(closeOverlay, /niaCampusActivity/);
});

test('N.I.A campus activity reuses the sandbox location background mapping', () => {
  const background = readFunction('getSceneBackground');
  assert.match(background, /action === "nia_campus_activity"/);
  assert.match(background, /getMapLocationSceneBackground\(campusActionContext\)/);
  assert.match(source, /WORLD_MAP_LOCATION_SCENES\[locationId\] \|\| DEFAULT_OUTING_SCENE/);
});

test('N.I.A saves remain resumable without the classic affinity opening flag', () => {
  const resumable = readFunction('hasResumableGameplay');
  assert.match(resumable, /state\.produceScenario === "nia" \|\| state\.nia\?\.mode === "nia"/);
  assert.match(resumable, /nia\.training\?\.active/);
  assert.match(resumable, /nia\.planStatus === "committed"/);
});

test('host save recovery restores the N.I.A route and clears a stale launch pause', () => {
  const applyHost = readFunction('applyHostCharacter');
  assert.match(applyHost, /state\.produceScenario = "nia"/);
  assert.match(applyHost, /state\.launchMode = "nia"/);
  assert.match(applyHost, /state\.launchMenuPaused = false/);
  assert.match(applyHost, /resumeNiaModeIfNeeded\(\)/);
  assert.ok(
    applyHost.indexOf('state.launchMenuPaused = false') < applyHost.indexOf('render();'),
    'the restored N.I.A route must be rendered before a phone or tablet overlay opens'
  );
});

test('N.I.A route recovery ignores a stale launch-menu pause for active training', () => {
  const resume = readFunction('resumeNiaModeIfNeeded');
  assert.match(resume, /state\.produceScenario !== "nia" && state\.nia\?\.mode !== "nia"/);
  assert.match(resume, /state\.launchMenuPaused && hasResumableGameplay\(\)/);
  assert.match(resume, /state\.launchMenuPaused = false/);
});

test('schedule-share recovery ignores a phone state belonging to an older N.I.A plan', () => {
  const resumeShare = readFunction('resumeNiaScheduleShareIfNeeded');
  assert.match(resumeShare, /!nia\.plan \|\| nia\.planStatus !== "committed"/);
  assert.match(resumeShare, /nia\.schedule_share_without_plan_cleared/);
  assert.match(resumeShare, /buildScheduleAttachment\(nia\.plan\)/);
  assert.match(resumeShare, /currentPlanId !== share\.planId/);
  assert.match(resumeShare, /nia\.schedule_share_stale_round_cleared/);
});

test('N.I.A host recovery keeps a newer local mirror instead of rolling back to an older remote snapshot', () => {
  const resolve = readFunction('resolveHostState');
  assert.match(resolve, /remoteIsNia/);
  assert.match(resolve, /localIsNia/);
  assert.match(resolve, /localRevision > remoteRevision/);
  assert.match(resolve, /source: "local"/);
});
