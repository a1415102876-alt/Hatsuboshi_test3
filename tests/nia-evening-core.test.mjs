import test from 'node:test';
import assert from 'node:assert/strict';

await import('../nia-evening-core.js');
const evening = globalThis.HatsuNiaEvening;

test('old saves receive an idle NIA evening', () => {
  assert.deepEqual(evening.normalizeEvening(null), {
    status: 'idle', dayIndex: -1, clockMinutes: 1320, atApartment: false, companionIdol: '', startedAt: 0, completedAt: 0
  });
});

test('a completed plan day activates one 22:00 evening without resetting it', () => {
  const active = evening.activateEvening(null, { completedDayIndex: 2, now: 100 });
  assert.equal(active.status, 'active');
  assert.equal(active.dayIndex, 2);
  assert.equal(active.clockMinutes, 1320);
  assert.equal(active.startedAt, 100);

  const advanced = evening.advanceEveningClock(active, 25);
  const duplicate = evening.activateEvening(advanced, { completedDayIndex: 2, now: 200 });
  assert.equal(duplicate.clockMinutes, 1345);
  assert.equal(duplicate.startedAt, 100);
});

test('NIA evening clock advancement is bounded and ignores inactive state', () => {
  const idle = evening.advanceEveningClock(null, 30);
  assert.equal(idle.status, 'idle');
  assert.equal(idle.clockMinutes, 1320);

  const active = evening.activateEvening(null, { completedDayIndex: 0, now: 1 });
  assert.equal(evening.advanceEveningClock(active, 30).clockMinutes, 1350);
  assert.equal(evening.advanceEveningClock(active, 1000).clockMinutes, 1439);
});

test('companion and sleep update only the evening runtime', () => {
  const active = evening.activateEvening(null, { completedDayIndex: 4, now: 10 });
  const entered = evening.enterEveningApartment(active, '花海咲季');
  assert.equal(entered.atApartment, true);
  const accompanied = evening.setEveningCompanion(entered, '花海咲季');
  assert.equal(accompanied.companionIdol, '花海咲季');

  const completed = evening.completeEvening(accompanied, { completedDayIndex: 4, now: 20 });
  assert.equal(completed.status, 'completed');
  assert.equal(completed.dayIndex, 4);
  assert.equal(completed.atApartment, false);
  assert.equal(completed.companionIdol, '');
  assert.equal(completed.completedAt, 20);
  assert.deepEqual(evening.completeEvening(completed, { completedDayIndex: 4, now: 30 }), completed);
});
