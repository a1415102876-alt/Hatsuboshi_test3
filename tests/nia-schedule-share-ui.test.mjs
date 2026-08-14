import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [source, html, css] = await Promise.all([
  readFile(new URL('../app.js', import.meta.url), 'utf8'),
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../style.css', import.meta.url), 'utf8')
]);

test('phone chat includes dedicated NIA schedule actions', () => {
  assert.match(html, /id="phoneNiaScheduleActions"/);
  assert.match(html, /id="phoneNiaScheduleRetryBtn"[^>]*>重新获取回复</);
  assert.match(html, /id="phoneNiaScheduleStartBtn"[^>]*>开始第一天</);
  assert.match(source, /phoneNiaScheduleRetryBtn[^\n]*retryNiaScheduleShareReply/);
  assert.match(source, /phoneNiaScheduleStartBtn[^\n]*startNiaFirstDayAfterScheduleShare/);
});

test('schedule attachment renders five escaped day rows as a document card', () => {
  assert.match(source, /function renderNiaScheduleAttachmentMarkup\(/);
  assert.match(source, /line-schedule-card/);
  assert.match(source, /line-schedule-day/);
  assert.match(source, /attachment\.days/);
  assert.match(source, /escapePhoneText\(day\.title\)/);
  assert.match(css, /\.line-schedule-card/);
  assert.match(css, /\.line-schedule-day/);
});

test('thread preview identifies schedule attachments', () => {
  assert.match(source, /last\?\.kind === "nia_schedule_attachment"/);
  assert.match(source, /last\.attachment\?\.title/);
  assert.doesNotMatch(source, /\[日程表\] N\.I\.A 第一轮活动日程/);
});

test('schedule action UI is scoped to the assigned idol thread and lifecycle', () => {
  assert.match(source, /function updateNiaScheduleShareUi\(/);
  assert.match(source, /share\.threadId === threadId/);
  assert.match(source, /share\.status === "retryable_failed"/);
  assert.match(source, /share\.status === "completed"/);
  assert.match(source, /form\.hidden = !thread\.writable \|\| scheduleShareActive/);
});

test('generic phone retry hint is suppressed during schedule sharing', () => {
  assert.match(source, /function shouldShowPhoneChatRetryHint\(\)/);
  assert.match(source, /scheduleShare\?\.threadId === state\.phoneChat\?\.activeThreadId/);
  assert.match(source, /\[\"sending\", \"awaiting_reply\", \"retryable_failed\", \"completed\"\]\.includes\(scheduleShare\.status\)/);
});
