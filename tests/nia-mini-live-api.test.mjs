import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

function loadApi() {
  const context = { globalThis: {}, console };
  const source = fs.readFileSync(new URL('../nia-mini-live-api.js', import.meta.url), 'utf8').replace(/export\s+/g, '');
  vm.runInNewContext(source + ';globalThis.__api={buildNiaMiniLivePrompt,parseNiaMiniLivePayload};', context);
  return context.globalThis.__api;
}

const lines = Array.from({ length: 6 }, (_, index) => ({ id: `l${index}`, type: 'narration', speaker: '', text: `line ${index}` }));

test('mini-live prompt delegates non-Saki portrait markers to the world book', () => {
  const api = loadApi();
  const prompt = api.buildNiaMiniLivePrompt({
    businessId: 'biz-portrait-rules',
    venue: { id: 'shopping-street', name: '商店街' }
  }, { businessId: 'biz-portrait-rules', venueId: 'shopping-street' });
  assert.match(prompt, /其他角色遵守各自世界书中的立绘情绪标记规则/);
  assert.doesNotMatch(prompt, /花海佑芽说话时/);
});

test('mini-live prompt uses the active route idol in its speaker example', () => {
  const api = loadApi();
  const prompt = api.buildNiaMiniLivePrompt({
    idol: '藤田琴音',
    businessId: 'mini-kotone',
    venue: { id: 'shopping_street', name: '商店街', audience: '路人', challenge: '抓住注意力' }
  }, { businessId: 'mini-kotone', venueId: 'shopping_street' });
  assert.match(prompt, /藤田琴音\(功能词\)/);
  assert.doesNotMatch(prompt, /花海咲季\(振奋宣言\)/);
});

test('mini live API selects the last complete tag and ignores planning text', () => {
  const api = loadApi();
  const body = { businessId: 'mini-api-1', venueId: 'shopping_street', lines, highlight: 'h', audienceResponse: 'a', impressionChange: 'i', bonusReason: 'b', resultSummary: 's', bonusTier: 'medium' };
  const source = '<NIA_MINI_LIVE>{"businessId":"old"}</NIA_MINI_LIVE>\n' + `<NIA_MINI_LIVE>${JSON.stringify(body)}</NIA_MINI_LIVE>`;
  assert.equal(api.parseNiaMiniLivePayload(source, { businessId: 'mini-api-1', venueId: 'shopping_street' }).ok, true);
  assert.equal(api.parseNiaMiniLivePayload(source.slice(0, -10), { businessId: 'mini-api-1', venueId: 'shopping_street' }).ok, false);
});

test('mini live prompt freezes venue and requires a single complete generation', () => {
  const api = loadApi();
  const prompt = api.buildNiaMiniLivePrompt({ businessId: 'mini-api-2', venue: { id: 'shopping_street', name: '商店街临时舞台', audience: '路人', challenge: '抓住注意力' } }, { businessId: 'mini-api-2', venueId: 'shopping_street' });
  assert.match(prompt, /NIA_MINI_LIVE/);
  assert.match(prompt, /不要拆成多段请求/);
  assert.match(prompt, /shopping_street/);
});
