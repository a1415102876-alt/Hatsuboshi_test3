import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const normalize = (value) => JSON.parse(JSON.stringify(value));

function readFunction(source, functionName) {
  const start = source.indexOf(`function ${functionName}(`);
  assert.notEqual(start, -1, `${functionName} must exist`);
  const bodyStart = source.indexOf("{", source.indexOf(")", start));
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'" || character === "`") quote = character;
    else if (character === "{") depth += 1;
    else if (character === "}" && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`Could not parse ${functionName}`);
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}
function loadInjection() {
  const sandbox = { globalThis: {}, console };
  sandbox.globalThis = sandbox;
  for (const file of ["world/director-state.js", "world/director-injection.js"]) {
    vm.runInNewContext(readFileSync(new URL(file, root), "utf8"), sandbox, { filename: file });
  }
  return sandbox.HatsuWorld.directorInjection;
}

function directorState() {
  return {
    schemaVersion: 1,
    enabled: true,
    directorRevision: 3,
    chronicleRevision: 4,
    chronicleDigests: [],
    dailyDirection: {
      dayKey: "day-2",
      tone: "克制而温暖",
      summary: "让训练承诺获得一次可观察的回应。",
      focusActorIds: ["idol:藤田琴音"],
      focusPressureIds: ["p-focus", "p-private"],
      narrativeGoals: ["体现承诺的重量"],
      avoid: ["替玩家作决定"]
    },
    pressures: [
      {
        id: "p-focus", type: "relationship", theme: "trust", actorId: "idol:藤田琴音", targetIds: ["producer"],
        scopeKey: "global", sourceRefs: ["digest-1"], sourceSummary: "明确约定", stage: "emerging", intensity: 55,
        direction: "mixed", visibility: "implicit", dramaticNeed: "确认制作人是否可靠", escalationConditions: ["再次迟到"],
        reliefConditions: ["按时出现"], status: "active", locked: false
      },
      {
        id: "p-private", type: "relationship", theme: "trust", actorId: "idol:月村手毬", targetIds: ["idol:秦谷美铃"],
        scopeKey: "global", sourceRefs: ["digest-secret"], sourceSummary: "无关私密证据", stage: "active", intensity: 90,
        direction: "negative", visibility: "private", dramaticNeed: "不应泄露", escalationConditions: [], reliefConditions: [], status: "active"
      },
      {
        id: "p-location", type: "social", theme: "public_rumor", actorId: "idol:花海咲季", targetIds: [],
        scopeKey: "location:classroom", sourceRefs: ["digest-2"], sourceSummary: "教室里的公开传言", stage: "latent", intensity: 30,
        direction: "mixed", visibility: "public", dramaticNeed: "让传言保持背景压力", escalationConditions: [], reliefConditions: [], status: "active"
      },
      {
        id: "p-suspended", type: "schedule", theme: "overwork", actorId: "idol:藤田琴音", targetIds: [],
        scopeKey: "global", sourceRefs: ["digest-3"], sourceSummary: "暂停事项", stage: "latent", intensity: 80,
        direction: "negative", visibility: "implicit", dramaticNeed: "暂停", escalationConditions: [], reliefConditions: [], status: "suspended"
      }
    ],
    activeJob: null,
    dirty: false,
    lastAppliedJobId: "job-3",
    receipts: [{ jobId: "job-3", reason: "SECRET RECEIPT" }]
  };
}

function context(overrides = {}) {
  return {
    currentDayKey: "day-2",
    participants: ["producer", "idol:藤田琴音"],
    locationId: "classroom",
    scopeKey: "scope-a",
    maxChars: 1400,
    ...overrides
  };
}

test("relevance selection includes participant and location pressure but excludes unrelated private or suspended pressure", () => {
  const api = loadInjection();
  const selected = normalize(api.selectRelevantPressures(directorState(), context()));
  assert.deepEqual(selected.map((item) => item.id), ["p-focus", "p-location"]);
  assert.equal(selected.some((item) => item.id === "p-private" || item.id === "p-suspended"), false);
});

test("narrative block is bounded, private, and treats direction as guidance rather than authority", () => {
  const api = loadInjection();
  const block = api.composeDirectorNarrativeBlock(directorState(), context({ maxChars: 900 }));
  assert.ok(block.length <= 900);
  assert.match(block, /叙事方向.*不是既定剧本/);
  assert.match(block, /压力不必在本轮爆发/);
  assert.match(block, /不得修改.*数值.*时间/);
  assert.match(block, /不得替玩家创造选择/);
  assert.match(block, /确认制作人是否可靠/);
  for (const secret of ["无关私密证据", "不应泄露", "SECRET RECEIPT", "digest-1", "job-3"]) {
    assert.equal(block.includes(secret), false);
  }
});

test("disabled or stale-day direction produces no private narrative block", () => {
  const api = loadInjection();
  const disabled = directorState();
  disabled.enabled = false;
  assert.equal(api.composeDirectorNarrativeBlock(disabled, context()), "");
  assert.equal(api.composeDirectorNarrativeBlock(directorState(), context({ currentDayKey: "day-3" })), "");
});

