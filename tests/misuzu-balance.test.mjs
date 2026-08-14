import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");

function readFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const signatureEnd = source.indexOf(") {", start);
  assert.notEqual(signatureEnd, -1, `${name} signature must end`);
  const bodyStart = signatureEnd + 2;
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'" || char === "`") quote = char;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`Could not parse ${name}`);
}

test("Misuzu uses two-action equivalent lesson and training tuning", () => {
  const context = { canonicalIdolName: (name) => name, lessonEventChance: 45, trainingEventChance: 55 };
  vm.runInNewContext(`${readFunction("getActionTuning")}\nthis.getActionTuning = getActionTuning;`, context);

  assert.deepEqual(JSON.parse(JSON.stringify(context.getActionTuning("秦谷美铃", "lesson"))), {
    lessonGain: 98,
    staminaDelta: -30,
    trainingMultiplier: 1,
    eventChance: 45
  });
  assert.deepEqual(JSON.parse(JSON.stringify(context.getActionTuning("秦谷美铃", "training"))), {
    lessonGain: 0,
    staminaDelta: -33,
    trainingMultiplier: 1.5,
    eventChance: 55
  });
  assert.deepEqual(JSON.parse(JSON.stringify(context.getActionTuning("秦谷美铃", "rest"))), {
    lessonGain: 0,
    staminaDelta: 30,
    trainingMultiplier: 1,
    eventChance: 50
  });
});

test("other idols retain the existing action balance", () => {
  const context = { canonicalIdolName: (name) => name, lessonEventChance: 45, trainingEventChance: 55 };
  vm.runInNewContext(`${readFunction("getActionTuning")}\nthis.getActionTuning = getActionTuning;`, context);
  assert.equal(context.getActionTuning("藤田琴音", "lesson").lessonGain, 65);
  assert.equal(context.getActionTuning("藤田琴音", "lesson").staminaDelta, -10);
  assert.equal(context.getActionTuning("藤田琴音", "training").staminaDelta, -12);
  assert.equal(context.getActionTuning("藤田琴音", "training").trainingMultiplier, 1);
  assert.equal(context.getActionTuning("藤田琴音", "rest").eventChance, 0);
});

test("Misuzu training multiplier is applied before the existing SP bonus", () => {
  const context = { Math };
  vm.runInNewContext(`${readFunction("calculateTrainingGain")}\nthis.calculateTrainingGain = calculateTrainingGain;`, context);
  assert.equal(context.calculateTrainingGain(50, 1.5, false), 75);
  assert.equal(context.calculateTrainingGain(50, 1.5, true), 113);
  assert.equal(context.calculateTrainingGain(3, 1.5, false), 5);
  assert.equal(context.calculateTrainingGain(3, 1.5, true), 8);
  assert.equal(context.calculateTrainingGain(50, 1, true), 75);
});

test("stamina-consuming lessons and training are unavailable without enough stamina", () => {
  const context = {
    state: { idol: "藤田琴音", stamina: 0, round: 1, liveReady: false },
    canonicalIdolName: (name) => name,
    lessonEventChance: 45,
    trainingEventChance: 55,
    isBondEventDay: () => false,
    isExtraRound: () => false
  };
  vm.runInNewContext(
    `${readFunction("getActionTuning")}\n${readFunction("hasEnoughStaminaForAction")}\n${readFunction("isActionAvailable")}\nthis.isActionAvailable = isActionAvailable;`,
    context
  );

  assert.equal(context.isActionAvailable("training"), false);
  assert.equal(context.isActionAvailable("lesson"), false);
  assert.equal(context.isActionAvailable("rest"), true);

  context.state.stamina = 11;
  assert.equal(context.isActionAvailable("training"), false);
  context.state.stamina = 12;
  assert.equal(context.isActionAvailable("training"), true);

  context.state.idol = "秦谷美铃";
  context.state.stamina = 32;
  assert.equal(context.isActionAvailable("training"), false);
  context.state.stamina = 33;
  assert.equal(context.isActionAvailable("training"), true);
});

test("settlement, random events, and UI consume shared action tuning", () => {
  assert.match(readFunction("settleAction"), /getActionTuning\(state\.idol, action\)/);
  assert.match(readFunction("settleAction"), /calculateTrainingGain/);
  assert.match(readFunction("rollActionEvent"), /getActionTuning\(state\.idol, action\)/);
  assert.match(readFunction("renderActionButtons"), /getActionCostText\(state\.idol/);
});
