const $ = (selector) => document.querySelector(selector);

let hostWindow = null;
let hostConnected = false;
let lastProjection = null;
let briefingIndex = 0;
let briefingOpened = false;
let briefingPreviousFocus = null;
let selectedWorkTaskId = '';
let selectedWorkPhaseId = '';

const BUSINESS_METHODS = Object.freeze({
  online_live: {
    approach: '通过线上预热直播展示咲季的日常状态与实时互动，为后续正式营业积累观众印象。'
  },
  sns_post: {
    approach: '通过初星圈发布一篇带预设配图的帖子，观察评论并完成一次互动。'
  },
  tv_program: {
    approach: '通过电视节目访谈展示偶像在舞台外的真实魅力，并利用制作人指示完成临场转化。'
  },
  school_radio: {
    approach: '先完成《初星放送部》广播企划，再以校园广播完成咲季的正式亮相。'
  },
  mini_live: {
    approach: '在商店街、学园礼堂或购物中心等开放场地举办迷你演出，通过现场表演与路人反馈扩大认知。'
  }
});
const MINI_LIVE_VENUE_LABELS = Object.freeze({
  shopping_street: '商店街临时舞台',
  junior_school_auditorium: '初星学园中等部',
  shopping_mall: '购物中心中庭',
  campus_courtyard: '初星学园校园中庭'
});

const NIA_FIRST_ROUND_BRIEFING = [
  'Producer，先说明一下 N.I.A 的赛制吧。育成分为三轮，每轮结束都有审查：前两轮分别进行一次试镜，共两次试镜；第三轮则是 FINALE。',
  '参加试镜和 FINALE 都必须先达到规定的粉丝数审查线。营业和试镜是主要的粉丝增长来源，不过只追求数字还不够，观众为什么记住她同样重要。',
  '每一轮开始前，你都要先制定企划，再安排接下来的五天。训练、营业、外出和制作人工作并不是彼此分开的任务，它们要围绕同一个方向逐步积累成果。',
  '现在先读完咲季的档案，然后填写本轮目标、希望观众看到的形象，以及你的实现思路。草案完成后交给我，我会帮你整理成能够执行的五日计划。'
];

function postToHost(payload) {
  const targets = [];
  let current = window;
  for (let depth = 0; depth < 8; depth += 1) {
    let parent;
    try { parent = current.parent; } catch { break; }
    if (!parent || parent === current || targets.includes(parent)) break;
    targets.push(parent);
    current = parent;
  }
  if (hostWindow) {
    hostWindow.postMessage(payload, '*');
    return true;
  }
  targets.forEach((target) => target.postMessage(payload, '*'));
  return targets.length > 0;
}

function createOperationId() {
  return 'nia-plan-operation-' + Date.now() + '-' + Math.random().toString(16).slice(2, 10);
}

function preferredScrollBehavior() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

function shouldOpenFirstRoundBriefing(projection) {
  return Boolean(
    projection
    && projection.round === 1
    && projection.phase === 'draft'
    && !projection.firstRoundBriefingSeen
  );
}

function renderFirstRoundBriefing() {
  const text = $('#niaBriefingText');
  const progress = $('#niaBriefingProgress');
  const nextButton = $('#niaBriefingNextBtn');
  if (text) text.textContent = NIA_FIRST_ROUND_BRIEFING[briefingIndex] || '';
  if (progress) progress.textContent = `${briefingIndex + 1} / ${NIA_FIRST_ROUND_BRIEFING.length}`;
  if (nextButton) nextButton.textContent = briefingIndex === NIA_FIRST_ROUND_BRIEFING.length - 1 ? '明白了' : '继续';
}

function openFirstRoundBriefing(projection) {
  const overlay = $('#niaBriefingOverlay');
  if (!overlay || briefingOpened || !shouldOpenFirstRoundBriefing(projection)) return false;
  briefingOpened = true;
  briefingIndex = 0;
  briefingPreviousFocus = document.activeElement;
  renderFirstRoundBriefing();
  overlay.hidden = false;
  document.body.classList.add('is-briefing-open');
  window.setTimeout(() => $('#niaBriefingNextBtn')?.focus(), 0);
  return true;
}

function completeFirstRoundBriefing() {
  const overlay = $('#niaBriefingOverlay');
  if (!overlay || overlay.hidden) return false;
  overlay.hidden = true;
  document.body.classList.remove('is-briefing-open');
  if (lastProjection) lastProjection.firstRoundBriefingSeen = true;
  postToHost({
    source: 'hatsuboshi-produce-nia-view',
    type: 'niaFirstRoundBriefingComplete'
  });
  if (briefingPreviousFocus instanceof HTMLElement) briefingPreviousFocus.focus();
  briefingPreviousFocus = null;
  return true;
}

function advanceFirstRoundBriefing() {
  const overlay = $('#niaBriefingOverlay');
  if (!overlay || overlay.hidden) return false;
  if (briefingIndex < NIA_FIRST_ROUND_BRIEFING.length - 1) {
    briefingIndex += 1;
    renderFirstRoundBriefing();
    return true;
  }
  return completeFirstRoundBriefing();
}

function scrollToPlanningDraft() {
  $('#planningDraftPage')?.scrollIntoView({ behavior: preferredScrollBehavior(), block: 'start' });
}

