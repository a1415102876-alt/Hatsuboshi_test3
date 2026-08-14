import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const app = await readFile(new URL('app.js', root), 'utf8');

test('online live uses one owned main-model request for each segment', () => {
  assert.match(app, /function requestNiaLiveSegment\(segmentIndex\)/);
  assert.match(app, /ownerKind:\s*"nia_business"/);
  assert.match(app, /buildNiaLiveSegmentPrompt/);
  assert.match(app, /parseNiaLiveSegmentPayload/);
  assert.match(app, /beginSegmentGeneration/);
  assert.match(app, /applySegmentPayload/);
});

test('online live remains strongly bound to completed online producer work', () => {
  assert.match(app, /resolveBusinessPreparation\(work, "online_live", planDay\)/);
  assert.match(app, /businessType:\s*"online_live"/);
  assert.match(app, /sourceTaskId:\s*onlineTask\.id/);
});

test('legacy saves past a completed producer workday can recover the live brief', () => {
  assert.match(app, /sourceKind:\s*"legacy_completed_producer_work"/);
  assert.match(app, /firstRoundFixedWorkCompleted\s*=\s*nia\.round\s*===\s*1\s*&&\s*training\.actionIndex\s*>\s*0/);
  assert.match(app, /progressedToLaterBusinessDay\s*=\s*explicitOnlineLive\s*&&\s*training\.actionIndex\s*>\s*0/);
  assert.match(app, /priorScheduleHasProducerWork/);
  assert.match(app, /producerWorkHasCompletionEvidence/);
  assert.match(app, /untypedLegacyBusinessDay/);
  assert.match(app, /Boolean\(training\.active\)/);
  assert.match(app, /nia\.online_live_legacy_preparation_recovered/);
});

test('producer instruction is persisted and sent into segment four', () => {
  assert.match(app, /submitNiaLiveProducerInstruction/);
  assert.match(app, /submitProducerInstruction/);
  assert.match(app, /requestNiaLiveSegment\(4\)/);
});

test('malformed segments stay retryable in the dedicated overlay', () => {
  assert.match(app, /status:\s*"retryable_failed"/);
  assert.match(app, /triggerNiaBusinessRegeneration/);
  assert.match(app, /renderNiaLiveBusiness\(session\.runtime/);
});

test('live settlement advances training once only after explicit confirmation', () => {
  assert.match(app, /settleLiveOnce/);
  assert.match(app, /progressionApplied/);
  assert.match(app, /niaLiveResultConfirmBtn/);
  assert.match(app, /actionIndex:\s*training\.actionIndex \+ 1/);
});

test('online live start path does not open the generic VN overlay', () => {
  const start = app.slice(app.indexOf('async function startNiaBusinessSession'), app.indexOf('function startCurrentNiaBusinessAction'));
  assert.doesNotMatch(start, /openEventOverlay|initVisualNovelPlayer|vnContainer/);
  assert.match(start, /renderNiaLiveBusiness/);
});

test('business button reports module loading and failure on the visible main UI', () => {
  const sessionStart = app.slice(app.indexOf('async function startNiaBusinessSession'), app.indexOf('function startCurrentNiaBusinessAction'));
  const actionStart = app.slice(app.indexOf('function startCurrentNiaBusinessAction'), app.indexOf('function requestNiaBusinessResolution'));
  assert.match(actionStart, /showToast\("正在准备营业"/);
  assert.match(actionStart, /typeof niaProducerWorkCore\.resolveBusinessPreparation !== "function"/);
  assert.match(actionStart, /showToast\("制作人工作模块尚未更新"/);
  assert.match(sessionStart, /showToast\("营业模块尚未加载"/);
  assert.match(sessionStart, /return false/);
  assert.match(sessionStart, /return true/);
});

test('business enters the dedicated live UI before waiting for the API module', () => {
  const sessionStart = app.slice(app.indexOf('async function startNiaBusinessSession'), app.indexOf('function startCurrentNiaBusinessAction'));
  const enterIndex = sessionStart.indexOf('setNiaPrototypeVisible(false)');
  const renderIndex = sessionStart.indexOf('renderNiaLiveBusiness(niaBusinessSession.runtime');
  const waitIndex = sessionStart.indexOf('await Promise.race');
  assert.notEqual(enterIndex, -1);
  assert.notEqual(renderIndex, -1);
  assert.notEqual(waitIndex, -1);
  assert.ok(enterIndex < waitIndex, 'live UI must open before API-module waiting begins');
  assert.ok(renderIndex < waitIndex, 'live loading state must render before API-module waiting begins');
  assert.match(sessionStart, /failNiaBusiness\("营业API模块尚未加载/);
});

test('school radio owns one main-model request per segment and never opens generic VN', () => {
  const start = app.indexOf('function requestNiaRadioSegment(segmentIndex)');
  const end = app.indexOf('function auditionXmlStory', start);
  const flow = app.slice(start, end);
  assert.match(flow, /function requestNiaRadioSegment\(segmentIndex\)/);
  assert.match(flow, /ownerKind:\s*"nia_radio_business"/);
  assert.match(flow, /buildNiaRadioSegmentPrompt/);
  assert.match(flow, /parseNiaRadioSegmentPayload/);
  assert.match(flow, /renderNiaRadioBusiness/);
  assert.doesNotMatch(flow, /openEventOverlay|initVisualNovelPlayer|vnContainer/);
});

test('school radio is strongly bound to radio_plan and keeps one business id', () => {
  assert.match(app, /resolveBusinessPreparation\(work, "school_radio", \{ \.\.\.planDay, idol: state\.idol \}\)/);
  assert.match(app, /businessId:\s*radioPreparation\.radioPlan\.business_id/);
  assert.match(app, /businessType:\s*"school_radio"/);
  assert.match(app, /radioPlan:\s*radioPreparation\.radioPlan/);
});

test('school radio pauses at segment three and settles once after explicit confirmation', () => {
  assert.match(app, /submitNiaRadioProducerInstruction/);
  assert.match(app, /requestNiaRadioSegment\(4\)/);
  assert.match(app, /settleRadioOnce/);
  assert.match(app, /radioSettledBusinessId|markRadioPlanSettled/);
  assert.match(app, /progressionApplied:\s*true/);
  assert.match(app, /niaRadioResultConfirmBtn/);
});

test('school radio persists and restores the dedicated overlay before the tablet', () => {
  assert.match(app, /radioBusiness:/);
  assert.match(app, /radioBusinessContext:/);
  assert.match(app, /function resumeNiaRadioBusinessIfNeeded\(\)/);
  assert.match(app, /if \(resumeNiaRadioBusinessIfNeeded\(\)\) return true/);
  assert.match(app, /recoverInterruptedRadio/);
  assert.match(app, /playbackLineIndex/);
});
