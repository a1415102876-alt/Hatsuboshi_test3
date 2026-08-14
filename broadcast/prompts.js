(function (global) {
  "use strict";

  function buildBroadcastScriptPrompt(episode, state, helpers) {
    const guests = (episode?.guests || []).join("、") || "学园嘉宾";
    const outline = String(episode?.outline || "").trim();
    const guard = global.HatsuWorld?.castTrack?.getRouteGuardLines?.(state, helpers?.canonicalIdolName) || "";
    const summary = global.HatsuWorld?.injection?.composeWorldSummary?.(state, { scope: "broadcast" }, helpers) || "";
    const dateLabel = state?.launchMode === "sandbox"
      ? `学园第 ${state?.freeMode?.postLiveDay || 1} 天`
      : `Live 后第 ${state?.freeMode?.postLiveDay || 1} 天`;

    return `[初星广播部 · 完整节目稿]

节目：${episode?.title || "学园广播"}
嘉宾：${guests}
日期：${dateLabel}

${summary}

${guard}

本期提纲：
${outline}

写作要求：
- 写双人或多人对话式广播稿，主持人口吻自然，嘉宾符合各自公开人设。
- 只讨论学园公开活动、课程、传闻与节目话题；禁止写入制作人与非嘉宾偶像的私密培育细节。
- 不要重新计算任何育成数值。
- 输出完整可朗读稿，800 字以内。

输出格式：
【初星正文开始】
（广播稿正文）
【初星正文结束】`;
  }

  global.HatsuWorld = global.HatsuWorld || {};
  global.HatsuWorld.broadcastPrompts = {
    buildBroadcastScriptPrompt
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
