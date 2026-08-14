import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNiaRadioSegmentPrompt, parseNiaRadioSegmentPayload } from '../nia-radio-business-api.js';

const context = {
  businessId: 'radio-1',
  idol: '花海咲季',
  programTitle: '初星放送部',
  episodeTitle: '新人的第一声问候',
  goal: '让听众认识咲季严谨之外的一面',
  host: '真诚优',
  guest: '花海咲季',
  interviewFocus: '胜负心与日常反差'
};

const runtime = {
  businessId: 'radio-1',
  plan: context,
  segments: [],
  producerInstruction: '诚实回答，再由优把话题带回本期主题。'
};

function payload(segmentIndex, extra = {}) {
  return {
    schemaVersion: 1,
    businessId: 'radio-1',
    segmentIndex,
    status: segmentIndex === 3 ? 'awaiting_producer' : segmentIndex === 4 ? 'ended' : 'continue',
    lines: [
      { type: 'dialogue', speaker: '真诚优', text: '欢迎来到初星放送部。' },
      { type: 'dialogue', speaker: '花海咲季', text: '请多指教。' }
    ],
    continuitySummary: `segment ${segmentIndex} complete`,
    ...extra
  };
}

test('four prompts assign distinct duties and preserve the same show identity', () => {
  const duties = [
    /嘉宾入场/,
    /主题访谈/,
    /听众来信/,
    /回应与收播/
  ];
  for (let index = 1; index <= 4; index += 1) {
    const prompt = buildNiaRadioSegmentPrompt(context, { ...runtime, pendingSegmentIndex: index });
    assert.match(prompt, duties[index - 1]);
    assert.match(prompt, /radio-1/);
    assert.match(prompt, /真诚优/);
    assert.match(prompt, /<NIA_RADIO>/);
    assert.doesNotMatch(prompt, /NIA_LIVE_SEGMENT/);
  }
});

test('segment three requires awaiting status, one problem, and exactly three options', () => {
  const valid = payload(3, {
    listenerLetter: '有人问咲季是否只在胜利时才会开心。',
    problem: '问题碰到了她不愿承认的弱点。',
    options: ['正面回答', '举例说明', '请主持人换个角度']
  });
  const parsed = parseNiaRadioSegmentPayload(`<NIA_RADIO>${JSON.stringify(valid)}</NIA_RADIO>`, {
    businessId: 'radio-1', segmentIndex: 3
  });
  assert.equal(parsed.ok, true);
  assert.equal(parsed.data.options.length, 3);
  assert.equal(parsed.data.status, 'awaiting_producer');

  const wrongStatus = { ...valid, status: 'continue' };
  assert.equal(parseNiaRadioSegmentPayload(`<NIA_RADIO>${JSON.stringify(wrongStatus)}</NIA_RADIO>`, {
    businessId: 'radio-1', segmentIndex: 3
  }).reason, 'invalid_incident_contract');
});

test('segment four must end cleanly and contain settlement fields', () => {
  const valid = payload(4, {
    highlight: '咲季坦率承认自己也会因进步而开心。',
    audienceResponse: '听众觉得她比想象中亲切。',
    impressionChange: '严格的优等生也有直率的一面。',
    followupHook: '优邀请她下次带妹妹一起参加。',
    resultSummary: '节目按时收播。',
    fanGain: 360
  });
  const parsed = parseNiaRadioSegmentPayload(`<NIA_RADIO>${JSON.stringify(valid)}</NIA_RADIO>`, {
    businessId: 'radio-1', segmentIndex: 4
  });
  assert.equal(parsed.ok, true);
  assert.equal(parsed.data.status, 'ended');
  assert.equal(parsed.data.fanGain, 360);

  const capped = parseNiaRadioSegmentPayload(`<NIA_RADIO>${JSON.stringify({ ...valid, fanGain: 9999 })}</NIA_RADIO>`, {
    businessId: 'radio-1', segmentIndex: 4
  });
  assert.equal(capped.ok, true);
  assert.equal(capped.data.fanGain, 3000);

  const reopened = { ...valid, problem: '收播后又出现新问题', options: ['继续'] };
  assert.equal(parseNiaRadioSegmentPayload(`<NIA_RADIO>${JSON.stringify(reopened)}</NIA_RADIO>`, {
    businessId: 'radio-1', segmentIndex: 4
  }).reason, 'invalid_closing_contract');
});

test('parser selects the last complete NIA_RADIO block', () => {
  const leaked = payload(1, { lines: [{ type: 'narration', speaker: '', text: 'planning example' }] });
  const actual = payload(1, { lines: [{ type: 'dialogue', speaker: '真诚优', text: 'actual opening' }] });
  const source = [
    `<NIA_RADIO>${JSON.stringify(leaked)}</NIA_RADIO>`,
    `<NIA_RADIO>${JSON.stringify(actual)}</NIA_RADIO>`
  ].join('\n');
  const parsed = parseNiaRadioSegmentPayload(source, { businessId: 'radio-1', segmentIndex: 1 });
  assert.equal(parsed.ok, true);
  assert.equal(parsed.data.lines[0].text, 'actual opening');
});

test('parser ignores a planning mention before the final NIA_RADIO block', () => {
  const source = '思考：输出 <NIA_RADIO> JSON。\n<NIA_RADIO>'
    + JSON.stringify(payload(1)) + '</NIA_RADIO>';
  const parsed = parseNiaRadioSegmentPayload(source, { businessId: 'radio-1', segmentIndex: 1 });
  assert.equal(parsed.ok, true);
});

test('parser rejects stale business and segment identifiers', () => {
  const source = `<NIA_RADIO>${JSON.stringify(payload(2))}</NIA_RADIO>`;
  assert.equal(parseNiaRadioSegmentPayload(source, { businessId: 'other', segmentIndex: 2 }).reason, 'business_id_mismatch');
  assert.equal(parseNiaRadioSegmentPayload(source, { businessId: 'radio-1', segmentIndex: 1 }).reason, 'segment_index_mismatch');
});
