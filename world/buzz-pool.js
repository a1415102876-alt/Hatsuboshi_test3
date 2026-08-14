(function (global) {
  "use strict";

  /**
   * 初星 SNS · 舆论池（与广播 events-pool 分池）
   * - activity: 0~1，被选为 author 的权重
   * - lurker: 极少主动发帖
   * - controversy: 0~1，炎上/误读/高热概率
   * - tones: 可用模板标签
   * - replyHabit: 0~1，是否在他人帖下留言（后续 pass）
   * - heatBaseline: low | normal | high，常态互动感
   */

  const SNS_PROFILES = {
    "藤田琴音": {
      activity: 0.82,
      lurker: false,
      controversy: 0.22,
      replyHabit: 0.75,
      heatBaseline: "normal",
      tones: ["cute", "pragmatic", "selfie", "seeking_praise"],
      note: "高频；可爱与现实收益并置；被误读成「太功利」时会自己梗化。",
      samples: [
        "今天也可爱到可以折现吗……不对，是可爱到可以加油练习了。",
        "打工→练习→如果还有力气发自拍，说明今日 KPI 合格。",
        "限定甜品售罄了。人生也是。……开玩笑的，明天继续冲。",
        "有人夸我可爱吗，没有的话我十秒后再来看一遍。"
      ]
    },
    "月村手毬": {
      activity: 0.72,
      lurker: false,
      controversy: 0.88,
      replyHabit: 0.35,
      heatBaseline: "high",
      tones: ["sharp", "dry", "self_sabotage", "misread_risk"],
      note: "炎上系；短句、像怼人；本意自嘲却被读成攻击；常删帖或「打错了」。",
      flags: ["misread_risk", "ratio_prone", "delete_attempt"],
      samples: [
        "说练不够的人，请先看看自己练没练。",
        "……打错了。原意是说我本人。",
        "今天状态一般。一般是指比你们强一点。",
        "删了。当没看见。",
        "又被人截图了？随便。"
      ]
    },
    "花海咲季": {
      activity: 0.68,
      lurker: false,
      controversy: 0.18,
      replyHabit: 0.45,
      heatBaseline: "normal",
      tones: ["competitive", "proud", "training", "athlete"],
      note: "中高频；胜负欲、训练记录；很少示弱；提到妹妹时语气会软一点。",
      samples: [
        "今日训练完成。赢过昨天的自己，算小胜。",
        "食堂蛋白质补充完毕。下一步：把舞台也拿下。",
        "有人说一年级太拼了——谢谢，是夸奖吧。",
        "失败只是数据。改方案就行。"
      ]
    },
    "花海佑芽": {
      activity: 0.9,
      lurker: false,
      controversy: 0.08,
      replyHabit: 0.85,
      heatBaseline: "normal",
      tones: ["energetic", "straight", "sister", "genki"],
      note: "最高频之一；直球、感叹号多；常提姐姐但不直说输赢；评论区气氛组。",
      samples: [
        "今天也练超——开心！！",
        "小卖部新口味试了！结论：能补充体力就是好味！",
        "路过讲堂听到有人练唱，好厉害，我也不能输！",
        "下雨也跑步！……跑回宿舍算吗？"
      ]
    },
    "筱泽广": {
      activity: 0.24,
      lurker: false,
      controversy: 0.15,
      replyHabit: 0.2,
      heatBaseline: "low",
      tones: ["deadpan", "theory", "experiment", "absurdist"],
      note: "低频怪帖；像实验记录；偶尔因太抽象被转疯，本人不解。",
      samples: [
        "今日步行 312 步。比预测少 47。有趣。",
        "楼梯是垂直赛道。我弃权。",
        "把歌词当公式背了。身体没同意。",
        "存活确认。"
      ]
    },
    "十王星南": {
      activity: 0.38,
      lurker: false,
      controversy: 0.12,
      replyHabit: 0.25,
      heatBaseline: "normal",
      tones: ["polished", "president", "notice", "mentor"],
      note: "中低频；像通知不像碎碎念；很少回复；完美形象不容出错。",
      samples: [
        "本周学生会安排已更新。请一年级同学注意 First Live 相关日程。",
        "初星的基础，是每日的积累。共勉。",
        "看到后辈们在部室栋努力，很好。",
        "（无配文）训练场照片一张，构图已检查。"
      ]
    },
    "秦谷美铃": {
      activity: 0.12,
      lurker: true,
      controversy: 0.05,
      replyHabit: 0.15,
      heatBaseline: "low",
      tones: ["sleepy", "absurdist", "tea", "unbothered"],
      note: "极低频 lurker；凌晨出没；半句消失；偶尔神句；星南看了会头痛。",
      samples: [
        "早安。……已经是下午了吗。",
        "限定布丁是什么。",
        "在茶道部睡过头的后果：错过限定。值得。",
        "茶，很好。学園，也不错。继续睡。",
        "被@了。稍后。可能。"
      ]
    },
    "仓本千奈": {
      activity: 0.56,
      lurker: false,
      controversy: 0.1,
      replyHabit: 0.65,
      heatBaseline: "normal",
      tones: ["earnest", "formal_cute", "emotional", "trying_hard"],
      note: "中频；礼貌用语多；认真过头像公告；练输了会发长文又删。",
      samples: [
        "今天也努力练习了！虽然还是最后一名……但比昨天多坚持了一分钟！",
        "食堂的汤很好喝。感谢厨师阿姨。",
        "对不起发太多……只是太开心了。",
        "如果打扰到大家，我会少发。……少发一条试试。"
      ]
    },
    "葛城莉莉娅": {
      activity: 0.36,
      lurker: false,
      controversy: 0.06,
      replyHabit: 0.4,
      heatBaseline: "low",
      tones: ["shy", "anime", "self_deprecating", "friend_tag"],
      note: "中低频；害羞自我否定；动漫/游戏话题会突然变长；常@清夏。",
      samples: [
        "还、还可以再练……吧……",
        "今天没有绊倒。进步。",
        "这部新番的 ED 好适合当练习背景……只是说说。",
        "和清夏约好了。一定会上的。"
      ]
    },
    "紫云清夏": {
      activity: 0.86,
      lurker: false,
      controversy: 0.16,
      replyHabit: 0.82,
      heatBaseline: "normal",
      tones: ["gyaru", "fashion", "playful", "deflect", "social_native", "friend_tag"],
      note: "高频；典型 SNS 辣妹——Stories、OOTD、@ 朋友、投票问卷都发；练不练另说，手机不能停。公开露面少≠帖少。",
      samples: [
        "今日 OOTD：练舞也能穿好看，信我。",
        "Story 更新了。可丽饼测评，满分。",
        "@葛城莉莉娅 今晚视频通话打卡～约好了不许逃",
        "问卷：可丽饼 vs 珍珠奶茶，选错的自己反省",
        "翘……调整了一下课表。去买了可丽饼。",
        "别问为什么不在练习室。问就是在买鞋。",
        "莉莉娅说想练我也得在。行吧行吧～",
        "转发：这家美甲店初星学園站步行五分钟，懂的来"
      ]
    },
    "有村麻央": {
      activity: 0.44,
      lurker: false,
      controversy: 0.1,
      replyHabit: 0.5,
      heatBaseline: "normal",
      tones: ["prince", "dorm_care", "curated", "otaku_slip"],
      note: "中频；宿舍长/王子人设；照顾后辈口吻；偶发动画相关手滑又删。",
      samples: [
        "宿舍熄灯时间请遵守。熬夜的我会单独谈话。",
        "训练场借到用了，记得整理鞋架。",
        "……手滑转发。已删。",
        "后辈们今天也辛苦了。王子……不，学长在看着。"
      ]
    },
    "姬崎莉波": {
      activity: 0.52,
      lurker: false,
      controversy: 0.08,
      replyHabit: 0.7,
      heatBaseline: "normal",
      tones: ["onee_san", "gentle", "secretary", "sweet_tooth"],
      note: "中频；姐姐式安抚；学生会书记腔与私下甜食帖并存；爱回复后辈。",
      samples: [
        "大家辛苦了。记得补水。",
        "学生会资料整理完了。可以安心练歌了。",
        "祭典的苹果糖……只是路过买了。",
        "不要太勉强。姐姐会在后面推一把。"
      ]
    },
    "雨夜燕": {
      activity: 0.58,
      lurker: false,
      controversy: 0.42,
      replyHabit: 0.4,
      heatBaseline: "high",
      tones: ["sharp", "vice_president", "rivalry", "tsundere", "otaku_slip"],
      note: "中高频；副会长式逻辑发言；间接 @ 星南；毒舌易被误读；动漫店被拍到会否认。",
      flags: ["misread_risk", "debate_prone"],
      samples: [
        "某些「永远第一」的人，今天也练习了吗。——泛指。",
        "理论武装完毕。有意见请带数据来。",
        "只是路过动漫区。不是特意去的。",
        "副会长也会累。……这句删掉。",
        "星南……不，会长今天公告发错了字。我修好了。"
      ]
    }
  };

  /** 日常类（非广播节目类）；tone 与 SNS_PROFILES.tones 对齐 */
  const BUZZ_TEMPLATES = [
    { category: "food", tone: "cute", text: "限定甜品没了……我的笑容也没了。……骗你的，练习继续。" },
    { category: "food", tone: "sharp", text: "限定又没了。行。" },
    { category: "food", tone: "sleepy", text: "限定是什么。" },
    { category: "food", tone: "earnest", text: "食堂的汤很好喝。认真推荐。" },
    { category: "food", tone: "gyaru", text: "可丽饼 > 卡路里。今日结论。" },
    { category: "food", tone: "social_native", text: "Story 更新了。今日甜度报告。" },
    { category: "food", tone: "friend_tag", text: "@好友 今晚这家去不去，不回当默认去" },
    { category: "food", tone: "onee_san", text: "记得吃饭。别空着肚子练。" },

    { category: "practice_idle", tone: "competitive", text: "今日训练完成。小胜。" },
    { category: "practice_idle", tone: "energetic", text: "练完！还能再跑一圈！" },
    { category: "practice_idle", tone: "deadpan", text: "练习 47 分钟。存活。" },
    { category: "practice_idle", tone: "sharp", text: "说练不够的人，请先看看自己练没练。", misreadRisk: true },
    { category: "practice_idle", tone: "shy", text: "今天没有绊倒。……算进步。" },
    { category: "practice_idle", tone: "prince", text: "训练场整理完毕。请保持。" },

    { category: "class_mood", tone: "pragmatic", text: "这节偶像科课能换成实践吗。……不能啊。" },
    { category: "class_mood", tone: "formal_cute", text: "今天提问回答了！虽然声音很小……" },
    { category: "class_mood", tone: "president", text: "期中提醒：日程见学生会公告。" },
    { category: "class_mood", tone: "deflect", text: "课表什么的，之后再说～" },

    { category: "weather_day", tone: "genki", text: "下雨也练！……室内也算！" },
    { category: "weather_day", tone: "tea", text: "雨天适合茶。适合睡。" },
    { category: "weather_day", tone: "athlete", text: "湿度高。热身加长。" },

    { category: "campus_spot", tone: "playful", text: "小卖部新贴纸好可爱。买了。" },
    { category: "campus_spot", tone: "social_native", text: "初星站前新开的店，已定位。需要的自取。" },
    { category: "campus_spot", tone: "gyaru", text: "部室栋镜子光线不行。下次换地方拍。" },
    { category: "campus_spot", tone: "self_deprecating", text: "在部室栋迷路了。……同层也算。" },
    { category: "campus_spot", tone: "dorm_care", text: "宿舍走廊灯坏了一盏。已报修。" },

    { category: "self_moment", tone: "seeking_praise", text: "有人夸我可爱吗，没有的话我十秒后再来看一遍。" },
    { category: "self_moment", tone: "self_sabotage", text: "……打错了。当没看见。" },
    { category: "self_moment", tone: "otaku_slip", text: "……手滑转发。已删。" },
    { category: "self_moment", tone: "sister", text: "今天也要追上某个人！……是谁先不说。" },

    { category: "petty_gossip", tone: "absurdist", text: "听说部室栋三楼很吵。我睡的三楼也很吵。无关。" },
    { category: "petty_gossip", tone: "rivalry", text: "学生会今天也很忙。——陈述句。" },
    { category: "petty_gossip", tone: "unbothered", text: "被@了。稍后。可能。" }
  ];

  /** 广播播出日可选追加，不进主池抽签 */
  const BROADCAST_REACTION_TEMPLATES = [
    { tone: "genki", text: "今天广播听了！怪谈那段好吓人但又想听！" },
    { tone: "sharp", text: "广播部今天话题不错。……我指内容，不是主持人。" },
    { tone: "sleepy", text: "广播开始的时候我刚好醒来。算准时。" },
    { tone: "onee_san", text: "广播辛苦了。大家记得放松耳朵。" },
    { tone: "deadpan", text: "广播作为背景音。存活率 100%。" },
    { tone: "cute", text: "如果广播里提到可爱的人，应该不是在说我吧……应该在说我吧？" }
  ];

  /** 炎上 follow-up（仅 author.controversy 高且 flags 命中时） */
  const CONTROVERSY_FOLLOWUPS = {
    crowd: [
      { text: "那条是不是在影射谁……", anonymous: true },
      { text: "截图了。别删啊。", anonymous: true },
      { text: "评论区打起来了", anonymous: true }
    ],
    author: [
      { tone: "self_sabotage", text: "……打错了。原意是说我本人。" },
      { tone: "sharp", text: "删了。当没看见。" },
      { tone: "sharp", text: "又被人截图了？随便。" },
      { tone: "tsundere", text: "副会长也会累。……这句删掉。" }
    ]
  };

  const OFFICIAL_ACCOUNTS = {
    student_council: {
      name: "初星学生会",
      activity: 0.3,
      tones: ["notice"]
    },
    broadcast_club: {
      name: "初星广播部",
      activity: 0.25,
      tones: ["notice"]
    },
    cafeteria: {
      name: "初星食堂",
      activity: 0.2,
      tones: ["notice"]
    }
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

  function getSnsProfile(idolName) {
    return SNS_PROFILES[idolName] || null;
  }

  function pickWeightedAuthor(idolNames, state, dayKey, slot, canonicalFn) {
    const current = typeof canonicalFn === "function" ? canonicalFn(state?.idol || "") : state?.idol;
    const candidates = (idolNames || [])
      .map((n) => (typeof canonicalFn === "function" ? canonicalFn(n) : n))
      .filter((n) => n && n !== current && SNS_PROFILES[n]);

    if (!candidates.length) return null;

    const campusWeight = global.HatsuWorld?.campusBehavior?.getCampusPresenceWeightMultiplier;

    const weights = candidates.map((name) => {
      const p = SNS_PROFILES[name];
      let w = p.lurker ? Math.max(0.05, p.activity * 0.35) : Math.max(0.05, p.activity);
      if (typeof campusWeight === "function") {
        w *= campusWeight(name, state);
      }
      return w;
    });
    const total = weights.reduce((a, b) => a + b, 0);
    let roll = hashSeed(`sns:author:${dayKey}:${slot}`) % total;
    for (let i = 0; i < candidates.length; i += 1) {
      roll -= weights[i];
      if (roll < 0) return candidates[i];
    }
    return candidates[candidates.length - 1];
  }

  function pickBuzzCategory(state, dayKey, slot) {
    const campusBoost = global.HatsuWorld?.campusBehavior?.getCampusBuzzCategoryWeightMultiplier;
    if (typeof campusBoost !== "function") {
      return seededWeightedPickCategories(BUZZ_CATEGORIES, `buzz:cat:${dayKey}:${slot}`);
    }
    return seededWeightedPick(BUZZ_CATEGORIES, `buzz:cat:${dayKey}:${slot}`, (cat) => {
      const base = Math.max(0, Number(cat.weight) || 0);
      return base * campusBoost(cat.id, state);
    }) || BUZZ_CATEGORIES[0];
  }

  function maybeCampusAwareText(author, text, state, dayKey, slot) {
    const hintFn = global.HatsuWorld?.campusBehavior?.getCampusSpotHint;
    if (typeof hintFn !== "function" || !author || !text) return text;
    const hint = hintFn(author, state);
    if (!hint) return text;
    if (hashSeed(`buzz:campusHint:${dayKey}:${slot}:${author}`) % 100 > 42) return text;
    if (text.includes(hint.slice(0, 4))) return text;
    return `${hint}。${text}`;
  }

  function pickTemplateForAuthor(author, category, dayKey, slot) {
    const profile = SNS_PROFILES[author];
    if (!profile) return null;

    const personal = profile.samples || [];
    const pool = BUZZ_TEMPLATES.filter((t) => {
      if (category && t.category !== category) return false;
      return profile.tones.includes(t.tone);
    });

    const usePersonal = hashSeed(`sns:src:${dayKey}:${slot}:${author}`) % 100 < 45;
    if (usePersonal && personal.length) {
      const text = seededPick(personal, `sns:sample:${dayKey}:${slot}:${author}`);
      return { category: category || "daily", tone: profile.tones[0], text, author };
    }

    const tpl = seededPick(pool.length ? pool : BUZZ_TEMPLATES, `sns:tpl:${dayKey}:${slot}:${author}`);
    if (!tpl) return null;
    return { ...tpl, author };
  }

  function resolveHeat(profile, template) {
    if (template?.misreadRisk || profile?.flags?.includes("ratio_prone")) return "high";
    if (profile?.heatBaseline === "high") return "high";
    if (profile?.heatBaseline === "low") return "low";
    if ((profile?.controversy || 0) >= 0.7) return "high";
    return "normal";
  }

  global.HatsuWorld = global.HatsuWorld || {};
  const OFFICIAL_POST_TEXTS = {
    student_council: "本周活动安排已更新，详见学生会公告栏。",
    broadcast_club: "今日广播已开始，欢迎收听。",
    cafeteria: "今日限定菜单见食堂窗口。"
  };

  const BUZZ_CATEGORIES = [
    { id: "food", weight: 22 },
    { id: "practice_idle", weight: 22 },
    { id: "class_mood", weight: 14 },
    { id: "weather_day", weight: 12 },
    { id: "campus_spot", weight: 14 },
    { id: "self_moment", weight: 12 },
    { id: "petty_gossip", weight: 10 }
  ];

  const SCOPES = ["campus", "campus", "campus", "net", "fanclub"];

  function seededWeightedPickCategories(list, seed) {
    const weights = list.map((item) => Math.max(0, Number(item.weight) || 0));
    const total = weights.reduce((sum, w) => sum + w, 0);
    if (total <= 0) return list[0];
    let roll = hashSeed(seed) % total;
    for (let i = 0; i < list.length; i += 1) {
      roll -= weights[i];
      if (roll < 0) return list[i];
    }
    return list[list.length - 1];
  }

  function rollEngagement(heat, seed) {
    const base = hashSeed(seed) % 1000;
    if (heat === "high") {
      return { comments: 80 + (base % 120), reposts: 20 + (base % 80) };
    }
    if (heat === "low") {
      return { comments: base % 8, reposts: base % 3 };
    }
    return { comments: 8 + (base % 32), reposts: 2 + (base % 12) };
  }

  function fakeTimeLabel(slot) {
    const mins = [4, 16, 38, 72, 180][slot % 5];
    if (mins < 60) return `${mins}分钟前`;
    return `${Math.floor(mins / 60)}小时前`;
  }

  function buildBuzzPost(base) {
    return {
      id: base.id,
      dayKey: base.dayKey,
      author: base.author || "",
      anonymous: Boolean(base.anonymous),
      official: Boolean(base.official),
      officialKey: base.officialKey || "",
      text: base.text || "",
      category: base.category || "daily",
      scope: base.scope || "campus",
      heat: base.heat || "normal",
      flags: base.flags || [],
      source: base.source || "buzz_pool",
      comments: base.comments || 0,
      reposts: base.reposts || 0,
      timeLabel: base.timeLabel || "",
      deleted: Boolean(base.deleted),
      broadcastHint: base.broadcastHint || ""
    };
  }

  function pickAnonymousTemplate(dayKey, slot) {
    const pool = BUZZ_TEMPLATES.filter((t) => t.category === "petty_gossip" || t.category === "campus_spot");
    const tpl = seededPick(pool.length ? pool : BUZZ_TEMPLATES, `buzz:anon:${dayKey}:${slot}`);
    return tpl?.text || "部室栋今天也很热闹。";
  }

  function maybeOfficialPost(dayKey, slot) {
    if (hashSeed(`buzz:official:${dayKey}`) % 100 > 22) return null;
    const keys = Object.keys(OFFICIAL_ACCOUNTS);
    const key = seededPick(keys, `buzz:officialPick:${dayKey}:${slot}`);
    const acct = OFFICIAL_ACCOUNTS[key];
    if (!acct) return null;
    const heat = "low";
    const engagement = rollEngagement(heat, `buzz:eng:${dayKey}:official`);
    return buildBuzzPost({
      id: `${dayKey}_official_${slot}`,
      dayKey,
      author: acct.name,
      official: true,
      officialKey: key,
      text: OFFICIAL_POST_TEXTS[key] || "学园通知。",
      category: "official_micro",
      scope: "campus",
      heat,
      source: "buzz_pool",
      comments: engagement.comments,
      reposts: engagement.reposts,
      timeLabel: fakeTimeLabel(slot)
    });
  }

  function maybeBroadcastReaction(dayKey, slot, broadcastEpisode, helpers) {
    if (!broadcastEpisode?.title) return null;
    if (hashSeed(`buzz:react:${dayKey}`) % 100 > 35) return null;
    const canonicalFn = helpers?.canonicalIdolName;
    const author = pickWeightedAuthor(helpers?.idolNames || [], { idol: "" }, dayKey, `react:${slot}`, canonicalFn);
    const profile = author ? getSnsProfile(author) : null;
    const pool = BROADCAST_REACTION_TEMPLATES.filter((t) => !profile || profile.tones.includes(t.tone));
    const tpl = seededPick(pool.length ? pool : BROADCAST_REACTION_TEMPLATES, `buzz:reactTpl:${dayKey}:${slot}`);
    const heat = "normal";
    const engagement = rollEngagement(heat, `buzz:eng:${dayKey}:react`);
    return buildBuzzPost({
      id: `${dayKey}_react_${slot}`,
      dayKey,
      author: author || "",
      anonymous: !author,
      text: tpl?.text || "今天广播听了，有点意思。",
      category: "broadcast_reaction",
      scope: "campus",
      heat,
      source: "broadcast_reaction",
      comments: engagement.comments,
      reposts: engagement.reposts,
      timeLabel: fakeTimeLabel(slot),
      broadcastHint: broadcastEpisode.title
    });
  }

  function appendControversyFollowups(posts, dayKey, helpers, startSlot) {
    const hot = posts.find((p) => p.heat === "high" && p.author);
    if (!hot) return posts;
    if (hashSeed(`buzz:follow:${dayKey}`) % 100 > 55) return posts;

    const crowd = seededPick(CONTROVERSY_FOLLOWUPS.crowd, `buzz:crowd:${dayKey}`);
    if (crowd) {
      posts.push(buildBuzzPost({
        id: `${dayKey}_crowd_${startSlot}`,
        dayKey,
        anonymous: true,
        text: crowd.text,
        category: "petty_gossip",
        scope: "campus",
        heat: "high",
        source: "buzz_pool",
        related: hot.author ? [hot.author] : [],
        comments: 40 + (hashSeed(`buzz:crowdEng:${dayKey}`) % 60),
        reposts: 10 + (hashSeed(`buzz:crowdRp:${dayKey}`) % 30),
        timeLabel: "刚刚"
      }));
      startSlot += 1;
    }

    const profile = getSnsProfile(hot.author);
    if (profile && (profile.controversy || 0) >= 0.5) {
      const pool = CONTROVERSY_FOLLOWUPS.author.filter((t) => profile.tones.includes(t.tone));
      const line = seededPick(pool.length ? pool : CONTROVERSY_FOLLOWUPS.author, `buzz:authorFix:${dayKey}`);
      if (line) {
        posts.push(buildBuzzPost({
          id: `${dayKey}_fix_${startSlot}`,
          dayKey,
          author: hot.author,
          text: line.text,
          category: "self_moment",
          scope: "campus",
          heat: "high",
          flags: ["delete_attempt"],
          source: "buzz_pool",
          comments: 60 + (hashSeed(`buzz:fixEng:${dayKey}`) % 80),
          reposts: 25 + (hashSeed(`buzz:fixRp:${dayKey}`) % 40),
          timeLabel: "刚刚",
          deleted: line.text.includes("删")
        }));
      }
    }
    return posts;
  }

  function composeDailyBuzzPosts(state, dayKey, helpers, broadcastEpisode) {
    const canonicalFn = helpers?.canonicalIdolName;
    const idolNames = helpers?.idolNames || [];
    const postCount = 2 + (hashSeed(`buzz:count:${dayKey}`) % 3);
    const posts = [];
    let slot = 0;

    for (let i = 0; i < postCount; i += 1) {
      const author = pickWeightedAuthor(idolNames, state, dayKey, i, canonicalFn);
      if (!author) {
        const engagement = rollEngagement("low", `buzz:eng:${dayKey}:anon:${i}`);
        posts.push(buildBuzzPost({
          id: `${dayKey}_anon_${i}`,
          dayKey,
          anonymous: true,
          text: pickAnonymousTemplate(dayKey, i),
          category: "petty_gossip",
          scope: seededPick(SCOPES, `buzz:scope:${dayKey}:${i}`),
          heat: "low",
          source: "buzz_pool",
          comments: engagement.comments,
          reposts: engagement.reposts,
          timeLabel: fakeTimeLabel(i)
        }));
        slot += 1;
        continue;
      }

      const category = pickBuzzCategory(state, dayKey, i);
      const tpl = pickTemplateForAuthor(author, category?.id, dayKey, i);
      const profile = getSnsProfile(author);
      const heat = resolveHeat(profile, tpl);
      const flags = [];
      if (tpl?.misreadRisk || (profile?.flags || []).includes("misread_risk")) {
        flags.push("misread_risk");
      }
      const engagement = rollEngagement(heat, `buzz:eng:${dayKey}:${author}:${i}`);
      posts.push(buildBuzzPost({
        id: `${dayKey}_${author}_${i}`,
        dayKey,
        author,
        text: maybeCampusAwareText(author, tpl?.text || pickAnonymousTemplate(dayKey, i), state, dayKey, i),
        category: category?.id || tpl?.category || "daily",
        scope: seededPick(SCOPES, `buzz:scope:${dayKey}:${i}`),
        heat,
        flags,
        source: "buzz_pool",
        comments: engagement.comments,
        reposts: engagement.reposts,
        timeLabel: fakeTimeLabel(i)
      }));
      slot += 1;
    }

    const official = maybeOfficialPost(dayKey, slot);
    if (official) {
      posts.push(official);
      slot += 1;
    }

    const reaction = maybeBroadcastReaction(dayKey, slot, broadcastEpisode, helpers);
    if (reaction) {
      posts.push(reaction);
      slot += 1;
    }

    return appendControversyFollowups(posts, dayKey, helpers, slot);
  }

  function rollDailyBuzz(state, helpers, broadcastEpisode) {
    const dayKey = helpers?.getDayKey?.(state) || `live+${state?.freeMode?.postLiveDay || 1}`;
    const world = state?.freeMode?.world || {};
    if (!world.buzz) world.buzz = { items: [], buzzDayKey: "", hotTopic: "" };
    if (world.buzz.buzzDayKey === dayKey && Array.isArray(world.buzz.items) && world.buzz.items.length) {
      return world.buzz.items;
    }

    const items = composeDailyBuzzPosts(state, dayKey, helpers, broadcastEpisode);
    const older = (world.buzz.items || []).filter((item) => item.dayKey !== dayKey);
    world.buzz.items = [...items, ...older].slice(0, 40);
    world.buzz.buzzDayKey = dayKey;
    world.buzz.hotTopic = items.find((item) => item.heat === "high")?.text
      || items[0]?.text
      || "";
    if (state?.freeMode) state.freeMode.world.buzz = world.buzz;
    return world.buzz.items;
  }

  global.HatsuWorld.buzzPool = {
    SNS_PROFILES,
    BUZZ_TEMPLATES,
    BROADCAST_REACTION_TEMPLATES,
    CONTROVERSY_FOLLOWUPS,
    OFFICIAL_ACCOUNTS,
    getSnsProfile,
    pickWeightedAuthor,
    pickTemplateForAuthor,
    resolveHeat,
    rollDailyBuzz,
    composeDailyBuzzPosts,
    buildBuzzPost,
    fakeTimeLabel,
    hashSeed,
    seededPick
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
