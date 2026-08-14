import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

test('VN contains an isolated audition ranking HUD', async () => {
  const html = await readFile(new URL('index.html', root), 'utf8');
  assert.match(html, /id="auditionRankingHud"[^>]*hidden/);
  assert.match(html, /id="auditionRankingStrip"/);
  assert.match(html, /id="auditionRankingSummary"/);
});

test('audition ranking renderer shows only one qualifying position', async () => {
  const source = await readFile(new URL('app.js', root), 'utf8');
  assert.match(source, /function renderAuditionRankingHud/);
  assert.match(source, /slice\(0, 6\)/);
  assert.match(source, /candidate\.rank === 1/);
  assert.match(source, /pendingActionContext\?\.action === "nia_audition"/);
});

test('audition HUD has compact desktop and mobile layouts', async () => {
  const css = await readFile(new URL('style.css', root), 'utf8');
  assert.match(css, /\.audition-ranking-hud/);
  assert.match(css, /grid-template-columns:\s*1\.22fr repeat\(5, 1fr\)/);
  assert.match(css, /@media \(max-width: 800px\)[\s\S]*\.audition-ranking-hud/);
});
