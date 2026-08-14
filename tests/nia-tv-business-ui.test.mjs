import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../style.css', import.meta.url), 'utf8');

function functionBody(name, nextName) {
  const start = app.indexOf(`function ${name}(`);
  const end = app.indexOf(`function ${nextName}(`, start + 1);
  assert.notEqual(start, -1, `${name} should exist`);
  assert.notEqual(end, -1, `${nextName} should follow ${name}`);
  return app.slice(start, end);
}

test('TV mode replaces the shared radio stage with the assigned idol', () => {
  const body = functionBody('renderNiaTvBusiness', 'playNiaTvSegment');

  assert.match(body, /stage\.classList\.add\("nia-tv-mode"\)/);
  assert.match(body, /stageSign\.textContent = "HATSUBOSHI TV STUDIO"/);
  assert.match(body, /host\.hidden = true/);
  assert.match(body, /additionalGuest\.hidden = true/);
  assert.match(body, /context\.idol \|\| state\.idol/);
  assert.match(body, /getDefaultSpeakerVisualCue/);
  assert.match(body, /applyResolvedPortraitToImage\(guest, guestCue\.portrait\)/);
  assert.match(body, /guest\.hidden = false/);
  assert.match(body, /guest\.style\.left = "52%"/);
  assert.match(body, /confirm\.textContent = "确认电视节目结果"/);
});

test('TV playback switches the assigned idol to expression portraits', () => {
  const body = functionBody('playNiaTvSegment', 'failNiaTvBusiness');
  assert.match(body, /resolvePortraitForSpeakerVisualCue\(line\.speaker\)/);
  assert.match(body, /canonicalIdolName\(visual\.speaker\) === canonicalIdolName\(idolName\)/);
  assert.match(body, /applyResolvedPortraitToImage\(guest, visual\.portrait\)/);
  assert.match(body, /strong\.textContent = visual\.speaker/);
});

test('TV mode uses its dedicated studio background asset', () => {
  assert.equal(fs.existsSync(new URL('../assets/scenes/TV_Studio.png', import.meta.url)), true);
  assert.match(css, /\.nia-radio-stage\.nia-tv-mode\{[^}]*TV_Studio\.png/);
});

test('radio mode restores its host, stage branding, and guest layout', () => {
  const body = functionBody('renderNiaRadioBusiness', 'stopNiaRadioPlayback');

  assert.match(body, /stage\.classList\.remove\("nia-tv-mode"\)/);
  assert.match(body, /host\.hidden = false/);
  assert.match(body, /stageSign\.textContent = "HATSUBOSHI RADIO CLUB"/);
  assert.match(body, /brand\.textContent = "初星放送部"/);
  assert.match(body, /guest\.style\.left = ""/);
  assert.match(body, /confirm\.textContent = "确认广播结果"/);
  assert.doesNotMatch(body, /确认电视节目结果/);
});