test("styled direction injects separate active long-term threads and omits dormant threads", () => {
  const api = loadInjection();
  const director = directorState();
  director.dailyDirection.styleMixRevision = 3;
  director.dailyDirection.styleThreads = {
    heroic: {
      status: "active", weight: 60, focusPressureIds: ["p-focus"],
      dramaticQuestion: "她能否找到新的训练方法？", narrativeGoals: ["检验当前方法的极限"], dormantReason: ""
    },
    romance: {
      status: "dormant", weight: 40, focusPressureIds: [],
      dramaticQuestion: "", narrativeGoals: [], dormantReason: "当前没有合法关系素材"
    },
    kaibunsho: null
  };
  const block = api.composeDirectorNarrativeBlock(director, context({ maxChars: 1200 }));
  assert.match(block, /王道长期问题/);
  assert.match(block, /她能否找到新的训练方法/);
  assert.doesNotMatch(block, /恋爱长期问题/);
  assert.doesNotMatch(block, /当前没有合法关系素材/);
});

test("evidence contract requests bounded structured facts without authorizing state changes", () => {
  const contract = loadInjection().composeDirectorEvidenceContract();
  assert.match(contract, /<director_event>/);
  assert.match(contract, /"facts"/);
  assert.match(contract, /"playerChoices"/);
  assert.match(contract, /每组最多 3 条/);
  assert.match(contract, /不得写入正文/);
  assert.match(contract, /不代表状态修改/);
});

test("only the approved prompt builders receive one director addendum", () => {
  for (const name of ["buildPrompt", "buildFreeChatPrompt", "buildIdolInteractionPrompt", "buildMapLocationExplorePrompt"]) {
    const start = appSource.indexOf(`function ${name}(`);
    assert.notEqual(start, -1);
    const end = appSource.indexOf("\n  function ", start + 1);
    const source = appSource.slice(start, end);
    assert.equal((source.match(/composeWorldDirectorPromptAddendum\(/g) || []).length, 1, `${name} should append once`);
  }
  for (const name of ["buildPhoneChatPrompt", "buildFirstLivePrePrompt", "buildBroadcastPrompt"]) {
    const start = appSource.indexOf(`function ${name}(`);
    if (start < 0) continue;
    const end = appSource.indexOf("\n  function ", start + 1);
    assert.doesNotMatch(appSource.slice(start, end), /composeWorldDirectorPromptAddendum\(/, `${name} must stay excluded`);
  }
});

test("approved builders execute against frozen state and append the director context exactly once", () => {
  let addendumCalls = 0;
  const state = deepFreeze({
    idol: "藤田琴音", trust: 40, day: 2, round: 1, Vo: 100, Da: 90, Vi: 80, stamina: 70, stress: 10,
    growth: { Vo: 1, Da: 1, Vi: 1 }, sp: {}, boundCharacter: { name: "卡" },
    freeMode: { activeLocationId: "classroom" }
  });
  const sandbox = {
    state,
    idols: { 藤田琴音: { core: "角色核心", styles: { lesson: "课程风格", rest: "休息风格" } } },
    interactionCharacters: ["藤田琴音", "月村手毬"],
    actionLabel: () => "课程",
    getAffinityStageLine: () => "AFF_TAG",
    getPhase: () => "阶段",
    roundLabel: () => "上午",
    summarizeProduceActionContext: () => "上文",
    buildProducerPromptSection: () => "[PRODUCER]",
    composeWorldSummaryBlock: () => "[PUBLIC WORLD]",
    outputContract: () => "[OUTPUT]",
    composeWorldDirectorPromptAddendum: () => {
      addendumCalls += 1;
      return "[DIRECTOR ADDENDUM]";
    },
    globalThis: {
      HatsuWorldStorytellerInjection: {
        composeStorytellerIncidentPromptAddendum: () => "[STORYTELLER]",
        composeNarrativeAuthorityContract: () => "[AUTHORITY]"
      }
    }
  };
  Object.assign(sandbox.globalThis, sandbox);
  const buildPrompt = vm.runInNewContext(`(${readFunction(appSource, "buildPrompt")})`, sandbox);
  const buildFreeChatPrompt = vm.runInNewContext(`(${readFunction(appSource, "buildFreeChatPrompt")})`, sandbox);
  const buildIdolInteractionPrompt = vm.runInNewContext(`(${readFunction(appSource, "buildIdolInteractionPrompt")})`, sandbox);
  const prompts = [
    buildPrompt("lesson", "Vo", "结算完成", null, { locationId: "classroom" }),
    buildFreeChatPrompt("今天的训练"),
    buildIdolInteractionPrompt(["月村手毬"], "共同练习", false)
  ];
  assert.equal(addendumCalls, 3);
  for (const prompt of prompts) assert.equal((prompt.match(/\[DIRECTOR ADDENDUM\]/g) || []).length, 1);
  assert.match(prompts[0], /\[PUBLIC WORLD\]/);
  assert.ok(prompts[0].indexOf("缁撶畻瀹屾垚") < prompts[0].indexOf("[DIRECTOR ADDENDUM]"));
  assert.ok(prompts[0].indexOf("[DIRECTOR ADDENDUM]") < prompts[0].indexOf("[STORYTELLER]"));
  assert.ok(prompts[0].indexOf("[STORYTELLER]") < prompts[0].indexOf("[AUTHORITY]"));
  assert.ok(prompts[0].indexOf("[AUTHORITY]") < prompts[0].indexOf("[OUTPUT]"));
  assert.equal(state.day, 2);
});
test("director injection module loads before app in direct and ST loaders", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const st = readFileSync(new URL("../st.html", import.meta.url), "utf8");
  assert.ok(html.indexOf("world/director-injection.js") < html.indexOf("app.js"));
  assert.match(st, /"world\/director-injection\.js"/);
});