function enableTabletDragScroll() {
  const screen = $('#tabletScreen');
  if (!screen) return;
  let drag = null;
  screen.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0 || event.target.closest('textarea, button, select, input, a')) return;
    screen.setPointerCapture(event.pointerId);
    drag = { id: event.pointerId, y: event.clientY, scrollTop: screen.scrollTop };
    screen.classList.add('content-dragging');
    event.preventDefault();
  });
  screen.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    screen.scrollTop = drag.scrollTop - (event.clientY - drag.y);
    event.preventDefault();
  });
  const finish = (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    drag = null;
    screen.classList.remove('content-dragging');
  };
  screen.addEventListener('pointerup', finish);
  screen.addEventListener('pointercancel', finish);
}

function setDeskFocus(focus) {
  const desk = document.querySelector('.desk');
  const phone = $('#niaDeskPhone');
  const tablet = $('#tablet');
  if (!desk || !phone || !tablet) return;
  const phoneFocused = focus === 'phone';
  desk.dataset.focus = phoneFocused ? 'phone' : 'tablet';
  desk.classList.toggle('phone-focused', phoneFocused);
  phone.classList.toggle('is-awake', phoneFocused);
  phone.setAttribute('aria-pressed', String(phoneFocused));
  phone.setAttribute('aria-label', phoneFocused ? '切换回平板企划终端' : '打开制作人手机预览');
  tablet.setAttribute('aria-label', phoneFocused ? '切换回平板企划终端' : '打开平板企划终端');
}

function enableDeskPhonePreview() {
  const phone = $('#niaDeskPhone');
  const tablet = $('#tablet');
  if (!phone) return;
  phone.addEventListener('click', (event) => {
    const appButton = event.target.closest('[data-phone-app]');
    const phoneAlreadyFocused = document.querySelector('.desk')?.dataset.focus === 'phone';
    if (appButton && phoneAlreadyFocused) {
      postToHost({
        source: 'hatsuboshi-produce-nia-view',
        type: 'niaPhoneAppOpen',
        appId: appButton.dataset.phoneApp
      });
      return;
    }
    setDeskFocus('phone');
  });
  phone.addEventListener('keydown', (event) => {
    if (event.target === phone && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      setDeskFocus('phone');
    }
  });
  tablet?.addEventListener('click', (event) => {
    if (event.target.closest('button, textarea, select, input, a')) return;
    setDeskFocus('tablet');
  });
  tablet?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setDeskFocus('tablet');
    }
  });
  setDeskFocus(document.querySelector('.desk')?.dataset.focus || 'tablet');
}

function readSelectedBusinessMethods() {
  return [...document.querySelectorAll('input[name="businessMethod"]:checked')]
    .map((input) => ({ id: input.value, ...BUSINESS_METHODS[input.value] }))
    .filter((item) => item.approach);
}

function syncMiniLiveVenueField() {
  const field = $('#miniLiveVenueField');
  const toggle = document.querySelector('input[name="businessMethod"][value="mini_live"]');
  if (field) field.hidden = !toggle?.checked;
}

function selectBusinessMethodForApproach(approach) {
  const normalized = String(approach || '');
  const selected = [];
  if (/迷你演出|迷你Live|小型演出|商店街演出|中等部演出|mini_live/i.test(normalized)) selected.push('mini_live');
  if (/综艺|电视节目|访谈节目|tv_program/i.test(normalized)) selected.push('tv_program');
  if (/广播|放送/.test(normalized)) selected.push('school_radio');
  if (/初星圈|SNS|发帖/i.test(normalized)) selected.push('sns_post');
  if (/直播|线上|预热/.test(normalized)) selected.push('online_live');
  ['online_live', 'sns_post', 'mini_live', 'school_radio', 'tv_program'].forEach((id) => { if (selected.length < 2 && !selected.includes(id)) selected.push(id); });
  document.querySelectorAll('input[name="businessMethod"]').forEach((input) => { input.checked = selected.includes(input.value); });
  syncBusinessMethodLimit();
}

function syncBusinessMethodLimit() {
  const checked = readSelectedBusinessMethods();
  const secondRoundUnlocked = Number(lastProjection?.round) >= 2;
  document.querySelectorAll('input[name="businessMethod"]').forEach((input) => {
    const lockedUntilSecondRound = input.dataset.unlockRound === '2' && !secondRoundUnlocked;
    input.disabled = lockedUntilSecondRound || (checked.length >= 2 && !input.checked);
    if (lockedUntilSecondRound) input.checked = false;
  });
}

function renderBusinessLevelRule(projection = lastProjection) {
  const rule = $('#businessLevelRule');
  if (!rule) return;
  const round = Math.max(1, Number(projection?.round) || 1);
  const fans = Math.max(0, Number(projection?.fans) || 0);
  const lv2Unlocked = round >= 2 && fans >= 5000;
  const lv3Unlocked = round >= 3 && fans >= 20000;
  rule.classList.toggle('is-unlocked', lv2Unlocked);
  rule.textContent = lv3Unlocked
    ? `Lv3 已解锁 · 当前 ${fans.toLocaleString('zh-CN')} 粉丝。直播、广播和电视节目将自动采用 Lv3；初星圈目前固定为 Lv1。`
    : lv2Unlocked
      ? `Lv2 已解锁 · Lv3 条件为进入第三轮且达到 20,000 粉丝。当前第 ${round} 轮 · ${fans.toLocaleString('zh-CN')} 粉丝；初星圈目前固定为 Lv1。`
      : `Lv2 解锁条件：进入第二轮且达到 5,000 粉丝；Lv3 还需进入第三轮且达到 20,000 粉丝。当前第 ${round} 轮 · ${fans.toLocaleString('zh-CN')} 粉丝；初星圈目前固定为 Lv1。`;
}

