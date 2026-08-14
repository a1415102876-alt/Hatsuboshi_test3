(function (global) {
  "use strict";

  const SIDE_TIER_IDS = ["fail", "pass_low", "pass", "perfect"];

  const SIDE_TIER_META = {
    fail: { label: "失败", hint: "场面失控，仍有最低安慰奖" },
    pass_low: { label: "勉强", hint: "勉强过关，表现平平" },
    pass: { label: "完成", hint: "标准完成委托" },
    perfect: { label: "完美", hint: "超常发挥" }
  };

  const SIDE_TIER_REWARDS = {
    fail: { money: 80, fame: 1, Vo: 0, Da: 0, Vi: 0, stamina: 2, stress: 1, trust: 1 },
    pass_low: { money: 150, fame: 3, Vo: 1, Da: 1, Vi: 1, stamina: 4, stress: 0, trust: 3 },
    pass: { money: 280, fame: 6, Vo: 2, Da: 2, Vi: 2, stamina: 6, stress: -2, trust: 5 },
    perfect: { money: 450, fame: 10, Vo: 4, Da: 4, Vi: 4, stamina: 10, stress: -3, trust: 8 }
  };

  const SIDE_TAG_LABELS = {
    stamina: "体能",
    syngup: "歌唱",
    diet: "饮食",
    stage: "舞台",
    general: "商演"
  };

  const SIDE_QUEST_LOCATIONS = {
    shopping_street: { id: "shopping_street", name: "商店街" },
    shopping_mall: { id: "shopping_mall", name: "购物中心" },
    local_radio: { id: "local_radio", name: "地方电台" },
    tv_station: { id: "tv_station", name: "电视台" },
    event_hall: { id: "event_hall", name: "活动会场" },
    music_festival: { id: "music_festival", name: "音乐节会场" },
    photo_studio: { id: "photo_studio", name: "摄影棚" },
    brand_store: { id: "brand_store", name: "品牌旗舰店" }
  };

  const SIDE_QUEST_FORBIDDEN_RULES = `禁止写成以下类型（这不是委托系统内容）：
- 制作人私自安排的训练课表、加练、体能作业、发声作业、日程表整理
- 校园内自习、教室练习、陪跑、食堂配餐、休息监督、广播复盘作业
- 主线任务、物色、签约、日常培育流水账
每条委托必须有明确外部主办方（商场、电台、品牌、节目组、活动执行方等）与对外演出/宣传目标。`;

  function getSideQuestFameTier(fame) {
    const value = Math.max(0, Number(fame) || 0);
    if (value >= 70) {
      return {
        id: "prime",
        label: "头部商业档期",
        fame: value,
        minFame: 70,
        scale: "地上波综艺节目、全国连锁品牌站台、大型音乐节嘉宾席等专业商业档期",
        examples: "综艺录制出演、冠名商演、电视台音乐节目嘉宾、品牌全国巡演站台"
      };
    }
    if (value >= 40) {
      return {
        id: "media",
        label: "媒体露出档期",
        fame: value,
        minFame: 40,
        scale: "地方电视台栏目、网络直播企划、杂志拍摄、品牌发布活动等有排面的商业露出",
        examples: "音乐节目短出演、直播带货站台、时尚杂志拍摄、品牌发布会暖场"
      };
    }
    if (value >= 15) {
      return {
        id: "regional",
        label: "区域正式商演",
        fame: value,
        minFame: 15,
        scale: "购物中心、连锁门店、社区文化节等正式对外商演与宣传邀约",
        examples: "商场周末舞台、连锁咖啡店代言日、地方文化节主舞台、书店签售谈话会"
      };
    }
    return {
      id: "street",
      label: "街区商演出道期",
      fame: value,
      minFame: 0,
      scale: "学园周边、商店街、车站广场等低门槛小型商演与宣传邀约",
      examples: "商业街舞台暖场、站前快闪、商场中庭迷你演出、店铺开业站台"
    };
  }

  function buildFameTierPromptBlock(fame) {
    const tier = getSideQuestFameTier(fame);
    return `当前知名度：${tier.fame}（档位：${tier.label}）
本档委托规模：${tier.scale}
参考形态：${tier.examples}`;
  }

  function normalizeSideQuestLocation(locationId) {
    const id = String(locationId || "").trim();
    const location = SIDE_QUEST_LOCATIONS[id] || SIDE_QUEST_LOCATIONS.shopping_street;
    return { locationId: location.id, locationName: location.name };
  }

  function inferSideQuestLocation(quest = {}, fame = 0) {
    if (quest.locationId && SIDE_QUEST_LOCATIONS[quest.locationId]) {
      return normalizeSideQuestLocation(quest.locationId);
    }
    const title = `${quest.title || ""} ${quest.desc || ""}`;
    if (/综艺|电视台|电视|录制/.test(title)) return normalizeSideQuestLocation("tv_station");
    if (/音乐节|大型户外|副舞台/.test(title)) return normalizeSideQuestLocation("music_festival");
    if (/摄影|杂志|拍摄|视觉/.test(title)) return normalizeSideQuestLocation("photo_studio");
    if (/直播|品牌|旗舰|连锁|发布会|代言/.test(title)) {
      return normalizeSideQuestLocation(Number(fame) >= 40 ? "brand_store" : "shopping_mall");
    }
    if (/电台|广播|访谈/.test(title)) return normalizeSideQuestLocation("local_radio");
    if (/商场|购物中心|中庭|Mall/.test(title)) return normalizeSideQuestLocation("shopping_mall");
    if (/会场|文化节|活动方|嘉宾席/.test(title)) return normalizeSideQuestLocation("event_hall");
    if (/商店街|街区|车站|广场|摊位|食祭|开业/.test(title)) return normalizeSideQuestLocation("shopping_street");
    if (Number(fame) >= 70) return normalizeSideQuestLocation("tv_station");
    if (Number(fame) >= 40) return normalizeSideQuestLocation("brand_store");
    if (Number(fame) >= 15) return normalizeSideQuestLocation("shopping_mall");
    return normalizeSideQuestLocation("shopping_street");
  }

  const SIDE_QUEST_POOL = [
    {
      id: "shopping_street_warmup",
      title: "商业街舞台暖场",
      desc: "接受街区商会邀约，在周末客流前完成两首暖场曲与简短问候。",
      tag: "stage",
      minFame: 0,
      maxFame: 24
    },
    {
      id: "station_plaza_greeting",
      title: "车站广场快闪问候",
      desc: "配合交通广场活动方完成十五分钟快闪演出，并派发学园公演传单。",
      tag: "general",
      minFame: 0,
      maxFame: 24
    },
    {
      id: "mall_mini_live",
      title: "商场中庭迷你舞台",
      desc: "接受近邻商场邀请，在周末客流前完成两首短曲和合影问候。",
      tag: "stage",
      minFame: 0,
      maxFame: 39
    },
    {
      id: "shopping_street_opening",
      title: "商店街开幕站台",
      desc: "为新开甜品店做简短站台，负责开场问候和拍照宣传。",
      tag: "general",
      minFame: 0,
      maxFame: 39
    },
    {
      id: "local_radio_guest",
      title: "地方电台短访谈",
      desc: "到社区电台录制十分钟访谈，介绍近期舞台并清唱一句副歌。",
      tag: "syngup",
      minFame: 0,
      maxFame: 39
    },
    {
      id: "festival_booth_call",
      title: "街区节庆摊位招呼",
      desc: "为临时节庆摊位吸引客流，完成简短口播、拍立得和舞台预告。",
      tag: "general",
      minFame: 0,
      maxFame: 39
    },
    {
      id: "karaoke_trial",
      title: "卡拉 OK 店试唱企划",
      desc: "为合作门店录制试唱片段，检验麦克适配并留下宣传素材。",
      tag: "syngup",
      minFame: 0,
      maxFame: 39
    },
    {
      id: "street_food_tasting",
      title: "商店街食祭试吃站台",
      desc: "为街区食祭合作摊位站台，完成试吃推荐、口播与路人合影环节。",
      tag: "diet",
      minFame: 0,
      maxFame: 24
    },
    {
      id: "bookstore_talk",
      title: "书店小型谈话会",
      desc: "配合杂志角活动进行十五分钟谈话，分享最近舞台与下一场公演预告。",
      tag: "stage",
      minFame: 15,
      maxFame: 69
    },
    {
      id: "boutique_window",
      title: "精品店橱窗拍摄",
      desc: "为小型服装店拍摄橱窗宣传照，完成品牌方要求的站姿与表情展示。",
      tag: "stage",
      minFame: 15,
      maxFame: 69
    },
    {
      id: "sports_shop_demo",
      title: "运动品牌体验站台",
      desc: "在运动用品店完成节奏展示企划，把舞台动作包装成可观看商业演示。",
      tag: "stamina",
      minFame: 15,
      maxFame: 69
    },
    {
      id: "cafe_menu_promo",
      title: "咖啡店品牌代言日",
      desc: "为合作咖啡店拍摄轻食宣传照，在店内完成试饮推荐与粉丝合影环节。",
      tag: "diet",
      minFame: 15,
      maxFame: 69
    },
    {
      id: "deli_lunch_report",
      title: "便当品牌试吃站台",
      desc: "试吃合作便当店的新菜单，录制面向路人的健康轻食推荐短评。",
      tag: "diet",
      minFame: 15,
      maxFame: 69
    },
    {
      id: "mall_weekend_stage",
      title: "购物中心周末主舞台",
      desc: "在区域商场周末活动担任主舞台嘉宾，完成固定曲目与主持人互动。",
      tag: "stage",
      minFame: 15,
      maxFame: 69
    },
    {
      id: "culture_festival_guest",
      title: "社区文化节嘉宾席",
      desc: "受邀出席街区文化节，完成开幕问候、舞台演出与赞助商鸣谢。",
      tag: "general",
      minFame: 15,
      maxFame: 69
    },
    {
      id: "tv_music_corner",
      title: "地方电视台音乐角",
      desc: "录制地方电视台音乐栏目短出演，完成一首曲目与主持人快问快答。",
      tag: "syngup",
      minFame: 40,
      maxFame: 999
    },
    {
      id: "livestream_brand_slot",
      title: "品牌直播站台专场",
      desc: "出席合作品牌直播专场，完成产品站台、舞台展示与线上互动环节。",
      tag: "general",
      minFame: 40,
      maxFame: 999
    },
    {
      id: "magazine_shoot_event",
      title: "时尚杂志拍摄活动",
      desc: "参加杂志方线下拍摄活动，完成造型展示、快访与签名合影流程。",
      tag: "stage",
      minFame: 40,
      maxFame: 999
    },
    {
      id: "brand_launch_warmup",
      title: "品牌发布会暖场",
      desc: "在品牌新品发布会担任暖场嘉宾，完成舞台演出与发布会主持衔接。",
      tag: "general",
      minFame: 40,
      maxFame: 999
    },
    {
      id: "variety_guest_slot",
      title: "综艺节目嘉宾出演",
      desc: "受邀录制人气综艺的偶像嘉宾环节，完成游戏挑战与舞台展示。",
      tag: "stage",
      minFame: 70,
      maxFame: 999
    },
    {
      id: "national_chain_stage",
      title: "全国连锁冠名站台",
      desc: "在全国连锁品牌巡演站台担任表演嘉宾，完成品牌曲目与观众互动。",
      tag: "general",
      minFame: 70,
      maxFame: 999
    },
    {
      id: "music_festival_guest",
      title: "大型音乐节嘉宾席",
      desc: "登上城市音乐节副舞台，在主办方安排下完成正式商演时段。",
      tag: "syngup",
      minFame: 70,
      maxFame: 999
    },
    {
      id: "tv_variety_music_show",
      title: "电视音乐综艺录制",
      desc: "参与电视音乐综艺录制，完成正式舞台表演与节目流程彩排。",
      tag: "stage",
      minFame: 70,
      maxFame: 999
    }
  ];

  function hashString(str) {
    let h = 2166136261;
    const source = String(str || "");
    for (let i = 0; i < source.length; i++) {
      h ^= source.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function seededSortKey(seed, index) {
    const x = Math.sin(seed + index * 9301 + 49297) * 233280;
    return x - Math.floor(x);
  }

  function filterQuestPoolByFame(fame, idol) {
    const value = Math.max(0, Number(fame) || 0);
    const eligible = SIDE_QUEST_POOL.filter((quest) => {
      if (quest.idol && quest.idol !== idol) return false;
      const min = Number(quest.minFame) || 0;
      const max = Number.isFinite(Number(quest.maxFame)) ? Number(quest.maxFame) : Infinity;
      return value >= min && value <= max;
    });
    if (eligible.length >= 3) return eligible;
    return SIDE_QUEST_POOL.filter((quest) => {
      if (quest.idol && quest.idol !== idol) return false;
      const min = Number(quest.minFame) || 0;
      return value >= min;
    });
  }

  function pickDailyQuests(dayKey, idol, count = 3, fame = 0) {
    const seed = hashString(`${dayKey}|${idol || ""}|${fame}`);
    const pool = filterQuestPoolByFame(fame, idol);
    const ranked = pool
      .map((quest, index) => ({
        quest,
        sort: seededSortKey(seed, index)
      }))
      .sort((a, b) => a.sort - b.sort);
    const selected = ranked.slice(0, count).map(({ quest }) => quest);
    if (count >= 3 && !selected.some((quest) => quest.tag === "diet")) {
      const dietQuest = ranked.find(({ quest }) => quest.tag === "diet" && !selected.includes(quest))?.quest;
      if (dietQuest) selected[selected.length - 1] = dietQuest;
    }
    return selected.map((quest, slotIndex) => ({
      ...inferSideQuestLocation(quest, fame),
      slotIndex,
      poolId: quest.id,
      title: quest.title,
      desc: quest.desc,
      tag: quest.tag,
      status: "open",
      resultTier: null
    }));
  }

  function getTagLabel(tag) {
    return SIDE_TAG_LABELS[tag] || tag || "综合";
  }

  function formatTierRewardSummary(tier) {
    const reward = SIDE_TIER_REWARDS[tier];
    if (!reward) return "";
    const parts = [`${reward.money} 初星币`];
    if (reward.Vo) parts.push(`Vo+${reward.Vo}`);
    if (reward.Da) parts.push(`Da+${reward.Da}`);
    if (reward.Vi) parts.push(`Vi+${reward.Vi}`);
    if (reward.fame) parts.push(`知名度+${reward.fame}`);
    if (reward.stamina) parts.push(`体力+${reward.stamina}`);
    if (reward.stress < 0) parts.push(`压力${reward.stress}`);
    if (reward.trust) parts.push(`信赖+${reward.trust}`);
    return parts.join(" · ");
  }

  global.HatsuSideQuestPool = {
    SIDE_TIER_IDS,
    SIDE_TIER_META,
    SIDE_TIER_REWARDS,
    SIDE_TAG_LABELS,
    SIDE_QUEST_POOL,
    SIDE_QUEST_LOCATIONS,
    SIDE_QUEST_FORBIDDEN_RULES,
    getSideQuestFameTier,
    buildFameTierPromptBlock,
    normalizeSideQuestLocation,
    inferSideQuestLocation,
    pickDailyQuests,
    getTagLabel,
    formatTierRewardSummary
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
