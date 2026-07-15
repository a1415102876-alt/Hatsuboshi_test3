import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);

function loadGiftShop() {
  const sandbox = { globalThis: {} };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(readFileSync(new URL("shop/gift-shop.js", root), "utf8"), sandbox, { filename: "shop/gift-shop.js" });
  return sandbox.globalThis.HatsuGiftShop;
}

function makeState(money = 500) {
  return {
    tasks: {
      wallet: { money, fame: 0 },
      inventory: {}
    }
  };
}

test("gift shop buys items and tracks inventory", () => {
  const shop = loadGiftShop();
  const state = makeState(300);
  const result = shop.buyGift(state, "bottled_tea", 2);
  assert.equal(result.ok, true);
  assert.equal(result.spent, 160);
  assert.equal(state.tasks.wallet.money, 140);
  assert.equal(shop.getInventoryCount(state, "bottled_tea"), 2);
});

test("gift shop rejects purchases when wallet is insufficient", () => {
  const shop = loadGiftShop();
  const state = makeState(50);
  const result = shop.buyGift(state, "limited_plush");
  assert.equal(result.ok, false);
  assert.match(result.error, /不足/);
  assert.equal(shop.getInventoryCount(state, "limited_plush"), 0);
});

test("gift shop gives gifts and consumes inventory", () => {
  const shop = loadGiftShop();
  const state = makeState(0);
  state.tasks.inventory = { cookie_box: 1 };
  const key = shop.buildRecipientKey("idol", "花海佑芽");
  const result = shop.giveGift(state, "cookie_box", key);
  assert.equal(result.ok, true);
  assert.equal(result.affinity, 8);
  assert.equal(result.recipient.name, "花海佑芽");
  assert.equal(shop.getInventoryCount(state, "cookie_box"), 0);
});

test("gift shop catalog uses doubled affinity values", () => {
  const shop = loadGiftShop();
  assert.deepEqual(
    Array.from(shop.GIFT_CATALOG, ({ id, affinity }) => [id, affinity]),
    [
      ["muscle_patch", 2],
      ["bottled_tea", 4],
      ["study_sticker", 4],
      ["pudding_cup", 6],
      ["fan_badge", 6],
      ["cookie_box", 8],
      ["star_hairpin", 10],
      ["throat_tea", 10],
      ["memory_album", 12],
      ["limited_plush", 16]
    ]
  );
});

test("npc gifts receive the same full affinity gain as idol gifts", () => {
  const shop = loadGiftShop();
  const item = shop.getCatalogItem("memory_album");
  assert.equal(shop.getGiftAffinityGain(item, "idol"), 12);
  assert.equal(shop.getGiftAffinityGain(item, "npc"), 12);
});

test("app wires student store shop entry and gift overlay", () => {
  const html = readFileSync(new URL("index.html", root), "utf8");
  const app = readFileSync(new URL("app.js", root), "utf8");
  assert.match(html, /id="mapLocationShopBtn"/);
  assert.match(html, /id="giftShopOverlay"/);
  assert.match(html, /id="freeModeBagBtn"/);
  assert.match(html, /shop\/gift-shop\.js/);
  assert.match(app, /function openGiftShopOverlay/);
  assert.match(app, /function handleGiftShopGive/);
});

test("gift shop is gated to sandbox mode after the idol invitation", () => {
  const app = readFileSync(new URL("app.js", root), "utf8");
  const match = app.match(/function canOpenGiftShop\(\) \{\s*return ([^;]+);/);
  assert.ok(match, "canOpenGiftShop should exist");
  assert.match(match[1], /isSandboxLaunch\(\)/);
  assert.match(match[1], /state\.sandbox\?\.inviteComplete/);
  assert.doesNotMatch(match[1], /^isFreeModeActive\(\) && Boolean\(getGiftShopApi\(\)\)$/);
});

test("app wires gift giving story prompt and activeStoryNode", () => {
  const app = readFileSync(new URL("app.js", root), "utf8");
  assert.match(app, /function buildGiftGivingPrompt/);
  assert.match(app, /function beginGiftGivingStory/);
  assert.match(app, /type: "gift"/);
  assert.match(app, /\[\"freechat\", \"interaction\", \"gift\"\]/);
});
