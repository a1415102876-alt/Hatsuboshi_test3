import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");

function readObjectLiteral(name) {
  const marker = `const ${name} = `;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `${name} must exist`);
  const objectStart = source.indexOf("{", start + marker.length);
  let depth = 0;
  let quote = "";
  let escaped = false;

  for (let index = objectStart; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return vm.runInNewContext(`(${source.slice(objectStart, index + 1)})`);
    }
  }
  throw new Error(`Could not parse ${name}`);
}

function readFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const signatureEnd = source.indexOf(")", start);
  const bodyStart = source.indexOf("{", signatureEnd);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`Could not parse ${name}`);
}

test("all playable idols have stable affinity tag codes", () => {
  const codes = readObjectLiteral("affinityIdolCodes");
  assert.deepEqual(JSON.parse(JSON.stringify(codes)), {
    "藤田琴音": "KOTONE",
    "月村手毬": "TEMARI",
    "花海咲季": "SAKI",
    "花海佑芽": "UME",
    "筱泽广": "HIRO",
    "十王星南": "SENA",
    "秦谷美铃": "MISUZU",
    "仓本千奈": "CHINA",
    "葛城莉莉娅": "LILJA",
    "紫云清夏": "SUMIKA",
    "有村麻央": "MAO",
    "姬崎莉波": "RINAMI",
    "雨夜燕": "TSUBAME"
  });
});

test("affinity tags use the highest reached trust threshold", () => {
  const affinityIdolCodes = { "葛城莉莉娅": "LILJA" };
  const context = { affinityIdolCodes };
  vm.runInNewContext(`${readFunction("getAffinityStageThreshold")}\n${readFunction("getAffinityStageTag")}\nthis.getAffinityStageTag = getAffinityStageTag;`, context);

  const cases = [
    [0, "AFF_LILJA_0"], [19, "AFF_LILJA_0"],
    [20, "AFF_LILJA_20"], [39, "AFF_LILJA_20"],
    [40, "AFF_LILJA_40"], [59, "AFF_LILJA_40"],
    [60, "AFF_LILJA_60"], [79, "AFF_LILJA_60"],
    [80, "AFF_LILJA_80"], [99, "AFF_LILJA_80"],
    [100, "AFF_LILJA_100"], [150, "AFF_LILJA_100"]
  ];

  for (const [trust, expected] of cases) {
    assert.equal(context.getAffinityStageTag("葛城莉莉娅", trust), expected);
  }
  assert.equal(context.getAffinityStageTag("未知偶像", 40), "");
});

test("affinity stage line uses the exact worldbook trigger format", () => {
  const context = {
    affinityIdolCodes: { "葛城莉莉娅": "LILJA" }
  };
  vm.runInNewContext(
    `${readFunction("getAffinityStageThreshold")}\n${readFunction("getAffinityStageTag")}\n${readFunction("getAffinityStageLine")}\nthis.getAffinityStageLine = getAffinityStageLine;`,
    context
  );
  assert.equal(context.getAffinityStageLine("葛城莉莉娅", 47), "好感度阶段标签：AFF_LILJA_40");
  assert.equal(context.getAffinityStageLine("未知偶像", 47), "");
});

test("every AI prompt builder includes the affinity stage line", () => {
  const builders = [
    "buildPrompt",
    "buildChoicePhase1Prompt",
    "buildChoicePhase2Prompt",
    "buildOpeningPrompt",
    "buildLivePrompt",
    "buildAffinityPrompt",
    "buildFreeChatPrompt",
    "buildIdolInteractionPrompt",
    "buildFirstLivePrePrompt",
    "buildFirstLivePostPrompt"
  ];

  for (const [index, name] of builders.entries()) {
    const start = source.indexOf(`  function ${name}(`);
    assert.notEqual(start, -1, `${name} must exist`);
    const nextBuilder = builders
      .slice(index + 1)
      .map((candidate) => source.indexOf(`  function ${candidate}(`, start + 1))
      .filter((position) => position !== -1)
      .sort((a, b) => a - b)[0];
    const nextFunction = source.indexOf("\n  function ", start + 1);
    const end = Math.min(...[nextBuilder, nextFunction, source.length].filter((position) => position !== undefined && position !== -1));
    const body = source.slice(start, end);
    assert.match(body, /getAffinityStageLine\(state\.idol, state\.trust\)/, `${name} must include the current affinity tag`);
  }
});

test("AI prompt builders include the galgame render contract", () => {
  const builders = [
    "buildPrompt",
    "buildChoicePhase1Prompt",
    "buildChoicePhase2Prompt",
    "buildOpeningPrompt",
    "buildLivePrompt",
    "buildAffinityPrompt",
    "buildFreeChatPrompt",
    "buildIdolInteractionPrompt",
    "buildFirstLivePrePrompt",
    "buildFirstLivePostPrompt"
  ];

  assert.match(source, /function galgameRenderContract\(/, "shared render contract helper must exist");
  assert.match(source, /【初星学园 Galgame 渲染规则契约】/);
  assert.match(source, /普通剧情中只使用：/);
  assert.match(source, /选项剧情必须输出完整四个 option。/);

  for (const name of builders) {
    const start = source.indexOf(`  function ${name}(`);
    assert.notEqual(start, -1, `${name} must exist`);
    const end = source.indexOf("\n  function ", start + 1);
    const body = source.slice(start, end === -1 ? source.length : end);
    assert.match(body, /galgameRenderContract\(|outputContract\(/, `${name} must include the shared render contract`);
  }
});

test("produce action prompt anchors prior story to avoid replaying opening", () => {
  assert.match(source, /function summarizeProduceActionContext\(/);
  const buildPrompt = readFunction("buildPrompt");
  assert.match(buildPrompt, /summarizeProduceActionContext\(\)/);
  assert.match(buildPrompt, /上文摘要/);
  assert.match(buildPrompt, /不要重写担当开场/);
  assert.match(buildPrompt, /不要.*递名片/);
  assert.match(buildPrompt, /必须直接写本次行动现场/);
});