import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const appJs = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const indexHtml = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const stHtml = await readFile(new URL('../st.html', import.meta.url), 'utf8');
const viewHtml = await readFile(new URL('../nia-prototype.html', import.meta.url), 'utf8');
const viewJs = await readFile(new URL('../nia-prototype.js', import.meta.url), 'utf8');
const viewCss = await readFile(new URL('../nia-prototype.css', import.meta.url), 'utf8');

function readFunction(name) {
  let start = appJs.indexOf(`function ${name}`);
  if (start < 0) start = appJs.indexOf(`async function ${name}`);
  const nextFunction = appJs.indexOf('\n  function ', start + 1);
  const nextAsyncFunction = appJs.indexOf('\n  async function ', start + 1);
  const end = [nextFunction, nextAsyncFunction].filter((index) => index > start).sort((a, b) => a - b)[0];
  return appJs.slice(start, end);
}

test('formal N.I.A producer action opens a persisted workday instead of settling immediately', () => {
  assert.match(appJs, /button\.dataset\.action === "nia_producer_work"[\s\S]{0,120}startCurrentNiaProducerWorkAction/);
  assert.match(appJs, /function startCurrentNiaProducerWorkAction/);
  assert.match(appJs, /producerWork:/);
  assert.match(appJs, /training:\s*\{ \.\.\.training, actionIndex: training\.actionIndex \+ 1 \}/);
});

test('workday owns one main-model request with lease identity and retryable failure', () => {
  assert.match(appJs, /ownerKind:\s*"nia_producer_work"/);
  assert.match(appJs, /function isCurrentNiaProducerWorkReply/);
  assert.match(appJs, /function failNiaProducerWork/);
  assert.match(appJs, /work\.pendingDecision/);
  assert.match(appJs, /type === "niaProducerWorkExecute"/);
});

test('direct and embedded launches load the producer runtime before app.js', () => {
  assert.ok(indexHtml.indexOf('nia-producer-work-core.js') < indexHtml.indexOf('app.js'));
  assert.ok(stHtml.indexOf("fetch(abs('nia-producer-work-core.js')") < stHtml.indexOf("fetch(abs('app.js')"));
});

test('desk view exposes schedule, dossier, execution and phone operation surfaces', () => {
  assert.match(viewHtml, /id="producerWorkPage"/);
  assert.match(viewHtml, /id="workPeriodList"/);
  assert.match(viewHtml, /id="workDossier"/);
  assert.match(viewHtml, /id="workExecuteBtn"/);
  assert.match(viewHtml, /id="producerWorkPhoneView"/);
  assert.match(viewJs, /niaProducerWorkAssign/);
  assert.match(viewJs, /niaProducerWorkScheduleConfirm/);
  assert.match(viewJs, /niaProducerWorkExecute/);
});

test('online live planning uses dedicated live editor copy instead of SNS publishing copy', () => {
  assert.match(viewHtml, /id="workPhoneKicker"/);
  assert.match(viewHtml, /id="workPhoneTitle"/);
  assert.match(viewJs, /task\.outputType === 'online_live_plan'/);
  assert.match(viewJs, /HATSUBOSHI LIVE/);
  assert.match(viewJs, /确认直播企划/);
  assert.match(viewJs, /直播主题/);
  assert.match(viewJs, /互动形式/);
});