function readDraft() {
  const methods = readSelectedBusinessMethods();
  return {
    goal: $('#goalInput').value.trim(),
    image: $('#imageInput').value.trim(),
    businessMethods: methods.map((item) => item.id),
    approach: methods.map((item) => item.approach).join('；'),
    miniLiveVenueId: $('#miniLiveVenueSelect')?.value || 'shopping_street'
  };
}

function writeDraft(draft) {
  if (!draft || typeof draft !== 'object') return;
  if (typeof draft.goal === 'string') $('#goalInput').value = draft.goal;
  if (typeof draft.image === 'string') $('#imageInput').value = draft.image;
  if (Array.isArray(draft.businessMethods) && draft.businessMethods.length) {
    document.querySelectorAll('input[name="businessMethod"]').forEach((input) => {
      input.checked = draft.businessMethods.includes(input.value);
    });
    syncBusinessMethodLimit();
  } else if (typeof draft.approach === 'string') {
    selectBusinessMethodForApproach(draft.approach);
  }
  if (draft.miniLiveVenueId && $('#miniLiveVenueSelect')) $('#miniLiveVenueSelect').value = draft.miniLiveVenueId;
  syncMiniLiveVenueField();
}

function setStatus(message, kind = '') {
  const status = $('#apiStatus');
  status.textContent = message;
  status.className = 'api-status' + (kind ? ' is-' + kind : '');
}

function renderPlanReceipt(plan) {
  if (!plan || typeof plan !== 'object') return;
  $('#compiledImage').textContent = plan.publicImage || '';
  $('#compiledPrinciple').textContent = plan.principle || '';
  $('#compiledSpine').textContent = plan.spine || '';
  const days = Array.isArray(plan.days) ? plan.days : [];
  $('#plannedDaysList').replaceChildren(...days.map((day, index) => {
    const item = document.createElement('li');
    const title = document.createElement('strong');
    const detail = document.createElement('span');
    title.textContent = 'DAY ' + String(day.day || (index + 1)) + ' · ' + String(day.type || '计划行动');
    const venueLabel = day.businessType === 'mini_live' ? MINI_LIVE_VENUE_LABELS[day.venueId] : '';
    detail.textContent = [String(day.title || day.purpose || '待执行企划'), venueLabel].filter(Boolean).join(' · ');
    item.append(title, detail);
    return item;
  }));
  $('#draftStage').classList.remove('is-active');
  $('#planReceipt').classList.add('is-active');
  const startButton = $('#niaTrainingStartBtn');
  if (startButton) startButton.disabled = false;
  setStatus(Number(lastProjection?.round) >= 2 ? '企划已修改完成，请确认第2日至第6日安排' : '企划已修改完成，请确认五日安排', 'connected');
}

function renderRoundTwoPlanning(projection) {
  const round = Math.max(1, Number(projection?.round) || 1);
  const advancedRound = round >= 2;
  const roundNames = ['', '一', '二', '三'];
  const roundName = roundNames[round] || String(round);
  const meta = $('#planningRoundMeta');
  const title = $('#planningDraftTitle');
  const receipt = $('#planningReceiptTitle');
  const daysTitle = $('#plannedDaysTitle');
  const fixed = $('#fixedOutingSummary');
  if (meta) meta.textContent = `PLANNING SHEET / ROUND ${String(round).padStart(2, '0')}`;
  if (title) title.textContent = `第${roundName}轮企划草案`;
  if (receipt) receipt.textContent = `第${roundName}轮企划已建立`;
  if (daysTitle) daysTitle.textContent = advancedRound ? '第 2 日至第 6 日计划顺序' : '五日计划顺序';
  if (fixed) {
    const outing = projection?.fixedOuting;
    fixed.hidden = !advancedRound || !outing;
    if (advancedRound && outing) {
      fixed.innerHTML = `<article><span>第 1 日 · 固定外出</span><strong>${escapeWorkHtml(outing.destination || '外出放松')}</strong><small>${escapeWorkHtml(outing.summary || `固定外出已完成，作为第${roundName}轮开场承接。`)}</small></article>`;
    }
  }
}

const WORK_CATEGORY_LABELS = {
  external: ['外', '外部接洽'],
  online: ['网', '线上运营'],
  management: ['企', '企划管理'],
  training: ['训', '陪同训练']
};

function escapeWorkHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function workTaskById(work, taskId) {
  return work?.tasks?.find((task) => task.id === taskId) || null;
}

function workPhaseById(task, phaseId) {
  return task?.phases?.find((phase) => phase.id === phaseId) || null;
}

function isWorkdayProjection(projection) {
  return Boolean(
    projection?.currentDay?.type === '制作人工作'
    && projection?.producerWork
    && projection.producerWork.status !== 'idle'
  );
}

function selectDefaultWorkTask(work) {
  const currentPeriod = work.periods?.[work.periodIndex];
  const currentTask = workTaskById(work, currentPeriod?.taskId);
  const selected = workTaskById(work, selectedWorkTaskId);
  const task = selected || currentTask || work.tasks?.find((item) => item.status !== 'completed') || work.tasks?.[0];
  if (!task) return null;
  selectedWorkTaskId = task.id;
  const selectedPhase = workPhaseById(task, selectedWorkPhaseId);
  const phase = selectedPhase
    || task.phases?.find((item) => !task.completedPhases?.includes(item.id) && !item.fixedPeriod)
    || task.phases?.find((item) => !task.completedPhases?.includes(item.id))
    || task.phases?.[0];
  selectedWorkPhaseId = phase?.id || '';
  return task;
}

