(function (global) {
  "use strict";

  const PRESENCE_FILL_RATE = 0.45;

  function ensureWorldShape(state) {
    if (!state.freeMode) state.freeMode = {};
    if (!state.freeMode.world) {
      state.freeMode.world = {
        macro_phase: "first_live",
        cast_first_live: {},
        kotone_seina_proxy: "pending",
        school_events: [],
        broadcast: { today: null, history: [], pendingRequestId: "", autoFullScript: true },
        buzz: { items: [], buzzDayKey: "", hotTopic: "" },
        dailyGen: { dayKey: "", status: "idle", source: "", pendingRequestId: "" }
      };
    }
    if (!state.freeMode.world.dailyGen) {
      state.freeMode.world.dailyGen = { dayKey: "", status: "idle", source: "", pendingRequestId: "" };
    }
    if (!state.freeMode.world.broadcast) {
      state.freeMode.world.broadcast = { today: null, history: [], pendingRequestId: "" };
    }
    if (!state.freeMode.world.buzz) {
      state.freeMode.world.buzz = { items: [], buzzDayKey: "", hotTopic: "" };
    }
    if (!Array.isArray(state.freeMode.world.buzz.items)) {
      state.freeMode.world.buzz.items = [];
    }
    if (state.freeMode.world.campus !== null && typeof state.freeMode.world.campus !== "object") {
      state.freeMode.world.campus = null;
    }
    return state.freeMode.world;
  }

  function getDayKey(state) {
    return `live+${state?.freeMode?.postLiveDay || 1}`;
  }

  function rollDailyBroadcast(state, helpers) {
    const world = ensureWorldShape(state);
    const dayKey = helpers?.getDayKey?.(state) || getDayKey(state);
    if (global.HatsuWorld?.worldGen?.shouldDeferStaticWorldRoll?.(state, dayKey)) {
      return world.broadcast.today || null;
    }
    if (world.broadcast.today?.dateKey === dayKey) return world.broadcast.today;

    const campusBehavior = global.HatsuWorld?.campusBehavior;
    if (campusBehavior?.shouldUseCampusBehavior?.(state, helpers) && !world.campus?.slots) {
      refreshWorldPresence(state, helpers);
    }

    const eventsPool = global.HatsuWorld?.eventsPool;
    const castTrack = global.HatsuWorld?.castTrack;
    const plan = eventsPool?.composeDailyBroadcastEpisode?.(state, dayKey, helpers, castTrack)
      || {
        host: "真诚优",
        topicId: "campus_daily_campus_routine",
        categoryId: "campus_daily",
        categoryLabel: "学园日常",
        title: "本周学园概况",
        brief: "日常广播",
        hooks: [],
        guests: [],
        outline: "主持：真诚优\n本期主题：本周学园概况"
      };

    const episode = {
      id: `${dayKey}_${plan.topicId}`,
      dateKey: dayKey,
      host: plan.host,
      topicId: plan.topicId,
      categoryId: plan.categoryId,
      categoryLabel: plan.categoryLabel,
      angleId: plan.angleId,
      title: plan.title,
      brief: plan.brief,
      hooks: plan.hooks || [],
      meta: plan.meta || {},
      guests: plan.guests || [],
      outline: plan.outline,
      fullScript: "",
      scriptStatus: "idle",
      heard: false,
      createdAt: Date.now()
    };

    if (world.broadcast.today) {
      world.broadcast.history = [world.broadcast.today, ...(world.broadcast.history || [])].slice(0, 14);
    }
    world.broadcast.today = episode;
    return episode;
  }

  function applyUserProducingCampusOverride(state, campus, helpers) {
    if (campus?.phase === "scout") return;
    const castTrack = global.HatsuWorld?.castTrack;
    const campusBehavior = global.HatsuWorld?.campusBehavior;
    const canonicalFn = helpers?.canonicalIdolName;
    const currentIdol = typeof canonicalFn === "function"
      ? canonicalFn(state?.idol)
      : state?.idol;
    if (!currentIdol || !campus?.slots) return;

    const status = castTrack?.getCastFirstLiveStatus?.(currentIdol, state, canonicalFn);
    if (status !== "user_producing") return;

    // 物色期已结束、由你培育时：大部分时段担当走自己的日程，只在部分时段陪你在制作人科教室，
    // 避免签约后担当被钉死在制作人科教室。同时保证担当始终能在地图上被找到。
    const slotKey = campus.slotKey || helpers?.getPresenceSlotKey?.(state) || getDayKey(state);
    const withProducer = campusBehavior?.rollIdolWithProducer?.(slotKey, currentIdol);
    if (withProducer) {
      campus.slots[currentIdol] = {
        locationId: "producer_classroom",
        activityId: "group_lesson",
        publicLabel: "与制作人一同在制作人科教室",
        interactable: true,
        source: "user_producing"
      };
      return;
    }

    const naturalSlot = campusBehavior?.getProfileSlotForIdol?.(currentIdol, state, helpers);
    if (naturalSlot?.locationId) {
      campus.slots[currentIdol] = naturalSlot;
    } else if (!campus.slots[currentIdol]) {
      // 没有可用的自然日程时退回旧行为，确保担当仍可被找到。
      campus.slots[currentIdol] = {
        locationId: "producer_classroom",
        activityId: "group_lesson",
        publicLabel: "与制作人一同在制作人科教室",
        interactable: true,
        source: "user_producing"
      };
    }
  }

  function refreshWorldPresence(state, helpers) {
    ensureWorldShape(state);
    const campusBehavior = global.HatsuWorld?.campusBehavior;
    const slotKey = helpers?.getPresenceSlotKey?.(state) || getDayKey(state);

    if (campusBehavior?.shouldUseCampusBehavior?.(state, helpers)) {
      const campus = campusBehavior.resolveCampusDay(state, helpers);
      if (campus) {
        campus.slotKey = slotKey;
        applyUserProducingCampusOverride(state, campus, helpers);
        campusBehavior.applyCampusSnapshot(state, campus, slotKey);
        const castTrack = global.HatsuWorld?.castTrack;
        castTrack?.rebuildCastFirstLiveCache?.(state, helpers?.idolNames || [], helpers?.canonicalIdolName);
        return state.freeMode.presence;
      }
    }

    const eventsPool = global.HatsuWorld?.eventsPool;
    const castTrack = global.HatsuWorld?.castTrack;
    const canonicalFn = helpers?.canonicalIdolName;
    const idolNames = helpers?.idolNames || [];
    const presence = {};

    idolNames.forEach((name) => {
      const idol = typeof canonicalFn === "function" ? canonicalFn(name) : name;
      if (!idol) return;
      const seed = eventsPool?.hashSeed?.(`${slotKey}:${idol}`) || 0;
      const roll = (seed % 1000) / 1000;
      if (roll > PRESENCE_FILL_RATE) return;

      const status = castTrack?.getCastFirstLiveStatus?.(idol, state, canonicalFn);
      const isCurrentIdol = idol === (typeof canonicalFn === "function" ? canonicalFn(state?.idol) : state?.idol);
      if (status === "user_producing" && isCurrentIdol
        && campusBehavior?.rollIdolWithProducer?.(slotKey, idol)) {
        presence[idol] = "producer_classroom";
        return;
      }

      const loc = eventsPool?.pickPresenceLocation?.(idol, state);
      if (loc) presence[idol] = loc;
    });

    state.freeMode.presence = presence;
    state.freeMode.presenceSlotKey = slotKey;
    state.freeMode.world.campus = null;
    if (castTrack?.rebuildCastFirstLiveCache) {
      castTrack.rebuildCastFirstLiveCache(state, idolNames, canonicalFn);
    }
    return presence;
  }

  function rollDailyBuzz(state, helpers) {
    const world = ensureWorldShape(state);
    const dayKey = helpers?.getDayKey?.(state) || getDayKey(state);
    if (global.HatsuWorld?.worldGen?.shouldDeferStaticWorldRoll?.(state, dayKey)) {
      return world.buzz?.items || [];
    }
    const campusBehavior = global.HatsuWorld?.campusBehavior;
    if (campusBehavior?.shouldUseCampusBehavior?.(state, helpers) && !world.campus?.slots) {
      refreshWorldPresence(state, helpers);
    }
    const episode = world.broadcast?.today;
    return global.HatsuWorld?.buzzPool?.rollDailyBuzz?.(state, {
      ...helpers,
      getDayKey: (s) => helpers?.getDayKey?.(s) || getDayKey(s)
    }, episode) || world.buzz?.items || [];
  }

  function runFreeModeDailyTick(state, helpers) {
    refreshWorldPresence(state, helpers);
    rollDailyBroadcast(state, helpers);
    rollDailyBuzz(state, helpers);
  }

  function defaultWorldState() {
    return {
      macro_phase: "first_live",
      cast_first_live: {},
      kotone_seina_proxy: "pending",
      school_events: [],
      campus: null,
      broadcast: { today: null, history: [], pendingRequestId: "", autoFullScript: true },
      buzz: { items: [], buzzDayKey: "", hotTopic: "" },
      dailyGen: { dayKey: "", status: "idle", source: "", pendingRequestId: "" }
    };
  }

  global.HatsuWorld = global.HatsuWorld || {};
  global.HatsuWorld.dailyTick = {
    ensureWorldShape,
    rollDailyBroadcast,
    rollDailyBuzz,
    refreshWorldPresence,
    runFreeModeDailyTick,
    defaultWorldState,
    getDayKey,
    PRESENCE_FILL_RATE
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
