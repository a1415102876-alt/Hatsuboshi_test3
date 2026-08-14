import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../nia-prototype.html', import.meta.url), 'utf8');
const css = await readFile(new URL('../nia-prototype.css', import.meta.url), 'utf8');
const js = await readFile(new URL('../nia-prototype.js', import.meta.url), 'utf8');
const appJs = await readFile(new URL('../app.js', import.meta.url), 'utf8');

test('planning desk exposes a fixed phone prop beside the tablet', () => {
  assert.match(html, /<article[^>]+id="niaDeskPhone"[^>]+aria-pressed="false"/);
  assert.match(html, /class="desk"[\s\S]*id="niaDeskPhone"[\s\S]*class="tablet"/);
  assert.match(css, /\.desk-phone\s*\{[\s\S]*position:\s*absolute/);
  assert.match(css, /\.desk-phone\.is-awake/);
  assert.match(css, /@media\s*\(max-width:\s*760px\)[\s\S]*\.desk-phone/);
  assert.match(css, /prefers-reduced-motion:\s*reduce[\s\S]*\.desk-phone/);
});

test('desk phone click feedback keeps its accessible pressed state in sync', () => {
  assert.match(js, /function enableDeskPhonePreview\(\)/);
  assert.match(js, /classList\.toggle\('is-awake'/);
  assert.match(js, /setAttribute\('aria-pressed'/);
  assert.match(js, /enableDeskPhonePreview\(\)/);
});

test('desk devices expose a focus switch with the phone as the secondary terminal', () => {
  assert.match(html, /class="desk"[\s\S]*data-focus="tablet"/);
  assert.match(html, /class="[^"]*desk-phone[^"]*"[^>]+data-terminal="phone"/);
  assert.match(html, /class="[^"]*mini-phone-screen[^"]*"/);
  assert.match(html, /class="mini-phone-notch"/);
  assert.match(html, /class="phone-app-icon-badge"/);
  assert.match(html, /class="phone-home-dock"/);
  assert.match(html, />LINE<|>LINE<\/span>/);
  assert.match(html, />初星世界引擎<\/span>/);
  assert.match(css, /\.desk\.phone-focused[\s\S]*\.tablet/);
  assert.match(css, /\.desk\.phone-focused[\s\S]*\.desk-phone/);
  assert.match(js, /dataset\.focus/);
  assert.match(js, /focus === 'phone'/);
  assert.match(js, /classList\.toggle\('phone-focused'/);
});

test('N.I.A phone apps open the real host phone app and return to N.I.A on close', () => {
  assert.match(js, /niaPhoneAppOpen/);
  assert.match(js, /data-phone-app/);
  assert.match(appJs, /data\.type === "niaPhoneAppOpen"/);
  assert.match(appJs, /launchPhoneApp\(appId\)/);
  assert.match(appJs, /returnToNiaAfterPhone/);
});
