(function (global) {
  "use strict";

  const { castTrack } = global.HatsuWorld || {};
  const MAX_SUMMARY_CHARS = 560;

  function composeWorldSummary(state, options, helpers) {
    const scope = options?.scope || "produce";
    const canonicalFn = helpers?.canonicalIdolName;
    const idolNames = helpers?.idolNames || [];
    const ct = castTrack || global.HatsuWorld?.castTrack;
    if (!ct) return "";

    const cache = ct.rebuildCastFirstLiveCache(state, idolNames, canonicalFn);
    const currentIdol = typeof canonicalFn === "function" ? canonicalFn(state?.idol || "") : state?.idol;
    const world = ct.getWorldState(state);
    const lines = [];

    lines.push("[学园公开层概况]");
    const isSandbox = typeof helpers?.isSandboxLaunch === "function" && helpers.isSandboxLaunch();
    const phaseLabel = isSandbox
      ? (world.macro_phase === "scout" ? "沙盒物色期" : "沙盒学园日常")
      : world.macro_phase === "scout"
        ? "沙盒物色期"
        : world.macro_phase === "first_live"
          ? "First Live 阶段"
          : world.macro_phase || "First Live 阶段";
    lines.push(`宏观阶段：${phaseLabel}`);

    if (scope === "map" && (world.macro_phase === "scout" || (isSandbox && helpers?.isSandboxScoutPhase?.()))) {
      lines.push("阶段说明：制作人尚未与任何偶像签约，本次地图行动以物色担当为主。");
      if (currentIdol) {
        lines.push(`物色目标：${currentIdol}。`);
      }
    }

    if (scope === "produce" && currentIdol) {
      lines.push(`当前担当 ${currentIdol} 由制作人亲自培育；以下仅为背景偶像公开动态。`);
    }

    if (isSandbox && scope !== "produce") {
      lines.push(`学园第 ${state?.freeMode?.postLiveDay || 1} 天，${helpers?.formatClock?.(state.freeMode.clockMinutes) || "日间"}`);
    } else if (state?.freeMode?.unlocked && scope !== "produce") {
      lines.push(`Live 后第 ${state.freeMode.postLiveDay || 1} 天，${helpers?.formatClock?.(state.freeMode.clockMinutes) || "日间"}`);
    } else if (world.macro_phase === "scout" && scope !== "produce") {
      lines.push(`学园第 ${state?.freeMode?.postLiveDay || 1} 天，${helpers?.formatClock?.(state.freeMode.clockMinutes) || "日间"}`);
    }

    const highlights = [];
    Object.entries(cache).forEach(([idol, entry]) => {
      if (idol === currentIdol) return;
      if (entry.status === "complete" && entry.publicTag) {
        highlights.push(`${idol}：${entry.publicTag}`);
      } else if (entry.status === "pending" && idol === ct.SEINA_EDGE) {
        highlights.push(`${idol}：是否接受星南代理培育仍无公开定论`);
      } else if (entry.status === "none" && ct.NO_PRODUCER_GROUP?.includes(idol)) {
        highlights.push(`${idol}：尚无公开 First Live，仅有自练或同班活动传闻`);
      }
    });

    if (highlights.length) {
      lines.push("背景偶像公开标签：");
      highlights.slice(0, 6).forEach((line) => lines.push(`- ${line}`));
    }

    const today = world.broadcast?.today;
    if (today?.title && scope !== "broadcast") {
      lines.push(`今日广播话题：${today.title}（嘉宾：${(today.guests || []).join("、") || "未定"}）`);
    }

    const hotTopic = world.buzz?.hotTopic;
    if (hotTopic && scope !== "sns") {
      lines.push(`近日热议：${hotTopic}`);
    }

    if (Array.isArray(world.school_events) && world.school_events.length) {
      lines.push(`近期学园活动：${world.school_events.slice(0, 3).map((e) => e.label || e.id).join("；")}`);
    }

    const campusBlock = global.HatsuWorld?.campusBehavior?.buildCampusInjectionBlock?.(state, scope);
    if (campusBlock && (scope === "sns" || scope === "broadcast" || scope === "map" || scope === "produce")) {
      lines.push(campusBlock);
    }

    lines.push("写作约束：不得写入非担当与制作人的私密培育史；三年级偶像 First Live 已属过去时。");

    let text = lines.join("\n");
    if (text.length > MAX_SUMMARY_CHARS) {
      text = `${text.slice(0, MAX_SUMMARY_CHARS - 1)}…`;
    }
    return text;
  }

  global.HatsuWorld = global.HatsuWorld || {};
  global.HatsuWorld.injection = {
    composeWorldSummary,
    MAX_SUMMARY_CHARS
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