function renderWorkSchedule(work) {
  const list = $('#workPeriodList');
  if (!list) return;
  list.replaceChildren(...work.periods.map((period, index) => {
    const task = workTaskById(work, period.taskId);
    const phase = workPhaseById(task, period.phaseId);
    const row = document.createElement('article');
    row.className = `work-period${index === work.periodIndex ? ' is-current' : ''}${period.status === 'completed' ? ' is-completed' : ''}`;
    const time = document.createElement('div');
    time.className = 'work-period-time';
    time.textContent = period.label;
    const assignment = document.createElement('div');
    assignment.className = 'work-period-assignment';
    const title = document.createElement('strong');
    title.textContent = task?.title || '尚未安排';
    const detail = document.createElement('span');
    detail.textContent = period.status === 'completed'
      ? (period.summary || phase?.label || '已完成')
      : (phase?.label || '从待办文件中选择');
    assignment.append(title, detail);
    let control;
    if (period.status === 'completed') {
      control = document.createElement('span');
      control.className = 'work-period-stamp';
      control.textContent = '完成';
    } else if (period.fixed) {
      control = document.createElement('span');
      control.className = 'work-period-lock';
      control.textContent = '预约';
    } else {
      control = document.createElement('button');
      control.type = 'button';
      control.className = 'work-period-clear';
      control.textContent = period.taskId ? '清除' : '空闲';
      control.disabled = !period.taskId || index < work.periodIndex || period.status === 'generating';
      control.addEventListener('click', () => postToHost({
        source: 'hatsuboshi-produce-nia-view',
        type: 'niaProducerWorkClear',
        periodId: period.id
      }));
    }
    row.append(time, assignment, control);
    return row;
  }));
  const confirm = $('#workScheduleConfirm');
  const planning = work.status === 'planning';
  const radioPlanRequired = Boolean(work.requirements?.radioPlanRequired);
  const radioPlanAssigned = work.periods.some((period) => period.taskId === 'radio-department-plan');
  const onlineLivePlanRequired = Boolean(work.requirements?.onlineLivePlanRequired);
  const onlineLivePlanAssigned = work.periods.some((period) => period.taskId === 'online-live-plan');
  confirm.hidden = !planning;
  confirm.disabled = !work.periods.every((period) => period.taskId && period.phaseId)
    || (radioPlanRequired && !radioPlanAssigned)
    || (onlineLivePlanRequired && !onlineLivePlanAssigned);
  $('#workFeedback').textContent = work.lastError
    || (planning && radioPlanRequired && !radioPlanAssigned
      ? '本轮日程包含《初星放送部》，请务必安排“广播部企划”。'
      : planning && onlineLivePlanRequired && !onlineLivePlanAssigned
        ? '本轮日程包含网络直播，请务必安排“网络直播企划”。'
      : planning
        ? '固定预约已经落入日程，请安排剩余时间。'
        : '每段完成后仍可调整尚未开始的安排。');
}

function renderWorkTaskList(work) {
  const list = $('#workTaskList');
  if (!list) return;
  list.replaceChildren(...work.tasks.map((task) => {
    const labels = WORK_CATEGORY_LABELS[task.category] || WORK_CATEGORY_LABELS.management;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `work-task-card${task.id === selectedWorkTaskId ? ' is-selected' : ''}`;
    button.dataset.category = task.category;
    if (work.requirements?.radioPlanRequired && task.id === 'radio-department-plan') button.dataset.required = 'true';
    if (work.requirements?.onlineLivePlanRequired && task.id === 'online-live-plan') button.dataset.required = 'true';
    button.disabled = task.status === 'expired';
    button.innerHTML = `
      <span class="work-task-category" aria-hidden="true">${labels[0]}</span>
      <span class="work-task-copy"><strong>${escapeWorkHtml(task.title)}</strong><span>${escapeWorkHtml(task.goal)}</span></span>
      <span class="work-task-deadline">${task.status === 'completed' ? '已完成' : escapeWorkHtml(task.deadline)}</span>
    `;
    button.addEventListener('click', () => {
      selectedWorkTaskId = task.id;
      selectedWorkPhaseId = '';
      renderProducerWorkday(lastProjection);
    });
    return button;
  }));
}

