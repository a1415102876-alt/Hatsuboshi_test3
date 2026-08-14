import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const html = await readFile(new URL('index.html', root), 'utf8');
const css = await readFile(new URL('style.css', root), 'utf8');
const app = await readFile(new URL('app.js', root), 'utf8');

test('dedicated live overlay contains stage, comments, metrics, intervention, and result', () => {
  for (const id of [
    'niaLiveOverlay', 'niaLiveStage', 'niaLiveStandee', 'niaLiveCaption',
    'niaLiveCommentRail', 'niaLiveComments', 'niaLiveViewers', 'niaLiveHeat',
    'niaLivePressure', 'niaLiveTopic', 'niaLiveContinueBtn', 'niaLiveRetryBtn',
    'niaLiveProducerDrawer', 'niaLiveProducerOptions', 'niaLiveProducerInput',
    'niaLiveResultPanel', 'niaLiveResultConfirmBtn'
  ]) assert.match(html, new RegExp(`id=["']${id}["']`), id);
});

test('live overlay carries the Hatsuboshi platform and official channel identity', () => {
  assert.match(html, /class=["']nia-live-school-crest["'][^>]*src=["']\.\/assets\/select-bg\/bg_logo\.png["']/);
  assert.match(html, /class=["']nia-live-platform-name["'][^>]*>HATSUBOSHI LIVE</);
  assert.match(html, /class=["']nia-live-channel-identity["']/);
  assert.match(html, /class=["']nia-live-pinned-notice["']/);
});

test('live visual system uses official orange with the idol color limited to accents', () => {
  assert.match(css, /\.nia-live-overlay\{[^}]*--live-orange:#f7931e[^}]*--live-idol-accent:var\(--idol-theme,/);
  assert.match(css, /\.nia-live-header\{[^}]*background:var\(--live-orange\)/);
  assert.match(css, /\.nia-live-channel-mark\{[^}]*border-color:var\(--live-idol-accent\)/);
  assert.match(css, /\.nia-live-school-crest[^}]*filter:[^;}]*drop-shadow/);
});

test('live stage uses the supplied room while the school crest watermarks the chat rail', () => {
  assert.match(css, /\.nia-live-stage\{[^}]*background:[^;}]*url\(["']?\.\/assets\/scenes\/Saki_Bedroom\.png["']?\)[^;}]*center\s+center\s*\/\s*cover\s+no-repeat/);
  assert.doesNotMatch(html, /class=["']nia-live-stage-pattern["']/);
  assert.match(html, /class=["']nia-live-comments-watermark["'][^>]*src=["']\.\/assets\/select-bg\/bg_logo\.png["']/);
  assert.match(css, /\.nia-live-comments-watermark\{[^}]*opacity:/);
});

test('generated comments receive local viewer identity without changing API content', () => {
  assert.match(app, /className = "nia-live-comment-avatar"/);
  assert.match(app, /className = "nia-live-comment-name"/);
  assert.match(app, /comment\.text/);
});

test('live overlay uses the approved stage/comment split and responsive controls', () => {
  assert.match(css, /\.nia-live-main[\s\S]*?grid-template-columns:\s*minmax\(0,\s*68fr\)\s+minmax\(\d+px,\s*32fr\)/);
  assert.match(css, /\.nia-live-action[\s\S]*?min-height:\s*44px/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});

test('live overlay escapes the embedded app container and fills the browser viewport', () => {
  assert.match(app, /function ensureNiaLiveOverlayRoot\(\)/);
  assert.match(app, /document\.fullscreenElement/);
  assert.match(app, /getElementById\(["']hatsu-fullscreen-overlay["']\)/);
  assert.match(app, /mountTarget\.appendChild\(overlay\)/);
  assert.match(app, /addEventListener\(["']fullscreenchange["']/);
  assert.match(css, /\.nia-live-overlay\{[^}]*width:100vw[^}]*height:100dvh/);
  assert.match(css, /\.nia-live-shell\{[^}]*width:100%[^}]*height:100dvh/);
});

test('app owns segment playback and never routes the dedicated live through VN', () => {
  assert.match(app, /function renderNiaLiveBusiness/);
  assert.match(app, /function playNiaLiveSegment/);
  assert.match(app, /function requestNiaLiveSegment/);
  assert.match(app, /function settleNiaLiveBusiness/);
  assert.match(app, /niaLivePlaybackController/);
  assert.match(app, /buildNiaLiveSegmentPrompt/);
  assert.match(app, /parseNiaLiveSegmentPayload/);
});

test('live captions advance only when the player clicks the stage or caption', () => {
  assert.match(app, /function advanceNiaLivePlayback\(event\)/);
  assert.match(app, /niaLiveStage["']\)\?\.addEventListener\(["']click["'],\s*advanceNiaLivePlayback\)/);
  assert.match(app, /niaLiveCaption["']\)\?\.addEventListener\(["']click["'],\s*advanceNiaLivePlayback\)/);
  assert.doesNotMatch(app, /setTimeout\(next,\s*Math\.max\(120,\s*Number\(beat\.delayMs\)/);
});

test('live exposes a prominent in-stage continue control for paused segments', () => {
  assert.match(html, /id="niaLiveStageContinue"[^>]*class="nia-segment-advance-hint"/);
  assert.match(app, /niaLiveStageContinue[\s\S]*requestNiaLiveSegment\(Number\(runtime\.segmentIndex \|\| 0\) \+ 1\)/);
  assert.match(css, /\.nia-segment-advance-hint[\s\S]*min-height:\s*44px/);
  assert.match(css, /\.nia-segment-advance-hint:focus-visible/);
});

test('result confirmation is delegated above the clickable live stage', () => {
  assert.match(app, /function handleNiaLiveOverlayClick\(event\)/);
  assert.match(app, /closest(?:\?\.)?\(["']#niaLiveResultConfirmBtn["']\)/);
  assert.match(app, /niaLiveOverlay["']\)\?\.addEventListener\(["']click["'],\s*handleNiaLiveOverlayClick\)/);
});

test('result confirmation accepts the persisted runtime result', () => {
  assert.match(app, /session\?\.result\s*\|\|\s*session\?\.runtime\?\.result/);
});

test('result button receives a direct handler whenever the settlement UI renders', () => {
  assert.match(app, /const confirm = niaLiveEl\(["']niaLiveResultConfirmBtn["']\)/);
  assert.match(app, /confirm\.onclick = handleNiaLiveResultConfirm/);
  assert.match(app, /function handleNiaLiveResultConfirm\(event\)/);
});

test('the fourth live segment settles by state instead of assuming four caption beats', () => {
  assert.match(app, /completed\.runtime\?\.status === ["']awaiting_settlement["']/);
  assert.doesNotMatch(app, /if \(index === 4\) settleNiaLiveBusiness\(\)/);
});

test('live beats resolve expression-aware speakers and show a clean caption name', () => {
  assert.match(app, /resolvePortraitForSpeakerVisualCue\(beat\.speaker\)/);
  assert.match(app, /strong\.textContent = visual\.speaker/);
  assert.match(app, /applyResolvedPortraitToImage\(standee, visual\.portrait\)/);
});

test('Saki live starts from the neutral standby preset instead of the legacy portrait', () => {
  assert.match(app, /getDefaultSpeakerVisualCue\?\.\(state\.idol\)/);
  assert.match(app, /resolvePortraitForSpeakerVisualCue\(defaultVisualSpeaker\)/);
  assert.match(app, /standee\.dataset\.portraitFallbackApplied === "1"/);
  assert.match(app, /!standee\.dataset\.portraitUserUrl/);
});

test('live standee uses a lowered upper-body crop on desktop and a safer mobile crop', () => {
  assert.match(css, /\.nia-live-standee\{[^}]*bottom:-58%;height:148%;max-width:96%/);
  assert.match(css, /@media\(max-width:760px\)\{[\s\S]*?\.nia-live-standee\{[^}]*bottom:-46%;height:136%;max-width:98%/);
});
