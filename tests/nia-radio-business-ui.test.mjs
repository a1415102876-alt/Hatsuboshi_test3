import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../style.css', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');

test('radio has a dedicated in-place broadcast overlay', () => {
  assert.match(html, /id="niaRadioOverlay"/);
  assert.match(html, /class="nia-radio-on-air"/);
  assert.match(html, /id="niaRadioSegmentLabel"/);
  assert.match(html, /id="niaRadioHostStandee"/);
  assert.match(html, /assets\/novel-standees\/mashiro-yu\.png/);
  assert.match(html, /id="niaRadioGuestStandee"/);
  assert.match(html, /id="niaRadioAdditionalGuestStandee"/);
  assert.match(html, /id="niaRadioCaption"/);
  assert.match(html, /id="niaRadioStageContinue"[^>]*class="nia-segment-advance-hint"/);
});

test('multi-guest radio shows a second guest and highlights the current speaker', () => {
  assert.match(app, /context\.additionalGuest/);
  assert.match(app, /has-multiple-guests/);
  assert.match(app, /niaRadioAdditionalGuestStandee/);
  assert.match(app, /function updateNiaRadioSpeakerStandees\(speaker\)/);
  assert.match(app, /classList\.toggle\("is-speaking"/);
  assert.match(app, /applyResolvedPortraitToImage\(target, visual\.portrait\)/);
  assert.match(css, /\.nia-radio-stage\.has-multiple-guests \.nia-radio-additional-guest/);
  assert.match(css, /\.nia-radio-standee\.is-speaking/);
});

test('radio keeps history, recovery, cue-card, and result controls in the overlay', () => {
  assert.match(html, /id="niaRadioHistoryDrawer"/);
  assert.match(html, /id="niaRadioHistoryToggle"/);
  assert.match(html, /id="niaRadioRetryBtn"/);
  assert.match(html, /id="niaRadioContinueBtn"/);
  assert.match(html, /id="niaRadioProducerCue"/);
  assert.match(html, /id="niaRadioProducerOptions"/);
  assert.match(html, /id="niaRadioProducerInput"/);
  assert.match(html, /id="niaRadioResultPanel"/);
  assert.match(html, /id="niaRadioResultConfirmBtn"/);
});

test('radio controls remain accessible and responsive', () => {
  assert.match(css, /\.nia-radio-action[^}]*min-height:\s*44px/s);
  assert.match(css, /\.nia-radio-action:focus-visible/);
  assert.match(css, /@media\(max-width:760px\)[^{]*\{[^}]*\.nia-radio/s);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)[^{]*\{[^}]*\.nia-radio/s);
});

test('radio stage uses the recording room scene', () => {
  assert.match(css, /\.nia-radio-stage\{[^}]*url\("\.\/assets\/scenes\/Recording_Room\.png"\)/s);
  assert.match(css, /\.nia-radio-booth\{[^}]*display:\s*none/s);
});

test('radio standees use a larger lowered half-body crop', () => {
  assert.match(css, /\.nia-radio-standee\{[^}]*bottom:\s*-42%[^}]*height:\s*132%[^}]*max-width:\s*54%/s);
  assert.match(css, /@media\(max-width:760px\)[^{]*\{[\s\S]*?\.nia-radio-standee\{[^}]*height:\s*112%[^}]*bottom:\s*-32%/s);
});

test('radio overlay follows browser fullscreen changes', () => {
  assert.match(app, /function syncNiaRadioOverlayRootForFullscreen\(\)/);
  assert.match(app, /document\.addEventListener\("fullscreenchange", syncNiaRadioOverlayRootForFullscreen\)/);
});

test('radio and TV share a discoverable stage advance handler', () => {
  assert.match(app, /function advanceNiaRadioOrTvPlayback\(event\)/);
  assert.match(app, /niaRadioStage["']\)\?\.addEventListener\(["']click["'], advanceNiaRadioOrTvPlayback\)/);
  assert.match(app, /niaRadioStageContinue["']\)\?\.addEventListener\(["']click["']/);
  assert.match(app, /requestNiaRadioSegment\(nextIndex\)/);
  assert.match(app, /requestNiaTvSegment\(nextIndex\)/);
});
