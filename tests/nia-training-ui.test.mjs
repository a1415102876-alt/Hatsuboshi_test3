import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const css = await readFile(new URL('../style.css', import.meta.url), 'utf8');
const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');

test('NIA training HUD has image-backed review targets and fan progress semantics', () => {
  for (const asset of ['Vo_Mini.png', 'Da_Mini.png', 'Vi_mini.png', 'nia-fan-mini.png', 'nia-fan-badge.png']) {
    assert.match(html, new RegExp(asset.replace('.', '\\.')));
  }
  for (const id of ['targetFans', 'niaFanFill', 'niaFanValue', 'niaFanRank']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /role="progressbar"/);
  assert.match(css, /body\.is-nia-training[\s\S]*\.nia-only/);
  assert.match(css, /\.threshold-icon[\s\S]*object-fit:\s*contain/);
  assert.match(html, /threshold-icon-crop/);
  assert.match(css, /\.threshold-icon-crop[\s\S]*overflow:\s*hidden/);
  assert.match(css, /\.threshold-item\.(vo|da|vi)\s+\.threshold-icon[\s\S]*width:\s*220px/);
});

test('NIA plan artwork is the complete action-button surface instead of an icon inside a generic card', () => {
  assert.match(app, /class="nia-plan-action-visual"/);
  assert.match(app, /class="nia-plan-action-image"/);
  assert.match(app, /class="nia-plan-action-label"/);
  assert.match(css, /\.action-button\.nia-plan-action-button[\s\S]*border:\s*0/);
  assert.match(css, /\.action-button\.nia-plan-action-button::before[\s\S]*content:\s*none/);
  assert.match(css, /\.nia-plan-action-image[\s\S]*width:\s*175%/);
});
