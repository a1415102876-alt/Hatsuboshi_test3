import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const app = await readFile(new URL('app.js', root), 'utf8');

test('app routes sns_post business days into a dedicated session', () => {
  assert.match(app, /businessType[^\n]*sns_post|sns_post[^\n]*businessType/);
  assert.match(app, /function startNiaSnsBusinessSession\(/);
});

test('direct SNS business entry opens the outer phone overlay', () => {
  const functionBody = app.match(/function openPhoneSnsApp\([\s\S]*?\n  }\n\n  function bindPhoneSnsEvents\(/)?.[0] || '';
  assert.match(functionBody, /setElementHidden\("phoneOverlay", false\)/);
});

test('app owns post and result request handlers with retry recovery', () => {
  assert.match(app, /function requestNiaSnsPostGeneration\(/);
  assert.match(app, /function requestNiaSnsResultGeneration\(/);
  assert.match(app, /function handleNiaSnsAiReply\(/);
  assert.match(app, /recoverInterruptedSnsPost/);
});

test('SNS publish syncs the edited draft into the active in-memory session', () => {
  const functionBody = app.match(/function updateSnsBusinessDraft\([\s\S]*?\n  }\n\n  function bindSnsBusinessEvents\(/)?.[0] || '';
  assert.match(functionBody, /niaSnsBusinessSession\.runtime[\s\S]*draft/);
});

test('SNS interaction submits the explicitly selected comment instead of the first comment', () => {
  const functionBody = app.match(/const submitInteraction = \(action\) => \{[\s\S]*?\n    \};/)?.[0] || '';
  assert.match(functionBody, /niaSnsSelectedCommentId/);
  assert.doesNotMatch(functionBody, /comments\?\.\[0\]\?\.id/);
});

test('sns settlement is guarded by the runtime one-time settlement contract', () => {
  assert.match(app, /settleSnsPostOnce/);
  assert.match(app, /progressionApplied/);
});
