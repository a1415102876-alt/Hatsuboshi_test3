import test from 'node:test';
import assert from 'node:assert/strict';

await import('../nia-training-core.js');

const {
  normalizeNiaTraining,
  getCurrentNiaPlanAction,
  mapNiaPlanAction,
  getFanProgress,
  advanceNiaOrdinaryPlanAction,
  isCompanionTrainingPlanDay,
  ensureCompanionTrainingDay,
  getCompanionTrainingPhase,
  isCompanionTrainingPeriodAction,
  completeCompanionTrainingPeriod,
  completeCompanionTrainingCampusActivity,
  applyNiaTrainingGainMultiplier
} = globalThis.HatsuNiaTraining;

test('active NIA training doubles calculated gains without affecting ordinary training', () => {
  assert.equal(applyNiaTrainingGainMultiplier(42, true), 84);
  assert.equal(applyNiaTrainingGainMultiplier(42, false), 42);
});

test('normalizes the NIA fan runtime and clamps progress', () => {
  assert.deepEqual(
    normalizeNiaTraining({ fans: -10, fanTarget: 3000, actionIndex: -2 }),
    { active: false, fans: 0, fanTarget: 3000, actionIndex: 0, companionDay: null }
  );
  assert.equal(getFanProgress(4500, 3000), 100);
  assert.equal(getFanProgress(750, 3000), 25);
  assert.equal(getFanProgress(10, 0), 0);
});

test('normalizes and resumes an afternoon companion training period', () => {
  const operationIds = Array.from({ length: 14 }, (_, index) => `op-${index}`);
  const training = normalizeNiaTraining({
    active: true,
    actionIndex: 1,
    companionDay: {
      planDayIndex: 1.9,
      periodIndex: 1.8,
      morningSummary: '  上午完成换气练习  ',
      afternoonSummary: 42,
      campusLocationId: ' student_store ',
      processedOperationIds: ['op-1', ...operationIds, 'op-13', '', 12]
    }
  });

  assert.equal(training.companionDay.planDayIndex, 1);
  assert.equal(training.companionDay.periodIndex, 1);
  assert.equal(training.companionDay.morningSummary, '上午完成换气练习');
  assert.equal(training.companionDay.afternoonSummary, '');
  assert.equal(training.companionDay.campusLocationId, 'student_store');
  assert.deepEqual(
    training.companionDay.processedOperationIds,
    Array.from({ length: 12 }, (_, index) => `op-${index + 2}`)
  );
  assert.equal(getCompanionTrainingPhase(training), 'afternoon');
  assert.deepEqual(ensureCompanionTrainingDay(training), training);
});

test('recognizes only a formal companion training plan day', () => {
  assert.equal(isCompanionTrainingPlanDay({ type: '陪同训练' }), true);
  assert.equal(isCompanionTrainingPlanDay({ type: ' 陪同训练日 ' }), true);
  assert.equal(isCompanionTrainingPlanDay({ type: '制作人工作', title: '陪同训练' }), false);
  assert.equal(isCompanionTrainingPlanDay({ type: '制作人工作', workSeed: { companionTraining: true } }), false);
});

test('advances two internal periods without advancing the outer plan day', () => {
  const start = ensureCompanionTrainingDay({ active: true, actionIndex: 2 });
  assert.equal(getCompanionTrainingPhase(start), 'morning');
  assert.equal(isCompanionTrainingPeriodAction(start, { action: 'lesson', attribute: 'Vo' }), true);

  const morning = completeCompanionTrainingPeriod(start, {
    operationId: 'morning-1',
    summary: '发现镜头前表情过紧'
  });
  assert.equal(morning.completed, true);
  assert.equal(morning.training.actionIndex, 2);
  assert.equal(morning.training.companionDay.periodIndex, 1);
  assert.equal(morning.training.companionDay.morningSummary.length > 0, true);
  assert.equal(morning.training.companionDay.afternoonSummary, '');

  const afternoon = completeCompanionTrainingPeriod(morning.training, {
    operationId: 'afternoon-1',
    summary: '通过节奏练习改善了表情'
  });
  assert.equal(afternoon.completed, true);
  assert.equal(afternoon.training.actionIndex, 2);
  assert.equal(getCompanionTrainingPhase(afternoon.training), 'campus');
  assert.equal(afternoon.training.companionDay.afternoonSummary.length > 0, true);

  const longSummary = completeCompanionTrainingPeriod(start, {
    operationId: 'morning-long',
    summary: 'x'.repeat(2500)
  });
  assert.equal(longSummary.training.companionDay.morningSummary.length, 2000);
});

test('completes the outer plan day only after the campus activity', () => {
  const beforeCampus = normalizeNiaTraining({
    active: true,
    actionIndex: 2,
    companionDay: { planDayIndex: 2, periodIndex: 2 }
  });
  const rejectedPeriod = completeCompanionTrainingPeriod(beforeCampus, {
    operationId: 'late-period',
    summary: 'too late'
  });
  assert.equal(rejectedPeriod.completed, false);
  assert.equal(rejectedPeriod.training.actionIndex, 2);

  assert.equal(completeCompanionTrainingCampusActivity(beforeCampus, {
    operationId: '', locationId: 'student_store'
  }).completed, false);
  assert.equal(completeCompanionTrainingCampusActivity(beforeCampus, {
    operationId: 'campus-blank', locationId: ' '
  }).completed, false);

  const result = completeCompanionTrainingCampusActivity(beforeCampus, {
    operationId: 'campus-1',
    locationId: 'student_store'
  });
  assert.equal(result.completed, true);
  assert.equal(result.training.actionIndex, 3);
  assert.equal(result.training.companionDay, null);
});