test('each executable work period restores both submit buttons after the previous request', () => {
  const start = viewJs.indexOf('function renderWorkExecution');
  const end = viewJs.indexOf('\nfunction ', start + 1);
  const renderWorkExecution = viewJs.slice(start, end);

  assert.match(renderWorkExecution, /workExecuteBtn'\)\.disabled = false/);
  assert.match(renderWorkExecution, /workPhoneSubmit'\)\.disabled = false/);
});

test('producer work reply hides the tablet before presenting its VN result', () => {
  const handler = readFunction('handleNiaProducerWorkAiReply');
  const syncIndex = handler.indexOf('postNiaStateSync()');
  const hideIndex = handler.indexOf('setNiaPrototypeVisible(false)', syncIndex);
  const vnIndex = handler.indexOf('openEventOverlay', syncIndex);

  assert.ok(syncIndex >= 0);
  assert.ok(hideIndex > syncIndex, 'the updated tablet must be hidden after state sync');
  assert.ok(vnIndex > hideIndex, 'the VN must open only after the tablet is hidden');
});

test('malformed producer work replies remain in VN before returning to the retryable tablet', () => {
  const handler = readFunction('handleNiaProducerWorkAiReply');
  const close = readFunction('closeEventOverlay');

  assert.match(handler, /failNiaProducerWork[\s\S]*showPrototype: false/);
  assert.match(handler, /type: "niaProducerWorkError"/);
  assert.match(handler, /openEventOverlay\("N\.I\.A · 制作人工作"/);
  assert.match(close, /niaProducerWorkError[\s\S]*setNiaPrototypeVisible\(true\)/);
});

test('producer work VN uses the producer office scene', () => {
  const background = readFunction('getSceneBackground');

  assert.match(background, /nia_producer_work[\s\S]*Producer_Office\.png/);
});

test('producer work format failures expose the specific parser reason and use a versioned API module', () => {
  const handler = readFunction('handleNiaProducerWorkAiReply');
  const formatter = readFunction('formatNiaProducerWorkFailureReason');
  const loader = readFunction('loadNiaProducerWorkApiModule');

  assert.match(formatter, /receipt_id_mismatch/);
  assert.match(formatter, /incomplete_radio_plan/);
  assert.match(handler, /formatNiaProducerWorkFailureReason\(parsed\.reason/);
  assert.match(loader, /nia-producer-work-api\.js\?v=20260809-2/);
});

test('radio planning uses a structured quick or custom editor before AI execution', () => {
  assert.match(viewHtml, /id="radioPlanEditor"/);
  assert.match(viewHtml, /name="radioPlanMode" value="quick"/);
  assert.match(viewHtml, /name="radioPlanMode" value="custom"/);
  assert.match(viewHtml, /name="radioPlanFocus"/);
  assert.match(viewJs, /function readRadioPlanDecision\(\)/);
  assert.match(viewJs, /radioPlan\n\s*\}\);/);
  assert.match(appJs, /saveState\("nia\.radio_plan_frozen"\)/);
  assert.match(appJs, /programTitle:\s*"初星放送部"/);
  assert.match(appJs, /host:\s*"真诚优"/);
});

test('radio plan mode hides the inactive form instead of rendering both field sets', () => {
  assert.match(appJs, /nia-prototype\.html\?v=20260811-1/);
  assert.match(viewHtml, /id="radioPlanModeCustom"[^>]*name="radioPlanMode"[^>]*value="custom"/);
  assert.match(viewJs, /radioPlanQuickFields'\)\.hidden = mode !== 'quick'/);
  assert.match(viewJs, /radioPlanCustomFields'\)\.hidden = mode !== 'custom'/);
  assert.match(viewCss, /\.radio-plan-fields\[hidden\]\s*\{\s*display:\s*none;\s*\}/);
  assert.doesNotMatch(viewCss, /\.radio-plan-mode input\s*\{[^}]*pointer-events:\s*none/);
  assert.match(viewCss, /\.radio-plan-mode input\s*\{[^}]*inset:\s*0;[^}]*z-index:\s*1;/);
});

test('a planned radio activity makes radio planning mandatory on the producer workday', () => {
  assert.match(appJs, /function niaPlanRequiresRadioPreparation/);
  assert.match(appJs, /radioPlanRequired:\s*niaPlanRequiresRadioPreparation/);
  assert.match(appJs, /requiresRadioPlan:\s*niaPlanRequiresRadioPreparation/);
  assert.match(appJs, /validateWorkSchedule\(work,\s*\{\s*requireRadioPlan:/);
  assert.match(appJs, /必须在今天安排“广播部企划”/);
  assert.match(viewJs, /radioPlanRequired/);
  assert.match(viewJs, /请务必安排“广播部企划”/);
});

test('a planned online live makes live planning mandatory on the producer workday', () => {
  assert.match(appJs, /function niaPlanRequiresOnlineLivePreparation/);
  assert.match(appJs, /onlineLivePlanRequired:\s*niaPlanRequiresOnlineLivePreparation/);
  assert.match(appJs, /requiresOnlineLivePlan:\s*niaPlanRequiresOnlineLivePreparation/);
  assert.match(appJs, /requireOnlineLivePlan:\s*niaPlanRequiresOnlineLivePreparation/);
  assert.match(appJs, /必须在今天安排“网络直播企划”/);
  assert.match(viewJs, /onlineLivePlanRequired/);
  assert.match(viewJs, /请务必安排“网络直播企划”/);
});
