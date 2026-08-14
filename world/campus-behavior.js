(function (global) {
  "use strict";

  const PRESENCE_TIER_RATE = {
    高: 0.68,
    中: 0.48,
    低: 0.3,
    很少: 0.14
  };

  const GLOBAL_PRESENCE_MULT = {
    低: 0.72,
    中: 1,
    高: 1.05
  };

  function profileSlot(locationId, publicLabel, presenceTier, altLocations, activityId) {
    return {
      locationId,
      publicLabel,
      presenceTier: presenceTier || "中",
      altLocations: altLocations || [],
      activityId: activityId || "wandering"
    };
  }

  /** 沙盒物色期：固定地面真相（位置 + 公开活动） */
  const SCOUT_OPENING_PRESENCE = {
    "月村手毬": {
      locationId: "special_education",
      activityId: "solo_training",
      publicLabel: "特教栋训练室加练，气氛很紧"
    },
    "藤田琴音": {
      locationId: "student_store",
      activityId: "part_time",
      publicLabel: "小卖部附近，像刚下班路过"
    },
    "十王星南": {
      locationId: "club_room",
      activityId: "student_council",
      publicLabel: "部室栋学生会办公室处理公务"
    },
    "雨夜燕": {
      locationId: "club_room",
      activityId: "student_council",
      publicLabel: "副会长在部室栋学生会，态度很冲"
    },
    "仓本千奈": {
      locationId: "china_home",
      facilityId: "bedroom",
      activityId: "at_home",
      publicLabel: "仓本家卧室，等待制作人来访"
    }
  };

  /** 物色期背景偶像：地图可见，暂不可搭讪 */
  const SCOUT_BACKGROUND_PRESENCE = {
    "花海咲季": {
      locationId: "playground",
      activityId: "solo_training",
      publicLabel: "自主体能训练"
    },
    "秦谷美铃": {
      locationId: "courtyard",
      activityId: "rest_tea",
      publicLabel: "中庭长椅午睡"
    },
    "筱泽广": {
      locationId: "idol_classroom",
      activityId: "group_lesson",
      publicLabel: "上课但人在后排发呆"
    },
    "葛城莉莉娅": {
      locationId: "idol_classroom",
      activityId: "group_lesson",
      publicLabel: "偶像科教室旁边的走廊，抱着教材有些拘谨"
    }
  };

  /**
   * Live 后加权 presence（依据 GKMS 平行轨 / 角色 skill 推断）
   * presenceTier: 高 / 中 / 低 / 很少
   */
  const CAMPUS_PROFILES = {
    "藤田琴音": {
      slots: {
        morning: profileSlot("idol_classroom", "赶着上课，心思还在打工和偶像上", "低", ["student_store"], "group_lesson"),
        midday: profileSlot("student_store", "小卖部打工或刚换班", "高", ["dining_hall"], "part_time"),
        afternoon: profileSlot("student_store", "打工兼自学偶像技巧", "高", ["school_entrance"], "part_time"),
        evening: profileSlot("school_entrance", "下班回宿舍路上", "中", ["student_store"], "wandering")
      }
    },
    "月村手毬": {
      slots: {
        morning: profileSlot("special_education", "特教栋早训", "高", ["gymnasium"], "solo_training"),
        midday: profileSlot("dining_hall", "勉强吃饭，常被催着休息", "中", ["special_education"], "rest_tea"),
        afternoon: profileSlot("special_education", "高强度加练，不希望被打扰", "高", ["gymnasium"], "solo_training"),
        evening: profileSlot("special_education", "加练到闭馆", "高", ["gymnasium"], "solo_training")
      }
    },
    "花海咲季": {
      slots: {
        morning: profileSlot("playground", "晨跑与体能训练", "高", ["gymnasium"], "solo_training"),
        midday: profileSlot("dining_hall", "快速用餐后看训练计划", "中", ["playground"], "rest_tea"),
        afternoon: profileSlot("playground", "自主训练，信号灯全开", "高", ["gymnasium"], "solo_training"),
        evening: profileSlot("gymnasium", "傍晚加练", "高", ["playground"], "solo_training")
      }
    },
    "紫云清夏": {
      globalPresence: "低",
      slots: {
        morning: profileSlot("idol_classroom", "翘课但偶尔露脸", "很少", ["playground"], "wandering"),
        midday: profileSlot("dining_hall", "和莉莉娅固定午餐", "中", ["student_store"], "rest_tea"),
        afternoon: profileSlot("special_education", "旁观莉莉娅练习、顺便摸鱼", "低", ["playground"], "wandering"),
        evening: profileSlot("outstage", "陪莉莉娅练台步", "低", ["dining_hall"], "rehearsal")
      }
    },
    "葛城莉莉娅": {
      slots: {
        morning: profileSlot("special_education", "特教栋偷偷练声乐", "中", ["idol_classroom"], "solo_training"),
        midday: profileSlot("dining_hall", "和清夏一起吃午饭", "中", ["student_store"], "rest_tea"),
        afternoon: profileSlot("special_education", "基础练习，怕被人听见", "高", ["idol_classroom"], "solo_training"),
        evening: profileSlot("special_education", "继续练到闭馆", "中", ["outstage"], "rehearsal")
      }
    },
    "筱泽广": {
      slots: {
        morning: profileSlot("idol_classroom", "理论课前排秒懂", "中", ["producer_classroom"], "group_lesson"),
        midday: profileSlot("dining_hall", "休息、SSD 或发呆", "中", ["idol_classroom"], "rest_tea"),
        afternoon: profileSlot("idol_classroom", "补习组或后排观察", "高", ["producer_classroom"], "group_lesson"),
        evening: profileSlot("producer_classroom", "给佑芽千奈补习", "中", ["dining_hall"], "group_lesson")
      }
    },
    "花海佑芽": {
      slots: {
        morning: profileSlot("playground", "星南带晨跑", "高", ["gymnasium"], "solo_training"),
        midday: profileSlot("club_room", "学生会午间会议或整理文件", "低", ["dining_hall"], "student_council"),
        afternoon: profileSlot("gymnasium", "追姐姐的自主训练", "高", ["playground"], "solo_training"),
        evening: profileSlot("outstage", "傍晚加练", "高", ["gymnasium"], "rehearsal")
      }
    },
    "秦谷美铃": {
      slots: {
        morning: profileSlot("courtyard", "中庭树荫下喝茶摸鱼，上课常迟到", "高", ["dining_hall"], "rest_tea"),
        midday: profileSlot("courtyard", "中庭长椅午睡续摊", "高", ["dining_hall", "student_store"], "rest_tea"),
        afternoon: profileSlot("special_education", "顺路看手毬或浅练一下", "中", ["courtyard"], "solo_training"),
        evening: profileSlot("club_room", "被拎回学生会补文件，全程犯困", "很少", ["dining_hall", "courtyard"], "student_council")
      }
    },
    "仓本千奈": {
      slots: {
        morning: profileSlot("idol_classroom", "星南基础课，硬跟进度", "高", ["producer_classroom"], "group_lesson"),
        midday: profileSlot("dining_hall", "和广、佑芽一起吃", "中", ["student_store"], "rest_tea"),
        afternoon: profileSlot("gymnasium", "基础体力课，练到想哭再继续", "高", ["idol_classroom"], "solo_training"),
        evening: profileSlot("club_room", "学生会整理会务或复盘材料", "低", ["outstage", "gymnasium"], "student_council")
      }
    },
    "十王星南": {
      slots: {
        morning: profileSlot("club_room", "学生会晨间公务", "高", ["playground"], "student_council"),
        midday: profileSlot("club_room", "公务与后辈约谈", "高", ["dining_hall"], "student_council"),
        afternoon: profileSlot("club_room", "代理培育会议", "高", ["gymnasium"], "student_council"),
        evening: profileSlot("club_room", "广播筹备或文件整理", "中", ["auditorium"], "student_council")
      }
    },
    "雨夜燕": {
      slots: {
        morning: profileSlot("club_room", "副会长备稿、训话前准备", "高", ["gymnasium"], "student_council"),
        midday: profileSlot("club_room", "学生会行政", "高", ["dining_hall"], "student_council"),
        afternoon: profileSlot("gymnasium", "独自加码练，追赶星南", "高", ["club_room"], "solo_training"),
        evening: profileSlot("club_room", "补行政或复盘", "中", ["student_store"], "student_council")
      }
    },
    "有村麻央": {
      slots: {
        morning: profileSlot("gymnasium", "宿舍长带后辈热身", "中", ["playground"], "solo_training"),
        midday: profileSlot("dining_hall", "确认后辈都好好吃饭", "中", ["club_room"], "rest_tea"),
        afternoon: profileSlot("gymnasium", "武术形体练习", "高", ["idol_classroom"], "solo_training"),
        evening: profileSlot("dining_hall", "宿舍事务与照看", "中", ["club_room"], "wandering")
      }
    },
    "姬崎莉波": {
      slots: {
        morning: profileSlot("club_room", "学生会书记整理资料", "高", ["dining_hall"], "student_council"),
        midday: profileSlot("dining_hall", "甜食招待、照顾后辈", "高", ["club_room"], "rest_tea"),
        afternoon: profileSlot("club_room", "资料会议与文书", "高", ["idol_classroom"], "student_council"),
        evening: profileSlot("dining_hall", "最后再确认大家用餐", "中", ["club_room"], "student_council")
      }
    }
  };

  function hashSeed(text) {
    return global.HatsuWorld?.eventsPool?.hashSeed?.(text) || 0;
  }

  function seededWeightedPick(list, seed, weightFn) {
    const fn = global.HatsuWorld?.eventsPool?.seededWeightedPick;
    if (typeof fn === "function") {
      return fn(list, seed, weightFn);
    }
    return list?.[0] || null;
  }

  function getTimePhase(clockMinutes) {
    const fn = global.HatsuWorld?.eventsPool?.getTimePhase;
    if (typeof fn === "function") return fn(clockMinutes);
    const m = Number(clockMinutes) || 480;
    if (m < 12 * 60) return "morning";
    if (m < 14 * 60) return "midday";
    if (m < 18 * 60) return "afternoon";
    return "evening";
  }

  function normalizeIdolName(name, canonicalFn) {
    const raw = String(name || "").trim();
    if (!raw) return "";
    return typeof canonicalFn === "function" ? canonicalFn(raw) : raw;
  }

  function isSandboxScoutPhase(state, helpers) {
    if (typeof helpers?.isSandboxScoutPhase === "function") {
      return helpers.isSandboxScoutPhase() === true;
    }
    return false;
  }

  function getEffectivePhase(state, helpers) {
    if (isSandboxScoutPhase(state, helpers)) {
      return "scout";
    }
    if (typeof helpers?.isSandboxLaunch === "function" && helpers.isSandboxLaunch()) {
      return "first_live";
    }
    const phase = state?.freeMode?.world?.macro_phase;
    return phase === "scout" ? "scout" : phase || "first_live";
  }

  function shouldUseCampusBehavior(state, helpers) {
    const phase = getEffectivePhase(state, helpers);
    return phase === "scout" || phase === "first_live";
  }

  function buildSlot(idolName, config, state, helpers, source) {
    const targetIdol = normalizeIdolName(state?.idol, helpers?.canonicalIdolName);
    return {
      locationId: config.locationId,
      facilityId: config.facilityId || "",
      activityId: config.activityId || "wandering",
      publicLabel: config.publicLabel || "",
      mood: config.mood || "",
      interactable: targetIdol ? idolName === targetIdol : Boolean(config.interactable),
      source: source || "sandbox_scout"
    };
  }

  function pickLocationFromSlot(slotConfig, seed) {
    const primary = slotConfig.locationId;
    const alts = slotConfig.altLocations || [];
    if (!primary) return "";
    if (!alts.length) return primary;
    const options = [{ id: primary, weight: 7 }];
    const altWeight = 3 / alts.length;
    alts.forEach((locationId) => {
      if (locationId) options.push({ id: locationId, weight: altWeight });
    });
    const picked = seededWeightedPick(options, seed, (item) => item.weight);
    return picked?.id || primary;
  }

  function rollProfilePresence(slotKey, idolName, slotConfig, profile) {
    const tier = slotConfig.presenceTier || "中";
    const globalMult = GLOBAL_PRESENCE_MULT[profile?.globalPresence] || 1;
    const rate = (PRESENCE_TIER_RATE[tier] || PRESENCE_TIER_RATE.中) * globalMult;
    const roll = (hashSeed(`${slotKey}:${idolName}:presence`) % 10000) / 10000;
    return roll <= rate;
  }

  function resolveScoutCampus(state, helpers) {
    const dayKey = typeof helpers?.getDayKey === "function"
      ? helpers.getDayKey(state)
      : `scout+${state?.freeMode?.postLiveDay || 1}`;
    const slots = {};
    const targetIdol = normalizeIdolName(state?.idol, helpers?.canonicalIdolName);

    Object.entries(SCOUT_OPENING_PRESENCE).forEach(([idolName, config]) => {
      slots[idolName] = buildSlot(idolName, config, state, helpers, "sandbox_scout");
    });
    Object.entries(SCOUT_BACKGROUND_PRESENCE).forEach(([idolName, config]) => {
      slots[idolName] = buildSlot(idolName, { ...config, interactable: false }, state, helpers, "sandbox_scout_bg");
      slots[idolName].interactable = false;
    });

    if (targetIdol && slots[targetIdol]) {
      Object.keys(slots).forEach((idolName) => {
        slots[idolName].interactable = idolName === targetIdol;
      });
    }

    return {
      dayKey,
      phase: "scout",
      slots
    };
  }

  function resolveProfileCampus(state, helpers) {
    const timePhase = getTimePhase(state?.freeMode?.clockMinutes);
    const dayKey = typeof helpers?.getDayKey === "function"
      ? helpers.getDayKey(state)
      : `live+${state?.freeMode?.postLiveDay || 1}`;
    const slotKey = typeof helpers?.getPresenceSlotKey === "function"
      ? helpers.getPresenceSlotKey(state)
      : `${state?.freeMode?.postLiveDay || 1}@${state?.freeMode?.clockMinutes || 480}`;
    const idolNames = helpers?.idolNames?.length
      ? helpers.idolNames
      : Object.keys(CAMPUS_PROFILES);
    const slots = {};

    idolNames.forEach((idolName) => {
      const canonical = normalizeIdolName(idolName, helpers?.canonicalIdolName);
      const profile = CAMPUS_PROFILES[canonical];
      const slotConfig = profile?.slots?.[timePhase];
      if (!canonical || !slotConfig) return;
      if (!rollProfilePresence(slotKey, canonical, slotConfig, profile)) return;

      const locationId = pickLocationFromSlot(slotConfig, `${slotKey}:${canonical}:loc`);
      slots[canonical] = {
        locationId,
        activityId: slotConfig.activityId || "wandering",
        publicLabel: slotConfig.publicLabel || "",
        mood: slotConfig.mood || "",
        interactable: true,
        source: "campus_profile"
      };
    });

    return {
      dayKey,
      phase: "first_live",
      timePhase,
      slots
    };
  }

  // 担当被你培育时，按概率陪你在制作人科教室；其余时段走她自己的日程。
  const WITH_PRODUCER_RATE = 0.3;

  function rollIdolWithProducer(slotKey, idolName) {
    const roll = (hashSeed(`${slotKey}:${idolName}:with_producer`) % 10000) / 10000;
    return roll < WITH_PRODUCER_RATE;
  }

  // 取某偶像当前时段的自然出没槽位（忽略 presence 概率，保证担当始终能被找到）。
  function getProfileSlotForIdol(idolName, state, helpers) {
    const canonical = normalizeIdolName(idolName, helpers?.canonicalIdolName);
    const profile = CAMPUS_PROFILES[canonical];
    if (!canonical || !profile) return null;
    const timePhase = getTimePhase(state?.freeMode?.clockMinutes);
    const slotConfig = profile.slots?.[timePhase];
    if (!slotConfig) return null;
    const slotKey = typeof helpers?.getPresenceSlotKey === "function"
      ? helpers.getPresenceSlotKey(state)
      : `${state?.freeMode?.postLiveDay || 1}@${state?.freeMode?.clockMinutes || 480}`;
    const locationId = pickLocationFromSlot(slotConfig, `${slotKey}:${canonical}:loc`);
    return {
      locationId,
      activityId: slotConfig.activityId || "wandering",
      publicLabel: slotConfig.publicLabel || "",
      mood: slotConfig.mood || "",
      interactable: true,
      source: "campus_profile"
    };
  }

  function resolveCampusDay(state, helpers) {
    const phase = getEffectivePhase(state, helpers);
    if (phase === "scout") return resolveScoutCampus(state, helpers);
    if (phase === "first_live") return resolveProfileCampus(state, helpers);
    return null;
  }

  function buildPresenceFromCampus(campus) {
    const presence = {};
    if (!campus?.slots) return presence;
    Object.entries(campus.slots).forEach(([idolName, slot]) => {
      if (slot?.locationId) presence[idolName] = slot.locationId;
    });
    return presence;
  }

  function applyCampusSnapshot(state, campus, slotKey) {
    if (!state.freeMode) state.freeMode = {};
    if (!state.freeMode.world) state.freeMode.world = {};
    state.freeMode.world.campus = campus;
    state.freeMode.presence = buildPresenceFromCampus(campus);
    if (slotKey) state.freeMode.presenceSlotKey = slotKey;
    return state.freeMode.presence;
  }

  function getIdolCampusSlot(state, idolName, helpers) {
    const canonical = normalizeIdolName(idolName, helpers?.canonicalIdolName);
    if (!canonical) return null;
    return state?.freeMode?.world?.campus?.slots?.[canonical] || null;
  }

  function getScoutTargetLocation(idolName, helpers) {
    const canonical = normalizeIdolName(idolName, helpers?.canonicalIdolName);
    if (!canonical) return "";
    const config = SCOUT_OPENING_PRESENCE[canonical];
    return config?.locationId || "";
  }

  function getScoutTargetFacility(idolName, helpers) {
    const canonical = normalizeIdolName(idolName, helpers?.canonicalIdolName);
    if (!canonical) return "";
    return SCOUT_OPENING_PRESENCE[canonical]?.facilityId || "";
  }

  function getLocationBehaviorLines(locationId, state) {
    const campus = state?.freeMode?.world?.campus;
    if (!campus?.slots || !locationId) return [];
    return Object.entries(campus.slots)
      .filter(([, slot]) => slot.locationId === locationId)
      .map(([idolName, slot]) => `${idolName}：${slot.publicLabel || slot.activityId}`);
  }

  function getIdolsAtLocation(locationId, state) {
    const campus = state?.freeMode?.world?.campus;
    if (!campus?.slots || !locationId) return [];
    return Object.entries(campus.slots)
      .filter(([, slot]) => slot.locationId === locationId)
      .map(([idolName, slot]) => ({ idolName, ...slot }));
  }

  function getInteractableIdolsAtLocation(locationId, state) {
    return getIdolsAtLocation(locationId, state).filter((entry) => entry.interactable);
  }

  function buildMapPresencePromptLines(locationId, state, helpers) {
    const entries = getIdolsAtLocation(locationId, state);
    if (!entries.length) {
      if (shouldUseCampusBehavior(state, helpers)) {
        return "当前该地点没有已确认到场的偶像。";
      }
      return "";
    }

    const lines = ["当前该地点在场偶像（前端已确认，请勿改判位置）："];
    entries.forEach(({ idolName, publicLabel, interactable }) => {
      const accessLabel = interactable ? "可接触" : "仅远处可见";
      lines.push(`- ${idolName}：${publicLabel || "在场"}（${accessLabel}）`);
    });

    if (getEffectivePhase(state, helpers) === "scout") {
      const targetIdol = normalizeIdolName(state?.idol, helpers?.canonicalIdolName);
      const interactable = entries.filter((entry) => entry.interactable);
      if (targetIdol && interactable.length === 1 && interactable[0].idolName === targetIdol) {
        lines.push(`物色目标：${targetIdol}。本次是与她初次接触、尝试邀请成为担当，不是已签约育成。`);
        lines.push("写作约束：不要写其他在场偶像主动加入对话；背景偶像最多作为远处掠过的一笔。");
      } else if (targetIdol) {
        lines.push(`物色目标 ${targetIdol} 今天不在这里；背景偶像仅供远观，不要写成可搭话对象。`);
      }
    } else {
      lines.push("请自然写入剧情，但不要替前端重新决定她们是否在场。");
    }

    return lines.join("\n");
  }

  /** 阶段 D：广播角度 → 关联地点（用于按 campus 快照加权） */
  const BROADCAST_ANGLE_LOCATIONS = {
    cafeteria: ["dining_hall", "student_store"],
    club_gossip: ["club_room", "gymnasium", "outstage", "auditorium"],
    student_council: ["club_room"],
    stage_preview: ["auditorium", "outstage", "gymnasium"],
    campus_routine: ["idol_classroom", "producer_classroom", "playground", "school_entrance"],
    season_overview: ["idol_classroom", "producer_classroom", "club_room"],
    practice_room: ["club_room", "gymnasium", "special_education", "outstage"],
    public_debut: ["auditorium", "outstage", "gymnasium"]
  };

  /** 阶段 D：SNS 分类 → 关联地点 */
  const BUZZ_CATEGORY_LOCATIONS = {
    food: ["dining_hall", "student_store"],
    practice_idle: ["gymnasium", "club_room", "special_education", "outstage", "playground"],
    campus_spot: ["club_room", "courtyard", "dining_hall", "playground", "gymnasium", "student_store", "school_entrance"],
    class_mood: ["idol_classroom", "producer_classroom"],
    weather_day: [],
    self_moment: [],
    petty_gossip: ["club_room", "courtyard", "dining_hall", "student_store"]
  };

  const LOCATION_LABELS = {
    school_entrance: "学园正门",
    student_store: "小卖部",
    courtyard: "中庭",
    dining_hall: "食堂",
    playground: "运动场",
    gymnasium: "体育馆",
    club_room: "部室栋",
    idol_classroom: "偶像科教室",
    producer_classroom: "制作人科教室",
    special_education: "特教栋",
    auditorium: "讲堂",
    outstage: "野外舞台",
    swimming_pool: "泳池"
  };

  const CAMPUS_PRESENCE_BOOST = 1.85;
  const CAMPUS_ABSENT_FACTOR = 0.55;
  const CAMPUS_COVISIT_BOOST = 1.25;
  const CAMPUS_ANGLE_BOOST = 2.2;

  function getCampusSnapshot(state) {
    return state?.freeMode?.world?.campus || null;
  }

  function getPresentLocationIds(state) {
    const campus = getCampusSnapshot(state);
    if (!campus?.slots) return new Set();
    const ids = new Set();
    Object.values(campus.slots).forEach((slot) => {
      if (slot?.locationId) ids.add(slot.locationId);
    });
    return ids;
  }

  function getCoVisitCount(idolName, state) {
    const campus = getCampusSnapshot(state);
    const slot = campus?.slots?.[idolName];
    if (!slot?.locationId) return 0;
    return Object.values(campus.slots).filter((entry) => entry.locationId === slot.locationId).length - 1;
  }

  function getCampusPresenceWeightMultiplier(idolName, state) {
    const campus = getCampusSnapshot(state);
    if (!campus?.slots) return 1;
    const slot = campus.slots[idolName];
    if (!slot) return CAMPUS_ABSENT_FACTOR;
    let weight = CAMPUS_PRESENCE_BOOST;
    const coVisit = getCoVisitCount(idolName, state);
    if (coVisit > 0) weight *= CAMPUS_COVISIT_BOOST;
    return weight;
  }

  function getCampusAngleWeightMultiplier(angleId, state) {
    const locations = BROADCAST_ANGLE_LOCATIONS[angleId];
    if (!locations?.length) return 1;
    const present = getPresentLocationIds(state);
    if (!present.size) return 1;
    return locations.some((locationId) => present.has(locationId)) ? CAMPUS_ANGLE_BOOST : 1;
  }

  function getCampusBuzzCategoryWeightMultiplier(categoryId, state) {
    const locations = BUZZ_CATEGORY_LOCATIONS[categoryId];
    if (!locations?.length) return 1;
    const present = getPresentLocationIds(state);
    if (!present.size) return 1;
    return locations.some((locationId) => present.has(locationId)) ? CAMPUS_ANGLE_BOOST : 1;
  }

  function getCampusSpotHint(idolName, state) {
    const slot = getCampusSnapshot(state)?.slots?.[idolName];
    if (!slot) return "";
    const place = LOCATION_LABELS[slot.locationId] || slot.locationId || "";
    const activity = slot.publicLabel || "";
    if (place && activity) return `${place} · ${activity}`;
    return activity || place;
  }

  function buildCampusDigestLines(state, limit = 6) {
    const campus = getCampusSnapshot(state);
    if (!campus?.slots) return [];
    return Object.entries(campus.slots)
      .slice(0, Math.max(1, limit))
      .map(([idolName, slot]) => {
        const place = LOCATION_LABELS[slot.locationId] || slot.locationId || "学园";
        const label = slot.publicLabel || slot.activityId || "在场";
        return `${idolName}：${label}（${place}）`;
      });
  }

  function buildCampusInjectionBlock(state, scope) {
    const lines = buildCampusDigestLines(state, scope === "broadcast" ? 8 : 5);
    if (!lines.length) return "";
    const header = scope === "sns"
      ? "今日校园动向（SNS 可参考，勿改判位置）："
      : "今日校园动向（广播/SNS 地面真相，勿改判位置）：";
    return `${header}\n${lines.map((line) => `- ${line}`).join("\n")}`;
  }

  global.HatsuWorld = global.HatsuWorld || {};
  global.HatsuWorld.campusBehavior = {
    SCOUT_OPENING_PRESENCE,
    SCOUT_BACKGROUND_PRESENCE,
    CAMPUS_PROFILES,
    PRESENCE_TIER_RATE,
    BROADCAST_ANGLE_LOCATIONS,
    BUZZ_CATEGORY_LOCATIONS,
    shouldUseCampusBehavior,
    getEffectivePhase,
    resolveCampusDay,
    resolveProfileCampus,
    getProfileSlotForIdol,
    rollIdolWithProducer,
    buildPresenceFromCampus,
    applyCampusSnapshot,
    getIdolCampusSlot,
    getScoutTargetLocation,
    getScoutTargetFacility,
    getLocationBehaviorLines,
    getIdolsAtLocation,
    getInteractableIdolsAtLocation,
    buildMapPresencePromptLines,
    getCampusSnapshot,
    getCampusPresenceWeightMultiplier,
    getCampusAngleWeightMultiplier,
    getCampusBuzzCategoryWeightMultiplier,
    getCampusSpotHint,
    buildCampusDigestLines,
    buildCampusInjectionBlock
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
