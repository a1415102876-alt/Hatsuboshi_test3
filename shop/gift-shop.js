(function (global) {
  "use strict";

  /** @type {ReadonlyArray<{ id: string, name: string, short: string, price: number, affinity: number, desc: string, tone?: string }>} */
  const GIFT_CATALOG = [
    { id: "muscle_patch", name: "酸痛贴", short: "贴", price: 60, affinity: 2, desc: "训练后的小礼物，意外很贴心。", tone: "#7ec8a8" },
    { id: "bottled_tea", name: "瓶装茶水", short: "茶", price: 80, affinity: 4, desc: "学园小卖部常销款，解渴也解乏。", tone: "#8ab6e8" },
    { id: "study_sticker", name: "学分贴纸", short: "贴", price: 100, affinity: 4, desc: "可爱贴纸套装，适合随手分享。", tone: "#f0b35c" },
    { id: "pudding_cup", name: "限定布丁", short: "布丁", price: 150, affinity: 6, desc: "当日限定口味，甜度刚好。", tone: "#f6a96d" },
    { id: "fan_badge", name: "粉丝徽章", short: "徽", price: 200, affinity: 6, desc: "学园祭周边，带着一点应援感。", tone: "#d88cf0" },
    { id: "cookie_box", name: "曲奇礼盒", short: "饼", price: 280, affinity: 8, desc: "手工曲奇礼盒，适合课后分享。", tone: "#d9a06a" },
    { id: "star_hairpin", name: "星星发卡", short: "星", price: 350, affinity: 10, desc: "闪亮小物，适合当作鼓励礼物。", tone: "#8fd3ff" },
    { id: "throat_tea", name: "护嗓茶套组", short: "嗓", price: 400, affinity: 10, desc: "偶像科常备礼品，体贴又实用。", tone: "#9ad29f" },
    { id: "memory_album", name: "纪念相册", short: "册", price: 500, affinity: 12, desc: "可夹入活动照片的纪念册。", tone: "#b8a0f8" },
    { id: "limited_plush", name: "限定玩偶", short: "偶", price: 800, affinity: 16, desc: "小卖部限量款，稀有但颇受欢迎。", tone: "#ff8aa6" }
  ];

  const catalogById = Object.fromEntries(GIFT_CATALOG.map((item) => [item.id, item]));

  function getCatalogItem(itemId) {
    return catalogById[String(itemId || "").trim()] || null;
  }

  function getWalletMoney(state) {
    return Math.max(0, Number(state?.tasks?.wallet?.money) || 0);
  }

  function ensureInventory(state) {
    if (!state?.tasks) return {};
    if (!state.tasks.inventory || typeof state.tasks.inventory !== "object" || Array.isArray(state.tasks.inventory)) {
      state.tasks.inventory = {};
    }
    const normalized = {};
    Object.entries(state.tasks.inventory).forEach(([rawId, rawCount]) => {
      const item = getCatalogItem(rawId);
      const count = Math.max(0, Math.floor(Number(rawCount) || 0));
      if (item && count > 0) normalized[item.id] = count;
    });
    state.tasks.inventory = normalized;
    return normalized;
  }

  function getInventoryCount(state, itemId) {
    const inventory = ensureInventory(state);
    return Math.max(0, Number(inventory[itemId]) || 0);
  }

  function getInventoryEntries(state) {
    return ensureInventory(state);
  }

  function getInventoryList(state) {
    return Object.entries(ensureInventory(state))
      .map(([id, count]) => {
        const item = getCatalogItem(id);
        if (!item || count <= 0) return null;
        return { ...item, count };
      })
      .filter(Boolean)
      .sort((a, b) => a.price - b.price || a.name.localeCompare(b.name, "zh-Hans-CN"));
  }

  function hasInventoryItems(state) {
    return getInventoryList(state).length > 0;
  }

  function getTotalInventoryCount(state) {
    return getInventoryList(state).reduce((sum, entry) => sum + entry.count, 0);
  }

  function buyGift(state, itemId, quantity = 1) {
    const item = getCatalogItem(itemId);
    const amount = Math.max(1, Math.floor(Number(quantity) || 1));
    if (!item) return { ok: false, error: "商品不存在" };
    if (!state?.tasks?.wallet) return { ok: false, error: "钱包未初始化" };
    const cost = item.price * amount;
    const money = getWalletMoney(state);
    if (money < cost) {
      return { ok: false, error: `初星币不足（需要 ${cost}，当前 ${money}）` };
    }
    state.tasks.wallet.money = money - cost;
    const inventory = ensureInventory(state);
    inventory[item.id] = (Number(inventory[item.id]) || 0) + amount;
    return { ok: true, item, quantity: amount, spent: cost, balance: state.tasks.wallet.money };
  }

  function parseRecipientKey(recipientKey) {
    const raw = String(recipientKey || "").trim();
    const match = raw.match(/^(idol|npc):(.+)$/);
    if (!match) return null;
    return { type: match[1], name: match[2].trim() };
  }

  function buildRecipientKey(type, name) {
    const safeType = type === "npc" ? "npc" : "idol";
    const safeName = String(name || "").trim();
    if (!safeName) return "";
    return `${safeType}:${safeName}`;
  }

  function getGiftAffinityGain(item) {
    return Math.max(1, Number(item?.affinity) || 1);
  }

  function giveGift(state, itemId, recipientKey) {
    const item = getCatalogItem(itemId);
    const recipient = parseRecipientKey(recipientKey);
    if (!item) return { ok: false, error: "礼物不存在" };
    if (!recipient?.name) return { ok: false, error: "请选择赠送对象" };
    const inventory = ensureInventory(state);
    const owned = Number(inventory[item.id]) || 0;
    if (owned <= 0) return { ok: false, error: "背包里没有这件礼物" };
    inventory[item.id] = owned - 1;
    if (inventory[item.id] <= 0) delete inventory[item.id];
    const affinity = getGiftAffinityGain(item, recipient.type);
    return {
      ok: true,
      item,
      recipient,
      affinity,
      remaining: Number(inventory[item.id]) || 0
    };
  }

  global.HatsuGiftShop = {
    GIFT_CATALOG,
    getCatalogItem,
    getWalletMoney,
    ensureInventory,
    getInventoryCount,
    getInventoryEntries,
    getInventoryList,
    hasInventoryItems,
    getTotalInventoryCount,
    buyGift,
    giveGift,
    parseRecipientKey,
    buildRecipientKey,
    getGiftAffinityGain
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
