(function (root) {
  "use strict";

  const CHARACTER_SLUGS = Object.freeze({
    "花海咲季": "saki",
    Saki: "saki",
    saki: "saki",
    "藤田琴音": "kotone",
    Kotone: "kotone",
    kotone: "kotone",
    "花海佑芽": "ume",
    "花海祐芽": "ume",
    "佑芽": "ume",
    "祐芽": "ume",
    Ume: "ume",
    ume: "ume"
  });

  const SHARED_NSFW_POSES = Object.freeze([
    { id: "kissing_makeout", label: "接吻爱抚", fallback: "" },
    { id: "handjob", label: "手交", fallback: "kissing_makeout" },
    { id: "fingering", label: "指交", fallback: "kissing_makeout" },
    { id: "blowjob", label: "口交", fallback: "handjob" },
    { id: "cunnilingus", label: "舔阴", fallback: "fingering" },
    { id: "titjob", label: "乳交", fallback: "handjob" },
    { id: "sixty_nine", label: "六九式", fallback: "blowjob" },
    { id: "missionary", label: "传教士", fallback: "" },
    { id: "missionary_legs_up", label: "抬腿传教士", fallback: "missionary" },
    { id: "missionary_mating_press", label: "压叠", fallback: "missionary_legs_up" },
    { id: "doggy", label: "后入跪趴", fallback: "missionary" },
    { id: "doggy_face_down", label: "趴伏后入", fallback: "doggy" },
    { id: "prone_bone", label: "俯卧后入", fallback: "doggy_face_down" },
    { id: "cowgirl", label: "骑乘", fallback: "missionary" },
    { id: "reverse_cowgirl", label: "反骑", fallback: "cowgirl" },
    { id: "lotus", label: "莲花对抱", fallback: "cowgirl" },
    { id: "spooning", label: "侧入", fallback: "missionary" },
    { id: "standing", label: "站立正面", fallback: "against_wall" },
    { id: "standing_doggy", label: "站立后入", fallback: "doggy" },
    { id: "against_wall", label: "抵墙", fallback: "standing" },
    { id: "full_nelson", label: "尼尔森", fallback: "standing" },
    { id: "carry", label: "抱起", fallback: "standing" },
    { id: "breeding", label: "配种位", fallback: "doggy" },
    { id: "chair", label: "椅子骑乘", fallback: "cowgirl" },
    { id: "aftercare_embrace", label: "事后拥抱", fallback: "kissing_makeout" }
  ]);

  // 佑芽专属 / 变体姿势；缺图时回落到已有 SHARED 资源
  const UME_EXTRA_POSES = Object.freeze([
    { id: "standing_kiss_breastgrab", label: "站立拥吻揉胸", fallback: "nipple_suck" },
    { id: "nipple_suck", label: "吮吸乳头", fallback: "missionary_breastgrab" },
    { id: "missionary_breastgrab", label: "传教士揉胸", fallback: "missionary" },
    { id: "arched_missionary", label: "拱腰传教士", fallback: "missionary" },
    { id: "doggy_armpull_front", label: "跪姿后入扯臂", fallback: "doggy" },
    { id: "paizuri_pov", label: "乳交POV", fallback: "titjob" },
    { id: "paizuri_oral", label: "乳交口交", fallback: "paizuri_pov" },
    { id: "paizuri_straddle", label: "骑胸乳交", fallback: "paizuri_pov" },
    { id: "cowgirl_bounce", label: "骑乘胸晃", fallback: "cowgirl" },
    { id: "pov_breastgrab_oral", label: "仰头口交揉胸", fallback: "blowjob" },
    { id: "pov_deepthroat", label: "深喉口交", fallback: "blowjob" },
    { id: "standing_handjob", label: "站立手交", fallback: "handjob" },
    { id: "standing_fingering", label: "站立指交", fallback: "fingering" }
  ]);

  // 佑芽尚缺部分 SHARED 原图时，把 fallback 指到已有资源，避免空层
  const UME_SHARED_FALLBACK_OVERRIDES = Object.freeze({
    kissing_makeout: "nipple_suck",
    handjob: "blowjob",
    fingering: "cunnilingus",
    // spooning 现已有图（由误标的 arched_missionary 资源纠正而来）
    against_wall: "standing",
    aftercare_embrace: "nipple_suck",
    prone_bone: "doggy_face_down",
    breeding: "doggy",
    chair: "cowgirl"
  });

  function buildUmeNsfwPoses() {
    const shared = SHARED_NSFW_POSES.map((pose) => {
      const nextFallback = UME_SHARED_FALLBACK_OVERRIDES[pose.id];
      return nextFallback ? { ...pose, fallback: nextFallback } : pose;
    });
    return Object.freeze(shared.concat(UME_EXTRA_POSES));
  }

  const SAKI_NSFW_POSES = SHARED_NSFW_POSES;
  const KOTONE_NSFW_POSES = SHARED_NSFW_POSES;
  const UME_NSFW_POSES = buildUmeNsfwPoses();

  const POSE_BY_CHARACTER = Object.freeze({
    saki: SAKI_NSFW_POSES,
    kotone: KOTONE_NSFW_POSES,
    ume: UME_NSFW_POSES
  });

  // 资源目录名；R2/CDN 区分大小写。本地 Windows 上 Ume/ume 是同一文件夹，
  // 但已上传桶路径是 assets/hcg/Ume/，必须与之对齐，否则 st.html 走 CDN 会 404。
  const ASSET_FOLDER_BY_SLUG = Object.freeze({
    saki: "saki",
    kotone: "kotone",
    ume: "Ume"
  });

  const POSE_LOOKUP = Object.freeze(
    Object.fromEntries(
      Object.entries(POSE_BY_CHARACTER).map(([slug, poses]) => [
        slug,
        Object.freeze(Object.fromEntries(poses.map((pose) => [pose.id, pose])))
      ])
    )
  );

  const CONTROL_TAG_RE = /<(nsfw_mode|pose)\b([^>]*)\/>|<(nsfw_mode|pose)\b([^>]*)>([\s\S]*?)<\/\3\s*>/gi;
  const ATTR_RE = /([A-Za-z_][\w-]*)\s*=\s*"([^"]*)"/g;

  function text(value, limit = 120) {
    return String(value || "").trim().slice(0, limit);
  }

  function resolveCharacterSlug(characterName) {
    const raw = text(characterName, 40);
    if (!raw) return "";
    if (CHARACTER_SLUGS[raw]) return CHARACTER_SLUGS[raw];
    const lower = raw.toLowerCase();
    if (CHARACTER_SLUGS[lower]) return CHARACTER_SLUGS[lower];
    // 立绘差分名如「花海佑芽(意外动摇)」也要能解析到角色 slug
    const base = raw.replace(/[（(][^）)]*[）)]\s*$/u, "").trim();
    if (base && CHARACTER_SLUGS[base]) return CHARACTER_SLUGS[base];
    return "";
  }

  function listPoseIds(characterName) {
    const slug = resolveCharacterSlug(characterName);
    const poses = POSE_BY_CHARACTER[slug] || [];
    return poses.map((pose) => pose.id);
  }

  function getPoseEntry(characterName, poseId) {
    const slug = resolveCharacterSlug(characterName);
    const id = text(poseId, 80).toLowerCase();
    if (!slug || !id) return null;
    return POSE_LOOKUP[slug]?.[id] || null;
  }

  function resolveHcgAsset(characterName, poseId) {
    const slug = resolveCharacterSlug(characterName);
    const entry = getPoseEntry(characterName, poseId);
    if (!slug || !entry) return null;
    const folder = ASSET_FOLDER_BY_SLUG[slug] || slug;
    return {
      id: `${slug}_nsfw_${entry.id}_v01`,
      characterSlug: slug,
      poseId: entry.id,
      label: entry.label,
      fallbackPoseId: entry.fallback || "",
      path: `./assets/hcg/${folder}/${entry.id}_v01.png`
    };
  }

  function resolveHcgAssetWithFallback(characterName, poseId, depth = 0) {
    if (depth > 8) return null;
    const asset = resolveHcgAsset(characterName, poseId);
    if (!asset) return null;
    return asset;
  }

  function parseAttributes(raw) {
    const attributes = new Map();
    for (const match of String(raw || "").matchAll(ATTR_RE)) {
      if (attributes.has(match[1])) return null;
      attributes.set(match[1], match[2]);
    }
    const leftover = String(raw || "").replace(ATTR_RE, "").trim();
    if (leftover) return null;
    return attributes;
  }

  function normalizeModeValue(value) {
    const raw = text(value, 20).toLowerCase();
    if (["on", "1", "true", "yes", "open", "start"].includes(raw)) return "on";
    if (["off", "0", "false", "no", "close", "end", "hide"].includes(raw)) return "off";
    return "";
  }

  function parseNsfwModeTag(attrRaw, bodyRaw) {
    const attributes = parseAttributes(attrRaw);
    if (!attributes) return null;
    const fromAttr = normalizeModeValue(attributes.get("status") || attributes.get("mode") || attributes.get("value"));
    const fromBody = normalizeModeValue(bodyRaw);
    const value = fromAttr || fromBody;
    if (!value) return null;
    if (attributes.size && !fromAttr && fromBody) return null;
    if (fromAttr && attributes.size > 1) return null;
    if (!fromAttr && attributes.size > 0) return null;
    return { kind: "nsfw_mode", mode: value };
  }

  function parsePoseTag(attrRaw) {
    const attributes = parseAttributes(attrRaw);
    if (!attributes) return null;
    const action = text(attributes.get("action"), 20).toLowerCase();
    const poseId = text(attributes.get("id") || attributes.get("pose"), 80).toLowerCase();
    if (action === "hide" && !poseId && attributes.size === 1) {
      return { kind: "pose", action: "hide" };
    }
    if ((!action || action === "show") && poseId && (attributes.size === 1 || (attributes.size === 2 && action === "show"))) {
      return { kind: "pose", action: "show", poseId };
    }
    return null;
  }

  function parseControlTagMatch(match) {
    const selfClosingName = match[1];
    if (selfClosingName) {
      if (selfClosingName.toLowerCase() === "nsfw_mode") return parseNsfwModeTag(match[2], "");
      return parsePoseTag(match[2]);
    }
    const pairedName = String(match[3] || "").toLowerCase();
    if (pairedName === "nsfw_mode") return parseNsfwModeTag(match[4], match[5]);
    if (pairedName === "pose") return parsePoseTag(match[4] || "");
    return null;
  }

  function extractControlEvents(source) {
    const events = [];
    const textChunks = [];
    let lastIndex = 0;
    const input = String(source || "");
    CONTROL_TAG_RE.lastIndex = 0;
    let match = CONTROL_TAG_RE.exec(input);
    while (match) {
      textChunks.push(input.slice(lastIndex, match.index));
      const event = parseControlTagMatch(match);
      if (event) {
        events.push({
          index: textChunks.length,
          event
        });
        textChunks.push("");
      } else {
        textChunks.push(match[0]);
      }
      lastIndex = CONTROL_TAG_RE.lastIndex;
      match = CONTROL_TAG_RE.exec(input);
    }
    textChunks.push(input.slice(lastIndex));
    return {
      text: textChunks.join(""),
      events: events.map((item) => item.event)
    };
  }

  function attachControlEventsToSlides(slides, source) {
    const list = Array.isArray(slides) ? slides.map((slide) => ({ ...slide })) : [];
    if (!list.length) return list;
    return attachControlEventsSequential(list, source);
  }

  function attachControlEventsSequential(slides, source) {
    const list = Array.isArray(slides) ? slides.map((slide) => ({ ...slide })) : [];
    if (!list.length) return list;

    const input = String(source || "");
    const contentMatches = [...input.matchAll(/<(dialogue|narration)(?:\s+char="([^"]+)")?>([\s\S]*?)<\/\1>/gi)]
      .filter((item) => String(item[3] || "").trim());
    if (!contentMatches.length) return list;

    const pendingBySlide = new Map();
    let pending = [];
    let lastIndex = 0;
    CONTROL_TAG_RE.lastIndex = 0;
    let match = CONTROL_TAG_RE.exec(input);

    const findSlideIndexAfter = (absoluteIndex) => {
      const exact = contentMatches.findIndex((item) => (item.index || 0) >= absoluteIndex);
      if (exact >= 0) return exact;
      return contentMatches.length - 1;
    };

    while (match) {
      const event = parseControlTagMatch(match);
      if (event) pending.push(event);
      lastIndex = CONTROL_TAG_RE.lastIndex;
      const nextContentIndex = findSlideIndexAfter(lastIndex);
      // Flush pending controls onto the next content slide that starts at/after this tag.
      if (pending.length && nextContentIndex >= 0) {
        const existing = pendingBySlide.get(nextContentIndex) || [];
        pendingBySlide.set(nextContentIndex, existing.concat(pending.splice(0, pending.length)));
      }
      match = CONTROL_TAG_RE.exec(input);
    }

    if (pending.length) {
      const last = contentMatches.length - 1;
      const existing = pendingBySlide.get(last) || [];
      pendingBySlide.set(last, existing.concat(pending));
    }

    for (const [slideIndex, events] of pendingBySlide.entries()) {
      if (list[slideIndex]) applyEventsToSlide(list[slideIndex], events);
    }
    return list;
  }

  function applyEventsToSlide(slide, events) {
    if (!slide || !Array.isArray(events) || !events.length) return slide;
    for (const event of events) {
      if (event.kind === "nsfw_mode") {
        slide.nsfwMode = event.mode;
      } else if (event.kind === "pose") {
        if (event.action === "hide") {
          slide.hcgAction = "hide";
          slide.poseId = "";
        } else if (event.poseId) {
          slide.hcgAction = "show";
          slide.poseId = event.poseId;
        }
      }
    }
    return slide;
  }

  function deriveHcgStateFromSlides(slides, throughIndex = Number.POSITIVE_INFINITY) {
    let nsfwMode = false;
    let poseId = "";
    let endedExplicitly = false;
    const list = Array.isArray(slides) ? slides : [];
    const end = Math.min(list.length - 1, throughIndex);
    for (let index = 0; index <= end; index += 1) {
      const slide = list[index];
      if (!slide) continue;
      if (slide.nsfwMode === "on") {
        nsfwMode = true;
        endedExplicitly = false;
      }
      if (slide.nsfwMode === "off") {
        nsfwMode = false;
        poseId = "";
        endedExplicitly = true;
      }
      if (slide.hcgAction === "hide") {
        // hide 视为结束当前 CG 显示（即使未写 nsfw_mode=off）
        poseId = "";
        nsfwMode = false;
        endedExplicitly = true;
      }
      // 只有 pose、漏写 nsfw_mode 时，也视为进入 HCG 视觉层，避免退回立绘差分
      if (slide.hcgAction === "show" && slide.poseId) {
        poseId = slide.poseId;
        nsfwMode = true;
        endedExplicitly = false;
      }
    }
    return {
      nsfwMode,
      poseId: nsfwMode ? poseId : "",
      endedExplicitly
    };
  }

  function stripControlTags(source) {
    return String(source || "").replace(CONTROL_TAG_RE, "").replace(/\n{3,}/g, "\n\n").trim();
  }

  function buildPoseWhitelistPrompt(characterName) {
    const poses = listPoseIds(characterName);
    if (!poses.length) {
      return "当前角色暂无可用姿势白名单；不要输出 <pose> 标签。";
    }
    return poses.map((id, index) => `${String(index + 1).padStart(2, "0")}. ${id}`).join("\n");
  }

  function buildNsfwHcgTagContract(characterName) {
    const whitelist = buildPoseWhitelistPrompt(characterName);
    return `【NSFW 视觉标签契约】
- 在 <story> 内，除 <dialogue> / <narration> 外，仅允许额外使用：
  - <nsfw_mode>on</nsfw_mode> 或 <nsfw_mode>off</nsfw_mode>
  - <pose id="姿势ID"/>
  - <pose action="hide"/>
- 当剧情进入明确成人向身体接触时，必须先输出 <nsfw_mode>on</nsfw_mode>，再输出 <pose id="..."/>。
- 推荐成对写法：
  <nsfw_mode>on</nsfw_mode>
  <pose id="kissing_makeout"/>
  <narration>...</narration>
- 姿势真正开始的那一页正文之前再换 pose；不要在纯对话铺垫页提前插入。
- 姿势没有实质变化时，不要重复输出同一个 pose。
- 收尾、事后安抚或结束亲密时，可切到 aftercare_embrace，然后 <nsfw_mode>off</nsfw_mode> 或 <pose action="hide"/>。
- 禁止编造白名单以外的 pose id。
- 注意：只写表情差分如 char="花海咲季(意外动摇)" 不会触发 HCG；HCG 只认 nsfw_mode / pose 标签。

可用姿势白名单（${text(characterName, 40) || "当前角色"}）：
${whitelist}`;
  }

  root.HatsuHcg = Object.freeze({
    CHARACTER_SLUGS,
    SAKI_NSFW_POSES,
    KOTONE_NSFW_POSES,
    UME_NSFW_POSES,
    UME_EXTRA_POSES,
    SHARED_NSFW_POSES,
    resolveCharacterSlug,
    listPoseIds,
    getPoseEntry,
    resolveHcgAsset,
    resolveHcgAssetWithFallback,
    parseNsfwModeTag,
    parsePoseTag,
    extractControlEvents,
    attachControlEventsToSlides,
    deriveHcgStateFromSlides,
    stripControlTags,
    buildPoseWhitelistPrompt,
    buildNsfwHcgTagContract
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
