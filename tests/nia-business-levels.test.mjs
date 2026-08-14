import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildNiaLiveSegmentPrompt } from '../nia-business-api.js';
import { buildNiaRadioSegmentPrompt } from '../nia-radio-business-api.js';
import { buildNiaTvSegmentPrompt } from '../nia-tv-business-api.js';

const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const view = fs.readFileSync(new URL('../nia-prototype.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../nia-prototype.html', import.meta.url), 'utf8');

test('Lv2 live prompt becomes a special planned broadcast without changing its contract', () => {
  const prompt = buildNiaLiveSegmentPrompt({ businessId: 'live-lv2', businessLevel: 2, idol: '花海咲季' }, {
    businessId: 'live-lv2', pendingSegmentIndex: 2
  });
  assert.match(prompt, /Lv2 特别企划直播/);
  assert.match(prompt, /特别企划执行/);
  assert.match(prompt, /不得退化成普通闲聊直播/);
  assert.match(prompt, /<NIA_LIVE_SEGMENT>/);
});

test('Lv2 radio prompt freezes the host, primary guest, and additional guest', () => {
  const prompt = buildNiaRadioSegmentPrompt({
    businessId: 'radio-lv2', businessLevel: 2, host: '真诚优', guest: '花海咲季',
    additionalGuest: '月村手毬', interviewFocus: '自律方式的差异'
  }, { businessId: 'radio-lv2', pendingSegmentIndex: 2, segments: [] });
  assert.match(prompt, /Lv2 多嘉宾采访回/);
  assert.match(prompt, /第二嘉宾固定为月村手毬/);
  assert.match(prompt, /多嘉宾采访/);
  assert.match(prompt, /不得把第二嘉宾降为只说一句话的陪衬/);
  assert.match(prompt, /<NIA_RADIO>/);
});

test('Lv2 TV prompt raises production scale while keeping the same output tag', () => {
  const prompt = buildNiaTvSegmentPrompt({ businessId: 'tv-lv2', businessLevel: 2, idol: '花海咲季' }, {
    businessId: 'tv-lv2', pendingSegmentIndex: 3
  });
  assert.match(prompt, /Lv2 大型正式电视节目/);
  assert.match(prompt, /节目组临时追加/);
  assert.match(prompt, /不得写成校园广播或简单聊天/);
  assert.match(prompt, /<NIA_TV_PROGRAM>/);
});

test('Lv3 businesses raise content stakes without changing their four-segment contracts', () => {
  const live = buildNiaLiveSegmentPrompt({ businessId: 'live-lv3', businessLevel: 3, idol: '花海咲季' }, { pendingSegmentIndex: 3 });
  const radio = buildNiaRadioSegmentPrompt({
    businessId: 'radio-lv3', businessLevel: 3, host: '真诚优', guest: '花海咲季', additionalGuest: '月村手毬'
  }, { pendingSegmentIndex: 2, segments: [] });
  const tv = buildNiaTvSegmentPrompt({ businessId: 'tv-lv3', businessLevel: 3, idol: '花海咲季' }, { pendingSegmentIndex: 3 });
  assert.match(live, /Lv3 官方重点特别企划直播/);
  assert.match(live, /形象压力事故/);
  assert.match(radio, /Lv3 高关注圆桌特辑/);
  assert.match(radio, /立场交锋采访/);
  assert.match(tv, /Lv3 旗舰时段重点特辑/);
  assert.match(tv, /既有公众形象/);
  assert.match(live, /<NIA_LIVE_SEGMENT>/);
  assert.match(radio, /<NIA_RADIO>/);
  assert.match(tv, /<NIA_TV_PROGRAM>/);
});

test('TV prompt requires expression tags for supported idols', () => {
  const prompt = buildNiaTvSegmentPrompt({ businessId: 'tv-expression', idol: '花海咲季' }, {
    businessId: 'tv-expression', pendingSegmentIndex: 1
  });
  assert.match(prompt, /花海咲季\(功能词\)/);
  assert.match(prompt, /平常待机/);
  assert.match(prompt, /被夸慌张/);
  assert.match(prompt, /震惊失语/);
  assert.match(prompt, /旁白 speaker 留空/);
});

test('TV prompt uses Ume expression tags and her own default standby', () => {
  const prompt = buildNiaTvSegmentPrompt({ businessId: 'tv-ume-expression', idol: '花海佑芽' }, {
    businessId: 'tv-ume-expression', pendingSegmentIndex: 1
  });
  assert.match(prompt, /花海佑芽\(功能词\)/);
  assert.match(prompt, /花海佑芽\(羞涩待机\)/);
  assert.match(prompt, /得意欢呼/);
  assert.match(prompt, /倾慕陶醉/);
  assert.doesNotMatch(prompt, /被夸陶醉/);
  assert.doesNotMatch(prompt, /俏皮推销/);
});

test('business level is frozen from round and fan count while SNS remains Lv1', () => {
  assert.match(app, /nia\.round >= 3 && training\.fans >= 20000/);
  assert.match(app, /nia\.round >= 2 && training\.fans >= 5000/);
  assert.match(app, /businessType: "sns_post",\s*businessLevel: 1/);
  assert.match(app, /businessType: "online_live",\s*businessLevel/);
  assert.match(app, /businessType: "tv_program",\s*businessLevel/);
  assert.match(app, /businessType: "school_radio",\s*businessLevel/);
});

test('planning UI explains the Lv2 unlock rule and current status', () => {
  assert.match(html, /id="businessLevelRule"/);
  assert.match(view, /function renderBusinessLevelRule\(projection = lastProjection\)/);
  assert.match(view, /round >= 2 && fans >= 5000/);
  assert.match(view, /Lv2 已解锁/);
  assert.match(view, /round >= 3 && fans >= 20000/);
  assert.match(view, /Lv3 已解锁/);
  assert.match(view, /初星圈目前固定为 Lv1/);
});

test('Lv2 radio plan supports random or specified additional guests', () => {
  assert.match(html, /id="radioPlanAdditionalGuestFields"/);
  assert.match(html, /name="radioPlanAdditionalGuestMode" value="random"/);
  assert.match(html, /name="radioPlanAdditionalGuestMode" value="specified"/);
  assert.match(view, /lastProjection\?\.round\) >= 2 && Number\(lastProjection\?\.fans\) >= 5000/);
  assert.match(view, /availableRadioGuests/);
  assert.match(app, /candidates\[Math\.floor\(Math\.random\(\) \* candidates\.length\)\]/);
  assert.match(app, /additionalGuest,\s*idol: state\.idol/);
  assert.match(app, /specifiedGuest = canonicalIdolName/);
  assert.match(app, /plan\.additionalGuestMode === "specified"/);
  assert.match(app, /指定嘉宾无效/);
});
