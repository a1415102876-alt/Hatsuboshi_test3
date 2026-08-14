import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const [app, html] = await Promise.all([
  readFile(new URL('app.js', root), 'utf8'),
  readFile(new URL('index.html', root), 'utf8')
]);

test('audition modules load before the application', () => {
  const coreIndex = html.indexOf('nia-audition-core.js');
  const apiIndex = html.indexOf('nia-audition-api.js');
  const appIndex = html.indexOf('./app.js');
  assert.ok(coreIndex >= 0 && apiIndex > coreIndex && appIndex > apiIndex);
});

test('NIA state persists audition runtime and frozen context', () => {
  assert.match(app, /const niaAuditionCore = globalThis\.HatsuNiaAudition \|\| \{\}/);
  assert.match(app, /audition:\s*typeof niaAuditionCore\.createAuditionRuntime/);
  assert.match(app, /auditionContext:\s*null/);
  assert.match(app, /normalizeAuditionRuntime\(source\.audition\)/);
});

test('completed five-day plan exposes the sixth-day first audition action', () => {
  assert.match(app, /const auditionActionLabel = currentRoundNumber >= 3 \? "开始 FINALE" : `开始\$\{currentRoundLabel\}试镜`/);
  assert.match(app, /createActionButton\(auditionActionLabel, "nia_audition"/);
  assert.match(app, /getNiaPlanDisplayDay\(state\.nia\.training\.actionIndex\)/);
  assert.match(app, /button\.dataset\.action === "nia_audition"/);
  assert.match(app, /startCurrentNiaAudition\(\)/);
});

test('second-round audition uses Rinha and does not reuse the first-round runtime', async () => {
  const route = await readFile(new URL('nia/routes/hanami-saki.js', root), 'utf8');
  assert.match(app, /getNiaRouteForIdol\(state\.idol\)/);
  assert.match(route, /name: "贺阳燐羽", avatar: "\.\/assets\/avatars\/kaya-rinha\.png"/);
  assert.match(app, /nia-second-audition/);
  assert.match(app, /const currentRoundAudition = auditionRound === currentRound \? audition : null/);
  assert.match(app, /roundNumber: context\.round, candidates: context\.fixedOpponents/);
  assert.match(app, /Number\(runtime\.roundNumber \|\| context\.round \|\| 1\) !== Number\(nia\.round \|\| 1\)/);
  assert.match(app, /if \(Number\(session\.context\?\.round \|\| 1\) === 1\) prepareNiaInterRoundOuting\(\)/);
});

test('third-round completed schedule opens FINALE against Ume on the shared audition flow', () => {
  assert.match(app, /roundNumber >= 3[\s\S]{0,180}name: "花海佑芽", avatar: "\.\/assets\/avatars\/hanami-ume\.png"/);
  assert.match(app, /isFinale: roundNumber >= 3/);
  assert.match(app, /stageName: roundNumber >= 3 \? "N\.I\.A FINALE"/);
  assert.match(app, /currentRoundNumber >= 3 \? "FINALE"/);
  assert.match(app, /currentRoundNumber >= 3 \? "开始 FINALE"/);
  assert.match(app, /currentRoundNumber >= 3 \? "争夺冠军"/);

  const start = app.slice(app.indexOf('function startCurrentNiaAudition'), app.indexOf('function failNiaPostAudition'));
  assert.ok(start.indexOf('resumeBlockingNiaFanMilestone()') < start.indexOf('buildNiaAuditionContext()'));

  const complete = app.slice(app.indexOf('function completeNiaPostAuditionAfterPlayback'), app.indexOf('function retryNiaAuditionSegment'));
  assert.match(complete, /Number\(session\.context\?\.round \|\| 1\) === 1\) prepareNiaInterRoundOuting\(\)/);
  assert.doesNotMatch(complete, /round \|\| 1\) === 3\) prepareNiaInterRoundOuting/);
});

test('each audition segment owns one main-model request and parses its tagged reply', () => {
  assert.match(app, /function requestNiaAuditionSegment\(segmentIndex\)/);
  assert.match(app, /ownerKind:\s*"nia_audition"/);
  assert.match(app, /generationMode:\s*"shujuku_same_layer"/);
  assert.match(app, /function handleNiaAuditionAiReply/);
  assert.match(app, /parseNiaAuditionSegmentPayload/);
  assert.match(app, /applyAuditionSegment/);
});

test('N.I.A audition VN uses dedicated preliminary and FINALE backgrounds', () => {
  assert.match(app, /state\.pendingActionContext\?\.action === "nia_audition"[\s\S]*?state\.nia\?\.round[\s\S]*?NIA_Finale\.png[\s\S]*?NIA_Audition1\.png/);
});

test('VN playback advances four segments and settles once', () => {
  assert.match(app, /function completeNiaAuditionSegmentAfterPlayback/);
  assert.match(app, /requestNiaAuditionSegment\(session\.runtime\.segmentIndex \+ 1\)/);
  assert.match(app, /settleAuditionOnce/);
  assert.match(app, /function confirmNiaAuditionResult/);
  assert.match(app, /progressionApplied:\s*true/);
  assert.match(app, /growth:\s*clone\(state\.growth\)/);
  assert.match(app, /const statGains = session\.result\?\.statGains/);
  assert.match(app, /state\[key\] = clamp\(\(state\[key\] \|\| 0\) \+ gain, 0, max\)/);
  assert.match(app, /fans: training\.fans \+ fanGain/);
  assert.match(app, /粉丝 \+\$\{settled\.result\.fanGain/);
});

test('audition failure and refresh recover only the current segment', () => {
  assert.match(app, /function failNiaAudition/);
  assert.match(app, /function retryNiaAuditionSegment/);
  assert.match(app, /function resumeNiaAuditionIfNeeded/);
  assert.match(app, /recoverInterruptedAudition/);
  assert.match(app, /owner\.ownerKind === "nia_audition"/);
});
