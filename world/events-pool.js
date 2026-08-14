(function (global) {
  "use strict";

  const BROADCAST_HOST = "真诚优";
  const BROADCAST_GUEST_COUNT_MIN = 1;
  const BROADCAST_GUEST_COUNT_MAX = 3;

  /** playlist / 活动表记名 → 游戏内 canonical 名 */
  const IDOL_NAME_ALIASES = {
    "藤田ことね": "藤田琴音",
    "葛城リーリヤ": "葛城莉莉娅",
    "篠澤 広": "筱泽广",
    "篠泽广": "筱泽广",
    "花海祐芽": "花海佑芽",
    "倉本千奈": "仓本千奈",
    "秦谷美鈴": "秦谷美铃",
    "紫雲清夏": "紫云清夏",
    "姫崎莉波": "姬崎莉波",
    "雨夜 燕": "雨夜燕"
  };

  const GRADE3_IDOLS = ["十王星南", "雨夜燕", "姬崎莉波", "有村麻央"];
  const NO_PRODUCER_IDOLS = ["花海咲季", "月村手毬", "紫云清夏", "筱泽广", "葛城莉莉娅"];

  /** 个人曲库：前端抽签，完整人设交给世界书 */
  const PERSONAL_SONGS = [
    { id: "saki_fmw", idol: "花海咲季", title: "Fighting My Way", hooks: ["公开采访里说过「像把比赛输掉的火重新烧起来」"] },
    { id: "saki_wf", idol: "花海咲季", title: "Wildest Flower", hooks: ["live 里会以手势暗示「还没结束」"] },
    { id: "saki_ego", idol: "花海咲季", title: "EGO", hooks: ["偏竞技向的自我对话感"] },
    { id: "temari_uhl", idol: "月村手毬", title: "Unhappy Light", hooks: ["公开层面谈「讨厌的旧自己」"] },
    { id: "temari_itk", idol: "月村手毬", title: "一体いつから", hooks: ["语气克制，适合广播里慢慢展开"] },
    { id: "kotone_cute", idol: "藤田琴音", title: "世界一可愛い私", hooks: ["本人会半开玩笑地强调「可爱也是实力」"] },
    { id: "kotone_fuwa", idol: "藤田琴音", title: "ふわふわ", hooks: ["轻松向，适合真诚优调侃接话"] },
    { id: "hiro_koukei", idol: "筱泽广", title: "光景", hooks: ["偏静、偏观察，适合部长引导式提问"] },
    { id: "hiro_sunfade", idol: "筱泽广", title: "サンフェーデッド", hooks: ["可聊「做起来比想得难」的公开回忆"] },
    { id: "lilya_fragile", idol: "葛城莉莉娅", title: "Fragile Heart", hooks: ["海外视角下对学园舞台的新鲜感"] },
    { id: "lilya_wake", idol: "葛城莉莉娅", title: "Wake up!!", hooks: ["元气向，和清夏搭档话题可自然互文"] },
    { id: "kiyoka_kira", idol: "紫云清夏", title: "Kira Kira", hooks: ["芭蕾出身与 pop 曲风的公开对比"] },
    { id: "kiyoka_tame", idol: "紫云清夏", title: "Tame-Lie-One-Step", hooks: ["近期较少公开露面，适合以「回归练习室」口吻"] },
    { id: "ume_riceball", idol: "花海佑芽", title: "The Rolling Riceball", hooks: ["体力系偶像的公开招牌曲之一"] },
    { id: "chiyuki_solf", idol: "仓本千奈", title: "ときめきのソルフェージュ", hooks: ["末位逆袭叙事里的代表曲"] },
    { id: "chiyuki_ws", idol: "仓本千奈", title: "Wonder Scale", hooks: ["适合聊「第一次觉得自己也能做到」"] },
    { id: "misuzu_hyori", idol: "秦谷美铃", title: "フワリ", hooks: ["睡神天才的反差萌代表"] },
    { id: "seina_choo", idol: "十王星南", title: "Choo Choo Choo", hooks: ["学生会会长偶尔在广播里被后辈点名"] },
    { id: "seina_akahada", idol: "十王星南", title: "赤裸々", hooks: ["三年级前辈谈「学园第一」的公开压力"] },
    { id: "tsubame_riron", idol: "雨夜燕", title: "理論武装して", hooks: ["副会长式逻辑发言，适合部长抛难题"] },
    { id: "riko_utakoe", idol: "姬崎莉波", title: "歌声は君いろ", hooks: ["三年级茶话向；可提学生会书记身份"] },
    { id: "mao_mite", idol: "有村麻央", title: "見て", hooks: ["宿舍长口吻，适合听众 mail 联动"] }
  ];

  /** 活动剧情映射（公开层） */
  const BROADCAST_ACTIVITIES = [
    {
      id: "grade3_class1",
      name: "三年一班的偶像们",
      idols: ["姬崎莉波", "有村麻央"],
      hooks: ["公开活动偏班级合唱，强调团体磨合而非个人秀"]
    },
    {
      id: "grade1_class1",
      name: "一年一班的偶像们",
      idols: ["花海佑芽", "仓本千奈", "秦谷美铃"],
      hooks: ["一年级班级向活动，气氛偏互相打气"]
    },
    {
      id: "grade1_class2",
      name: "一年二班的偶像们",
      idols: ["花海咲季", "月村手毬", "藤田琴音"],
      hooks: ["同班不同风格，公开讨论「班级偶像」的定义"]
    },
    {
      id: "lilia_kiyoka_daily",
      name: "莉莉娅与清夏的日常",
      idols: ["葛城莉莉娅", "紫云清夏"],
      hooks: ["海外新生与芭蕾出身的组合，偏日常轻喜剧公开层"]
    },
    {
      id: "seina_tsubame_daily",
      name: "星南与燕的日常",
      idols: ["十王星南", "雨夜燕"],
      hooks: ["学生会正副会长，公开层面永远像在开会又像拌嘴"]
    },
    {
      id: "student_council_produce",
      name: "プロデュースって大変ね",
      idols: ["十王星南", "雨夜燕"],
      hooks: ["只谈「制作人科很忙」的学园共识，不写具体担当"]
    },
    {
      id: "signal_lights",
      name: "こいつらめんどくせー",
      idols: ["花海咲季", "月村手毬", "藤田琴音"],
      hooks: ["信号灯组合的公开互怼与互补"]
    },
    {
      id: "kotone_seina_majika",
      name: "まじか。",
      idols: ["藤田琴音", "十王星南"],
      hooks: ["琴音对会长保持距离是公开人设，适合点到为止"]
    },
    {
      id: "temari_mirei_truce",
      name: "一時休戦です",
      idols: ["月村手毬"],
      hooks: ["手毬个人向活动，可聊「和前初中第一和解」的公开说法"]
    },
    {
      id: "from_scratch",
      name: "もう一度、最初から！",
      idols: ["花海佑芽", "仓本千奈", "秦谷美铃"],
      hooks: ["星南代理组叙事，公开层只谈「重新开始」"]
    },
    {
      id: "slow_time",
      name: "ゆっくりと過ごしましょう",
      idols: ["姬崎莉波", "有村麻央"],
      hooks: ["三年级慢节奏日常，适合广播收尾感"]
    },
    {
      id: "ara_kiguu",
      name: "あら、奇遇ね",
      idols: ["葛城莉莉娅", "紫云清夏"],
      hooks: ["偶遇系轻故事，适合真诚优串场吐槽"]
    }
  ];

  const BROADCAST_CATEGORIES = [
    {
      id: "campus_daily",
      label: "学园日常",
      weight: 20,
      guestMode: "random",
      angles: [
        { id: "cafeteria", title: "食堂午间特辑", brief: "以食堂午餐、零食与偶像闲聊为话题，语气轻松。" },
        { id: "club_gossip", title: "部室栋小道", brief: "聊聊练习室、社团排练与偶像们在部室栋的偶遇。" },
        { id: "student_council", title: "学生会速报", brief: "围绕学生会公告、活动排期与星南、燕的公开露面。" },
        { id: "stage_preview", title: "舞台前瞻", brief: "展望讲堂、野外舞台近期可能的练习或小型演出。" },
        { id: "campus_routine", title: "本周学园概况", brief: "播报初星学园本周课程、社团与偶像科日常。" }
      ]
    },
    {
      id: "first_live_public",
      label: "First Live 季",
      weight: 15,
      guestMode: "random",
      phases: ["first_live"],
      angles: [
        { id: "season_overview", title: "First Live 季动向", brief: "讨论一年级偶像 First Live 筹备与公开活动，只写公开层。" },
        { id: "practice_room", title: "练习室传闻", brief: "部室栋深夜还亮着灯的传闻，不得写成担当私密培育。" },
        { id: "public_debut", title: "公开亮相之后", brief: "已完成 First Live 的偶像谈舞台后变化，未完成者谈筹备心态。" }
      ]
    },
    {
      id: "urban_legend",
      label: "校园怪谈",
      weight: 10,
      guestMode: "random",
      angles: [
        {
          id: "auditorium_echo",
          title: "深夜讲堂的回声",
          brief: "学园轻怪谈：空讲堂里多出来的和声。一位嘉宾半信半疑，一位偏认真。",
          hooks: ["旧生说关麦克风后仍有一拍延迟", "广播部后辈曾来求证"]
        },
        {
          id: "pool_lane",
          title: "泳池第七道",
          brief: "泳池闭馆后数道数的都市传说，禁止写成确证灵异。",
          hooks: ["体育馆值班表多出一行空白签名"]
        },
        {
          id: "archive_steps",
          title: "旧档案室的脚步",
          brief: "行政楼档案室夜里的脚步声，结尾落在「当传闻就好」。",
          hooks: ["据说只在下雨的周二出现"]
        },
        {
          id: "rooftop_wind",
          title: "屋顶的风向",
          brief: "屋顶门禁明明锁了，却有人听见练习哼唱。",
          hooks: ["风向总往偶像科那边吹——嘉宾可以互相拆台"]
        },
        {
          id: "vending_machine",
          title: "自动贩卖机第 0 排",
          brief: "小卖部机器偶尔吐出已停售的限定款，轻松向怪谈。",
          hooks: ["只有考试周前夜才会发生"]
        }
      ]
    },
    {
      id: "personal_song",
      label: "个人曲时间",
      weight: 15,
      guestMode: "personal_song",
      angles: [
        { id: "why_this_song", title: "为什么选这首歌", brief: "主嘉宾谈选曲理由与公开回忆，副嘉宾听众视角提问。" },
        { id: "favorite_line", title: "最喜欢的一行", brief: "用大意聊歌词感受，不要大段念歌词。" },
        { id: "recording_memory", title: "录音棚小故事", brief: "只写公开层面的录音或 live 花絮。" },
        { id: "live_version", title: "舞台版有什么不同", brief: "对比 studio 与学园 live 的公开说法。" }
      ]
    },
    {
      id: "activity_song",
      label: "活动曲特辑",
      weight: 12,
      guestMode: "activity",
      angles: [
        { id: "activity_mood", title: "这首歌负责什么气氛", brief: "谈活动里歌曲承担的情绪分工，不写未公开剧情。" },
        { id: "rehearsal_gossip", title: "排练室公开花絮", brief: "排练时的公开趣事，禁止制作人私密线。" },
        { id: "compare_events", title: "和其他活动曲比一比", brief: "横向对比风格，不剧透。" },
        { id: "looking_forward", title: "期待向", brief: "活动若尚未发生，改聊期待与排练传闻。" }
      ]
    },
    {
      id: "senior_corner",
      label: "三年级茶话",
      weight: 8,
      guestMode: "grade3",
      angles: [
        { id: "senior_schedule", title: "三年级有多忙", brief: "学生会、宿舍、live 并行的公开吐槽。" },
        { id: "advice_to_juniors", title: "给后辈的一句话", brief: "三年级对一年级 First Live 季的公开建议。" },
        { id: "dorm_life", title: "宿舍长值班日", brief: "有村麻央宿舍长视角，可带莉波。" }
      ]
    },
    {
      id: "producer_life",
      label: "制作人科观察",
      weight: 5,
      guestMode: "no_producer",
      angles: [
        { id: "what_producers_do", title: "制作人都在忙什么", brief: "无担当一年级聊对制作人科的公开印象，不写 {{user}}。" },
        { id: "idol_class_rumor", title: "偶像科听来的", brief: "课程、合练、选拔传闻的公开层。" }
      ]
    },
    {
      id: "listener_mail",
      label: "听众来信",
      weight: 5,
      guestMode: "random",
      angles: [
        {
          id: "mail_campus",
          title: "学园生活咨询",
          brief: "真诚优读虚构听众来信，嘉宾公开层回应；信件内容前端虚构，勿涉制作人私密。",
          hooks: ["「一年级偶像如何平衡课程与练习」", "「食堂推荐套餐是什么」"]
        },
        {
          id: "mail_song",
          title: "点歌与感想",
          brief: "听众点播某首学园曲，嘉宾谈公开印象。",
          hooks: ["「请谈谈 Campus mode!! 对学园的意义」"]
        }
      ]
    }
  ];

  /** @deprecated 扁平列表，仅供旧引用；新逻辑走 BROADCAST_CATEGORIES */
  const BROADCAST_TOPICS = BROADCAST_CATEGORIES.flatMap((cat) =>
    cat.angles.map((angle) => ({
      id: `${cat.id}_${angle.id}`,
      categoryId: cat.id,
      title: angle.title,
      template: angle.brief
    }))
  );

  const LOCATION_WEIGHTS_BY_PHASE = {
    morning: ["playground", "gymnasium", "school_entrance", "idol_classroom"],
    midday: ["dining_hall", "student_store", "idol_classroom"],
    afternoon: ["club_room", "idol_classroom", "producer_classroom", "gymnasium"],
    evening: ["outstage", "dining_hall", "student_store", "auditorium"]
  };

  function hashSeed(text) {
    let h = 2166136261;
    const s = String(text || "");
    for (let i = 0; i < s.length; i += 1) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function seededPick(list, seed) {
    if (!Array.isArray(list) || !list.length) return null;
    const idx = hashSeed(seed) % list.length;
    return list[idx];
  }

  function seededWeightedPick(list, seed, weightFn) {
    if (!Array.isArray(list) || !list.length) return null;
    const weights = list.map((item) => Math.max(0, Number(weightFn(item)) || 0));
    const total = weights.reduce((sum, w) => sum + w, 0);
    if (total <= 0) return list[0];
    let roll = hashSeed(seed) % total;
    for (let i = 0; i < list.length; i += 1) {
      roll -= weights[i];
      if (roll < 0) return list[i];
    }
    return list[list.length - 1];
  }

  function normalizeIdolName(name, canonicalFn) {
    const raw = String(name || "").trim();
    if (!raw) return "";
    const aliased = IDOL_NAME_ALIASES[raw] || raw;
    return typeof canonicalFn === "function" ? canonicalFn(aliased) : aliased;
  }

  function filterAvailableIdols(idolList, idolNames, state, canonicalFn) {
    const available = new Set(
      (idolNames || []).map((name) => normalizeIdolName(name, canonicalFn)).filter(Boolean)
    );
    const current = normalizeIdolName(state?.idol, canonicalFn);
    return (idolList || [])
      .map((name) => normalizeIdolName(name, canonicalFn))
      .filter((name) => name && available.has(name) && name !== current);
  }

  function getCategoriesForPhase(phase) {
    return BROADCAST_CATEGORIES.filter((cat) => {
      if (!cat.phases || !cat.phases.length) return true;
      return cat.phases.includes(phase);
    });
  }

  function pickPersonalSong(state, dayKey, idolNames, canonicalFn) {
    const pool = PERSONAL_SONGS.filter((song) => {
      const idol = normalizeIdolName(song.idol, canonicalFn);
      return filterAvailableIdols([idol], idolNames, state, canonicalFn).length > 0;
    });
    return seededPick(pool, `song:${dayKey}:${state?.freeMode?.postLiveDay}`) || PERSONAL_SONGS[0];
  }

  function pickActivity(state, dayKey, phase) {
    const pool = BROADCAST_ACTIVITIES.filter((act) => !act.phases || act.phases.includes(phase));
    return seededPick(pool, `activity:${dayKey}:${phase}`) || BROADCAST_ACTIVITIES[0];
  }

  function countAvailableGuests(idolNames, state, canonicalFn, exclude) {
    const excluded = new Set((exclude || []).map((n) => normalizeIdolName(n, canonicalFn)));
    const pool = (idolNames || [])
      .map((name) => normalizeIdolName(name, canonicalFn))
      .filter((name) => name && !excluded.has(name));
    return new Set(pool).size;
  }

  function getGuestPoolCapacity(category, context, idolNames, state, canonicalFn) {
    if (category.guestMode === "personal_song" && context.song) {
      const primary = normalizeIdolName(context.song.idol, canonicalFn);
      const extras = countAvailableGuests(idolNames, state, canonicalFn, [primary]);
      return (primary ? 1 : 0) + extras;
    }

    if (category.guestMode === "activity" && context.activity) {
      const fromActivity = filterAvailableIdols(context.activity.idols, idolNames, state, canonicalFn);
      const activityCount = new Set(fromActivity).size;
      const fillCount = countAvailableGuests(idolNames, state, canonicalFn, fromActivity);
      return activityCount + fillCount;
    }

    if (category.guestMode === "grade3") {
      const pool = filterAvailableIdols(GRADE3_IDOLS, idolNames, state, canonicalFn);
      return pool.length ? new Set(pool).size : countAvailableGuests(idolNames, state, canonicalFn);
    }

    if (category.guestMode === "no_producer") {
      const pool = filterAvailableIdols(NO_PRODUCER_IDOLS, idolNames, state, canonicalFn);
      return pool.length ? new Set(pool).size : countAvailableGuests(idolNames, state, canonicalFn);
    }

    return countAvailableGuests(idolNames, state, canonicalFn);
  }

  function rollGuestCount(category, context, state, dayKey, idolNames, canonicalFn) {
    const capacity = getGuestPoolCapacity(category, context, idolNames, state, canonicalFn);
    if (capacity <= 0) return 0;
    const max = Math.min(BROADCAST_GUEST_COUNT_MAX, capacity);
    const min = Math.min(BROADCAST_GUEST_COUNT_MIN, max);
    if (max <= min) return max;
    const span = max - min + 1;
    const offset = hashSeed(`guestCount:${dayKey}:${category.id}`) % span;
    return min + offset;
  }

  function pickRandomGuests(idolNames, state, count, seedPrefix, canonicalFn, exclude) {
    const excluded = new Set((exclude || []).map((n) => normalizeIdolName(n, canonicalFn)));
    const pool = (idolNames || [])
      .map((name) => normalizeIdolName(name, canonicalFn))
      .filter((name) => name && !excluded.has(name));
    const campusWeight = global.HatsuWorld?.campusBehavior?.getCampusPresenceWeightMultiplier;
    const guests = [];
    let attempt = 0;
    while (guests.length < count && pool.length && attempt < 48) {
      let pick;
      if (typeof campusWeight === "function" && state?.freeMode?.world?.campus?.slots) {
        const candidates = pool.filter((name) => !guests.includes(name));
        if (!candidates.length) break;
        const weights = candidates.map((name) => Math.max(0.05, campusWeight(name, state)));
        pick = seededWeightedPick(candidates, `${seedPrefix}:${attempt}:${guests.length}`, (name) => {
          const idx = candidates.indexOf(name);
          return idx >= 0 ? weights[idx] : 0.05;
        });
      } else {
        pick = seededPick(pool, `${seedPrefix}:${attempt}:${guests.length}`);
      }
      attempt += 1;
      if (!pick || guests.includes(pick)) continue;
      guests.push(pick);
    }
    return guests;
  }

  function pickBroadcastAngle(category, state, dayKey) {
    const angles = category?.angles || [];
    if (!angles.length) return null;
    const campusBoost = global.HatsuWorld?.campusBehavior?.getCampusAngleWeightMultiplier;
    const useCampus = typeof campusBoost === "function"
      && state?.freeMode?.world?.campus?.slots
      && (category.id === "campus_daily" || category.id === "first_live_public");
    if (useCampus) {
      return seededWeightedPick(angles, `angle:${dayKey}:${category.id}`, (angle) => campusBoost(angle.id, state))
        || angles[0];
    }
    return seededPick(angles, `angle:${dayKey}:${category.id}`);
  }

  function pickGuestsForEpisode(category, context, state, dayKey, idolNames, canonicalFn, count) {
    const guestCount = Number.isFinite(count) ? count : rollGuestCount(category, context, state, dayKey, idolNames, canonicalFn);
    const seedPrefix = `guest:${dayKey}:${category.id}:${guestCount}`;

    if (guestCount <= 0) return [];

    if (category.guestMode === "personal_song" && context.song) {
      const primary = normalizeIdolName(context.song.idol, canonicalFn);
      const guests = primary ? [primary] : [];
      if (guests.length < guestCount) {
        guests.push(...pickRandomGuests(
          idolNames,
          state,
          guestCount - guests.length,
          `${seedPrefix}:extra`,
          canonicalFn,
          guests
        ));
      }
      return guests.slice(0, guestCount);
    }

    if (category.guestMode === "activity" && context.activity) {
      const fromActivity = filterAvailableIdols(context.activity.idols, idolNames, state, canonicalFn);
      const guests = [];
      let attempt = 0;
      while (guests.length < guestCount && fromActivity.length && attempt < 48) {
        const pick = seededPick(fromActivity, `${seedPrefix}:act:${attempt}`);
        attempt += 1;
        if (!pick || guests.includes(pick)) continue;
        guests.push(pick);
      }
      if (guests.length < guestCount) {
        guests.push(...pickRandomGuests(idolNames, state, guestCount - guests.length, `${seedPrefix}:fill`, canonicalFn, guests));
      }
      return guests.slice(0, guestCount);
    }

    if (category.guestMode === "grade3") {
      const pool = filterAvailableIdols(GRADE3_IDOLS, idolNames, state, canonicalFn);
      return pickRandomGuests(pool.length ? pool : idolNames, state, guestCount, seedPrefix, canonicalFn);
    }

    if (category.guestMode === "no_producer") {
      const pool = filterAvailableIdols(NO_PRODUCER_IDOLS, idolNames, state, canonicalFn);
      return pickRandomGuests(pool.length ? pool : idolNames, state, guestCount, seedPrefix, canonicalFn);
    }

    return pickRandomGuests(idolNames, state, guestCount, seedPrefix, canonicalFn);
  }

  function collectHooks(context, dayKey) {
    const hooks = [];
    if (context.song?.hooks?.length) hooks.push(...context.song.hooks);
    if (context.activity?.hooks?.length) hooks.push(...context.activity.hooks);
    if (context.angle?.hooks?.length) hooks.push(...context.angle.hooks);
    const unique = [...new Set(hooks.filter(Boolean))];
    if (!unique.length) return [];
    const first = seededPick(unique, `hook-a:${dayKey}`);
    const second = seededPick(unique.filter((h) => h !== first), `hook-b:${dayKey}`);
    return second ? [first, second] : [first];
  }

  function buildEpisodeTitle(category, context) {
    if (category.id === "personal_song" && context.song) {
      return `个人曲时间：${context.song.title}`;
    }
    if (category.id === "activity_song" && context.activity) {
      return `活动曲特辑：${context.activity.name}`;
    }
    if (category.id === "urban_legend" && context.angle) {
      return `校园怪谈：${context.angle.title}`;
    }
    return context.angle?.title || category.label;
  }

  function buildEpisodeBrief(category, context) {
    const parts = [context.angle?.brief || category.label];
    if (category.id === "personal_song" && context.song) {
      parts.push(`主嘉宾谈「${context.song.title}」的公开理解与回忆。`);
    }
    if (category.id === "activity_song" && context.activity) {
      parts.push(`围绕活动「${context.activity.name}」相关曲目与公开排练花絮。`);
    }
    return parts.filter(Boolean).join(" ");
  }

  function buildGuestNotes(guests, state, castTrack) {
    const ct = castTrack || global.HatsuWorld?.castTrack;
    return guests.map((g) => {
      const status = ct?.getCastFirstLiveStatus?.(g, state);
      if (status === "complete") return `${g} 近期有公开演出话题可聊`;
      if (status === "none") return `${g} 更多谈日常与课程`;
      return `${g} 可聊筹备与学园生活`;
    }).join("；");
  }

  function buildBroadcastOutline(episode, state, castTrack) {
    const guestText = (episode.guests || []).length ? episode.guests.join("、") : "（本期无来访嘉宾，真诚优对听众独白）";
    const hookText = (episode.hooks || []).length ? episode.hooks.join("；") : "";
    const guestNotes = buildGuestNotes(episode.guests || [], state, castTrack);
    const campusBlock = global.HatsuWorld?.campusBehavior?.buildCampusInjectionBlock?.(state, "broadcast") || "";
    return [
      `主持：${episode.host || BROADCAST_HOST}`,
      `类别：${episode.categoryLabel || ""}`,
      `本期主题：${episode.title || ""}`,
      `嘉宾：${guestText}`,
      episode.angleId ? `角度：${episode.angleId}` : "",
      `提纲：${episode.brief || ""}`,
      hookText ? `钩子：${hookText}` : "",
      episode.meta?.songTitle ? `曲目：${episode.meta.songTitle}` : "",
      episode.meta?.activityName ? `活动：${episode.meta.activityName}` : "",
      guestNotes ? `嘉宾方向：${guestNotes}` : "",
      campusBlock
    ].filter(Boolean).join("\n");
  }

  function rollBroadcastPlan(state, dayKey, helpers) {
    const canonicalFn = helpers?.canonicalIdolName;
    const idolNames = helpers?.idolNames || [];
    const phase = state?.freeMode?.world?.macro_phase || "first_live";
    const categories = getCategoriesForPhase(phase);
    const category = seededWeightedPick(categories, `cat:${dayKey}:${phase}`, (c) => c.weight) || categories[0];

    const context = { category, angle: null, song: null, activity: null };

    if (category.id === "personal_song") {
      context.song = pickPersonalSong(state, dayKey, idolNames, canonicalFn);
      context.angle = seededPick(category.angles, `angle:${dayKey}:personal:${context.song?.id}`);
    } else if (category.id === "activity_song") {
      context.activity = pickActivity(state, dayKey, phase);
      context.angle = seededPick(category.angles, `angle:${dayKey}:activity:${context.activity?.id}`);
    } else {
      context.angle = pickBroadcastAngle(category, state, dayKey);
    }

    const guestCount = rollGuestCount(category, context, state, dayKey, idolNames, canonicalFn);
    const guests = pickGuestsForEpisode(category, context, state, dayKey, idolNames, canonicalFn, guestCount);

    const hooks = collectHooks(context, dayKey);
    const title = buildEpisodeTitle(category, context);
    const brief = buildEpisodeBrief(category, context);

    return {
      host: BROADCAST_HOST,
      categoryId: category.id,
      categoryLabel: category.label,
      angleId: context.angle?.id || "",
      topicId: `${category.id}_${context.angle?.id || "default"}`,
      title,
      brief,
      hooks,
      guests,
      guestCount: guests.length,
      meta: {
        songTitle: context.song?.title || "",
        songIdol: context.song?.idol || "",
        activityId: context.activity?.id || "",
        activityName: context.activity?.name || ""
      }
    };
  }

  function composeDailyBroadcastEpisode(state, dayKey, helpers, castTrack) {
    const plan = rollBroadcastPlan(state, dayKey, helpers);
    return {
      ...plan,
      outline: buildBroadcastOutline(plan, state, castTrack)
    };
  }

  /** @deprecated 使用 rollBroadcastPlan / composeDailyBroadcastEpisode */
  function pickBroadcastTopic(state, dayKey) {
    const plan = rollBroadcastPlan(state, dayKey, { idolNames: [], canonicalIdolName: (n) => n });
    return {
      id: plan.topicId,
      categoryId: plan.categoryId,
      title: plan.title,
      template: plan.brief
    };
  }

  /** @deprecated 使用 rollBroadcastPlan 内的嘉宾逻辑 */
  function pickBroadcastGuests(idolNames, state, count, canonicalFn) {
    return pickRandomGuests(idolNames, state, count, `guest:legacy:${state?.freeMode?.postLiveDay}`, canonicalFn);
  }

  function getTimePhase(clockMinutes) {
    const m = Number(clockMinutes) || 480;
    if (m < 12 * 60) return "morning";
    if (m < 14 * 60) return "midday";
    if (m < 18 * 60) return "afternoon";
    return "evening";
  }

  function pickPresenceLocation(idolName, state) {
    const phase = getTimePhase(state?.freeMode?.clockMinutes);
    const weights = LOCATION_WEIGHTS_BY_PHASE[phase] || LOCATION_WEIGHTS_BY_PHASE.afternoon;
    const dayKey = `${state?.freeMode?.postLiveDay || 1}@${state?.freeMode?.clockMinutes || 480}`;
    return seededPick(weights, `loc:${dayKey}:${idolName}`) || weights[0];
  }

  global.HatsuWorld = global.HatsuWorld || {};
  global.HatsuWorld.eventsPool = {
    BROADCAST_HOST,
    BROADCAST_GUEST_COUNT_MIN,
    BROADCAST_GUEST_COUNT_MAX,
    BROADCAST_CATEGORIES,
    BROADCAST_ACTIVITIES,
    PERSONAL_SONGS,
    BROADCAST_TOPICS,
    LOCATION_WEIGHTS_BY_PHASE,
    hashSeed,
    seededPick,
    rollBroadcastPlan,
    rollGuestCount,
    composeDailyBroadcastEpisode,
    buildBroadcastOutline,
    pickBroadcastTopic,
    pickBroadcastGuests,
    getTimePhase,
    pickPresenceLocation
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
