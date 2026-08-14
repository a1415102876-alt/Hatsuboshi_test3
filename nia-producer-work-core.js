(function (root) {
  "use strict";

  const PERIODS = Object.freeze([
    { id: "morning", label: "上午" },
    { id: "afternoon", label: "下午" },
    { id: "evening", label: "傍晚" }
  ]);
  const TASK_CATEGORIES = new Set(["external", "online", "management", "training"]);
  const REACTION_FANS = Object.freeze({ flat: 40, normal: 120, good: 240, popular: 400 });

  function objectValue(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function text(value, limit = 500) {
    return String(value || "").trim().slice(0, limit);
  }

  function integer(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
    const number = Number(value);
    if (!Number.isFinite(number)) return min;
    return Math.min(max, Math.max(min, Math.floor(number)));
  }

  function stringList(value, max = 8, limit = 180) {
    return Array.isArray(value)
      ? value.map((item) => text(item, limit)).filter(Boolean).slice(0, max)
      : [];
  }

  function uniqueStrings(existing, added, max = 40) {
    return [...new Set([...stringList(existing, max), ...stringList(added, max)])].slice(-max);
  }

  function normalizeBriefing(raw) {
    const source = objectValue(raw);
    return {
      situation: text(source.situation, 500),
      facts: stringList(source.facts, 8, 220),
      constraints: stringList(source.constraints, 6, 220)
    };
  }

  function normalizePhase(raw, index = 0) {
    const source = objectValue(raw);
    return {
      id: text(source.id, 80) || `phase-${index + 1}`,
      label: text(source.label, 100) || `阶段 ${index + 1}`,
      required: source.required !== false,
      fixedPeriod: PERIODS.some((period) => period.id === source.fixedPeriod) ? source.fixedPeriod : "",
      briefing: normalizeBriefing(source.briefing),
      presets: stringList(source.presets, 4, 220)
    };
  }

  function normalizeTask(raw, index = 0) {
    const source = objectValue(raw);
    const phases = Array.isArray(source.phases) && source.phases.length
      ? source.phases.slice(0, 3).map(normalizePhase)
      : [normalizePhase({ id: "execute", label: "执行", briefing: source.briefing, presets: source.presets })];
    const completedPhases = stringList(source.completedPhases, 3, 80);
    return {
      id: text(source.id, 80) || `work-task-${index + 1}`,
      category: TASK_CATEGORIES.has(source.category) ? source.category : "management",
      priority: ["core", "followup", "optional", "emergency", "companion"].includes(source.priority)
        ? source.priority
        : "optional",
      title: text(source.title, 120) || "制作人待办",
      deadline: text(source.deadline, 80) || "本工作日",
      goal: text(source.goal, 240),
      background: text(source.background, 500),
      constraints: stringList(source.constraints, 6, 220),
      assets: stringList(source.assets, 8, 180),
      boundaries: stringList(source.boundaries, 6, 220),
      expectedOutput: text(source.expectedOutput, 180),
      outputType: text(source.outputType, 80),
      durationPeriods: integer(source.durationPeriods, 1, 3),
      phases,
      completedPhases,
      status: ["available", "in_progress", "completed", "deferred", "expired"].includes(source.status)
        ? source.status
        : (completedPhases.length ? "in_progress" : "available"),
      nextBriefing: normalizeBriefing(source.nextBriefing)
    };
  }

  function normalizePeriod(raw, index = 0) {
    const source = objectValue(raw);
    const template = PERIODS[index] || PERIODS[0];
    return {
      id: template.id,
      label: template.label,
      taskId: text(source.taskId, 80),
      phaseId: text(source.phaseId, 80),
      fixed: Boolean(source.fixed),
      status: ["open", "ready", "generating", "retryable_failed", "completed"].includes(source.status)
        ? source.status
        : (source.taskId ? "ready" : "open"),
      summary: text(source.summary, 300)
    };
  }

  function defaultRuntime() {
    return {
      status: "idle",
      dayIndex: 0,
      periodIndex: 0,
      periods: PERIODS.map((period) => ({ ...period, taskId: "", phaseId: "", fixed: false, status: "open", summary: "" })),
      tasks: [],
      backlog: [],
      documents: [],
      materials: [],
      contacts: [],
      terms: [],
      careerLog: [],
      risks: [],
      pendingDecision: null,
      activeRequest: null,
      processedOperationIds: [],
      processedReceiptIds: [],
      trainingSettled: false,
      radioPlan: null,
      radioSettledBusinessId: "",
      lastStory: "",
      lastError: "",
      updatedAt: 0
    };
  }

  function normalizeRequest(raw) {
    const source = objectValue(raw);
    const value = {
      requestId: text(source.requestId, 160),
      channelLeaseId: text(source.channelLeaseId, 160),
      turnId: text(source.turnId, 160),
      saveScope: text(source.saveScope, 300),
      sessionEpoch: text(source.sessionEpoch, 160),
      operationId: text(source.operationId, 160),
      receiptId: text(source.receiptId, 160),
      taskId: text(source.taskId, 80),
      phaseId: text(source.phaseId, 80),
      periodId: text(source.periodId, 40)
    };
    return value.requestId && value.channelLeaseId && value.turnId ? value : null;
  }

  function normalizeProducerWork(raw, idolName = "") {
    const defaults = defaultRuntime();
    const source = objectValue(raw);
    const replacement = String(idolName || source.idolName || source.idol || "").trim();
    const replaceIdolName = (value) => replacement
      ? JSON.parse(JSON.stringify(value), (key, item) => (
          typeof item === "string" ? item.replaceAll("咲季", replacement) : item
        ))
      : value;
    const tasks = Array.isArray(source.tasks) ? source.tasks.slice(0, 4).map(normalizeTask).map(replaceIdolName) : [];
    return {
      status: ["idle", "planning", "active", "generating", "retryable_failed", "complete"].includes(source.status)
        ? source.status
        : defaults.status,
      dayIndex: integer(source.dayIndex, 0, 20),
      periodIndex: integer(source.periodIndex, 0, 3),
      periods: PERIODS.map((period, index) => normalizePeriod(source.periods?.[index], index)),
      tasks,
      backlog: Array.isArray(source.backlog) ? source.backlog.slice(0, 12).map(normalizeTask).map(replaceIdolName) : [],
      documents: stringList(source.documents, 40, 220),
      materials: stringList(source.materials, 40, 220),
      contacts: stringList(source.contacts, 40, 220),
      terms: stringList(source.terms, 40, 240),
      careerLog: stringList(source.careerLog, 40, 240),
      risks: stringList(source.risks, 20, 220),
      pendingDecision: source.pendingDecision ? {
        taskId: text(source.pendingDecision.taskId, 80),
        phaseId: text(source.pendingDecision.phaseId, 80),
        periodId: text(source.pendingDecision.periodId, 40),
        preset: text(source.pendingDecision.preset, 220),
        freeText: text(source.pendingDecision.freeText, 1200)
      } : null,
      activeRequest: normalizeRequest(source.activeRequest),
      processedOperationIds: stringList(source.processedOperationIds, 20, 160),
      processedReceiptIds: stringList(source.processedReceiptIds, 20, 160),
      trainingSettled: Boolean(source.trainingSettled),
      radioPlan: source.radioPlan ? normalizeRadioPlan(source.radioPlan) : null,
      radioSettledBusinessId: text(source.radioSettledBusinessId, 160),
      lastStory: text(source.lastStory, 10000),
      lastError: text(source.lastError, 500),
      updatedAt: Math.max(0, Number(source.updatedAt) || 0)
    };
  }

  function sakiFallbackTasks(idolName = "咲季") {
    const idol = String(idolName || "担当偶像").trim() || "担当偶像";
    return [
      normalizeTask({
        id: "radio-department-plan",
        category: "management",
        priority: "optional",
        title: "广播部企划",
        deadline: "广播营业前",
        goal: "为《初星放送部》确定一期可执行的访谈主题与采访重点。",
        background: "真诚优主持的校园广播节目可作为新人偶像的初期公开亮相机会。",
        constraints: ["企划占用一个工作时段", "主持人固定为真诚优", "最终营业必须沿用同一 business_id"],
        assets: ["本轮公开形象企划", "担当偶像的近期经历"],
        boundaries: ["不预写听众来信的具体内容", "不替偶像决定临场回应"],
        expectedOutput: "radio_plan",
        outputType: "radio_plan",
        durationPeriods: 1,
        phases: [{
          id: "draft-radio-plan",
          label: "制定广播部企划",
          briefing: {
            situation: "需要向广播部提交本期节目主题、嘉宾资料和访谈重点。",
            facts: ["节目主持人为真诚优", "嘉宾为当前担当偶像"],
            constraints: ["只完成一期企划", "保留节目中的临场发挥空间"]
          },
          presets: ["从近期训练切入", "从公众印象反差切入", "从听众最关心的疑问切入"]
        }]
      }),
      normalizeTask({
        id: "saki-variety-negotiation",
        category: "external",
        priority: "core",
        title: "新人偶像综艺出演洽谈",
        deadline: "今日下午",
        goal: "争取能够展现咲季竞争心，并允许使用企划素材的正式出演机会。",
        background: "新人偶像竞技综艺正在寻找胜负欲强、现场反应鲜明的出演者。节目组愿意听取制作人的提案。",
        constraints: ["正式面谈固定在下午", "节目组需要明确的节目效果", "准备阶段可以跳过，但会失去提案材料"],
        assets: ["咲季的基础能力档案", "本轮公开形象企划"],
        boundaries: ["不要求咲季故意装弱", "不以刻意卖萌作为唯一卖点"],
        expectedOutput: "出演条款与后续节目简报",
        phases: [
          {
            id: "prepare",
            label: "准备出演提案",
            required: false,
            briefing: {
              situation: "面谈前还有时间整理咲季的推介重点与不可退让项。",
              facts: ["节目以新人之间的竞技环节为主", "节目组重视选手的即时反应"],
              constraints: ["提案必须说明观众能看到什么", "不能替咲季承诺尚未确认的表演"]
            },
            presets: ["强调咲季的竞技能力与胜负欲", "以实力为主、自然反差为辅", "先明确不可使用的素材与环节"]
          },
          {
            id: "meeting",
            label: "电视台正式面谈",
            required: true,
            fixedPeriod: "afternoon",
            briefing: {
              situation: "节目组愿意讨论出演，但希望制作人给出咲季能制造何种节目看点。",
              facts: ["核心环节会安排临场竞技", "节目预告需要一项鲜明的人物记忆点"],
              constraints: ["今天必须答复", "最终条款会影响后续训练与宣传"]
            },
            presets: ["争取竞技主环节并保留自然反应", "接受反差宣传但要求安排实力展示", "缩小宣传承诺，优先确保正式出演"]
          }
        ]
      }),
      normalizeTask({
        id: "saki-vlog-prep",
        category: "online",
        priority: "optional",
        title: "自律生活Vlog发布准备",
        deadline: "两日内",
        goal: "选择第一期公开素材与呈现角度，为后续营业建立观众预期。",
        background: "企划需要让观众同时看见咲季的实力和自然可爱，但目前素材仍以训练记录为主。",
        constraints: ["只能使用实际持有的素材", "发布内容会形成后续节目可引用的公开印象"],
        assets: ["训练后的整理片段", "营养餐讲解片段", "被真诚夸奖后的反应片段"],
        boundaries: ["不剪辑成故意出丑", "不得伪造咲季本人发言"],
        expectedOutput: "Vlog草稿、发布角度与评论处理方针",
        phases: [{
          id: "prepare-post",
          label: "准备Vlog",
          briefing: {
            situation: "需要从现有素材中确定第一期Vlog的主角度和发布语气。",
            facts: ["训练素材最完整", "反差片段最接近本轮公众形象"],
            constraints: ["普通发布只能带来有限即时粉丝", "内容会被节目组和观众持续引用"]
          },
          presets: ["以自律实力为主，保留一处自然反差", "采用制作团队观察视角", "先形成草稿并让咲季确认"]
        }]
      }),
      normalizeTask({
        id: "saki-location-plan",
        category: "management",
        priority: "optional",
        title: "商店街Vlog取材方案",
        deadline: "外出前",
        goal: "确定候选镜头、隐私边界和许可清单，但不替玩家规定外出地点与行动。",
        background: "生活素材可能补足训练Vlog的距离感，但取材内容仍应服从玩家当天的外出选择。",
        constraints: ["本任务只形成内部方案", "场地许可必须另行接洽", "外出的具体地点和话题保持开放"],
        assets: ["商店街候选店铺资料", "现有Vlog素材缺口"],
        boundaries: ["不预设咲季当天会自然流露何种反应"],
        expectedOutput: "取材优先级与许可申请清单",
        phases: [{
          id: "draft-location-plan",
          label: "整理取材方案",
          briefing: {
            situation: "需要决定若外出中出现合适机会，哪些生活镜头值得记录。",
            facts: ["目前缺少轻松生活素材", "部分商店需要提前申请拍摄许可"],
            constraints: ["不能把外出变成强制拍摄行程", "本阶段不能写成已取得许可"]
          },
          presets: ["只列素材缺口，不指定外出地点", "优先整理隐私与路人处理规则", "形成可随当天选择调整的轻量方案"]
        }]
      }),
      normalizeTask({
        id: "online-live-plan",
        category: "online",
        priority: "optional",
        title: "网络直播企划",
        deadline: "直播营业前",
        goal: "确定本轮直播的主题、公开素材、互动方向与不可触碰的边界。",
        background: "本轮日程已经安排网络直播，必须先把企划目标转化为可以执行的直播简报。",
        constraints: ["企划占用一个工作时段", "直播必须沿用本轮公开形象方向", "不预写观众的具体反应"],
        assets: ["本轮公开形象企划", "担当偶像的近期训练与生活素材"],
        boundaries: ["不替偶像决定全部临场发言", "不通过伪造事故制造节目效果"],
        expectedOutput: "网络直播主题、素材清单、互动方针与风险边界",
        outputType: "online_live_plan",
        durationPeriods: 1,
        phases: [{
          id: "draft-online-live-plan",
          label: "制定网络直播企划",
          briefing: {
            situation: "需要在直播营业前完成一份可供现场执行的节目简报。",
            facts: ["直播主题必须服务本轮公众印象", "现场互动仍要保留偶像的真实反应"],
            constraints: ["只确定企划与边界", "不提前生成直播正文或观众评论"]
          },
          presets: ["从近期训练与生活素材切入", "围绕本轮公众印象设计特别企划", "先确定互动边界与风险预案"]
        }]
      }),
      normalizeTask({
        id: "saki-companion-training",
        category: "training",
        priority: "companion",
        title: "陪同咲季训练",
        deadline: "今日",
        goal: "观察并推进当前企划需要解决的一个具体训练问题。",
        background: "若不安排陪同，咲季会按照自己的训练计划完成稳定的自主训练。",
        constraints: ["工作日最多安排一次", "价值在于针对性指导而非重复结算基础成长"],
        expectedOutput: "训练观察与针对性进展",
        phases: [{
          id: "companion",
          label: "陪同训练",
          briefing: {
            situation: "咲季准备进行自主训练，制作人可以选择留下观察并提供针对性帮助。",
            facts: ["她的基础能力扎实", "当前难点应与本轮公开活动相连"],
            constraints: ["只能推进一个具体问题", "不得直接写成彻底解决"]
          },
          presets: ["观察她面对镜头时过度紧绷的问题", "针对近期训练暴露的一个具体弱点进行反复练习", "先询问她今天最在意的训练难点"]
        }]
      })
    ].map((task) => JSON.parse(JSON.stringify(task), (key, value) => (
      typeof value === "string" ? value.replaceAll("咲季", idol) : value
    )));
  }

  function applyFixedAppointments(runtime) {
    const tasks = runtime.tasks;
    const coreExternalTask = tasks.find((task) => task.category === "external" && task.priority === "core")
      || tasks.find((task) => task.category === "external");
    const coreMeetingPhase = coreExternalTask?.phases.find((phase) => phase.fixedPeriod === "afternoon")
      || coreExternalTask?.phases.find((phase) => phase.required)
      || coreExternalTask?.phases.at(-1);
    if (coreMeetingPhase) coreMeetingPhase.fixedPeriod = "afternoon";

    PERIODS.forEach((period, index) => {
      const appointments = tasks.flatMap((task) => task.phases
        .filter((phase) => phase.fixedPeriod === period.id)
        .map((phase) => ({ task, phase })));
      const appointment = appointments.find(({ task }) => task.id === coreExternalTask?.id)
        || appointments.find(({ task }) => task.priority === "core")
        || appointments[0];
      if (!appointment) return;
      runtime.periods[index] = {
        ...runtime.periods[index],
        taskId: appointment.task.id,
        phaseId: appointment.phase.id,
        fixed: true,
        status: "ready"
      };
    });
    return runtime;
  }

  function reconcileFixedAppointments(raw) {
    const runtime = normalizeProducerWork(raw);
    if (runtime.status !== "planning") return runtime;
    return applyFixedAppointments(runtime);
  }

  function reconcileBusinessRequirements(raw, options = {}) {
    const runtime = normalizeProducerWork(raw);
    if (runtime.status !== "planning") return runtime;
    const requiredIds = [
      options.requireRadioPlan ? "radio-department-plan" : "",
      options.requireOnlineLivePlan ? "online-live-plan" : ""
    ].filter(Boolean);
    const fallbackTasks = sakiFallbackTasks(options.idolName);
    requiredIds.forEach((taskId) => {
      if (runtime.tasks.some((task) => task.id === taskId)) return;
      const requiredTask = fallbackTasks.find((task) => task.id === taskId);
      if (!requiredTask) return;
      if (runtime.tasks.length < 4) {
        runtime.tasks.push(requiredTask);
        return;
      }
      const protectedExternal = runtime.tasks.find((task) => task.category === "external" && task.priority === "core")
        || runtime.tasks.find((task) => task.category === "external");
      const candidate = runtime.tasks.findLast((task) => (
        task.id !== protectedExternal?.id
        && task.priority !== "companion"
        && !requiredIds.includes(task.id)
        && !runtime.periods.some((period) => period.fixed && period.taskId === task.id)
      ));
      if (!candidate) return;
      runtime.periods.forEach((period) => {
        if (period.taskId === candidate.id && !period.fixed) {
          period.taskId = "";
          period.phaseId = "";
          period.status = "open";
          period.summary = "";
        }
      });
      runtime.tasks.splice(runtime.tasks.findIndex((task) => task.id === candidate.id), 1, requiredTask);
    });
    runtime.updatedAt = Date.now();
    return applyFixedAppointments(runtime);
  }

  function createSakiRoundOneWorkday(planDay = {}) {
    const fallbackTasks = sakiFallbackTasks(planDay.idol || planDay.idolName);
    const seedTasks = Array.isArray(planDay?.workSeed?.tasks) && planDay.workSeed.tasks.length
      ? planDay.workSeed.tasks.slice(0, 3).map(normalizeTask)
      : fallbackTasks.filter((task) => task.priority !== "companion");
    const filledTasks = [...seedTasks.filter((task) => task.priority !== "companion")];
    fallbackTasks.filter((task) => task.priority !== "companion").forEach((task) => {
      if (filledTasks.length < 3 && !filledTasks.some((item) => item.id === task.id)) filledTasks.push(task);
    });
    filledTasks.splice(3);
    if (planDay?.requiresRadioPlan && !filledTasks.some((task) => task.id === "radio-department-plan")) {
      const radioTask = fallbackTasks.find((task) => task.id === "radio-department-plan");
      const protectedAppointment = filledTasks.find((task) => task.category === "external" && task.priority === "core")
        || filledTasks.find((task) => task.category === "external");
      const replaceIndex = filledTasks.findLastIndex((task) => task.id !== protectedAppointment?.id);
      if (radioTask && replaceIndex >= 0) filledTasks.splice(replaceIndex, 1, radioTask);
      else if (radioTask && filledTasks.length < 3) filledTasks.push(radioTask);
    }
    if (planDay?.requiresOnlineLivePlan && !filledTasks.some((task) => task.id === "online-live-plan")) {
      const liveTask = fallbackTasks.find((task) => task.id === "online-live-plan");
      const protectedAppointment = filledTasks.find((task) => task.category === "external" && task.priority === "core")
        || filledTasks.find((task) => task.category === "external");
      const replaceIndex = filledTasks.findLastIndex((task) => task.id !== protectedAppointment?.id && task.id !== "radio-department-plan");
      if (liveTask && replaceIndex >= 0) filledTasks.splice(replaceIndex, 1, liveTask);
      else if (liveTask && filledTasks.length < 3) filledTasks.push(liveTask);
    }
    const companion = fallbackTasks.find((task) => task.priority === "companion");
    const tasks = [...filledTasks.slice(0, 3), companion];
    const runtime = normalizeProducerWork({
      status: "planning",
      dayIndex: integer(planDay?.day, 1, 20) - 1,
      tasks,
      periods: PERIODS.map((period) => ({ ...period }))
    });
    return applyFixedAppointments(runtime);
  }

  function findPhase(runtime, taskId, phaseId) {
    const task = runtime.tasks.find((item) => item.id === taskId);
    const phase = task?.phases.find((item) => item.id === phaseId);
    return { task, phase };
  }

  function assignTaskToPeriod(raw, taskId, periodId, phaseId = "") {
    const runtime = normalizeProducerWork(raw);
    const periodIndex = PERIODS.findIndex((period) => period.id === periodId);
    if (periodIndex < runtime.periodIndex || periodIndex < 0) return { ok: false, reason: "period_unavailable", runtime };
    const period = runtime.periods[periodIndex];
    if (period.fixed || period.status === "completed" || period.status === "generating") return { ok: false, reason: "period_locked", runtime };
    const task = runtime.tasks.find((item) => item.id === taskId);
    if (!task || ["completed", "expired"].includes(task.status)) return { ok: false, reason: "task_unavailable", runtime };
    const phase = task.phases.find((item) => item.id === phaseId)
      || task.phases.find((item) => !item.fixedPeriod && !task.completedPhases.includes(item.id))
      || task.phases.find((item) => !task.completedPhases.includes(item.id));
    if (!phase || phase.fixedPeriod) return { ok: false, reason: "phase_unavailable", runtime };
    if (task.category === "training" && runtime.periods.some((item) => item.taskId === task.id && item.id !== periodId)) {
      return { ok: false, reason: "training_already_assigned", runtime };
    }
    const fixedIndex = task.phases.reduce((result, item) => {
      const index = PERIODS.findIndex((periodItem) => periodItem.id === item.fixedPeriod);
      return index >= 0 ? index : result;
    }, -1);
    if (fixedIndex >= 0 && periodIndex >= fixedIndex) return { ok: false, reason: "preparation_must_precede_appointment", runtime };
    runtime.periods.forEach((item) => {
      if (!item.fixed && item.taskId === task.id && item.phaseId === phase.id && item.status !== "completed") {
        item.taskId = "";
        item.phaseId = "";
        item.status = "open";
      }
    });
    runtime.periods[periodIndex] = { ...period, taskId: task.id, phaseId: phase.id, status: "ready" };
    runtime.updatedAt = Date.now();
    return { ok: true, runtime };
  }

  function clearFutureAssignment(raw, periodId) {
    const runtime = normalizeProducerWork(raw);
    const index = PERIODS.findIndex((period) => period.id === periodId);
    const period = runtime.periods[index];
    if (index < runtime.periodIndex || !period || period.fixed || period.status === "completed" || period.status === "generating") {
      return { ok: false, reason: "period_locked", runtime };
    }
    runtime.periods[index] = { ...period, taskId: "", phaseId: "", status: "open", summary: "" };
    runtime.updatedAt = Date.now();
    return { ok: true, runtime };
  }

  function validateWorkSchedule(raw, options = {}) {
    const runtime = normalizeProducerWork(raw);
    if (!runtime.periods.every((period) => period.taskId && period.phaseId)) {
      return { ok: false, reason: "incomplete_schedule", runtime };
    }
    if (options.requireRadioPlan) {
      const radioTask = runtime.tasks.find((task) => task.id === "radio-department-plan");
      const completed = radioTask?.status === "completed";
      const assigned = runtime.periods.some((period) => period.taskId === "radio-department-plan");
      if (!completed && !assigned) return { ok: false, reason: "radio_plan_required", runtime };
    }
    if (options.requireOnlineLivePlan) {
      const liveTask = runtime.tasks.find((task) => task.id === "online-live-plan");
      const completed = liveTask?.status === "completed";
      const assigned = runtime.periods.some((period) => period.taskId === "online-live-plan");
      if (!completed && !assigned) return { ok: false, reason: "online_live_plan_required", runtime };
    }
    return { ok: true, runtime };
  }

  function getCurrentPeriod(raw) {
    const runtime = normalizeProducerWork(raw);
    return runtime.periods[runtime.periodIndex] || null;
  }

  function getAssignedTask(raw, periodId) {
    const runtime = normalizeProducerWork(raw);
    const period = runtime.periods.find((item) => item.id === periodId);
    if (!period?.taskId) return null;
    const { task, phase } = findPhase(runtime, period.taskId, period.phaseId);
    return task && phase ? { task, phase, period } : null;
  }

  function getOnlineFanDelta(reaction) {
    return REACTION_FANS[reaction] || 0;
  }

  function applyWorkReceipt(raw, receipt = {}) {
    const runtime = normalizeProducerWork(raw);
    const receiptId = text(receipt.receiptId, 160);
    if (!receiptId) return { ok: false, reason: "missing_receipt_id", runtime };
    if (runtime.processedReceiptIds.includes(receiptId)) return { ok: true, duplicate: true, runtime };
    const period = runtime.periods[runtime.periodIndex];
    if (!period || period.id !== receipt.periodId || period.taskId !== receipt.taskId || period.phaseId !== receipt.completedPhase) {
      return { ok: false, reason: "receipt_context_mismatch", runtime };
    }
    const { task, phase } = findPhase(runtime, period.taskId, period.phaseId);
    if (!task || !phase) return { ok: false, reason: "missing_task_phase", runtime };
    period.status = "completed";
    period.summary = text(receipt.summary, 300);
    task.completedPhases = uniqueStrings(task.completedPhases, [phase.id], 3);
    task.nextBriefing = normalizeBriefing(receipt.nextBriefing);
    const requiredIds = task.phases.filter((item) => item.required).map((item) => item.id);
    if (requiredIds.every((id) => task.completedPhases.includes(id))) task.status = "completed";
    else task.status = "in_progress";
    runtime.documents = uniqueStrings(runtime.documents, receipt.documents);
    runtime.materials = uniqueStrings(runtime.materials, receipt.materials);
    runtime.contacts = uniqueStrings(runtime.contacts, receipt.contacts);
    runtime.terms = uniqueStrings(runtime.terms, receipt.terms);
    runtime.careerLog = uniqueStrings(runtime.careerLog, receipt.careerLog);
    runtime.risks = uniqueStrings(runtime.risks.filter((item) => !stringList(receipt.risksResolved).includes(item)), receipt.risksAdded, 20);
    runtime.backlog = [...runtime.backlog, ...(Array.isArray(receipt.followUps) ? receipt.followUps.map(normalizeTask) : [])].slice(-12);
    if (task.outputType === "radio_plan" || task.id === "radio-department-plan") {
      const plan = normalizeRadioPlan(receipt.radioPlan);
      if (plan.business_id) runtime.radioPlan = plan;
    }
    runtime.processedReceiptIds = uniqueStrings(runtime.processedReceiptIds, [receiptId], 20);
    runtime.periodIndex = Math.min(3, runtime.periodIndex + 1);
    runtime.status = runtime.periodIndex >= 3 ? "complete" : "active";
    runtime.pendingDecision = null;
    runtime.activeRequest = null;
    runtime.lastStory = text(receipt.story, 10000);
    runtime.lastError = "";
    runtime.updatedAt = Date.now();
    return { ok: true, duplicate: false, runtime };
  }

  function resolveBusinessPreparation(raw, businessType, planDay = {}) {
    const runtime = normalizeProducerWork(raw);
    if (businessType === "school_radio") {
      const existing = normalizeRadioPlan(runtime.radioPlan);
      if (existing.business_id && runtime.radioSettledBusinessId === existing.business_id) {
        return { ok: false, reason: "radio_already_settled" };
      }
      const task = runtime.tasks.find((item) => item.id === "radio-department-plan" && item.status === "completed");
      if (!task) return { ok: false, reason: "radio_plan_incomplete" };
      const fallbackId = `nia-radio-${text(runtime.processedReceiptIds.at(-1), 120) || text(runtime.updatedAt, 120) || "completed-plan"}`;
      const plan = normalizeRadioPlan({
        business_id: existing.business_id || fallbackId,
        programTitle: existing.programTitle || "初星放送部",
        episodeTitle: existing.episodeTitle || text(planDay.title, 200) || "新人特别回",
        goal: existing.goal || text(planDay.purpose, 600) || task.goal || "完成担当偶像的校园广播首秀",
        host: existing.host || "真诚优",
        guest: existing.guest || text(planDay.idol, 120) || "担当偶像",
        interviewFocus: existing.interviewFocus || text(planDay.approach, 600) || task.expectedOutput || task.goal,
        additionalGuestMode: existing.additionalGuestMode,
        additionalGuest: existing.additionalGuest
      });
      if (runtime.radioSettledBusinessId === plan.business_id) {
        return { ok: false, reason: "radio_already_settled" };
      }
      runtime.radioPlan = plan;
      return { ok: true, sourceKind: existing.business_id ? "radio_plan" : "completed_radio_task", task, radioPlan: plan, runtime };
    }
    if (businessType !== "online_live" && businessType !== "sns_post") {
      return { ok: false, reason: "unsupported_business_type" };
    }

    const completedOnlineTask = runtime.tasks.find(
      (task) => task.id === "online-live-plan" && task.status === "completed"
    ) || runtime.tasks.find((task) => task.category === "online" && task.status === "completed");
    const evidence = {
      documents: [...runtime.documents],
      materials: [...runtime.materials],
      contacts: [...runtime.contacts],
      terms: [...runtime.terms],
      careerLog: [...runtime.careerLog]
    };

    if (completedOnlineTask) {
      return {
        ok: true,
        sourceKind: "completed_online_task",
        task: {
          ...completedOnlineTask,
          assets: uniqueStrings(completedOnlineTask.assets, runtime.materials, 40),
          constraints: uniqueStrings(completedOnlineTask.constraints, runtime.risks, 20),
          boundaries: uniqueStrings(completedOnlineTask.boundaries, runtime.terms, 40)
        },
        evidence
      };
    }

    const completedNonTrainingTasks = runtime.tasks.filter(
      (task) => task.category !== "training" && task.status === "completed"
    );
    const allPeriodsCompleted = runtime.periods.every((period) => period.status === "completed");
    if (runtime.status !== "complete" || (!completedNonTrainingTasks.length && !allPeriodsCompleted)) {
      return { ok: false, reason: "producer_work_incomplete" };
    }

    const day = objectValue(planDay);
    const taskTitles = completedNonTrainingTasks.map((task) => task.title).filter(Boolean);
    const taskGoals = completedNonTrainingTasks.map((task) => task.goal).filter(Boolean);
    const backgroundParts = uniqueStrings(
      taskTitles,
      [...runtime.contacts, ...runtime.careerLog],
      40
    );
    const outputParts = uniqueStrings(
      runtime.documents,
      runtime.terms,
      40
    );

    return {
      ok: true,
      sourceKind: "completed_workday",
      task: {
        id: `completed-workday-online-${runtime.dayIndex + 1}`,
        category: "online",
        priority: "core",
        title: text(day.title, 120) || "网上直播营业",
        deadline: "本营业日",
        goal: text(day.purpose, 240) || taskGoals.join("；") || "执行本轮网上直播企划",
        background: backgroundParts.join("；"),
        constraints: uniqueStrings(day.problem ? [day.problem] : [], runtime.risks, 20),
        assets: [...runtime.materials],
        boundaries: [...runtime.terms],
        expectedOutput: text(day.output, 180) || outputParts.join("；"),
        phases: [],
        completedPhases: [],
        status: "completed",
        nextBriefing: normalizeBriefing({})
      },
      evidence
    };
  }

  function normalizeRadioPlan(raw) {
    const source = objectValue(raw);
    const additionalGuestMode = ["random", "specified"].includes(source.additionalGuestMode)
      ? source.additionalGuestMode
      : "random";
    return {
      business_id: text(source.business_id || source.businessId, 160),
      programTitle: text(source.programTitle, 160),
      episodeTitle: text(source.episodeTitle, 200),
      goal: text(source.goal, 600),
      host: text(source.host, 120),
      guest: text(source.guest, 120),
      interviewFocus: text(source.interviewFocus, 600),
      additionalGuestMode,
      additionalGuest: text(source.additionalGuest, 120)
    };
  }

  function markRadioPlanSettled(raw, businessId) {
    const runtime = normalizeProducerWork(raw);
    const id = text(businessId, 160);
    if (!id || runtime.radioPlan?.business_id !== id) return { ok: false, reason: "business_id_mismatch", runtime };
    if (runtime.radioSettledBusinessId === id) return { ok: true, duplicate: true, runtime };
    runtime.radioSettledBusinessId = id;
    runtime.updatedAt = Date.now();
    return { ok: true, duplicate: false, runtime };
  }

  root.HatsuNiaProducerWork = Object.freeze({
    PERIODS,
    normalizeProducerWork,
    normalizeTask,
    reconcileFixedAppointments,
    reconcileBusinessRequirements,
    createSakiRoundOneWorkday,
    assignTaskToPeriod,
    clearFutureAssignment,
    validateWorkSchedule,
    getCurrentPeriod,
    getAssignedTask,
    applyWorkReceipt,
    resolveBusinessPreparation,
    normalizeRadioPlan,
    markRadioPlanSettled,
    getOnlineFanDelta
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
