(function (global) {
  "use strict";

  const MAIN_QUEST_META = {
    scout_temari: {
      title: "担当物色：月村手毬",
      conflict: "在学园中接触月村手毬并邀请她成为担当",
      category: "scout"
    },
    relationship_20: {
      title: "培养和担当之间的关系：好感度 20",
      conflict: "亚纱里老师要求确认制作人与担当之间的初步信任",
      category: "relationship",
      trustTarget: 20
    },
    relationship_40: {
      title: "培养和担当之间的关系：好感度 40",
      conflict: "把日常陪伴推进到能共同复盘训练得失的关系",
      category: "relationship",
      trustTarget: 40
    },
    relationship_60: {
      title: "培养和担当之间的关系：好感度 60",
      conflict: "让担当能在压力下主动向制作人求助或商量",
      category: "relationship",
      trustTarget: 60
    },
    relationship_80: {
      title: "培养和担当之间的关系：好感度 80",
      conflict: "First Live 前确认担当愿意把最核心的不安交给制作人",
      category: "relationship",
      trustTarget: 80
    },
    relationship_100: {
      title: "培养和担当之间的关系：好感度 100",
      conflict: "First Live 后完成担当关系的收束与再确认",
      category: "relationship",
      trustTarget: 100
    },
    temari_main_01: {
      title: "解决担当面对的矛盾：舞台唱完",
      conflict: "体力锻炼到能在舞台上唱完",
      category: "conflict"
    },
    temari_main_02: {
      title: "解决担当面对的矛盾：和美铃和好",
      conflict: "调整与秦谷美铃的关系",
      category: "conflict"
    },
    temari_main_03: {
      title: "解决担当面对的矛盾：饮食与体态",
      conflict: "调整饮食与舞台体态",
      category: "conflict"
    },
    scout_kotone: {
      title: "担当物色：藤田琴音",
      conflict: "在学园中接触藤田琴音并邀请她成为担当",
      category: "scout"
    },
    scout_saki: {
      title: "担当物色：花海咲季",
      conflict: "在运动场接触花海咲季并邀请她成为担当",
      category: "scout"
    },
    scout_misuzu: {
      title: "担当物色：秦谷美铃",
      conflict: "在中庭接触秦谷美铃并邀请她成为担当",
      category: "scout"
    },
    scout_hiro: {
      title: "担当物色：筱泽广",
      conflict: "在偶像科教室旁走廊或教学楼保健室接触筱泽广并邀请她成为担当",
      category: "scout"
    },
    scout_lilja: {
      title: "担当物色：葛城莉莉娅",
      conflict: "在偶像科教室旁边的走廊接触葛城莉莉娅并邀请她成为担当",
      category: "scout"
    },
    lilja_main_01: {
      title: "解决担当面对的矛盾：自信的起点",
      conflict: "让莉莉娅从零基础的混乱训练中聚焦声乐，并通过录像复盘看见自己正在进步",
      category: "conflict"
    },
    lilja_main_02: {
      title: "解决担当面对的矛盾：自信的表达",
      conflict: "让莉莉娅理解笑容和表情不是模仿动作，而是把自己的心情传达给观众",
      category: "conflict"
    },
    lilja_main_03: {
      title: "解决担当面对的矛盾：自信的见证",
      conflict: "让莉莉娅鼓起勇气把仍不完美但正在努力的自己唱给清夏听",
      category: "conflict"
    },
    kotone_main_01: {
      title: "解决担当面对的矛盾：告别快餐店打工",
      conflict: "让琴音辞掉快餐店打工，并通过委托系统达到 30 点知名度、赚到 1000 初星币",
      category: "conflict"
    },
    kotone_main_02: {
      title: "解决担当面对的矛盾：建立自信",
      conflict: "累计夸奖琴音 20 次，帮她把制作人的认可变成自信",
      category: "conflict"
    },
    kotone_main_03: {
      title: "解决担当面对的矛盾：体力修养",
      conflict: "让琴音充分休息，把体力恢复到健康水平",
      category: "conflict"
    },
    saki_main_01: {
      title: "解决担当面对的矛盾：天才的停滞感",
      conflict: "让咲季承认超早熟带来的瓶颈，以及如果不改变就会输给佑芽的恐惧",
      category: "conflict"
    },
    saki_main_02: {
      title: "解决担当面对的矛盾：最强姐姐的谎言",
      conflict: "让咲季面对自己必须把「姐姐是世界第一」变成真实的压力",
      category: "conflict"
    },
    saki_main_03: {
      title: "解决担当面对的矛盾：把私欲升华为胜利",
      conflict: "把想赢佑芽、珍惜佑芽、害怕被追上的复杂羁绊转化为舞台上的压制力",
      category: "conflict"
    },
    misuzu_main_01: {
      title: "解决担当面对的矛盾：慢步调的野心",
      conflict: "让美铃在被理解的步调中承认自己也会一步步走向偶像顶点",
      category: "conflict"
    },
    misuzu_main_02: {
      title: "解决担当面对的矛盾：温柔里的独占欲",
      conflict: "让美铃把安稳平静的歌声背后想俘获所有人内心的真心唱出来",
      category: "conflict"
    },
    misuzu_main_03: {
      title: "解决担当面对的矛盾：比太阳更高的地方",
      conflict: "让美铃从手毬的支撑者走向手毬也不得不仰望的顶点",
      category: "conflict"
    },
    hiro_main_01: {
      title: "解决担当面对的矛盾：最不适合的挑战",
      conflict: "让广确认偶像活动正因为做不到才值得挑战，并接受制作人的试用指导",
      category: "conflict"
    },
    hiro_main_02: {
      title: "解决担当面对的矛盾：理论与身体的落差",
      conflict: "把理论理解与身体极限之间的失败转化为一点点前进的喜悦",
      category: "conflict"
    },
    hiro_main_03: {
      title: "解决担当面对的矛盾：每天在一起的约定",
      conflict: "让广把挑战、信任和想与制作人继续前进的心情说出口",
      category: "conflict"
    },
    ability_vocal_180: {
      title: "培养偶像能力：Vocal 达到 180",
      conflict: "完成亚纱里老师布置的歌唱能力阶段审查",
      category: "ability",
      stat: "Vo",
      target: 180
    },
    ability_dance_140: {
      title: "培养偶像能力：Dance 达到 140",
      conflict: "让舞蹈基础足以支撑 First Live 编舞",
      category: "ability",
      stat: "Da",
      target: 140
    },
    ability_visual_130: {
      title: "培养偶像能力：Visual 达到 130",
      conflict: "完成镜头感、表情和舞台体态的阶段打磨",
      category: "ability",
      stat: "Vi",
      target: 130
    },
    work_invite_30: {
      title: "工作邀约课题：知名度达到 30",
      conflict: "通过委托系统承接小型商演，提高担当偶像知名度",
      category: "work",
      fameTarget: 30
    },
    first_live_success: {
      title: "舞台终极任务：First Live 举办成功",
      conflict: "完成第一阶段的最终舞台审查",
      category: "final"
    }
  };
  const TEMARI_PERSONAL_IDS = ["temari_main_01", "temari_main_02", "temari_main_03"];
  const KOTONE_PERSONAL_IDS = ["kotone_main_01", "kotone_main_02", "kotone_main_03"];
  const SAKI_PERSONAL_IDS = ["saki_main_01", "saki_main_02", "saki_main_03"];
  const MISUZU_PERSONAL_IDS = ["misuzu_main_01", "misuzu_main_02", "misuzu_main_03"];
  const HIRO_PERSONAL_IDS = ["hiro_main_01", "hiro_main_02", "hiro_main_03"];
  const LILJA_PERSONAL_IDS = ["lilja_main_01", "lilja_main_02", "lilja_main_03"];

  const SANDBOX_IDOL_QUEST_PACKS = {
    "月村手毬": {
      scoutId: "scout_temari",
      personalIds: TEMARI_PERSONAL_IDS
    },
    "藤田琴音": {
      scoutId: "scout_kotone",
      personalIds: KOTONE_PERSONAL_IDS
    },
    "花海咲季": {
      scoutId: "scout_saki",
      personalIds: SAKI_PERSONAL_IDS
    },
    "秦谷美铃": {
      scoutId: "scout_misuzu",
      personalIds: MISUZU_PERSONAL_IDS
    },
    "筱泽广": {
      scoutId: "scout_hiro",
      personalIds: HIRO_PERSONAL_IDS
    },
    "葛城莉莉娅": {
      scoutId: "scout_lilja",
      personalIds: LILJA_PERSONAL_IDS
    }
  };
  const SANDBOX_SELECTABLE_IDOLS = Object.keys(SANDBOX_IDOL_QUEST_PACKS);

  const THRESHOLDS = {
    temari_main_01: { staminaMin: 85, voGain: 40 },
    temari_main_03: { viGain: 35, stressMax: 40, healthyMealsMin: 2 },
    kotone_main_01: { fameMin: 30, moneyEarnedMin: 1000 },
    kotone_main_02: { praiseMin: 20 },
    kotone_main_03: { staminaMin: 95, restSessionsMin: 2 }
  };

  function getSandboxQuestPack(state) {
    const idol = String(state?.idol || "").trim();
    return SANDBOX_IDOL_QUEST_PACKS[idol] || null;
  }

  function getScoutQuestId(state) {
    const idol = String(state?.sandbox?.scoutTargetIdol || "").trim();
    return SANDBOX_IDOL_QUEST_PACKS[idol]?.scoutId || "";
  }

  function getIdolByScoutQuestId(questId) {
    return Object.entries(SANDBOX_IDOL_QUEST_PACKS).find(([, pack]) => pack.scoutId === questId)?.[0] || "";
  }

  function getIdolForPersonalQuestId(questId) {
    return Object.entries(SANDBOX_IDOL_QUEST_PACKS).find(([, pack]) => pack.personalIds.includes(questId))?.[0] || "";
  }

  function ensureSandboxProgressState(state) {
    if (!state.sandbox || typeof state.sandbox !== "object") state.sandbox = {};
    if (!Array.isArray(state.sandbox.producedIdols)) state.sandbox.producedIdols = [];
    state.sandbox.producedIdols = state.sandbox.producedIdols.map((name) => String(name || "").trim()).filter(Boolean);
    if (state.sandbox.scoutTargetIdol) {
      state.sandbox.scoutTargetIdol = String(state.sandbox.scoutTargetIdol).trim() || null;
    } else {
      state.sandbox.scoutTargetIdol = null;
    }
    state.sandbox.secondIdolUnlocked = Boolean(state.sandbox.secondIdolUnlocked);
  }

  function getSharedMainQuestIds() {
    return Object.keys(MAIN_QUEST_META).filter((id) => !isScoutQuestId(id) && !isIdolPersonalQuestId(id));
  }

  function getIdolRelationshipScore(state, idolName) {
    const entry = state?.freeMode?.relationships?.[idolName];
    if (typeof entry === "object" && entry) return Number(entry.好感度) || 0;
    if (typeof entry === "number" || typeof entry === "string") return Number(entry) || 0;
    return 0;
  }

  function isIdolMainlineComplete(state, idolName) {
    const pack = SANDBOX_IDOL_QUEST_PACKS[idolName];
    if (!pack || !state.tasks?.main) return false;
    if (state.tasks.main[pack.scoutId]?.status !== "completed") return false;
    if (!pack.personalIds.every((id) => state.tasks.main[id]?.status === "completed")) return false;
    if (!getSharedMainQuestIds().every((id) => state.tasks.main[id]?.status === "completed")) return false;
    return getIdolRelationshipScore(state, idolName) >= 100;
  }

  function syncProducedIdolsAndSecondUnlock(state) {
    if (!isSandboxTasksActive(state)) return;
    ensureSandboxProgressState(state);
    const produced = new Set(state.sandbox.producedIdols);
    SANDBOX_SELECTABLE_IDOLS.forEach((idol) => {
      if (isIdolMainlineComplete(state, idol)) produced.add(idol);
    });
    state.sandbox.producedIdols = [...produced];
    const hasOpenSlot = produced.size < SANDBOX_SELECTABLE_IDOLS.length;
    state.sandbox.secondIdolUnlocked = produced.size > 0 && hasOpenSlot
      && [...produced].some((idol) => isIdolMainlineComplete(state, idol));
  }

  function getSecondIdolCandidates(state) {
    if (!isSandboxTasksActive(state)) return [];
    ensureSandboxProgressState(state);
    const produced = new Set(state.sandbox.producedIdols);
    return SANDBOX_SELECTABLE_IDOLS.filter((idol) => !produced.has(idol));
  }

  function createConfirmedIdolTaskState(idolName) {
    const pack = SANDBOX_IDOL_QUEST_PACKS[String(idolName || "").trim()];
    const main = defaultTasksState().main;
    Object.keys(MAIN_QUEST_META).forEach((id) => {
      if (!main[id]) main[id] = defaultMainQuest(id, "locked");
      main[id].status = "locked";
    });
    if (!pack) return { main, baseline: null };
    main[pack.scoutId].status = "completed";
    Object.keys(MAIN_QUEST_META).forEach((id) => {
      if (isScoutQuestId(id)) return;
      if (isIdolPersonalQuestId(id) && !pack.personalIds.includes(id)) return;
      main[id].status = "active";
    });
    return { main, baseline: null };
  }

  function syncScoutQuestSelection(state) {
    if (!isSandboxTasksActive(state)) return;
    ensureTasksShape(state);
    ensureSandboxProgressState(state);
    const selectedScoutId = SANDBOX_IDOL_QUEST_PACKS[state.sandbox.scoutTargetIdol]?.scoutId || "";
    Object.values(SANDBOX_IDOL_QUEST_PACKS).forEach((pack) => {
      const quest = state.tasks.main[pack.scoutId];
      if (!quest || quest.status === "completed") return;
      if (quest.status === "active" && pack.scoutId !== selectedScoutId) quest.status = "locked";
    });
  }
  function shouldShowMainQuestInPanel(state, id) {
    ensureTasksShape(state);
    const quest = state.tasks?.main?.[id];
    const status = quest?.status || "locked";
    if (isScoutQuestId(id)) {
      const idol = getIdolByScoutQuestId(id);
      if (status === "completed") return state.idol === idol;
      return state.sandbox?.scoutTargetIdol === idol && status === "active";
    }
    if (isIdolPersonalQuestId(id)) {
      const idol = getIdolForPersonalQuestId(id);
      if (status === "completed") return true;
      if (status === "active") return true;
      if (state.idol === idol) return true;
      return false;
    }
    const anyScoutDone = Object.values(SANDBOX_IDOL_QUEST_PACKS)
      .some((pack) => state.tasks?.main?.[pack.scoutId]?.status === "completed");
    if (!anyScoutDone && status === "locked") return false;
    return true;
  }

  function activateScoutQuestForIdol(state, idolName) {
    if (!isSandboxTasksActive(state)) return;
    const pack = SANDBOX_IDOL_QUEST_PACKS[idolName];
    if (!pack) return;
    ensureTasksShape(state);
    ensureSandboxProgressState(state);
    state.sandbox.scoutTargetIdol = idolName;
    Object.entries(SANDBOX_IDOL_QUEST_PACKS).forEach(([name, other]) => {
      if (name === idolName) return;
      const quest = state.tasks.main[other.scoutId];
      if (quest?.status !== "completed") quest.status = "locked";
    });
    const quest = state.tasks.main[pack.scoutId];
    if (quest && quest.status !== "completed") quest.status = "active";
  }

  function beginSecondIdolScout(state, idolName) {
    if (!isSandboxTasksActive(state)) return { ok: false, reason: "not_sandbox" };
    const canonical = String(idolName || "").trim();
    syncProducedIdolsAndSecondUnlock(state);
    if (!state.sandbox?.secondIdolUnlocked) return { ok: false, reason: "locked" };
    if (!getSecondIdolCandidates(state).includes(canonical)) return { ok: false, reason: "unavailable" };
    activateScoutQuestForIdol(state, canonical);
    return { ok: true, idol: canonical };
  }

  function getPersonalQuestIds(state) {
    return getSandboxQuestPack(state)?.personalIds || [];
  }

  function getAllPersonalQuestIds() {
    return Object.values(SANDBOX_IDOL_QUEST_PACKS).flatMap((pack) => pack.personalIds);
  }

  function isScoutQuestId(id) {
    return String(id || "").startsWith("scout_");
  }

  function isIdolPersonalQuestId(id) {
    return getAllPersonalQuestIds().includes(id);
  }

  const MAP_MAIN_QUEST_LOCATIONS = {
    temari_main_02_misaki: ["dining_hall", "club_room", "idol_classroom", "gymnasium", "playground"]
  };

  const MAP_CHOICE_HOOKS = [
    {
      id: "outstage_full_song",
      questId: "temari_main_01",
      locations: ["outstage", "auditorium"],
      patterns: [/唱完|试唱|完整(?:一)?首|唱通|整首|唱满|full/i],
      apply: "outstage_full_song",
      notice: "已记录野外舞台完整试唱"
    },
    {
      id: "diet_plan_active",
      questId: "temari_main_03",
      locations: ["dining_hall", "producer_classroom", "special_education"],
      patterns: [/饮食方案|营养(?:师|指导|餐|计划)|膳食计划|体重管理|菜单(?:计划|调整)|低卡|卡路里|体脂/i],
      apply: "diet_plan_active",
      notice: "已制定饮食方案"
    },
    {
      id: "healthy_meal",
      questId: "temari_main_03",
      locations: ["dining_hall", "student_store"],
      patterns: [/健康餐|沙拉|低油|蒸煮|清淡|营养餐|蔬菜为主|便当.*健康|轻食/i],
      apply: "healthy_meal",
      notice: "已记录一次健康餐"
    },
    {
      id: "part_time_cancelled",
      questId: "kotone_main_01",
      locations: ["student_store", "school_entrance", "dining_hall", "producer_classroom"],
      patterns: [/辞掉|取消打工|不再打工|退出兼职|快餐店|辞工|请假不上班|停止打工/i],
      apply: "part_time_cancelled",
      notice: "已确认琴音取消快餐店打工"
    },
    {
      id: "praise_kotone",
      questId: "kotone_main_02",
      locations: ["producer_classroom", "idol_classroom", "dining_hall", "outstage", "auditorium", "gymnasium", "special_education", "student_store"],
      patterns: [/夸她|夸奖|称赞|很可爱|真可爱|做得好|很棒|漂亮|厉害|表扬|夸赞/i],
      apply: "praise_kotone",
      notice: "已记录一次对琴音的夸奖"
    },
    {
      id: "full_rest",
      questId: "kotone_main_03",
      locations: ["producer_classroom", "dining_hall", "courtyard", "school_entrance"],
      patterns: [/充分休息|好好睡一觉|睡足|恢复体力|躺下休息|午睡|放松休息|休养/i],
      apply: "full_rest",
      notice: "已记录一次充分休息"
    }
  ];

  const QUEST_FLAG_IDS = [
    "diet_plan_active",
    "healthy_meal",
    "outstage_full_song",
    "part_time_cancelled",
    "praise_kotone",
    "full_rest"
  ];

  const QUEST_FLAG_NOTICE = {
    diet_plan_active: "已制定饮食方案",
    healthy_meal: "已记录一次健康餐",
    outstage_full_song: "已记录野外舞台完整试唱",
    part_time_cancelled: "已确认琴音取消快餐店打工",
    praise_kotone: "已记录一次对琴音的夸奖",
    full_rest: "已记录一次充分休息"
  };

  const CAMPUS_MAX_PER_DAY = 3;
  const SIDE_SLOTS_PER_DAY = 3;
  const SIDE_HEALTHY_MEAL_TIERS = ["pass", "perfect"];

  const QUEST_COMPLETE_TAG_RE = /【初星任务完成】\s*([a-z0-9_]+)/gi;
  const QUEST_COMPLETE_XML_RE = /<quest_complete\s+id=["']([a-z0-9_]+)["']\s*\/?>/gi;
  const QUEST_FLAG_TAG_RE = /【初星任务标记】\s*([a-z0-9_]+)/gi;
  const QUEST_FLAG_XML_RE = /<quest_flag\s+id=["']([a-z0-9_]+)["']\s*\/?>/gi;

  function matchesMapChoicePatterns(text, patterns) {
    const source = String(text || "");
    return patterns.some((pattern) => pattern.test(source));
  }

  function defaultMainQuest(id, status = "locked") {
    const flags = {};
    if (id === "temari_main_01") {
      flags.outstage_full_song = false;
    }
    if (id === "temari_main_03") {
      flags.diet_plan_active = false;
      flags.healthy_meal_count = 0;
    }
    if (id === "kotone_main_01") {
      flags.part_time_cancelled = false;
      flags.money_baseline = 0;
    }
    if (id === "kotone_main_02") {
      flags.praise_count = 0;
    }
    if (id === "kotone_main_03") {
      flags.rest_sessions = 0;
    }
    return { id, status, step: 0, flags };
  }

  function defaultSecondaryApi() {
    return {
      enabled: false,
      baseUrl: "",
      model: "",
      temperature: 0.7,
      maxTokens: 1200
    };
  }

  function defaultSideState() {
    return {
      dayKey: "",
      slots: [],
      activeSlotIndex: null,
      genStatus: "idle",
      source: "",
      pendingRequestId: ""
    };
  }

  function defaultTasksState() {
    return {
      wallet: { money: 0, fame: 0 },
      inventory: {},
      baseline: null,
      secondaryApi: defaultSecondaryApi(),
      main: {
        scout_temari: defaultMainQuest("scout_temari", "locked"),
        scout_kotone: defaultMainQuest("scout_kotone", "locked"),
        scout_saki: defaultMainQuest("scout_saki", "locked"),
        scout_misuzu: defaultMainQuest("scout_misuzu", "locked"),
        scout_hiro: defaultMainQuest("scout_hiro", "locked"),
        scout_lilja: defaultMainQuest("scout_lilja", "locked"),
        temari_main_01: defaultMainQuest("temari_main_01"),
        temari_main_02: defaultMainQuest("temari_main_02"),
        temari_main_03: defaultMainQuest("temari_main_03"),
        kotone_main_01: defaultMainQuest("kotone_main_01"),
        kotone_main_02: defaultMainQuest("kotone_main_02"),
        kotone_main_03: defaultMainQuest("kotone_main_03"),
        saki_main_01: defaultMainQuest("saki_main_01"),
        saki_main_02: defaultMainQuest("saki_main_02"),
        saki_main_03: defaultMainQuest("saki_main_03"),
        misuzu_main_01: defaultMainQuest("misuzu_main_01"),
        misuzu_main_02: defaultMainQuest("misuzu_main_02"),
        misuzu_main_03: defaultMainQuest("misuzu_main_03"),
        hiro_main_01: defaultMainQuest("hiro_main_01"),
        hiro_main_02: defaultMainQuest("hiro_main_02"),
        hiro_main_03: defaultMainQuest("hiro_main_03"),
        lilja_main_01: defaultMainQuest("lilja_main_01"),
        lilja_main_02: defaultMainQuest("lilja_main_02"),
        lilja_main_03: defaultMainQuest("lilja_main_03")
      },
      side: defaultSideState(),
      campus: { dayKey: "", usedCount: 0, maxPerDay: CAMPUS_MAX_PER_DAY, log: [] }
    };
  }

  function isSandboxTasksActive(state) {
    return state?.launchMode === "sandbox";
  }

  function hasCompletedScoutQuest(state) {
    if (!isSandboxTasksActive(state)) return false;
    return Object.values(SANDBOX_IDOL_QUEST_PACKS).some(
      (pack) => state.tasks?.main?.[pack.scoutId]?.status === "completed"
    );
  }

  function syncSandboxMacroPhase(state) {
    if (!hasCompletedScoutQuest(state)) return false;
    if (!state.freeMode || typeof state.freeMode !== "object") state.freeMode = {};
    if (!state.freeMode.world || typeof state.freeMode.world !== "object") {
      state.freeMode.world = {};
    }
    if (state.freeMode.world.macro_phase === "first_live") return false;
    state.freeMode.world.macro_phase = "first_live";
    return true;
  }

  function ensureMainQuest(state, id, status = "locked") {
    if (!state.tasks.main[id]) {
      state.tasks.main[id] = defaultMainQuest(id, status);
    }
    const quest = state.tasks.main[id];
    if (!quest.id) quest.id = id;
    if (!quest.flags || typeof quest.flags !== "object") {
      quest.flags = defaultMainQuest(id).flags;
    }
    if (id === "temari_main_01" && quest.flags.outstage_full_song === undefined) {
      quest.flags.outstage_full_song = false;
    }
    if (id === "temari_main_03") {
      if (quest.flags.diet_plan_active === undefined) quest.flags.diet_plan_active = false;
      if (!Number.isFinite(Number(quest.flags.healthy_meal_count))) {
        quest.flags.healthy_meal_count = 0;
      }
    }
    if (id === "kotone_main_01") {
      if (quest.flags.part_time_cancelled === undefined) quest.flags.part_time_cancelled = false;
      if (!Number.isFinite(Number(quest.flags.money_baseline))) {
        quest.flags.money_baseline = Number(state.tasks?.wallet?.money) || 0;
      }
    }
    if (id === "kotone_main_02" && !Number.isFinite(Number(quest.flags.praise_count))) {
      quest.flags.praise_count = 0;
    }
    if (id === "kotone_main_03" && !Number.isFinite(Number(quest.flags.rest_sessions))) {
      quest.flags.rest_sessions = 0;
    }
    const allowed = ["locked", "active", "completed"];
    if (!allowed.includes(quest.status)) quest.status = status;
    if (!Number.isFinite(Number(quest.step))) quest.step = 0;
    return quest;
  }

  function ensureTasksShape(state) {
    if (!state || typeof state !== "object") return state;
    if (!state.tasks || typeof state.tasks !== "object") {
      state.tasks = defaultTasksState();
    }
    state.tasks.wallet = {
      money: Number.isFinite(Number(state.tasks.wallet?.money)) ? Number(state.tasks.wallet.money) : 0,
      fame: Number.isFinite(Number(state.tasks.wallet?.fame)) ? Number(state.tasks.wallet.fame) : 0
    };
    if (globalThis.HatsuGiftShop?.ensureInventory) {
      globalThis.HatsuGiftShop.ensureInventory(state);
    } else if (!state.tasks.inventory || typeof state.tasks.inventory !== "object" || Array.isArray(state.tasks.inventory)) {
      state.tasks.inventory = {};
    }
    if (!state.tasks.main || typeof state.tasks.main !== "object") {
      state.tasks.main = defaultTasksState().main;
    }
    Object.keys(MAIN_QUEST_META).forEach((id) => ensureMainQuest(state, id));
    if (!state.tasks.side || typeof state.tasks.side !== "object") {
      state.tasks.side = defaultSideState();
    }
    if (!state.tasks.secondaryApi || typeof state.tasks.secondaryApi !== "object") {
      state.tasks.secondaryApi = defaultSecondaryApi();
    }
    state.tasks.secondaryApi = {
      ...defaultSecondaryApi(),
      ...state.tasks.secondaryApi,
      enabled: Boolean(state.tasks.secondaryApi.enabled),
      baseUrl: String(state.tasks.secondaryApi.baseUrl || "").trim(),
      model: String(state.tasks.secondaryApi.model || "").trim(),
      temperature: Number.isFinite(Number(state.tasks.secondaryApi.temperature))
        ? Number(state.tasks.secondaryApi.temperature)
        : 0.7,
      maxTokens: Number.isFinite(Number(state.tasks.secondaryApi.maxTokens))
        ? Number(state.tasks.secondaryApi.maxTokens)
        : 1200
    };
    if (!Array.isArray(state.tasks.side.slots)) state.tasks.side.slots = [];
    if (state.tasks.side.activeSlotIndex !== null && state.tasks.side.activeSlotIndex !== undefined) {
      const activeIndex = Number(state.tasks.side.activeSlotIndex);
      state.tasks.side.activeSlotIndex = Number.isInteger(activeIndex) ? activeIndex : null;
    } else {
      state.tasks.side.activeSlotIndex = null;
    }
    normalizeSideQuestLocations(state);
    if (!state.tasks.side.genStatus) state.tasks.side.genStatus = "idle";
    if (!state.tasks.side.source) state.tasks.side.source = "";
    if (!state.tasks.side.pendingRequestId) state.tasks.side.pendingRequestId = "";
    if (!state.tasks.campus || typeof state.tasks.campus !== "object") {
      state.tasks.campus = { dayKey: "", usedCount: 0, maxPerDay: CAMPUS_MAX_PER_DAY, log: [] };
    }
    state.tasks.campus.maxPerDay = CAMPUS_MAX_PER_DAY;
    state.tasks.campus.usedCount = Math.max(0, Number(state.tasks.campus.usedCount) || 0);
    if (!Array.isArray(state.tasks.campus.log)) state.tasks.campus.log = [];
    if (isSandboxTasksActive(state)) {
      syncCampusDay(state);
      syncSideQuestDay(state);
    }
    if (!state.tasks.baseline) {
      const scoutId = getScoutQuestId(state);
      if (scoutId && state.tasks.main[scoutId]?.status === "completed") {
      state.tasks.baseline = {
        Vo: Number(state.Vo) || 120,
        Vi: Number(state.Vi) || 80,
        stamina: Number(state.stamina) || 100
      };
      }
    }
    const scoutId = getScoutQuestId(state);
    if (scoutId && state.tasks.main[scoutId]?.status === "completed") {
      const pack = getSandboxQuestPack(state);
      Object.keys(MAIN_QUEST_META).forEach((id) => {
        if (id === scoutId) return;
        if (isScoutQuestId(id)) return;
        if (isIdolPersonalQuestId(id) && !pack?.personalIds.includes(id)) return;
        if (state.tasks.main[id]?.status === "locked") {
          state.tasks.main[id].status = "active";
        }
      });
    }
    syncSandboxMacroPhase(state);
    return state;
  }

  function getCampusDayKey(state) {
    return String(state?.freeMode?.postLiveDay || 1);
  }

  function syncCampusDay(state) {
    if (!isSandboxTasksActive(state)) return;
    if (!state.tasks?.campus) return;
    const dayKey = getCampusDayKey(state);
    if (state.tasks.campus.dayKey !== dayKey) {
      state.tasks.campus.dayKey = dayKey;
      state.tasks.campus.usedCount = 0;
      state.tasks.campus.log = [];
    }
  }

  function getCampusRemaining(state) {
    if (!isSandboxTasksActive(state)) return CAMPUS_MAX_PER_DAY;
    if (!state.tasks?.campus) return CAMPUS_MAX_PER_DAY;
    syncCampusDay(state);
    const max = state.tasks.campus.maxPerDay || CAMPUS_MAX_PER_DAY;
    return Math.max(0, max - state.tasks.campus.usedCount);
  }

  function isCampusDailyLimitReached(state) {
    return getCampusRemaining(state) <= 0;
  }

  function canRecordCampusAction(state) {
    if (!isSandboxTasksActive(state)) return true;
    syncCampusDay(state);
    return !isCampusDailyLimitReached(state);
  }

  function recordCampusAction(state, info = {}) {
    if (!isSandboxTasksActive(state)) return { ok: true, skipped: true };
    if (!state.tasks?.campus) return { ok: false, reason: "missing" };
    syncCampusDay(state);
    if (isCampusDailyLimitReached(state)) {
      return { ok: false, reason: "limit" };
    }
    state.tasks.campus.usedCount += 1;
    state.tasks.campus.log.push({
      kind: info.kind || "",
      locationId: info.locationId || "",
      minutes: Number(info.minutes) || 60,
      clock: info.clock || "",
      at: Date.now()
    });
    return {
      ok: true,
      usedCount: state.tasks.campus.usedCount,
      remaining: getCampusRemaining(state)
    };
  }

  function applyQuestFlag(state, flagId) {
    if (flagId === "diet_plan_active") return markDietPlanActive(state);
    if (flagId === "healthy_meal") return recordHealthyMeal(state, 1);
    if (flagId === "outstage_full_song") return markOutstageFullSong(state);
    if (flagId === "part_time_cancelled") return markPartTimeCancelled(state);
    if (flagId === "praise_kotone") return recordPraiseKotone(state, 1);
    if (flagId === "full_rest") return recordKotoneRestSession(state, 1);
    return false;
  }

  function initKotoneMain01MoneyBaseline(state) {
    const quest = state.tasks.main.kotone_main_01;
    if (!quest || quest.status !== "active") return;
    if (!Number.isFinite(Number(quest.flags.money_baseline))) {
      quest.flags.money_baseline = Number(state.tasks?.wallet?.money) || 0;
    }
  }

  function getKotoneMoneyEarned(state) {
    const quest = state.tasks.main.kotone_main_01;
    if (!quest) return 0;
    const baseline = Number(quest.flags?.money_baseline) || 0;
    return Math.max(0, (Number(state.tasks?.wallet?.money) || 0) - baseline);
  }

  function parseQuestFlagsFromText(text) {
    const ids = new Set();
    const source = String(text || "");
    let match;
    QUEST_FLAG_TAG_RE.lastIndex = 0;
    while ((match = QUEST_FLAG_TAG_RE.exec(source)) !== null) {
      if (match[1]) ids.add(match[1]);
    }
    QUEST_FLAG_XML_RE.lastIndex = 0;
    while ((match = QUEST_FLAG_XML_RE.exec(source)) !== null) {
      if (match[1]) ids.add(match[1]);
    }
    return [...ids];
  }

  function applyQuestFlagsFromReply(state, text) {
    if (!isSandboxTasksActive(state)) return { notices: [], completions: [] };
    const ids = parseQuestFlagsFromText(text).filter((id) => QUEST_FLAG_IDS.includes(id));
    const notices = [];
    const completions = [];
    ids.forEach((id) => {
      const temari01 = state.tasks.main.temari_main_01;
      const temari03 = state.tasks.main.temari_main_03;
      const kotone01 = state.tasks.main.kotone_main_01;
      const kotone02 = state.tasks.main.kotone_main_02;
      const kotone03 = state.tasks.main.kotone_main_03;
      let changed = false;
      if (id === "outstage_full_song" && temari01?.status === "active" && !temari01.flags.outstage_full_song) {
        changed = true;
      }
      if (id === "diet_plan_active" && temari03?.status === "active" && !temari03.flags.diet_plan_active) {
        changed = true;
      }
      if (id === "healthy_meal" && temari03?.status === "active") {
        changed = true;
      }
      if (id === "part_time_cancelled" && kotone01?.status === "active" && !kotone01.flags.part_time_cancelled) {
        changed = true;
      }
      if (id === "praise_kotone" && kotone02?.status === "active") {
        changed = true;
      }
      if (id === "full_rest" && kotone03?.status === "active") {
        changed = true;
      }
      if (!changed) return;
      if (applyQuestFlag(state, id)) {
        if (id === "outstage_full_song") completions.push("temari_main_01");
        if (id === "diet_plan_active" || id === "healthy_meal") {
          if (evaluateTemariMain03(state)) completions.push("temari_main_03");
        }
        if (id === "part_time_cancelled" && evaluateKotoneMain01(state)) {
          completions.push("kotone_main_01");
        }
        if (id === "praise_kotone" && evaluateKotoneMain02(state)) {
          completions.push("kotone_main_02");
        }
        if (id === "full_rest" && evaluateKotoneMain03(state)) {
          completions.push("kotone_main_03");
        }
      }
      if (QUEST_FLAG_NOTICE[id]) notices.push(QUEST_FLAG_NOTICE[id]);
    });
    syncMainQuestSteps(state);
    return { notices, completions: [...new Set(completions)] };
  }

  function applyMapChoiceHook(state, hook, choiceText) {
    const quest = state.tasks.main[hook.questId];
    if (!quest || quest.status !== "active") return null;
    if (!hook.locations.includes(String(choiceText.locationId || ""))) return null;
    if (!matchesMapChoicePatterns(choiceText.text, hook.patterns)) return null;

    if (hook.apply === "outstage_full_song" && quest.flags.outstage_full_song) return null;
    if (hook.apply === "diet_plan_active" && quest.flags.diet_plan_active) return null;
    if (hook.apply === "part_time_cancelled" && quest.flags.part_time_cancelled) return null;

    const result = { notices: [], completions: [] };
    if (hook.apply === "outstage_full_song") {
      quest.flags.outstage_full_song = true;
      if (evaluateTemariMain01(state)) result.completions.push("temari_main_01");
      result.notices.push(hook.notice);
      return result;
    }
    if (hook.apply === "diet_plan_active") {
      quest.flags.diet_plan_active = true;
      if (evaluateTemariMain03(state)) result.completions.push("temari_main_03");
      result.notices.push(hook.notice);
      return result;
    }
    if (hook.apply === "healthy_meal") {
      quest.flags.healthy_meal_count = Math.max(0, Number(quest.flags.healthy_meal_count) || 0) + 1;
      if (evaluateTemariMain03(state)) result.completions.push("temari_main_03");
      result.notices.push(hook.notice);
      return result;
    }
    if (hook.apply === "part_time_cancelled") {
      quest.flags.part_time_cancelled = true;
      if (evaluateKotoneMain01(state)) result.completions.push("kotone_main_01");
      result.notices.push(hook.notice);
      return result;
    }
    if (hook.apply === "praise_kotone") {
      quest.flags.praise_count = Math.max(0, Number(quest.flags.praise_count) || 0) + 1;
      if (evaluateKotoneMain02(state)) result.completions.push("kotone_main_02");
      result.notices.push(hook.notice);
      return result;
    }
    if (hook.apply === "full_rest") {
      quest.flags.rest_sessions = Math.max(0, Number(quest.flags.rest_sessions) || 0) + 1;
      if (evaluateKotoneMain03(state)) result.completions.push("kotone_main_03");
      result.notices.push(hook.notice);
      return result;
    }
    return null;
  }

  function processSandboxMainQuestMapChoice(state, locationId, choiceText) {
    if (!isSandboxTasksActive(state)) return { notices: [], completions: [] };
    ensureTasksShape(state);
    const notices = [];
    const completions = [];
    const payload = { locationId: String(locationId || ""), text: String(choiceText || "") };
    MAP_CHOICE_HOOKS.forEach((hook) => {
      const result = applyMapChoiceHook(state, hook, payload);
      if (!result) return;
      result.notices.forEach((notice) => notices.push(notice));
      result.completions.forEach((id) => completions.push(id));
    });
    syncMainQuestSteps(state);
    return { notices: [...new Set(notices)], completions: [...new Set(completions)] };
  }

  function clampRelationshipScore(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.round(Math.min(100, Math.max(0, number)));
  }

  function getCurrentIdolRelationshipEntry(state, create = false) {
    const idolName = String(state?.idol || "").trim();
    if (!idolName) return null;
    if (!state.freeMode || typeof state.freeMode !== "object") {
      if (!create) return null;
      state.freeMode = {};
    }
    if (!state.freeMode.relationships || typeof state.freeMode.relationships !== "object") {
      if (!create) return null;
      state.freeMode.relationships = {};
    }
    if (!state.freeMode.relationships[idolName] && create) {
      state.freeMode.relationships[idolName] = { 好感度: 0, 更新日: 0 };
    }
    const entry = state.freeMode.relationships[idolName];
    if (!entry) return null;
    if (typeof entry === "number" || typeof entry === "string") {
      const normalized = { 好感度: clampRelationshipScore(entry), 更新日: 0 };
      state.freeMode.relationships[idolName] = normalized;
      return normalized;
    }
    entry.好感度 = clampRelationshipScore(entry.好感度);
    entry.更新日 = Math.max(0, Number(entry.更新日) || 0);
    return entry;
  }

  function getCurrentIdolRelationshipScore(state) {
    return getCurrentIdolRelationshipEntry(state, false)?.好感度 || 0;
  }

  function addCurrentIdolRelationshipScore(state, delta) {
    const amount = Number(delta) || 0;
    if (!amount) return 0;
    const entry = getCurrentIdolRelationshipEntry(state, true);
    if (!entry) return 0;
    entry.好感度 = clampRelationshipScore((entry.好感度 || 0) + amount);
    entry.更新日 = Math.max(1, Number(state.freeMode?.postLiveDay || 0) || 1);
    return entry.好感度;
  }

  function getQuestProgressRatio(state, meta) {
    if (meta.trustTarget) return Math.min(1, getCurrentIdolRelationshipScore(state) / meta.trustTarget);
    if (meta.stat && meta.target) return Math.min(1, (Number(state[meta.stat]) || 0) / meta.target);
    if (meta.fameTarget) return Math.min(1, (Number(state.tasks?.wallet?.fame) || 0) / meta.fameTarget);
    if (meta.category === "final") return state.firstLive?.success ? 1 : 0;
    return 0;
  }

  function syncAsariStageQuestSteps(state) {
    Object.entries(MAIN_QUEST_META).forEach(([id, meta]) => {
      if (isScoutQuestId(id) || isIdolPersonalQuestId(id)) return;
      const quest = state.tasks.main[id];
      if (!quest || quest.status !== "active") return;
      const ratio = getQuestProgressRatio(state, meta);
      quest.step = Math.max(0, Math.min(3, Math.floor(ratio * 3)));
      if (ratio >= 1) {
        quest.step = 3;
        completeMainQuest(state, id);
      }
    });
  }

  function syncMainQuestSteps(state) {
    if (!isSandboxTasksActive(state)) return;
    ensureTasksShape(state);
    const baseline = state.tasks.baseline || { Vo: 120, Vi: 80, stamina: 100 };
    const quest01 = state.tasks.main.temari_main_01;
    if (quest01?.status === "active") {
      const t = THRESHOLDS.temari_main_01;
      if (quest01.flags.outstage_full_song) quest01.step = 3;
      else if (Number(state.stamina) >= t.staminaMin && Number(state.Vo) >= baseline.Vo + t.voGain) quest01.step = 2;
      else if (Number(state.stamina) >= t.staminaMin || Number(state.Vo) >= baseline.Vo + Math.floor(t.voGain / 2)) quest01.step = 1;
      else quest01.step = 0;
    }
    const quest02 = state.tasks.main.temari_main_02;
    if (quest02?.status === "active") {
      quest02.step = 1;
    }
    const quest03 = state.tasks.main.temari_main_03;
    if (quest03?.status === "active") {
      const t = THRESHOLDS.temari_main_03;
      if (quest03.flags.diet_plan_active && Number(quest03.flags.healthy_meal_count) >= t.healthyMealsMin) quest03.step = 3;
      else if (quest03.flags.diet_plan_active) quest03.step = 2;
      else if (Number(quest03.flags.healthy_meal_count) > 0) quest03.step = 1;
      else quest03.step = 0;
    }
    const kotone01 = state.tasks.main.kotone_main_01;
    if (kotone01?.status === "active") {
      initKotoneMain01MoneyBaseline(state);
      const t = THRESHOLDS.kotone_main_01;
      const fame = Number(state.tasks?.wallet?.fame) || 0;
      const earned = getKotoneMoneyEarned(state);
      if (kotone01.flags.part_time_cancelled && fame >= t.fameMin && earned >= t.moneyEarnedMin) kotone01.step = 3;
      else if (kotone01.flags.part_time_cancelled && (fame >= t.fameMin || earned >= t.moneyEarnedMin)) kotone01.step = 2;
      else if (kotone01.flags.part_time_cancelled || fame > 0 || earned > 0) kotone01.step = 1;
      else kotone01.step = 0;
    }
    const kotone02 = state.tasks.main.kotone_main_02;
    if (kotone02?.status === "active") {
      const t = THRESHOLDS.kotone_main_02;
      const count = Number(kotone02.flags.praise_count) || 0;
      if (count >= t.praiseMin) kotone02.step = 3;
      else if (count >= Math.floor(t.praiseMin * 0.6)) kotone02.step = 2;
      else if (count > 0) kotone02.step = 1;
      else kotone02.step = 0;
    }
    const kotone03 = state.tasks.main.kotone_main_03;
    if (kotone03?.status === "active") {
      const t = THRESHOLDS.kotone_main_03;
      const sessions = Number(kotone03.flags.rest_sessions) || 0;
      if (sessions >= t.restSessionsMin && Number(state.stamina) >= t.staminaMin) kotone03.step = 3;
      else if (sessions >= t.restSessionsMin || Number(state.stamina) >= t.staminaMin) kotone03.step = 2;
      else if (sessions > 0 || Number(state.stamina) >= Math.floor(t.staminaMin * 0.8)) kotone03.step = 1;
      else kotone03.step = 0;
    }
    syncAsariStageQuestSteps(state);
  }
  function buildSandboxMainQuestPromptBlock(state, locationId) {
    if (!isSandboxTasksActive(state) || !state.sandbox?.inviteComplete) return "";
    ensureTasksShape(state);
    syncMainQuestSteps(state);
    const blocks = [];
    const quest01 = state.tasks.main.temari_main_01;
    if (quest01?.status === "active") {
      blocks.push(
        `【亚纱里课题 · 舞台唱完】
手毬的迫切矛盾：她担心自己体力撑不住，无法在舞台上唱完整首歌（参考 GKMS 第5/6/9话：SyngUp 训练后的疲惫、登台前「说不定会失败」的不安）。
当前进度：${progressHint(state, "temari_main_01")}
叙事要求：若在野外舞台或讲堂引导完整试唱/排练，可写她咬牙唱完一曲后的虚脱与决心；不要在数值未达标前写矛盾已彻底解决。
若剧情中完成完整试唱，可在正文末尾输出【初星任务标记】outstage_full_song。`
      );
    }
    const quest02 = state.tasks.main.temari_main_02;
    if (quest02?.status === "active") {
      const misakiLine = MAP_MAIN_QUEST_LOCATIONS.temari_main_02_misaki.includes(locationId)
        ? "本地点可能出现秦谷美铃。可写她与手毬关于 SyngUp 解散的别扭同场、冷战或互相刺探。"
        : "若场景涉及秦谷美铃，可写 SyngUp 旧事与心结，但不要提前宣布和好完成。";
      blocks.push(
        `【亚纱里课题 · 与美铃和好】
手毬与秦谷美铃因 SyngUp 解散心结未解（参考 GKMS 第8～10话）。
${misakiLine}
和好完成时请在正文末尾输出【初星任务完成】temari_main_02（或 <quest_complete id="temari_main_02" />），不要由旁白直接宣布任务完成。`
      );
    }
    const quest03 = state.tasks.main.temari_main_03;
    if (quest03?.status === "active") {
      const dietLine = locationId === "dining_hall"
        ? "本场景在食堂：可写营养沟通、健康餐选择或体重管理；制作人可带她制定饮食方案。"
        : "若在食堂或 P 科教室，可写饮食与体态相关的讨论。";
      blocks.push(
        `【亚纱里课题 · 饮食与体态】
手毬在意饮食控制与舞台体态（参考 GKMS 第1～3话）。
${dietLine}
当前进度：${progressHint(state, "temari_main_03")}
制定饮食方案后可输出【初星任务标记】diet_plan_active；选择健康餐后可输出【初星任务标记】healthy_meal。`
      );
    }
    const kotone01 = state.tasks.main.kotone_main_01;
    if (kotone01?.status === "active") {
      const workLine = ["student_store", "school_entrance", "dining_hall"].includes(locationId)
        ? "本场景可写快餐店打工、辞工沟通，或引导她改用委托系统接偶像工作。"
        : "若在 P 科教室或小卖部附近，可写她仍想去快餐店打工，以及制作人如何劝阻。";
      blocks.push(
        `【亚纱里课题 · 告别快餐店打工】
琴音仍被赚钱焦虑推着走，想继续快餐店打工；制作人需要让她改用委托系统承接偶像工作。
${workLine}
当前进度：${progressHint(state, "kotone_main_01")}
确认她辞掉快餐店打工后，可输出【初星任务标记】part_time_cancelled。
知名度与初星币通过委托系统结算自动累计，不要在三项未达标前写课题已全部完成。`
      );
    }
    const kotone02 = state.tasks.main.kotone_main_02;
    if (kotone02?.status === "active") {
      blocks.push(
        `【亚纱里课题 · 建立自信】
琴音嘴上爱被夸，心里却不相信自己真的够好；制作人需要持续、认真地夸奖她，把认可变成自信。
当前进度：${progressHint(state, "kotone_main_02")}
若本轮剧情里制作人明确夸奖了琴音（可爱、努力、进步、舞台魅力等），可在正文末尾输出【初星任务标记】praise_kotone（或 <quest_flag id="praise_kotone" />），每次有效夸奖记 1 次。`
      );
    }
    const kotone03 = state.tasks.main.kotone_main_03;
    if (kotone03?.status === "active") {
      const restLine = ["producer_classroom", "dining_hall", "courtyard"].includes(locationId)
        ? "本场景适合写她被迫停下、好好吃饭或躺下休息。"
        : "可写她仍想硬撑训练，制作人需要安排充分休息。";
      blocks.push(
        `【亚纱里课题 · 体力修养】
琴音容易把自己逼到透支，需要制作人安排充分休息，把体力恢复到健康水平。
${restLine}
当前进度：${progressHint(state, "kotone_main_03")}
若本轮写了充分休息、睡足或明显恢复体力，可输出【初星任务标记】full_rest。`
      );
    }
    const saki01 = state.tasks.main.saki_main_01;
    if (saki01?.status === "active") {
      const sakiLine = locationId === "playground"
        ? "本场景在运动场：适合写咲季自主训练、速度或体能项目后的瓶颈感。"
        : "若场景涉及训练、课程或复盘，可写咲季用自夸掩盖成长停滞。";
      blocks.push(
        `【亚纱里课题 · 天才的停滞感】
咲季的迫切矛盾：她是入学第一、训练认真，却开始意识到超早熟带来的瓶颈；制作人要点破「如果不改变现状，就会输给佑芽」这份恐惧。
${sakiLine}
完成条件：咲季承认成长停滞、害怕输或逃避真正败北，并要求制作人告诉她赢法。
完成时请在正文末尾输出【初星任务完成】saki_main_01（或 <quest_complete id="saki_main_01" />），不要提前宣布课题完成。`
      );
    }
    const saki02 = state.tasks.main.saki_main_02;
    if (saki02?.status === "active") {
      blocks.push(
        `【亚纱里课题 · 最强姐姐的谎言】
咲季与佑芽的矛盾不是单纯胜负：她想把「姐姐是世界第一」这个被妹妹相信过的谎言变成真实，同时害怕失去最强姐姐的位置。
叙事要求：可写佑芽相关事件、童年承诺、姐姐身份压力；制作人应承诺陪她把谎言变成真实，而不是安慰她输也没关系。
完成时请在正文末尾输出【初星任务完成】saki_main_02（或 <quest_complete id="saki_main_02" />），不要提前宣布课题完成。`
      );
    }
    const saki03 = state.tasks.main.saki_main_03;
    if (saki03?.status === "active") {
      const battleLine = ["playground", "gymnasium", "outstage", "auditorium"].includes(locationId)
        ? "本场景适合写对抗式训练、舞台压制力或首场 Live 前的发抖与逞强。"
        : "可写她把训练、粉丝、营养管理和姐妹胜负重新组织成取胜计划。";
      blocks.push(
        `【亚纱里课题 · 把私欲升华为胜利】
咲季不能只靠苦行僧式努力；制作人要引导她把想赢佑芽、珍惜佑芽、害怕被追上的复杂羁绊转化为舞台上的绝对压制力。
${battleLine}
完成条件：咲季不再逃避和佑芽正面对决，把战胜妹妹升华为顶级偶像证明，并主动要求更严苛计划。
完成时请在正文末尾输出【初星任务完成】saki_main_03（或 <quest_complete id="saki_main_03" />），不要提前宣布课题完成。`
      );
    }
    const misuzu01 = state.tasks.main.misuzu_main_01;
    if (misuzu01?.status === "active") {
      const misuzuLine = locationId === "courtyard"
        ? "本场景在中庭：适合写美铃在阳光和长椅上打盹，制作人选择等待、理解并成为共犯。"
        : "若场景涉及休息、茶点、训练安排或偷懒，可写制作人理解她不是普通勤奋型偶像。";
      blocks.push(
        `【亚纱里课题 · 慢步调的野心】
美铃的迫切矛盾：她会午睡、逃训练、按自己的步调行动，但这不是没有野心；制作人要理解她会像散步一样一步步走向偶像顶点。
${misuzuLine}
完成条件：美铃承认自己也想抵达顶点，制作人不指责她偷懒而是接受她的步调，并与她成为共犯。
完成时请在正文末尾输出【初星任务完成】misuzu_main_01（或 <quest_complete id="misuzu_main_01" />），不要提前宣布课题完成。`
      );
    }
    const misuzu02 = state.tasks.main.misuzu_main_02;
    if (misuzu02?.status === "active") {
      blocks.push(
        `【亚纱里课题 · 温柔里的独占欲】
美铃的歌声表层是安稳、平静、悠闲和慵懒；更深处是想让观众的心被自己填满、从今以后只注视她一人的占有式野心。
叙事要求：不要写成普通治愈系，也不要写成阴暗病娇；让她用温柔平静的语气说出想俘获所有人的真心。
完成条件：美铃明确说出想俘获观众或让所有人只注视自己，并愿意把这种真心放进舞台。
完成时请在正文末尾输出【初星任务完成】misuzu_main_02（或 <quest_complete id="misuzu_main_02" />），不要提前宣布课题完成。`
      );
    }
    const misuzu03 = state.tasks.main.misuzu_main_03;
    if (misuzu03?.status === "active") {
      blocks.push(
        `【亚纱里课题 · 比太阳更高的地方】
美铃与手毬、SyngUp! 的旧创伤核心不是单纯和好：她曾想成为手毬的翅膀，支撑手毬、让手毬只注视自己；失败后，她要亲自走到手毬仰望的太阳、高空和前方。
叙事要求：可写手毬、SyngUp!、照顾欲与占有欲；重点是美铃从支撑者转为被注视的人，而不是回到旧组合状态。
完成条件：美铃不再只想回到过去或支撑手毬，而是宣言要取代「太阳/高空/前方」，成为顶尖偶像。
完成时请在正文末尾输出【初星任务完成】misuzu_main_03（或 <quest_complete id="misuzu_main_03" />），不要提前宣布课题完成。`
      );
    }
    const lilja01 = state.tasks.main.lilja_main_01;
    if (lilja01?.status === "active") {
      const liljaLine = ["idol_classroom", "special_education", "producer_classroom"].includes(locationId)
        ? "本场景适合写莉莉娅在偶像科教室旁或课程后训练到混乱，制作人把训练收束到声乐基础和录像复盘。"
        : "若场景涉及训练或复盘，可写莉莉娅什么都想做好、越练越乱，需要先确认一个能看见进步的起点。";
      blocks.push(
        `【亚纱里课题 · 自信的起点】
莉莉娅的迫切矛盾：零经验的她想同时练好歌、舞、表情，却因此更看不见自己的成长；制作人要帮她先聚焦声乐，并用录像复盘证明她正在前进。
${liljaLine}
完成条件：莉莉娅接受先从声乐基础开始，不再把一次做不好等同于没有资格，并通过前后对比确认自己确实进步了。
完成时请在正文末尾输出【初星任务完成】lilja_main_01（或 <quest_complete id="lilja_main_01" />），不要提前宣布课题完成。`
      );
    }
    const lilja02 = state.tasks.main.lilja_main_02;
    if (lilja02?.status === "active") {
      blocks.push(
        `【亚纱里课题 · 自信的表达】
莉莉娅的笑容一开始像是在模仿憧憬的偶像；制作人要让她明白表情不是装饰，也不是只要做对动作，而是把自己的心情交给观众的入口。
叙事要求：可写镜前练习、表情僵硬、回忆憧憬的舞台；重点从「正确微笑」推进到「用自己的笑容传达」。
完成条件：莉莉娅在练习中露出属于自己的真笑，或明确理解歌声和表情都要服务于传达心意。
完成时请在正文末尾输出【初星任务完成】lilja_main_02（或 <quest_complete id="lilja_main_02" />），不要提前宣布课题完成。`
      );
    }
    const lilja03 = state.tasks.main.lilja_main_03;
    if (lilja03?.status === "active") {
      const sumikaLine = ["idol_classroom", "special_education", "outstage", "auditorium"].includes(locationId)
        ? "本场景适合写她邀请清夏观看练习或小舞台展示，把现在的自己唱给最重要的朋友听。"
        : "若清夏或初 Live 前准备被提及，可写莉莉娅害怕不成熟的自己被看见，却仍想传达给清夏。";
      blocks.push(
        `【亚纱里课题 · 自信的见证】
莉莉娅最难的一步不是等到完美，而是在仍会紧张、仍不成熟时让重要的人看见现在的自己；制作人要支持她把歌声传达到清夏心里。
${sumikaLine}
完成条件：莉莉娅主动邀请清夏观看练习或在清夏面前完成歌唱，并确认「现在的我」也能传达到别人心里。
完成时请在正文末尾输出【初星任务完成】lilja_main_03（或 <quest_complete id="lilja_main_03" />），不要提前宣布课题完成。`
      );
    }
    const hiro01 = state.tasks.main.hiro_main_01;
    if (hiro01?.status === "active") {
      const hiroLine = ["idol_classroom", "special_education", "producer_classroom"].includes(locationId)
        ? "本场景适合写广在教室旁走廊、教学楼保健室或课程后摇摇晃晃地出现；制作人可以直说她不适合偶像，她反而觉得安心。"
        : "可写广把普通移动、课程或外出都当成实验变量，身体很快到极限，但因为做不到所以觉得有趣。";
      blocks.push(
        `【亚纱里课题 · 最不适合的挑战】
广的迫切矛盾：她选择偶像不是因为擅长，而是因为这像是最不适合自己的事情；制作人需要确认这份挑战不是自毁，而是她想认真前进的理由。
${hiroLine}
完成条件：广接受制作人的试用指导，明确说出「做不到所以有趣」或同等含义，并愿意把最不适合的偶像活动作为自己的挑战。
完成时请在正文末尾输出【初星任务完成】hiro_main_01（或 <quest_complete id="hiro_main_01" />），不要提前宣布课题完成。`
      );
    }
    const hiro02 = state.tasks.main.hiro_main_02;
    if (hiro02?.status === "active") {
      blocks.push(
        `【亚纱里课题 · 理论与身体的落差】
广能快速理解理论，却无法让身体跟上；重点不是突然变强，而是把失败、体力不足和一点点进步写成她真正感到开心的过程。
叙事要求：可写训练、上课、保健室休息、制作人扶住她后的复盘；不要把她写成普通体力差的悲情角色，她会平静甚至开心地面对困难。
完成条件：广在一次明显失败或体力极限后，确认自己确实前进了一点，并请求制作人继续见证她的挑战。
完成时请在正文末尾输出【初星任务完成】hiro_main_02（或 <quest_complete id="hiro_main_02" />），不要提前宣布课题完成。`
      );
    }
    const hiro03 = state.tasks.main.hiro_main_03;
    if (hiro03?.status === "active") {
      blocks.push(
        `【亚纱里课题 · 每天在一起的约定】
广的亲近不是热烈撒娇，而是直白地说开心、喜欢、谢谢，并希望制作人每天都在身边继续这个困难实验。
叙事要求：可写她记录恢复、课程后的短暂散步、保健室或教室旁的安静对话；重点是信任从「请夸我」推进到「请明天也在」。
完成条件：广主动表达想和制作人继续每天一起挑战偶像活动，制作人回应这份约定。
完成时请在正文末尾输出【初星任务完成】hiro_main_03（或 <quest_complete id="hiro_main_03" />），不要提前宣布课题完成。`
      );
    }
    return blocks.join("\n\n");
  }

  function activateScoutQuest(state) {
    const idol = String(state?.sandbox?.scoutTargetIdol || state?.idol || "").trim();
    if (!idol) return;
    activateScoutQuestForIdol(state, idol);
  }

  function captureBaseline(state) {
    state.tasks.baseline = {
      Vo: Number(state.Vo) || 0,
      Vi: Number(state.Vi) || 0,
      stamina: Number(state.stamina) || 0
    };
  }

  function activatePersonalQuests(state) {
    if (!isSandboxTasksActive(state)) return;
    ensureTasksShape(state);
    const pack = getSandboxQuestPack(state);
    if (!pack) return;
    if (!state.tasks.baseline) captureBaseline(state);
    Object.keys(MAIN_QUEST_META).forEach((id) => {
      if (id === pack.scoutId) return;
      if (isIdolPersonalQuestId(id) && !pack.personalIds.includes(id)) return;
      const quest = state.tasks.main[id];
      if (quest?.status === "locked") quest.status = "active";
    });
    initKotoneMain01MoneyBaseline(state);
  }

  function completeMainQuest(state, id) {
    if (!isSandboxTasksActive(state)) return false;
    ensureTasksShape(state);
    const quest = state.tasks.main[id];
    if (!quest || quest.status !== "active") return false;
    quest.status = "completed";
    return true;
  }

  function onScoutInviteComplete(state) {
    if (!isSandboxTasksActive(state)) return [];
    ensureTasksShape(state);
    ensureSandboxProgressState(state);
    if (state.idol && !state.sandbox.scoutTargetIdol) {
      state.sandbox.scoutTargetIdol = state.idol;
    }
    return [];
  }

  function completeScoutTemariOnLocationTalk(state) {
    return [];
  }

  function onScoutQuestCompleted(state, idolName = state.idol) {
    if (!isSandboxTasksActive(state)) return;
    if (String(idolName || "") === String(state.idol || "")) {
      if (!state.tasks.baseline) captureBaseline(state);
      activatePersonalQuests(state);
    }
    syncSandboxMacroPhase(state);
  }

  function onScoutTemariQuestCompleted(state) {
    onScoutQuestCompleted(state);
  }

  function syncSandboxQuestProgress(state) {
    if (!isSandboxTasksActive(state)) return [];
    ensureTasksShape(state);
    ensureSandboxProgressState(state);
    const completed = [];
    syncProducedIdolsAndSecondUnlock(state);
    completed.push(...evaluateNumericMainQuests(state));
    syncMainQuestSteps(state);
    return completed;
  }

  function parseQuestCompletionsFromText(text) {
    const ids = new Set();
    const source = String(text || "");
    let match;
    QUEST_COMPLETE_TAG_RE.lastIndex = 0;
    while ((match = QUEST_COMPLETE_TAG_RE.exec(source)) !== null) {
      if (match[1]) ids.add(match[1]);
    }
    QUEST_COMPLETE_XML_RE.lastIndex = 0;
    while ((match = QUEST_COMPLETE_XML_RE.exec(source)) !== null) {
      if (match[1]) ids.add(match[1]);
    }
    return [...ids];
  }

  function applyQuestCompletionsFromReply(state, text) {
    if (!isSandboxTasksActive(state)) return [];
    const ids = parseQuestCompletionsFromText(text);
    const completed = [];
    ids.forEach((id) => {
      if (completeMainQuest(state, id)) {
        completed.push(id);
        const scoutId = getScoutQuestId(state);
        if (scoutId && id === scoutId) onScoutQuestCompleted(state, getIdolByScoutQuestId(id));
      }
    });
    return completed;
  }

  function evaluateKotoneMain01(state) {
    const quest = state.tasks.main.kotone_main_01;
    if (quest?.status !== "active") return false;
    initKotoneMain01MoneyBaseline(state);
    const t = THRESHOLDS.kotone_main_01;
    if (!quest.flags.part_time_cancelled) return false;
    if ((Number(state.tasks?.wallet?.fame) || 0) < t.fameMin) return false;
    if (getKotoneMoneyEarned(state) < t.moneyEarnedMin) return false;
    return completeMainQuest(state, "kotone_main_01");
  }

  function evaluateKotoneMain02(state) {
    const quest = state.tasks.main.kotone_main_02;
    if (quest?.status !== "active") return false;
    if ((Number(quest.flags.praise_count) || 0) < THRESHOLDS.kotone_main_02.praiseMin) return false;
    return completeMainQuest(state, "kotone_main_02");
  }

  function evaluateKotoneMain03(state) {
    const quest = state.tasks.main.kotone_main_03;
    if (quest?.status !== "active") return false;
    const t = THRESHOLDS.kotone_main_03;
    if ((Number(quest.flags.rest_sessions) || 0) < t.restSessionsMin) return false;
    if (Number(state.stamina) < t.staminaMin) return false;
    return completeMainQuest(state, "kotone_main_03");
  }

  function evaluateTemariMain01(state) {
    const quest = state.tasks.main.temari_main_01;
    if (quest.status !== "active") return false;
    const baseline = state.tasks.baseline || { Vo: 120, Vi: 80, stamina: 100 };
    if (Number(state.stamina) < THRESHOLDS.temari_main_01.staminaMin) return false;
    if (Number(state.Vo) < baseline.Vo + THRESHOLDS.temari_main_01.voGain) return false;
    if (!quest.flags.outstage_full_song) return false;
    return completeMainQuest(state, "temari_main_01");
  }

  function evaluateTemariMain03(state) {
    const quest = state.tasks.main.temari_main_03;
    if (quest.status !== "active") return false;
    const baseline = state.tasks.baseline || { Vo: 120, Vi: 80, stamina: 100 };
    if (Number(state.Vi) < baseline.Vi + THRESHOLDS.temari_main_03.viGain) return false;
    if (Number(state.stress) > THRESHOLDS.temari_main_03.stressMax) return false;
    if (!quest.flags.diet_plan_active) return false;
    if (Number(quest.flags.healthy_meal_count) < THRESHOLDS.temari_main_03.healthyMealsMin) return false;
    return completeMainQuest(state, "temari_main_03");
  }

  function evaluateAsariStageQuests(state) {
    const completed = [];
    Object.keys(MAIN_QUEST_META).forEach((id) => {
      if (isScoutQuestId(id) || isIdolPersonalQuestId(id)) return;
      const quest = state.tasks.main[id];
      const meta = MAIN_QUEST_META[id];
      if (!quest || quest.status !== "active") return;
      if (getQuestProgressRatio(state, meta) >= 1 && completeMainQuest(state, id)) {
        completed.push(id);
      }
    });
    return completed;
  }

  function evaluateNumericMainQuests(state) {
    if (!isSandboxTasksActive(state)) return [];
    ensureTasksShape(state);
    const completed = [];
    if (evaluateTemariMain01(state)) completed.push("temari_main_01");
    if (evaluateTemariMain03(state)) completed.push("temari_main_03");
    if (evaluateKotoneMain01(state)) completed.push("kotone_main_01");
    if (evaluateKotoneMain02(state)) completed.push("kotone_main_02");
    if (evaluateKotoneMain03(state)) completed.push("kotone_main_03");
    completed.push(...evaluateAsariStageQuests(state));
    syncMainQuestSteps(state);
    return [...new Set(completed)];
  }
  function markOutstageFullSong(state) {
    if (!isSandboxTasksActive(state)) return false;
    ensureTasksShape(state);
    const quest = state.tasks.main.temari_main_01;
    if (quest.status !== "active") return false;
    quest.flags.outstage_full_song = true;
    return evaluateTemariMain01(state);
  }

  function markDietPlanActive(state) {
    if (!isSandboxTasksActive(state)) return false;
    ensureTasksShape(state);
    const quest = state.tasks.main.temari_main_03;
    if (quest.status !== "active") return false;
    quest.flags.diet_plan_active = true;
    return evaluateTemariMain03(state);
  }

  function markPartTimeCancelled(state) {
    if (!isSandboxTasksActive(state)) return false;
    ensureTasksShape(state);
    const quest = state.tasks.main.kotone_main_01;
    if (quest?.status !== "active" || quest.flags.part_time_cancelled) return false;
    quest.flags.part_time_cancelled = true;
    return evaluateKotoneMain01(state);
  }

  function recordPraiseKotone(state, count = 1) {
    if (!isSandboxTasksActive(state)) return false;
    ensureTasksShape(state);
    const quest = state.tasks.main.kotone_main_02;
    if (quest?.status !== "active") return false;
    quest.flags.praise_count = Math.max(0, Number(quest.flags.praise_count) || 0) + count;
    evaluateKotoneMain02(state);
    return true;
  }

  function recordKotoneRestSession(state, count = 1) {
    if (!isSandboxTasksActive(state)) return false;
    ensureTasksShape(state);
    const quest = state.tasks.main.kotone_main_03;
    if (quest?.status !== "active") return false;
    quest.flags.rest_sessions = Math.max(0, Number(quest.flags.rest_sessions) || 0) + count;
    return evaluateKotoneMain03(state);
  }

  function onSandboxRestSettled(state) {
    if (!isSandboxTasksActive(state) || state?.idol !== "藤田琴音") return [];
    const completed = [];
    if (recordKotoneRestSession(state, 1)) {
      completed.push("kotone_main_03");
    }
    syncMainQuestSteps(state);
    return completed;
  }

  function clampStat(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function getSideQuestPool() {
    return global.HatsuSideQuestPool || null;
  }

  function resolveSideQuestLocation(quest, state) {
    const pool = getSideQuestPool();
    return pool?.inferSideQuestLocation?.(quest, Number(state?.tasks?.wallet?.fame) || 0) || {
      locationId: String(quest?.locationId || "shopping_street"),
      locationName: String(quest?.locationName || "商店街")
    };
  }

  function normalizeSideQuestLocations(state) {
    if (!Array.isArray(state?.tasks?.side?.slots)) return;
    state.tasks.side.slots.forEach((slot) => {
      if (!slot || typeof slot !== "object" || slot.loading) return;
      const location = resolveSideQuestLocation(slot, state);
      slot.locationId = location.locationId || "shopping_street";
      slot.locationName = location.locationName || "商店街";
    });
    const activeIndex = state.tasks.side.activeSlotIndex;
    if (activeIndex !== null && (!state.tasks.side.slots[activeIndex] || state.tasks.side.slots[activeIndex]?.status === "done")) {
      state.tasks.side.activeSlotIndex = null;
    }
  }

  function shouldUseSecondarySideGen(state) {
    if (!isSandboxTasksActive(state)) return false;
    if (!state.sandbox?.inviteComplete) return false;
    const api = state.tasks?.secondaryApi;
    if (!api?.enabled) return false;
    return Boolean(String(api.baseUrl || "").trim() && String(api.model || "").trim());
  }

  function buildLoadingSideSlots() {
    return Array.from({ length: SIDE_SLOTS_PER_DAY }, (_, slotIndex) => ({
      slotIndex,
      poolId: "",
      title: "生成中",
      desc: "次 API 正在生成本日委托…",
      tag: "general",
      status: "open",
      resultTier: null,
      loading: true
    }));
  }

  const SIDE_QUEST_TAGS = ["stamina", "syngup", "diet", "stage", "general"];

  function applyGeneratedSideQuests(state, quests, source = "secondary") {
    if (!isSandboxTasksActive(state)) return false;
    ensureTasksShape(state);
    const dayKey = getCampusDayKey(state);
    if (!Array.isArray(quests)) return false;
    // 容错：只要有可用条目就采用；多于 3 条截断，少于 3 条用静态池补齐到固定槽位数。
    const valid = quests
      .map((quest) => {
        const title = String(quest?.title || "").trim();
        const desc = String(quest?.desc || "").trim();
        const location = resolveSideQuestLocation({ ...quest, title, desc }, state);
        return {
          title,
          desc,
          tag: SIDE_QUEST_TAGS.includes(quest?.tag) ? quest.tag : "general",
          poolId: String(quest?.poolId || "").trim(),
          tierHints: quest?.tierHints || null,
          locationId: location.locationId,
          locationName: location.locationName
        };
      })
      .filter((quest) => quest.title && quest.desc)
      .slice(0, SIDE_SLOTS_PER_DAY);
    if (!valid.length) return false;

    if (valid.length < SIDE_SLOTS_PER_DAY) {
      const pool = getSideQuestPool();
      const filler = pool?.pickDailyQuests
        ? pool.pickDailyQuests(dayKey, state.idol, SIDE_SLOTS_PER_DAY, Number(state.tasks?.wallet?.fame) || 0)
        : [];
      let fillerIndex = 0;
      while (valid.length < SIDE_SLOTS_PER_DAY && fillerIndex < filler.length) {
        const slot = filler[fillerIndex++];
        const title = String(slot?.title || "").trim();
        const desc = String(slot?.desc || "").trim();
        if (!title || !desc) continue;
        if (valid.some((quest) => quest.title === title)) continue;
        valid.push({
          title,
          desc,
          tag: SIDE_QUEST_TAGS.includes(slot?.tag) ? slot.tag : "general",
          poolId: String(slot?.poolId || "").trim(),
          locationId: String(slot?.locationId || "").trim(),
          locationName: String(slot?.locationName || "").trim(),
          tierHints: null,
          source: "static"
        });
      }
    }
    if (!valid.length) return false;

    state.tasks.side.dayKey = dayKey;
    state.tasks.side.slots = valid.map((quest, index) => ({
      slotIndex: index,
      poolId: quest.poolId || `gen_${dayKey}_${index}`,
      title: quest.title,
      desc: quest.desc,
      tag: quest.tag,
      locationId: quest.locationId || resolveSideQuestLocation(quest, state).locationId,
      locationName: quest.locationName || resolveSideQuestLocation(quest, state).locationName,
      status: "open",
      resultTier: null,
      source: quest.source || source,
      tierHints: quest.tierHints || null,
      tierGenStatus: quest.tierHints ? "ready" : "idle"
    }));
    state.tasks.side.genStatus = "ready";
    state.tasks.side.source = source;
    state.tasks.side.pendingRequestId = "";
    state.tasks.side.activeSlotIndex = null;
    return true;
  }

  function markSideQuestGenPending(state, requestId) {
    if (!state.tasks?.side) return;
    state.tasks.side.genStatus = "loading";
    state.tasks.side.pendingRequestId = String(requestId || "");
    state.tasks.side.slots = buildLoadingSideSlots();
    state.tasks.side.source = "";
  }

  function markSideQuestGenFailed(state) {
    if (!state.tasks?.side) return;
    state.tasks.side.genStatus = "failed";
    state.tasks.side.pendingRequestId = "";
  }

  function queueSideQuestRefresh(state) {
    if (!isSandboxTasksActive(state)) return "skip";
    const dayKey = getCampusDayKey(state);
    state.tasks.side.dayKey = dayKey;
    if (shouldUseSecondarySideGen(state)) {
      state.tasks.side.genStatus = "pending";
      state.tasks.side.slots = buildLoadingSideSlots();
      state.tasks.side.source = "";
      state.tasks.side.pendingRequestId = "";
      state.tasks.side.activeSlotIndex = null;
      return "api";
    }
    refreshSideQuestSlots(state);
    state.tasks.side.genStatus = "ready";
    state.tasks.side.source = "static";
    state.tasks.side.pendingRequestId = "";
    state.tasks.side.activeSlotIndex = null;
    return "static";
  }

  function refreshSideQuestSlots(state) {
    const pool = getSideQuestPool();
    if (!pool?.pickDailyQuests) return false;
    const dayKey = getCampusDayKey(state);
    state.tasks.side.dayKey = dayKey;
    state.tasks.side.slots = pool.pickDailyQuests(dayKey, state.idol, SIDE_SLOTS_PER_DAY, Number(state.tasks?.wallet?.fame) || 0).map((slot) => ({
      ...slot,
      source: "static",
      tierGenStatus: "idle",
      tierHints: null
    }));
    state.tasks.side.genStatus = "ready";
    state.tasks.side.source = "static";
    state.tasks.side.pendingRequestId = "";
    state.tasks.side.activeSlotIndex = null;
    return true;
  }

  function syncSideQuestDay(state) {
    if (!isSandboxTasksActive(state)) return;
    if (!state.tasks?.side) return;
    const dayKey = getCampusDayKey(state);
    if (state.tasks.side.dayKey !== dayKey) {
      queueSideQuestRefresh(state);
      return;
    }
    if (!Array.isArray(state.tasks.side.slots) || state.tasks.side.slots.length !== SIDE_SLOTS_PER_DAY) {
      queueSideQuestRefresh(state);
    }
  }

  function getSideQuestGenStatus(state) {
    ensureTasksShape(state);
    return state.tasks.side.genStatus || "idle";
  }

  function applySideQuestTierHints(state, slotIndex, hints) {
    if (!state.tasks?.side?.slots?.[slotIndex]) return false;
    const slot = state.tasks.side.slots[slotIndex];
    slot.tierHints = hints;
    slot.tierGenStatus = "ready";
    slot.tierPendingRequestId = "";
    return true;
  }

  function markSideQuestTierGenPending(state, slotIndex, requestId) {
    const slot = state.tasks?.side?.slots?.[slotIndex];
    if (!slot) return false;
    slot.tierGenStatus = "loading";
    slot.tierPendingRequestId = String(requestId || "");
    return true;
  }

  function getSideQuestRemaining(state) {
    if (!isSandboxTasksActive(state)) return SIDE_SLOTS_PER_DAY;
    syncSideQuestDay(state);
    return state.tasks.side.slots.filter((slot) => slot?.status !== "done").length;
  }

  function setActiveSideQuest(state, slotIndex) {
    if (!isSandboxTasksActive(state)) return { ok: false, reason: "not_sandbox" };
    ensureTasksShape(state);
    syncSideQuestDay(state);
    const index = Number(slotIndex);
    const slot = state.tasks.side.slots[index];
    if (!slot) return { ok: false, reason: "missing_slot" };
    if (slot.status === "done" || slot.loading) return { ok: false, reason: "slot_unavailable" };
    normalizeSideQuestLocations(state);
    const responsibleIdol = String(state.sandbox?.responsibleIdol || state.idol || "").trim();
    if (slot.ownerIdol && slot.ownerIdol !== responsibleIdol) {
      return { ok: false, reason: "owner_mismatch", ownerIdol: slot.ownerIdol };
    }
    if (!slot.ownerIdol) slot.ownerIdol = responsibleIdol;
    state.tasks.side.activeSlotIndex = index;
    return { ok: true, slotIndex: index, slot: { ...state.tasks.side.slots[index] } };
  }

  function getActiveSideQuest(state) {
    if (!isSandboxTasksActive(state)) return null;
    ensureTasksShape(state);
    syncSideQuestDay(state);
    const index = state.tasks.side.activeSlotIndex;
    if (index === null || index === undefined) return null;
    const slot = state.tasks.side.slots[Number(index)];
    if (!slot || slot.status === "done" || slot.loading) {
      state.tasks.side.activeSlotIndex = null;
      return null;
    }
    return { slotIndex: Number(index), ...slot };
  }

  function getActiveSideQuestAtLocation(state, locationId) {
    const active = getActiveSideQuest(state);
    if (!active) return null;
    const responsibleIdol = String(state.sandbox?.responsibleIdol || state.idol || "").trim();
    if (active.ownerIdol && active.ownerIdol !== responsibleIdol) return null;
    return active.locationId === String(locationId || "") ? active : null;
  }

  function applySideQuestReward(state, reward) {
    if (!reward || typeof reward !== "object") return;
    state.tasks.wallet.money = (Number(state.tasks.wallet.money) || 0) + (Number(reward.money) || 0);
    if (reward.Vo) state.Vo = Math.max(0, Number(state.Vo) + Number(reward.Vo));
    if (reward.Da) state.Da = Math.max(0, Number(state.Da) + Number(reward.Da));
    if (reward.Vi) state.Vi = Math.max(0, Number(state.Vi) + Number(reward.Vi));
    if (reward.stamina) state.stamina = clampStat(Number(state.stamina) + Number(reward.stamina), 0, 100);
    if (reward.stress) state.stress = clampStat(Number(state.stress) + Number(reward.stress), 0, 100);
    if (reward.trust) addCurrentIdolRelationshipScore(state, reward.trust);
    if (reward.fame) state.tasks.wallet.fame = Math.max(0, Number(state.tasks.wallet.fame) + Number(reward.fame));
  }

  function applySideQuestTier(state, slotIndex, tier) {
    if (!isSandboxTasksActive(state)) return { ok: false, reason: "not_sandbox" };
    const pool = getSideQuestPool();
    if (!pool?.SIDE_TIER_REWARDS?.[tier]) return { ok: false, reason: "invalid_tier" };
    ensureTasksShape(state);
    syncSideQuestDay(state);
    const index = Number(slotIndex);
    const slot = state.tasks.side.slots[index];
    if (!slot) return { ok: false, reason: "missing_slot" };
    if (slot.status === "done") return { ok: false, reason: "slot_done" };
    const responsibleIdol = String(state.sandbox?.responsibleIdol || state.idol || "").trim();
    if (slot.ownerIdol && slot.ownerIdol !== responsibleIdol) {
      return { ok: false, reason: "owner_mismatch", ownerIdol: slot.ownerIdol };
    }
    const reward = { ...pool.SIDE_TIER_REWARDS[tier] };
    applySideQuestReward(state, reward);
    slot.status = "done";
    slot.resultTier = tier;
    slot.completedAt = Date.now();
    if (state.tasks.side.activeSlotIndex === index) state.tasks.side.activeSlotIndex = null;
    let healthyMealRecorded = false;
    if (slot.tag === "diet" && SIDE_HEALTHY_MEAL_TIERS.includes(tier)) {
      healthyMealRecorded = Boolean(recordHealthyMeal(state, 1));
    }
    return {
      ok: true,
      slotIndex: index,
      tier,
      reward,
      slot: { ...slot },
      healthyMealRecorded
    };
  }

  function recordHealthyMeal(state, count = 1) {
    if (!isSandboxTasksActive(state)) return false;
    ensureTasksShape(state);
    const quest = state.tasks.main.temari_main_03;
    if (quest.status !== "active") return false;
    quest.flags.healthy_meal_count = Math.max(0, Number(quest.flags.healthy_meal_count) || 0) + count;
    evaluateTemariMain03(state);
    return true;
  }

  function progressHint(state, id) {
    const quest = state.tasks?.main?.[id];
    if (!quest || quest.status !== "active") return "";
    const baseline = state.tasks.baseline || { Vo: 120, Vi: 80, stamina: 100 };
    const meta = MAIN_QUEST_META[id] || {};
    if (id === "temari_main_01") {
      return `参考 GKMS 5/6/9 话：SyngUp 训练后疲惫、登台前不安 · 体力 ${state.stamina}/85 · Vo ${state.Vo}/${baseline.Vo + THRESHOLDS.temari_main_01.voGain} · 野外试唱 ${quest.flags.outstage_full_song ? "已完成" : "未完成"}`;
    }
    if (id === "temari_main_02") {
      return "参考 GKMS 8～10 话：SyngUp 心结与和美铃的别扭 · 和好需 AI 输出【初星任务完成】temari_main_02";
    }
    if (id === "temari_main_03") {
      return `参考 GKMS 1～3 话：饮食与体态 · Vi ${state.Vi}/${baseline.Vi + THRESHOLDS.temari_main_03.viGain} · 压力 ≤${THRESHOLDS.temari_main_03.stressMax} · 饮食方案 ${quest.flags.diet_plan_active ? "已制定" : "未制定"} · 健康餐 ${quest.flags.healthy_meal_count}/${THRESHOLDS.temari_main_03.healthyMealsMin}`;
    }
    if (id === "kotone_main_01") {
      const t = THRESHOLDS.kotone_main_01;
      const fame = Number(state.tasks?.wallet?.fame) || 0;
      const earned = getKotoneMoneyEarned(state);
      return `快餐店打工 ${quest.flags.part_time_cancelled ? "已取消" : "未取消"} · 知名度 ${fame}/${t.fameMin} · 初星币 +${earned}/${t.moneyEarnedMin}（委托收益）`;
    }
    if (id === "kotone_main_02") {
      return `累计夸奖 ${Number(quest.flags.praise_count) || 0}/${THRESHOLDS.kotone_main_02.praiseMin} 次`;
    }
    if (id === "kotone_main_03") {
      const t = THRESHOLDS.kotone_main_03;
      return `充分休息 ${Number(quest.flags.rest_sessions) || 0}/${t.restSessionsMin} 次 · 体力 ${Number(state.stamina) || 0}/${t.staminaMin}`;
    }
    if (meta.category === "relationship") {
      return `好感度 ${getCurrentIdolRelationshipScore(state)}/${meta.trustTarget} · 达成后开放对应羁绊课题复盘`;
    }
    if (meta.category === "ability") {
      return `${meta.stat} ${Number(state[meta.stat]) || 0}/${meta.target} · 通过课程、训练和委托继续提升`;
    }
    if (meta.category === "work") {
      return `知名度 ${Number(state.tasks?.wallet?.fame) || 0}/${meta.fameTarget} · 在委托系统承接小型商演与宣传工作`;
    }
    if (meta.category === "final") {
      return state.firstLive?.success ? "First Live 已举办成功" : "等待 First Live 最终演出成功";
    }
    if (isScoutQuestId(id)) {
      return `在物色目标所在地点搭话；她同意成为担当时由 AI 输出【初星任务完成】${id}`;
    }
    return "";
  }

  function getTaskPanelSnapshot(state) {
    ensureTasksShape(state);
    ensureSandboxProgressState(state);
    syncProducedIdolsAndSecondUnlock(state);
    syncScoutQuestSelection(state);
    const main = Object.keys(MAIN_QUEST_META)
      .filter((id) => shouldShowMainQuestInPanel(state, id))
      .map((id) => ({
        id,
        title: MAIN_QUEST_META[id].title,
        conflict: MAIN_QUEST_META[id].conflict,
        category: MAIN_QUEST_META[id].category || "main",
        status: state.tasks.main[id]?.status || "locked",
        step: Number(state.tasks.main[id]?.step) || 0,
        progressHint: progressHint(state, id)
      }));
    return {
      launchMode: state.launchMode,
      idol: state.idol,
      main,
      secondIdol: {
        unlocked: Boolean(state.sandbox?.secondIdolUnlocked),
        candidates: getSecondIdolCandidates(state),
        produced: [...(state.sandbox?.producedIdols || [])]
      },
      side: {
        dayKey: state.tasks.side.dayKey,
        slots: state.tasks.side.slots,
        activeSlotIndex: state.tasks.side.activeSlotIndex,
        activeSlot: getActiveSideQuest(state),
        remainingToday: getSideQuestRemaining(state),
        maxPerDay: SIDE_SLOTS_PER_DAY,
        genStatus: state.tasks.side.genStatus,
        source: state.tasks.side.source
      },
      secondaryApi: { ...state.tasks.secondaryApi },
      campus: {
        dayKey: state.tasks.campus.dayKey,
        usedCount: state.tasks.campus.usedCount,
        maxPerDay: state.tasks.campus.maxPerDay,
        remainingToday: getCampusRemaining(state)
      },
      wallet: { money: state.tasks.wallet.money, fame: state.tasks.wallet.fame },
      stats: {
        stamina: state.stamina,
        stress: state.stress,
        trust: state.trust,
        relationship: getCurrentIdolRelationshipScore(state),
        Vo: state.Vo,
        Da: state.Da,
        Vi: state.Vi
      }
    };
  }

  function getQuestCompleteToast(id) {
    const map = {
      scout_temari: "担当确认，亚纱里老师阶段课题已解锁",
      scout_kotone: "担当确认，亚纱里老师阶段课题已解锁",
      scout_saki: "担当确认，亚纱里老师阶段课题已解锁",
      scout_misuzu: "担当确认，亚纱里老师阶段课题已解锁",
      scout_hiro: "担当确认，亚纱里老师阶段课题已解锁",
      scout_lilja: "担当确认，亚纱里老师阶段课题已解锁",
      temari_main_01: "课题完成：舞台唱完",
      temari_main_02: "课题完成：和美铃和好",
      temari_main_03: "课题完成：饮食与体态",
      kotone_main_01: "课题完成：告别快餐店打工",
      kotone_main_02: "课题完成：建立自信",
      kotone_main_03: "课题完成：体力修养",
      saki_main_01: "课题完成：天才的停滞感",
      saki_main_02: "课题完成：最强姐姐的谎言",
      saki_main_03: "课题完成：把私欲升华为胜利",
      misuzu_main_01: "课题完成：慢步调的野心",
      misuzu_main_02: "课题完成：温柔里的独占欲",
      misuzu_main_03: "课题完成：比太阳更高的地方",
      hiro_main_01: "课题完成：最不适合的挑战",
      hiro_main_02: "课题完成：理论与身体的落差",
      hiro_main_03: "课题完成：每天在一起的约定",
      lilja_main_01: "课题完成：自信的起点",
      lilja_main_02: "课题完成：自信的表达",
      lilja_main_03: "课题完成：自信的见证"
    };
    return map[id] || `任务完成：${MAIN_QUEST_META[id]?.title || id}`;
  }

  global.HatsuTasks = {
    MAIN_QUEST_META,
    SANDBOX_IDOL_QUEST_PACKS,
    SANDBOX_SELECTABLE_IDOLS,
    TEMARI_PERSONAL_IDS,
    KOTONE_PERSONAL_IDS,
    SAKI_PERSONAL_IDS,
    MISUZU_PERSONAL_IDS,
    HIRO_PERSONAL_IDS,
    LILJA_PERSONAL_IDS,
    THRESHOLDS,
    CAMPUS_MAX_PER_DAY,
    SIDE_SLOTS_PER_DAY,
    SIDE_HEALTHY_MEAL_TIERS,
    MAP_CHOICE_HOOKS,
    QUEST_FLAG_IDS,
    defaultTasksState,
    ensureTasksShape,
    isSandboxTasksActive,
    hasCompletedScoutQuest,
    syncSandboxMacroPhase,
    getSandboxQuestPack,
    getScoutQuestId,
    getPersonalQuestIds,
    getCampusDayKey,
    syncCampusDay,
    getCampusRemaining,
    isCampusDailyLimitReached,
    canRecordCampusAction,
    recordCampusAction,
    syncSideQuestDay,
    refreshSideQuestSlots,
    queueSideQuestRefresh,
    shouldUseSecondarySideGen,
    applyGeneratedSideQuests,
    markSideQuestGenPending,
    markSideQuestGenFailed,
    getSideQuestGenStatus,
    applySideQuestTierHints,
    markSideQuestTierGenPending,
    getSideQuestRemaining,
    setActiveSideQuest,
    getActiveSideQuest,
    getActiveSideQuestAtLocation,
    applySideQuestTier,
    activateScoutQuest,
    activateScoutQuestForIdol,
    beginSecondIdolScout,
    createConfirmedIdolTaskState,
    getSecondIdolCandidates,
    isIdolMainlineComplete,
    shouldShowMainQuestInPanel,
    syncProducedIdolsAndSecondUnlock,
    onScoutInviteComplete,
    completeScoutTemariOnLocationTalk,
    onScoutQuestCompleted,
    onScoutTemariQuestCompleted,
    activatePersonalQuests,
    syncSandboxQuestProgress,
    parseQuestCompletionsFromText,
    parseQuestFlagsFromText,
    applyQuestCompletionsFromReply,
    applyQuestFlagsFromReply,
    processSandboxMainQuestMapChoice,
    buildSandboxMainQuestPromptBlock,
    syncMainQuestSteps,
    evaluateNumericMainQuests,
    markOutstageFullSong,
    markDietPlanActive,
    markPartTimeCancelled,
    recordPraiseKotone,
    recordKotoneRestSession,
    onSandboxRestSettled,
    recordHealthyMeal,
    getTaskPanelSnapshot,
    getQuestCompleteToast
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
