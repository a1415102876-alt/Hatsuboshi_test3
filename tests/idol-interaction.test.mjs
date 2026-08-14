import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const htmlSource = readFileSync(new URL("../index.html", import.meta.url), "utf8");

function readFunction(functionName) {
  const declaration = `function ${functionName}`;
  const start = appSource.indexOf(declaration);
  assert.notEqual(start, -1, `${functionName} must exist`);
  const bodyStart = appSource.indexOf("{", start);
  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let index = bodyStart; index < appSource.length; index += 1) {
    const character = appSource[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'" || character === "`") quote = character;
    else if (character === "{") depth += 1;
    else if (character === "}") {
      depth -= 1;
      if (depth === 0) return appSource.slice(start, index + 1);
    }
  }
  throw new Error(`Could not parse ${functionName}`);
}

const context = {
  state: {
    idol: "藤田琴音",
    boundCharacter: { name: "初星学园" },
    day: 4,
    round: 2,
    Vo: 300,
    Da: 320,
    Vi: 340,
    stamina: 72,
    stress: 8,
    trust: 25
  },
  idols: { "藤田琴音": { core: "现实收益、被选择的不安与夸奖燃料。" } },
  interactionCharacters: ["藤田琴音", "月村手毬", "花海咲季", "葛城莉莉娅"],
  getPhase: () => "First Live 前期",
  getAffinityStageLine: () => "好感度阶段标签：AFF_KOTONE_20",
  roundLabel: () => "第 2 / 3 轮行动",
  buildProducerPromptSection: () => "",
  outputContract: (text) => `OUTPUT:${text}`,
  composeWorldDirectorPromptAddendum: () => ""
};

test("selected idols are all required in a zero-cost interaction", () => {
  const builder = vm.runInNewContext(`(${readFunction("buildIdolInteractionPrompt")})`, context);
  const prompt = builder(["月村手毬", "花海咲季"], "训练后一起去便利店", false);
  assert.match(prompt, /月村手毬、花海咲季/);
  assert.match(prompt, /训练后一起去便利店/);
  assert.match(prompt, /所有指定角色都必须实际参与/);
  assert.match(prompt, /不消耗行动次数/);
  assert.match(prompt, /不推进轮次、日期/);
  assert.match(prompt, /不增加或减少任何数值/);
  assert.match(prompt, /1200 字以内/);
  assert.match(prompt, /好感度阶段标签：AFF_KOTONE_20/);
});

test("AI-decides mode receives the valid supporting cast", () => {
  const builder = vm.runInNewContext(`(${readFunction("buildIdolInteractionPrompt")})`, context);
  const prompt = builder([], "", true);
  assert.match(prompt, /由 AI 决定/);
  assert.match(prompt, /月村手毬、花海咲季、葛城莉莉娅/);
  assert.match(prompt, /选择一至三名/);
  assert.match(prompt, /情节也由 AI 自行设计/);
});

test("interaction overlay exposes stable controls", () => {
  for (const id of ["interactionOverlay", "interactionModeSpecified", "interactionModeAi", "interactionCharacterList", "interactionPlotTextarea", "interactionSendBtn"]) {
    assert.match(htmlSource, new RegExp(`id=["']${id}["']`));
  }
});