function renderWorkDossier(work) {
  const dossier = $('#workDossier');
  const task = selectDefaultWorkTask(work);
  if (!dossier || !task) return;
  const labels = WORK_CATEGORY_LABELS[task.category] || WORK_CATEGORY_LABELS.management;
  const phase = workPhaseById(task, selectedWorkPhaseId) || task.phases?.[0];
  const listHtml = (items, empty = '无') => items?.length
    ? `<ul>${items.map((item) => `<li>${escapeWorkHtml(item)}</li>`).join('')}</ul>`
    : `<p>${empty}</p>`;
  dossier.innerHTML = `
    <div class="work-dossier-head"><h2>${escapeWorkHtml(task.title)}</h2><span>${labels[1]} · ${escapeWorkHtml(task.deadline)}</span></div>
    <p class="work-dossier-goal">${escapeWorkHtml(task.goal)}</p>
    <div class="work-dossier-grid">
      <section><h3>背景资料</h3><p>${escapeWorkHtml(task.background || '当前企划产生的制作人待办。')}</p></section>
      <section><h3>预期产物</h3><p>${escapeWorkHtml(task.expectedOutput || '一份可供后续使用的工作结果')}</p></section>
      <section><h3>现有限制</h3>${listHtml(task.constraints)}</section>
      <section><h3>已有筹码 / 偶像边界</h3>${listHtml([...(task.assets || []), ...(task.boundaries || [])])}</section>
    </div>
    <div class="work-phase-list" id="workPhaseList"></div>
    <div class="work-assign-actions" id="workAssignActions"></div>
  `;
  const phaseList = $('#workPhaseList');
  task.phases.forEach((item) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `work-phase-button${item.id === phase?.id ? ' is-selected' : ''}`;
    button.textContent = `${item.label}${item.fixedPeriod ? ' · 固定预约' : ''}`;
    button.disabled = task.completedPhases?.includes(item.id);
    button.addEventListener('click', () => {
      selectedWorkPhaseId = item.id;
      renderWorkDossier(work);
    });
    phaseList.appendChild(button);
  });
  const assignActions = $('#workAssignActions');
  if (phase?.fixedPeriod) {
    const note = document.createElement('span');
    note.className = 'work-task-deadline';
    note.textContent = `已固定安排在${work.periods.find((item) => item.id === phase.fixedPeriod)?.label || '指定时段'}`;
    assignActions.appendChild(note);
  } else if (task.status !== 'completed') {
    work.periods.forEach((period, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'work-assign-button';
      button.textContent = `安排到${period.label}`;
      button.disabled = period.fixed || period.status === 'completed' || period.status === 'generating' || index < work.periodIndex;
      button.addEventListener('click', () => postToHost({
        source: 'hatsuboshi-produce-nia-view',
        type: 'niaProducerWorkAssign',
        taskId: task.id,
        phaseId: phase?.id || '',
        periodId: period.id
      }));
      assignActions.appendChild(button);
    });
  }
}

function renderWorkBriefing(phase) {
  const briefing = phase?.briefing || {};
  const facts = [...(briefing.facts || []), ...(briefing.constraints || [])];
  $('#workBriefing').innerHTML = `
    <strong>${escapeWorkHtml(briefing.situation || '确认当前资料后，决定制作人的行动。')}</strong>
    ${facts.length ? `<ul>${facts.map((item) => `<li>${escapeWorkHtml(item)}</li>`).join('')}</ul>` : ''}
  `;
}

function populateWorkPhone(task, work) {
  const livePlanning = task.outputType === 'online_live_plan' || task.id === 'online-live-plan';
  const setOptions = (select, values) => {
    select.replaceChildren(...values.map((value) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      return option;
    }));
  };
  $('#producerWorkPhoneView').dataset.workEditor = livePlanning ? 'online-live' : 'sns';
  $('#workPhoneKicker').textContent = livePlanning ? 'HATSUBOSHI LIVE' : 'HATSUBOSHI SNS';
  $('#workPhoneTitle').textContent = livePlanning ? '直播企划' : '发布准备';
  $('#workPhoneMaterialLabel').textContent = livePlanning ? '直播素材' : '使用素材';
  $('#workPhoneAngleLabel').textContent = livePlanning ? '直播主题' : '呈现角度';
  $('#workPhoneVoiceLabel').textContent = livePlanning ? '互动形式' : '发布语气';
  $('#workPhoneCommentsLabel').textContent = livePlanning ? '现场处理' : '评论处理';
  setOptions($('#workPhoneAngle'), livePlanning
    ? ['训练成果分享', '日常生活特别企划', '粉丝问答互动', '本轮公众形象验证']
    : ['实力与自律', '自然可爱反差', '制作团队观察', '保留素材原貌']);
  setOptions($('#workPhoneVoice'), livePlanning
    ? ['弹幕问答', '主题讲解与评论互动', '现场展示与即时回应', '轻松闲聊']
    : ['咲季本人语气', '制作团队视角', '节目预告语气']);
  setOptions($('#workPhoneComments'), livePlanning
    ? ['制作人筛选代表性提问', '偏题时拉回直播主题', '争议评论延后处理', '保留偶像自由回应']
    : ['先观察代表性反馈', '回应事实误解', '暂不主动回应']);
  $('#workPhoneFreeText').placeholder = livePlanning
    ? '补充直播流程、互动边界或临场预案'
    : '补充剪辑、文案或沟通方式';
  $('#workPhoneSubmit').textContent = livePlanning ? '确认直播企划' : '确认发布方案';
  const material = $('#workPhoneMaterial');
  const available = [...new Set([...(task.assets || []), ...(work.materials || [])])];
  material.replaceChildren(...(available.length ? available : ['使用当前已有素材']).map((item) => {
    const option = document.createElement('option');
    option.textContent = item;
    return option;
  }));
  const pending = work.pendingDecision;
  if (pending?.freeText) $('#workPhoneFreeText').value = pending.freeText;
}

function currentWorkAssignment(work) {
  const current = work?.periods?.[work.periodIndex];
  const task = workTaskById(work, current?.taskId);
  return { current, task, phase: workPhaseById(task, current?.phaseId) };
}

function syncRadioPlanMode() {
  const mode = document.querySelector('input[name="radioPlanMode"]:checked')?.value || 'quick';
  $('#radioPlanQuickFields').hidden = mode !== 'quick';
  $('#radioPlanCustomFields').hidden = mode !== 'custom';
}

