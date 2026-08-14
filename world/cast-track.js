(function (global) {
  "use strict";

  const SEINA_PROXY_GROUP = ["花海佑芽", "仓本千奈", "秦谷美铃"];
  const SEINA_EDGE = "藤田琴音";
  const NO_PRODUCER_GROUP = ["花海咲季", "月村手毬", "紫云清夏", "筱泽广", "葛城莉莉娅"];
  const GRADE3_GROUP = ["十王星南", "雨夜燕", "姬崎莉波", "有村麻央"];

  const FIRST_LIVE_PUBLIC_TAGS = {
    "花海佑芽": "补录体力怪物；星南后辈",
    "仓本千奈": "末位逆袭；Lv.1 新手偶像",
    "秦谷美铃": "睡神天才；星南头疼的小坏蛋",
    "藤田琴音": "现实系候补；对星南保持距离",
    "花海咲季": "入学第一；自驱训练",
    "月村手毬": "前初中第一；高强度自练",
    "紫云清夏": "芭蕾出身；近期较少公开露面",
    "筱泽广": "天才怪人；体力差但理论强",
    "葛城莉莉娅": "海外新生；与清夏约定一起登台",
    "十王星南": "学园第一；学生会长",
    "雨夜燕": "学生会副会长；学园第二",
    "姬崎莉波": "三年级；学生会书记",
    "有村麻央": "三年级；宿舍长"
  };

  function normalizeIdolName(name, canonicalFn) {
    const raw = String(name || "").trim();
    if (!raw) return "";
    return typeof canonicalFn === "function" ? canonicalFn(raw) : raw;
  }

  function getWorldState(state) {
    return state?.freeMode?.world || {};
  }

  function getCastFirstLiveStatus(idolName, state, canonicalFn) {
    const idol = normalizeIdolName(idolName, canonicalFn);
    if (!idol) return "none";

    const currentIdol = normalizeIdolName(state?.idol, canonicalFn);
    if (idol === currentIdol) {
      if (state?.firstLive?.completed && state.firstLive.success) return "complete";
      if (state?.firstLive?.completed && !state.firstLive.success) return "failed";
      return "user_producing";
    }

    if (GRADE3_GROUP.includes(idol)) return "complete";

    if (idol === SEINA_EDGE) {
      const proxy = getWorldState(state).kotone_seina_proxy || "pending";
      if (proxy === "accepted") return "complete";
      if (proxy === "rejected") return "none";
      return "pending";
    }

    if (SEINA_PROXY_GROUP.includes(idol)) return "complete";

    if (NO_PRODUCER_GROUP.includes(idol)) return "none";

    return "none";
  }

  function statusLabel(status) {
    switch (status) {
      case "complete": return "First Live 已完成（公开层）";
      case "pending": return "First Live 筹备中 / 未定论";
      case "failed": return "First Live 未成功";
      case "user_producing": return "由制作人培育中（当前担当）";
      default: return "尚无公开 First Live";
    }
  }

  function rebuildCastFirstLiveCache(state, idolNames, canonicalFn) {
    const cache = {};
    (idolNames || []).forEach((name) => {
      const idol = normalizeIdolName(name, canonicalFn);
      if (!idol) return;
      cache[idol] = {
        status: getCastFirstLiveStatus(idol, state, canonicalFn),
        publicTag: FIRST_LIVE_PUBLIC_TAGS[idol] || ""
      };
    });
    if (!state.freeMode) state.freeMode = {};
    if (!state.freeMode.world) state.freeMode.world = {};
    state.freeMode.world.cast_first_live = cache;
    return cache;
  }

  function getRouteGuardLines(state, canonicalFn) {
    const currentIdol = normalizeIdolName(state?.idol, canonicalFn);
    const lines = [
      "路由守卫：只写学园公开层信息。",
      "禁止把非当前担当写成已由 {{user}} 私密培育、签约或完成专属 First Live。",
      `当前担当（可写私密培育）：${currentIdol || "未选择"}。`
    ];
    return lines.join("\n");
  }

  global.HatsuWorld = global.HatsuWorld || {};
  global.HatsuWorld.castTrack = {
    SEINA_PROXY_GROUP,
    SEINA_EDGE,
    NO_PRODUCER_GROUP,
    GRADE3_GROUP,
    FIRST_LIVE_PUBLIC_TAGS,
    getCastFirstLiveStatus,
    statusLabel,
    rebuildCastFirstLiveCache,
    getRouteGuardLines,
    getWorldState
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
