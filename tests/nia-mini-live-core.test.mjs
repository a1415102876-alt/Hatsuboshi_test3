import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

function loadCore() {
  const context = { globalThis: {}, module: { exports: {} }, console };
  vm.runInNewContext(fs.readFileSync(new URL('../nia-mini-live-core.js', import.meta.url), 'utf8'), context);
  return context.module.exports;
}

const lines = Array.from({ length: 6 }, (_, index) => ({
  id: `line-${index + 1}`,
  type: index % 2 ? 'dialogue' : 'narration',
  speaker: index % 2 ? '花海咲季(振奋宣言)' : '',
  text: `现场台词 ${index + 1}`
}));

test('mini live exposes fixed venues and requires a selected venue', () => {
  const core = loadCore();
  const runtime = core.createMiniLiveRuntime({ businessId: 'mini-1' });
  assert.equal(runtime.status, 'selecting_venue');
  assert.equal(core.selectVenue(runtime, 'missing').ok, false);
  const selected = core.selectVenue(runtime, 'shopping_street');
  assert.equal(selected.ok, true);
  assert.match(core.VENUES.shopping_street.scene, /Shopping_Street\.png$/);
  assert.match(core.VENUES.junior_school_auditorium.scene, /Middle_School_Courtyard\.png$/);
});

test('mini live runtime accepts the venue frozen during planning', () => {
  const core = loadCore();
  const runtime = core.createMiniLiveRuntime({
    businessId: 'mini-planned',
    venueId: 'junior_school_auditorium'
  });

  assert.equal(runtime.venueId, 'junior_school_auditorium');
  assert.equal(core.beginGeneration(runtime, { requestId: 'req-planned' }).ok, true);
});

test('mini live plays the generated lines and maps middle tier compatibly', () => {
  const core = loadCore();
  let runtime = core.selectVenue(core.createMiniLiveRuntime({ businessId: 'mini-2' }), 'shopping_mall').runtime;
  runtime = core.applyPayload({ ...runtime, status: 'generating' }, {
    businessId: 'mini-2', venueId: 'shopping_mall', lines, bonusTier: 'middle',
    highlight: '亮点', audienceResponse: '反馈', impressionChange: '印象', bonusReason: '理由', resultSummary: '摘要'
  }).runtime;
  assert.equal(runtime.status, 'playing');
  for (let index = 0; index < lines.length; index += 1) runtime = core.advancePlayback(runtime).runtime;
  assert.equal(runtime.status, 'settled');
  assert.equal(core.settleMiniLiveOnce(runtime, 'mini-2').result.fanGain, 3000);
});

test('mini live settlement is idempotent and interrupted generation is retryable', () => {
  const core = loadCore();
  let runtime = core.selectVenue(core.createMiniLiveRuntime({ businessId: 'mini-3' }), 'campus_courtyard').runtime;
  runtime = core.beginGeneration(runtime, { requestId: 'req-1' }).runtime;
  runtime = core.recoverInterruptedMiniLive(runtime);
  assert.equal(runtime.status, 'retryable_failed');
  runtime = core.applyPayload({ ...runtime, status: 'generating' }, {
    businessId: 'mini-3', venueId: 'campus_courtyard', lines, bonusTier: 'small',
    highlight: '亮点', audienceResponse: '反馈', impressionChange: '印象', bonusReason: '理由', resultSummary: '摘要'
  }).runtime;
  for (let index = 0; index < lines.length; index += 1) runtime = core.advancePlayback(runtime).runtime;
  const first = core.settleMiniLiveOnce(runtime, 'mini-3');
  const second = core.settleMiniLiveOnce(first.runtime, 'mini-3');
  assert.equal(first.ok, true);
  assert.equal(second.reason, 'already_settled');
});