function syncRadioAdditionalGuestMode() {
  const specified = document.querySelector('input[name="radioPlanAdditionalGuestMode"]:checked')?.value === 'specified';
  const select = $('#radioPlanAdditionalGuest');
  if (select) select.disabled = !specified;
}

function configureRadioPlanEditor(work) {
  const plan = work.radioPlan || {};
  const guest = lastProjection?.idol || plan.guest || '担当偶像';
  $('#radioPlanGuest').textContent = guest;
  const lv2 = Number(lastProjection?.round) >= 2 && Number(lastProjection?.fans) >= 5000;
  const additionalFields = $('#radioPlanAdditionalGuestFields');
  if (additionalFields) additionalFields.hidden = !lv2;
  const additionalSelect = $('#radioPlanAdditionalGuest');
  if (additionalSelect) {
    const candidates = Array.isArray(lastProjection?.availableRadioGuests)
      ? lastProjection.availableRadioGuests.filter((name) => name && name !== guest)
      : [];
    additionalSelect.replaceChildren(...candidates.map((name) => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      return option;
    }));
    if (candidates.includes(plan.additionalGuest)) additionalSelect.value = plan.additionalGuest;
  }
  const additionalMode = lv2 && plan.additionalGuestMode === 'specified' ? 'specified' : 'random';
  const additionalModeInput = document.querySelector(`input[name="radioPlanAdditionalGuestMode"][value="${additionalMode}"]`);
  if (additionalModeInput) additionalModeInput.checked = true;
  syncRadioAdditionalGuestMode();
  const themeSelect = $('#radioPlanTheme');
  const goalSelect = $('#radioPlanGoal');
  const themes = [...themeSelect.options].map((option) => option.value);
  const goals = [...goalSelect.options].map((option) => option.value || option.textContent);
  const matchedTheme = themes.find((theme) => plan.episodeTitle === `${theme}特别回`);
  const focusValues = String(plan.interviewFocus || '').split('、').map((value) => value.trim()).filter(Boolean);
  const quickCompatible = !plan.business_id || (matchedTheme && goals.includes(plan.goal) && focusValues.length);
  const mode = quickCompatible ? 'quick' : 'custom';
  const modeInput = document.querySelector(`input[name="radioPlanMode"][value="${mode}"]`);
  if (modeInput) modeInput.checked = true;
  if (matchedTheme) themeSelect.value = matchedTheme;
  if (goals.includes(plan.goal)) goalSelect.value = plan.goal;
  document.querySelectorAll('input[name="radioPlanFocus"]').forEach((input) => {
    if (focusValues.length) input.checked = focusValues.includes(input.value);
  });
  $('#radioPlanCustomTitle').value = plan.episodeTitle || '';
  $('#radioPlanCustomGoal').value = plan.goal || '';
  $('#radioPlanCustomFocus').value = plan.interviewFocus || '';
  syncRadioPlanMode();
}

function readRadioPlanDecision() {
  const mode = document.querySelector('input[name="radioPlanMode"]:checked')?.value || 'quick';
  const lv2 = Number(lastProjection?.round) >= 2 && Number(lastProjection?.fans) >= 5000;
  const additionalGuestMode = lv2
    ? document.querySelector('input[name="radioPlanAdditionalGuestMode"]:checked')?.value || 'random'
    : 'random';
  const additionalGuest = lv2 && additionalGuestMode === 'specified' ? $('#radioPlanAdditionalGuest').value.trim() : '';
  const guestPlan = { additionalGuestMode, additionalGuest };
  if (mode === 'custom') {
    const episodeTitle = $('#radioPlanCustomTitle').value.trim();
    const goal = $('#radioPlanCustomGoal').value.trim();
    const interviewFocus = $('#radioPlanCustomFocus').value.trim();
    return episodeTitle && goal && interviewFocus
      ? { mode, episodeTitle, goal, interviewFocus, ...guestPlan }
      : null;
  }
  const theme = $('#radioPlanTheme').value.trim();
  const goal = $('#radioPlanGoal').value.trim();
  const focus = [...document.querySelectorAll('input[name="radioPlanFocus"]:checked')].map((input) => input.value);
  return theme && goal && focus.length
    ? { mode, episodeTitle: `${theme}特别回`, goal, interviewFocus: focus.join('、'), ...guestPlan }
    : null;
}