test('rejects duplicate operations, invalid phases, and invalid period actions', () => {
  const start = ensureCompanionTrainingDay({ active: true, actionIndex: 0 });
  assert.equal(isCompanionTrainingPeriodAction(start, { action: 'training', attribute: 'Da' }), true);
  assert.equal(isCompanionTrainingPeriodAction(start, { action: 'rest' }), true);
  assert.equal(isCompanionTrainingPeriodAction(start, { action: 'outing' }), false);
  assert.equal(isCompanionTrainingPeriodAction(start, { action: 'training', attribute: 'Sp' }), false);

  const missingId = completeCompanionTrainingPeriod(start, { operationId: ' ', summary: 'done' });
  assert.equal(missingId.completed, false);
  const first = completeCompanionTrainingPeriod(start, { operationId: 'same', summary: 'done' });
  const duplicate = completeCompanionTrainingPeriod(first.training, { operationId: 'same', summary: 'again' });
  assert.equal(duplicate.completed, false);
  assert.equal(duplicate.training.companionDay.periodIndex, 1);

  const prematureCampus = completeCompanionTrainingCampusActivity(first.training, {
    operationId: 'campus-early',
    locationId: 'student_store'
  });
  assert.equal(prematureCampus.completed, false);
  assert.equal(prematureCampus.training.actionIndex, 0);
  assert.equal(isCompanionTrainingPeriodAction(
    { ...first.training, companionDay: { ...first.training.companionDay, periodIndex: 2 } },
    { action: 'lesson', attribute: 'Vi' }
  ), false);
});

test('keeps old saves compatible and replaces stale companion-day state', () => {
  const oldSave = normalizeNiaTraining({ active: true, fans: 25, fanTarget: 3000, actionIndex: 3 });
  assert.equal(oldSave.companionDay, null);

  const current = ensureCompanionTrainingDay({
    ...oldSave,
    companionDay: { planDayIndex: 2, periodIndex: 2, processedOperationIds: ['stale'] }
  });
  assert.equal(current.actionIndex, 3);
  assert.deepEqual(current.companionDay, {
    planDayIndex: 3,
    periodIndex: 0,
    morningSummary: '',
    afternoonSummary: '',
    campusLocationId: '',
    processedOperationIds: []
  });

  const stalePeriod = normalizeNiaTraining({
    active: true,
    actionIndex: 3,
    companionDay: { planDayIndex: 2, periodIndex: 0 }
  });
  assert.equal(isCompanionTrainingPeriodAction(stalePeriod, { action: 'rest' }), false);
  assert.equal(completeCompanionTrainingPeriod(stalePeriod, {
    operationId: 'stale-period', summary: 'must not apply'
  }).completed, false);

  const staleCampus = normalizeNiaTraining({
    active: true,
    actionIndex: 3,
    companionDay: { planDayIndex: 2, periodIndex: 2 }
  });
  assert.equal(completeCompanionTrainingCampusActivity(staleCampus, {
    operationId: 'stale-campus', locationId: 'student_store'
  }).completed, false);
});

test('maps business to the NIA business action and supplied icon', () => {
  assert.deepEqual(mapNiaPlanAction({ type: '营业' }), {
    action: 'nia_business',
    label: '营业',
    attribute: null,
    color: '#f0a33a',
    icon: 'UI/Business.png'
  });
});

test('returns only the current committed plan day', () => {
  const nia = {
    training: { active: true, actionIndex: 1 },
    plan: { days: [{ type: '外出' }, { type: '营业' }] }
  };
  assert.equal(getCurrentNiaPlanAction(nia).type, '营业');
  assert.equal(getCurrentNiaPlanAction({ ...nia, training: { active: false, actionIndex: 1 } }), null);
});

test('advances a matching ordinary NIA plan action exactly once', () => {
  const nia = {
    training: { active: true, fans: 0, fanTarget: 3000, actionIndex: 1 },
    plan: { days: [{ type: '制作人工作' }, { type: '陪同训练', title: 'Da训练' }, { type: '外出' }] }
  };

  const completed = advanceNiaOrdinaryPlanAction(nia, { action: 'training', attribute: 'Da' });
  assert.equal(completed.completed, true);
  assert.equal(completed.training.actionIndex, 2);

  const staleRepeat = advanceNiaOrdinaryPlanAction(
    { ...nia, training: completed.training },
    { action: 'training', attribute: 'Da' }
  );
  assert.equal(staleRepeat.completed, false);
  assert.equal(staleRepeat.training.actionIndex, 2);
});

test('treats a planned outing as an ordinary NIA action', () => {
  const nia = {
    training: { active: true, actionIndex: 0 },
    plan: { days: [{ type: '外出' }] }
  };

  const completed = advanceNiaOrdinaryPlanAction(nia, { action: 'outing', attribute: null });
  assert.equal(completed.completed, true);
  assert.equal(completed.training.actionIndex, 1);
});
