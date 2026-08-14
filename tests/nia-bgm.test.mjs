import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const niaBgmUrl = new URL('../assets/bgm/nia-office.mp3', import.meta.url);

function readFunction(name) {
  const start = app.indexOf(`function ${name}`);
  const end = app.indexOf('\n  function ', start + 1);
  return start >= 0 ? app.slice(start, end) : '';
}

test('N.I.A office BGM is packaged as a non-empty local asset', async () => {
  const info = await stat(niaBgmUrl);
  assert.ok(info.isFile());
  assert.ok(info.size > 100_000);
});

test('existing BGM manager registers a dedicated N.I.A base track', () => {
  assert.match(app, /nia_base:\s*"\.\/assets\/bgm\/nia-office\.mp3"/);
  assert.match(app, /function isNiaBaseBgmActive\(\)/);
});

test('N.I.A preview and route use the base track without overriding scene music', () => {
  const context = readFunction('isNiaBaseBgmActive');
  const update = readFunction('updateBgm');
  assert.match(context, /selectedProduceScenario === "nia"/);
  assert.match(context, /state\.produceScenario === "nia"/);
  assert.match(context, /state\.launchMode === "nia"/);
  assert.match(update, /isNiaBaseBgmActive\(\)[\s\S]{0,100}bgmManager\.play\("nia_base"\)/);
  assert.match(update, /bgmManager\.play\("select"\)/);
  assert.ok(update.indexOf('bgmManager.play("lesson")') < update.lastIndexOf('bgmManager.play("nia_base")'));
  assert.ok(update.indexOf('bgmManager.play("outing")') < update.lastIndexOf('bgmManager.play("nia_base")'));
});

test('scenario navigation refreshes BGM immediately', () => {
  assert.match(readFunction('renderScenarioPreview'), /updateBgm\(\)/);
  assert.match(readFunction('resetScenarioPreview'), /updateBgm\(\)/);
  assert.match(readFunction('restoreIdolSelectionPanel'), /updateBgm\(\)/);
});