function renderWorkExecution(work) {
  const section = $('#workExecution');
  const phoneView = $('#producerWorkPhoneView');
  const homeView = document.querySelector('.phone-home-view');
  const current = work.periods?.[work.periodIndex];
  const task = workTaskById(work, current?.taskId);
  const phase = workPhaseById(task, current?.phaseId);
  const canExecute = ['active', 'retryable_failed'].includes(work.status) && current && task && phase;
  section.hidden = !canExecute;
  if (!canExecute) {
    phoneView.hidden = true;
    homeView.hidden = false;
    if (work.status !== 'generating') setDeskFocus('tablet');
    return;
  }
  $('#workExecuteBtn').disabled = false;
  $('#workPhoneSubmit').disabled = false;
  const labels = WORK_CATEGORY_LABELS[task.category] || WORK_CATEGORY_LABELS.management;
  $('#workExecutionPeriod').textContent = `${current.label} / ${phase.label}`;
  $('#workExecutionTitle').textContent = task.title;
  $('#workExecutionCategory').textContent = labels[1];
  renderWorkBriefing(phase);
  const radioPlanning = task.id === 'radio-department-plan';
  $('#radioPlanEditor').hidden = !radioPlanning;
  section.classList.toggle('is-radio-plan', radioPlanning);
  $('#workExecuteBtn').textContent = radioPlanning ? '确认企划并执行' : '执行当前安排';
  if (radioPlanning) configureRadioPlanEditor(work);
  const presetList = $('#workPresetList');
  presetList.replaceChildren(...(phase.presets || []).map((preset, index) => {
    const label = document.createElement('label');
    label.className = 'work-preset-option';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'workPreset';
    input.value = preset;
    input.checked = work.pendingDecision?.preset === preset || (!work.pendingDecision?.preset && index === 0);
    const span = document.createElement('span');
    span.textContent = preset;
    label.append(input, span);
    return label;
  }));
  $('#workFreeText').value = work.pendingDecision?.freeText || '';
  $('#workApiStatus').textContent = work.lastError || '本时段只会调用一次主 API。';
  const online = task.category === 'online';
  section.classList.toggle('is-online', online);
  phoneView.hidden = !online;
  homeView.hidden = online;
  if (online) {
    populateWorkPhone(task, work);
    setDeskFocus('phone');
  } else {
    setDeskFocus('tablet');
  }
}

function renderWorkOutputs(work) {
  const output = $('#workOutputStrip');
  const items = [
    ...work.documents.map((item) => `文件 · ${item}`),
    ...work.materials.map((item) => `素材 · ${item}`),
    ...work.contacts.map((item) => `联系人 · ${item}`)
  ].slice(-8);
  output.replaceChildren(...items.map((item) => {
    const note = document.createElement('span');
    note.className = 'work-output-note';
    note.textContent = item;
    return note;
  }));
}

function renderProducerWorkday(projection) {
  const work = projection.producerWork;
  document.body.classList.add('is-producer-workday');
  $('#producerWorkPage').hidden = false;
  $('#producerWorkDayNumber').textContent = String((work.dayIndex || 0) + 1).padStart(2, '0');
  $('#producerWorkTitle').textContent = projection.currentDay?.title || '制作人工作日';
  const statusLabels = { planning: '日程安排', active: '执行中', generating: '主API处理中', retryable_failed: '可重试', complete: '本日完成' };
  $('#producerWorkStatus').textContent = statusLabels[work.status] || '制作人工作';
  selectDefaultWorkTask(work);
  renderWorkSchedule(work);
  renderWorkTaskList(work);
  renderWorkDossier(work);
  renderWorkExecution(work);
  renderWorkOutputs(work);
}

function renderProjection(projection) {
  lastProjection = projection;
  hostConnected = true;
  $('#standaloneWarning').hidden = true;
  const route = projection.route || {};
  const portrait = document.querySelector('.portrait img');
  if (portrait && route.avatar) {
    portrait.src = route.avatar;
    portrait.alt = route.idolName || projection.idol || '担当偶像';
  }
  const identityName = document.querySelector('.identity strong');
  if (identityName && (route.idolName || projection.idol)) identityName.textContent = route.idolName || projection.idol;
  const stageName = document.querySelector('.identity b');
  if (stageName && route.stageName) stageName.textContent = route.stageName;
  if (isWorkdayProjection(projection)) {
    renderProducerWorkday(projection);
    return;
  }
  document.body.classList.remove('is-producer-workday');
  $('#producerWorkPage').hidden = true;
  writeDraft(projection.draft);
  renderRoundTwoPlanning(projection);
  renderBusinessLevelRule(projection);
  openFirstRoundBriefing(projection);
  const generating = projection.planStatus === 'generating';
      $('#compileBtn').disabled = generating || projection.phase === 'plan_ready';
      $('#goalInput').disabled = generating || projection.phase === 'plan_ready';
      $('#imageInput').disabled = generating || projection.phase === 'plan_ready';
      document.querySelectorAll('input[name="businessMethod"]').forEach((input) => {
        input.disabled = generating || projection.phase === 'plan_ready'
          || (input.dataset.unlockRound === '2' && Number(projection.round) < 2);
      });
      if ($('#miniLiveVenueSelect')) $('#miniLiveVenueSelect').disabled = generating || projection.phase === 'plan_ready';
      syncBusinessMethodLimit();
  if (projection.phase === 'plan_ready' && projection.plan) {
    renderPlanReceipt(projection.plan);
    return;
  }
  $('#planReceipt').classList.remove('is-active');
  $('#draftStage').classList.add('is-active');
  if (generating) setStatus(`主 API 正在建立第${Number(projection.round) || 1}轮企划…`, 'loading');
  else if (projection.planStatus === 'retryable_failed') setStatus(projection.lastError || '企划生成未完成，可以重新提交。', 'error');
  else setStatus('已连接正式 N.I.A 存档', 'connected');
}

function submitDraft() {
  const draft = readDraft();
  if (!draft.goal || !draft.image || draft.businessMethods.length !== 2) {
    setStatus('请选择两种营业方式后再提交企划。', 'error');
    return;
  }
  if (!hostConnected) {
    $('#standaloneWarning').hidden = false;
    setStatus('独立预览不能建立企划，请从“初”扩展进入 N.I.A 模式。', 'error');
    return;
  }
  $('#compileBtn').disabled = true;
  setStatus('正在提交企划草案…', 'loading');
  postToHost({
    source: 'hatsuboshi-produce-nia-view',
    type: 'niaPlanSubmit',
    operationId: createOperationId(),
    draft
  });
}

