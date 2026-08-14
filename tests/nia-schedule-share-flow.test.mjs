import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const embeddedLoader = await readFile(new URL('../st.html', import.meta.url), 'utf8');

function readUntilNextFunction(name) {
  const start = source.indexOf('function ' + name + '(');
  assert.notEqual(start, -1, name + ' must exist');
  const end = source.indexOf('\n  function ', start + 1);
  return source.slice(start, end < 0 ? source.length : end);
}

test('NIA state persists a normalized schedule-share lifecycle', () => {
  assert.match(source, /const niaScheduleShareCore = globalThis\.HatsuNiaScheduleShare/);
  assert.match(readUntilNextFunction('createDefaultNiaState'), /scheduleShare:/);
  assert.match(readUntilNextFunction('normalizeNiaState'), /normalizeScheduleShare\(source\.scheduleShare/);
});

test('tablet confirmation opens the schedule-share flow instead of training', () => {
  const tabletStart = readUntilNextFunction('startNiaTrainingFromTablet');
  assert.match(tabletStart, /beginNiaScheduleShareFromTablet\(\)/);
  assert.doesNotMatch(tabletStart, /startNiaTrainingFromCommittedPlan\(\)/);
  assert.match(source, /function beginNiaScheduleShareFromTablet\(\)/);
  assert.match(source, /buildScheduleAttachment\(\{ \.\.\.nia\.plan, round: nia\.round \}\)/);
  assert.match(source, /kind:\s*"nia_schedule_attachment"/);
  assert.match(source, /attachmentMessageId/);
  assert.match(source, /mode:\s*"nia_schedule_share"/);
});

test('the authoritative NIA round overrides an incorrect round returned by the plan model', () => {
  const handler = readUntilNextFunction('handleNiaPlanAiReply');
  assert.match(handler, /normalizeApiPlan\(parsed\.data, nia\.draft, \{ round: nia\.round \}\)/);
});

test('schedule reply failure is retryable without appending another attachment', () => {
  const retry = readUntilNextFunction('retryNiaScheduleShareReply');
  assert.match(retry, /requestNiaScheduleShareReply/);
  assert.doesNotMatch(retry, /appendNiaScheduleAttachment/);
  assert.match(readUntilNextFunction('handlePhoneChatAiReply'), /markNiaScheduleShareFailed/);
});

test('schedule reply and refresh recovery use the authoritative current round', () => {
  const request = readUntilNextFunction('requestNiaScheduleShareReply');
  assert.match(request, /authoritativePlan = \{ \.\.\.nia\.plan, round: nia\.round \}/);
  assert.match(request, /buildScheduleReactionPrompt\(authoritativePlan/);
  const resume = readUntilNextFunction('resumeNiaScheduleShareIfNeeded');
  assert.match(resume, /currentAttachment = niaScheduleShareCore\.buildScheduleAttachment\(authoritativePlan\)/);
  assert.match(resume, /appendNiaScheduleAttachment\(share\.threadId, currentAttachment\)/);
});

test('an existing schedule attachment is updated in place instead of duplicated', () => {
  const append = readUntilNextFunction('appendNiaScheduleAttachment');
  assert.match(append, /existing\.text = attachment\.title/);
  assert.match(append, /existing\.attachment = clone\(attachment\)/);
  assert.match(append, /return String\(existing\.id/);
});

test('schedule reply completes only after the delivered reply is persisted', () => {
  const handler = readUntilNextFunction('handlePhoneChatAiReply');
  assert.match(handler, /completedNode\?\.mode === "nia_schedule_share"/);
  assert.match(handler, /completeNiaScheduleShareReply/);
  const complete = readUntilNextFunction('completeNiaScheduleShareReply');
  assert.match(complete, /replyMessageId/);
  assert.match(complete, /completeScheduleShare/);
});

test('only completed schedule sharing can start Day 1', () => {
  const start = readUntilNextFunction('startNiaFirstDayAfterScheduleShare');
  assert.match(start, /scheduleShare\.status !== "completed"/);
  assert.match(start, /startNiaTrainingFromCommittedPlan\(\)/);
  assert.match(start, /closePhoneOverlay\(\)/);
  assert.match(start, /nia\.training_started_after_schedule_share/);
});

test('refresh recovery preserves the attachment and exposes schedule retry', () => {
  const reconcile = readUntilNextFunction('reconcilePhoneChatPendingState');
  assert.match(reconcile, /nia_schedule_share/);
  assert.match(reconcile, /markNiaScheduleShareFailed/);
  assert.match(source, /function resumeNiaScheduleShareIfNeeded\(/);
  assert.match(readUntilNextFunction('resumeNiaModeIfNeeded'), /resumeNiaScheduleShareIfNeeded\(\)/);
  const resume = readUntilNextFunction('resumeNiaScheduleShareIfNeeded');
  assert.match(resume, /openPhoneOverlay\(\)/);
  assert.match(resume, /openPhoneThread\(share\.threadId\)/);
});

test('embedded SillyTavern loader registers schedule core before app.js', () => {
  const coreIndex = embeddedLoader.indexOf("fetch(abs('nia-schedule-share-core.js')");
  const appIndex = embeddedLoader.indexOf("fetch(abs('app.js')");
  assert.ok(coreIndex >= 0);
  assert.ok(appIndex > coreIndex);
});

test('later NIA prompts carry authoritative current and future schedule context', () => {
  assert.match(source, /function buildNiaAuthoritativeScheduleContext\(/);
  const helper = readUntilNextFunction('buildNiaAuthoritativeScheduleContext');
  assert.match(helper, /【权威 N\.I\.A\. 日程】/);
  assert.match(helper, /【今天】/);
  assert.match(helper, /【未来】/);
  assert.match(helper, /今日行动：/);
  assert.match(helper, /未来.*不代表正在发生/);
  assert.match(source, /buildNiaLiveSegmentPrompt\([\s\S]{0,220}buildNiaAuthoritativeScheduleContext/);
  assert.match(source, /buildNiaRadioSegmentPrompt\([\s\S]{0,220}buildNiaAuthoritativeScheduleContext/);
  assert.match(source, /buildNiaAuditionSegmentPrompt\([\s\S]{0,220}buildNiaAuthoritativeScheduleContext/);
});