function requestNiaTrainingStart() {
  if (!hostConnected || lastProjection?.phase !== 'plan_ready' || !lastProjection?.plan) {
    setStatus('当前企划尚未达到可确认状态。', 'error');
    return false;
  }
  const startButton = $('#niaTrainingStartBtn');
  if (startButton) startButton.disabled = true;
  setStatus('正在确认企划并进入育成…', 'loading');
  return postToHost({
    source: 'hatsuboshi-produce-nia-view',
    type: 'niaTrainingStart'
  });
}

function createWorkOperationId() {
  return 'nia-work-operation-' + Date.now() + '-' + Math.random().toString(16).slice(2, 10);
}

function executeCurrentWorkDecision(decision) {
  if (!hostConnected || !lastProjection?.producerWork) return false;
  const work = lastProjection.producerWork;
  const current = work.periods?.[work.periodIndex];
  if (!current) return false;
  postToHost({
    source: 'hatsuboshi-produce-nia-view',
    type: 'niaProducerWorkExecute',
    operationId: createWorkOperationId(),
    decision
  });
  $('#workExecuteBtn').disabled = true;
  $('#workPhoneSubmit').disabled = true;
  $('#workApiStatus').textContent = '正在提交制作人的方案……';
  return true;
}

function executeTabletWorkDecision() {
  const { task } = currentWorkAssignment(lastProjection?.producerWork);
  if (task?.id === 'radio-department-plan') {
    const radioPlan = readRadioPlanDecision();
    if (!radioPlan) {
      $('#workApiStatus').textContent = '请填写本期标题、企划目标，并至少确定一项访谈重点。';
      return false;
    }
    return executeCurrentWorkDecision({
      preset: `确认《初星放送部》企划：${radioPlan.episodeTitle}`,
      freeText: '',
      radioPlan
    });
  }
  const preset = document.querySelector('input[name="workPreset"]:checked')?.value || '';
  const freeText = $('#workFreeText').value.trim();
  if (!preset && !freeText) {
    $('#workApiStatus').textContent = '请选择一种行动，或填写自由方案。';
    return false;
  }
  return executeCurrentWorkDecision({ preset, freeText });
}

function executePhoneWorkDecision() {
  const { task } = currentWorkAssignment(lastProjection?.producerWork);
  const livePlanning = task?.outputType === 'online_live_plan' || task?.id === 'online-live-plan';
  const preset = [
    `${livePlanning ? '直播素材' : '素材'}：${$('#workPhoneMaterial').value}`,
    `${livePlanning ? '直播主题' : '呈现角度'}：${$('#workPhoneAngle').value}`,
    `${livePlanning ? '互动形式' : '发布语气'}：${$('#workPhoneVoice').value}`,
    `${livePlanning ? '现场处理' : '评论处理'}：${$('#workPhoneComments').value}`
  ].join('；');
  return executeCurrentWorkDecision({ preset, freeText: $('#workPhoneFreeText').value.trim() });
}

$('#continueToPlanning')?.addEventListener('click', scrollToPlanningDraft);
document.querySelectorAll('input[name="businessMethod"]').forEach((input) => input.addEventListener('change', syncBusinessMethodLimit));
document.querySelectorAll('input[name="businessMethod"]').forEach((input) => input.addEventListener('change', syncMiniLiveVenueField));
syncBusinessMethodLimit();
syncMiniLiveVenueField();
$('#compileBtn')?.addEventListener('click', submitDraft);
$('#niaTrainingStartBtn')?.addEventListener('click', requestNiaTrainingStart);
$('#workScheduleConfirm')?.addEventListener('click', () => postToHost({
  source: 'hatsuboshi-produce-nia-view',
  type: 'niaProducerWorkScheduleConfirm'
}));
$('#workExecuteBtn')?.addEventListener('click', executeTabletWorkDecision);
$('#workPhoneSubmit')?.addEventListener('click', executePhoneWorkDecision);
document.querySelectorAll('input[name="radioPlanMode"]').forEach((input) => input.addEventListener('change', syncRadioPlanMode));
document.querySelectorAll('input[name="radioPlanAdditionalGuestMode"]').forEach((input) => input.addEventListener('change', syncRadioAdditionalGuestMode));
$('#niaBriefingNextBtn')?.addEventListener('click', advanceFirstRoundBriefing);
$('#niaBriefingDialogue')?.addEventListener('click', (event) => {
  if (event.target.closest('button')) return;
  advanceFirstRoundBriefing();
});
window.addEventListener('keydown', (event) => {
  if ($('#niaBriefingOverlay')?.hidden) return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    advanceFirstRoundBriefing();
  }
});
enableTabletDragScroll();
enableDeskPhonePreview();

window.addEventListener('message', (event) => {
  const payload = event.data || {};
  if (payload.source !== 'hatsuboshi-produce-nia-host' || payload.type !== 'niaStateSync') return;
  hostWindow = event.source;
  renderProjection(payload.state || {});
});

postToHost({ source: 'hatsuboshi-produce-nia-view', type: 'niaViewReady' });
window.setTimeout(() => {
  if (hostConnected) return;
  $('#standaloneWarning').hidden = false;
  setStatus('独立界面预览：正式企划需要从“初”扩展进入。', 'error');
}, 900);
