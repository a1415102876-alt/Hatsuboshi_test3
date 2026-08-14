import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");

function readFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const bodyStart = source.indexOf("{", start);
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
    if (char === '"' || char === "'" || char === "`") quote = char;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return vm.runInNewContext(`(${source.slice(objectStart, index + 1)})`);
    }
  }
  throw new Error(`Could not parse ${name}`);
}

function makePromptBuilder() {
  const context = {
    state: {
      idol: "月村手毬",
      trust: 45,
      boundCharacter: { name: "初星学园（里）" },
      day: 9,
      round: 1,
      Vo: 500,
      Da: 520,
      Vi: 410,
      stamina: 72,
      stress: 18,
      firstLive: { completed: false, success: false },
      producer: { name: "{{user}}", personality: "", style: "", settings: "" }
    },
    idols: {
      "月村手毬": {
        core: "冷淡外壳、脆弱自厌、SyngUp旧关系、制作人依赖。"
      }
    },
    affinityNodes: readObjectLiteral("affinityNodes"),
    affinityRouteSeeds: readObjectLiteral("affinityRouteSeeds"),
    hiroBondRoutes: readObjectLiteral("hiroBondRoutes"),
    seinaBondRoutes: readObjectLiteral("seinaBondRoutes"),
    kotoneBondRoutes: readObjectLiteral("kotoneBondRoutes"),
    sakiBondRoutes: readObjectLiteral("sakiBondRoutes"),
    umeBondRoutes: readObjectLiteral("umeBondRoutes"),
    chinaBondRoutes: readObjectLiteral("chinaBondRoutes"),
    liljaBondRoutes: readObjectLiteral("liljaBondRoutes"),
    sumikaBondRoutes: readObjectLiteral("sumikaBondRoutes"),
    maoBondRoutes: readObjectLiteral("maoBondRoutes"),
    rinamiBondRoutes: readObjectLiteral("rinamiBondRoutes"),
    temariBondRoutes: readObjectLiteral("temariBondRoutes"),
    misuzuBondRoutes: readObjectLiteral("misuzuBondRoutes"),
    amayaBondRoutes: readObjectLiteral("amayaBondRoutes"),
    getAffinityStageLine: () => "好感度阶段标签：AFF_TEMARI_40",
    buildProducerPromptSection: () => "",
    getPhase: () => "First Live 中期",
    roundLabel: () => "羁绊事件日",
    outputContract: (text) => `输出格式要求：${text}`,
    buildChoiceHardRules: () => "【输出硬规则】(测试桩)",
    FREE_MODE_MAP_CHOICE_MINUTES: 30
  };
  vm.runInNewContext(
    `${readFunction("galgameRenderContract")}\n${readFunction("formatBondOptions")}\n${readFunction("specialBondRoutesFor")}\n${readFunction("specialBondLabel")}\n${readFunction("buildSpecialBondPhase1Prompt")}\n${readFunction("buildSpecialBondPhase2Prompt")}\n${readFunction("buildSpecialBondFinalPrompt")}\n${readFunction("buildTemariBondPhase1Prompt")}\n${readFunction("buildTemariBondPhase2Prompt")}\n${readFunction("buildTemariBondFinalPrompt")}\n${readFunction("buildAffinityPrompt")}\nthis.buildAffinityPrompt = buildAffinityPrompt;`,
    context
  );
  return context.buildAffinityPrompt;
}

test("Temari bond 40 prompt starts a two-choice-route first phase", () => {
  const buildAffinityPrompt = makePromptBuilder();
  const prompt = buildAffinityPrompt(40);

  assert.match(prompt, /初星育成系统：手毬羁绊事件 - 第一轮选择/);
  assert.match(prompt, /第一轮选项：制作人如何揭开 SyngUp 的真相/);
  assert.match(prompt, /<option1>/);
  assert.match(prompt, /<option4>/);
  assert.doesNotMatch(prompt, /请写一段 1200 字以内的完整好感度剧情/);
});

test("Temari bond 100 remains a completed post-live ending prompt", () => {
  const buildAffinityPrompt = makePromptBuilder();
  const prompt = buildAffinityPrompt(100);

  assert.match(prompt, /演出成功后的故事收尾/);
  assert.match(prompt, /First Live 成功后：赌约兑现/);
  assert.doesNotMatch(prompt, /手毬羁绊事件 - 第一轮选择/);
});

test("Misuzu has dedicated two-choice bond route seeds", () => {
  const routes = readObjectLiteral("misuzuBondRoutes");
  assert.deepEqual(Object.keys(routes).map(Number), [20, 40, 60, 80]);
  assert.match(routes[20].canonAnchor, /SyngUp/);
  assert.match(routes[40].objective, /散步/);
  assert.match(routes[60].canonAnchor, /独占欲/);
  assert.match(routes[80].resolution, /直面手毬/);

  const routeSelector = readFunction("specialBondRoutesFor");
  const affinityPrompt = readFunction("buildAffinityPrompt");
  const triggerStart = source.indexOf("function triggerAffinityStory(");
  const triggerEnd = source.indexOf("const VIDEO_CDN", triggerStart);
  const triggerBody = source.slice(triggerStart, triggerEnd);

  assert.match(routeSelector, /idolName === "秦谷美铃"[\s\S]*misuzuBondRoutes/);
  assert.match(affinityPrompt, /specialBondRoutesFor\(\)\?\.\[threshold\]/);
  assert.match(triggerBody, /specialBondRoutesFor\(\)\?\.\[threshold\]/);
});

test("Kotone has dedicated two-choice bond route seeds", () => {
  const routes = readObjectLiteral("kotoneBondRoutes");
  assert.deepEqual(Object.keys(routes).map(Number), [20, 40, 60, 80]);
  assert.match(routes[20].canonAnchor, /不会抛弃/);
  assert.match(routes[40].objective, /打工/);
  assert.match(routes[60].canonAnchor, /玩偶秀/);
  assert.match(routes[80].resolution, /堂堂正正站上舞台/);

  const routeSelector = readFunction("specialBondRoutesFor");
  assert.match(routeSelector, /idolName === "藤田琴音"[\s\S]*kotoneBondRoutes/);
});

test("Amaya has dedicated two-choice bond route seeds", () => {
  const routes = readObjectLiteral("amayaBondRoutes");
  assert.deepEqual(Object.keys(routes).map(Number), [20, 40, 60, 80]);
  assert.match(routes[20].canonAnchor, /星南要毕业后退出偶像/);
  assert.match(routes[40].objective, /帅气凛然/);
  assert.match(routes[60].resolution, /你要支撑着我/);
  assert.match(routes[80].canonAnchor, /战胜星南/);

  const seeds = readObjectLiteral("affinityRouteSeeds")["雨夜燕"];
  assert.match(seeds[80], /必须赢的门口/);
  assert.doesNotMatch(seeds[80], /登台战胜星南夺第一/);
  assert.match(seeds[100], /试镜上燕登台战胜星南夺第一/);
  assert.match(seeds[100], /Live后的坦荡感谢与依赖/);

  const routeSelector = readFunction("specialBondRoutesFor");
  assert.match(routeSelector, /idolName === "雨夜燕"[\s\S]*amayaBondRoutes/);
});


test("Seina has dedicated two-choice bond route seeds", () => {
  const routes = readObjectLiteral("seinaBondRoutes");
  assert.deepEqual(Object.keys(routes).map(Number), [20, 40, 60, 80]);
  assert.match(routes[20].canonAnchor, /零成长/);
  assert.match(routes[40].canonAnchor, /藤田琴音/);
  assert.match(routes[60].resolution, /我要成为顶级偶像/);
  assert.match(routes[80].canonAnchor, /指路明灯/);

  const seeds = readObjectLiteral("affinityRouteSeeds")["十王星南"];
  assert.match(seeds[0], /一等星·启明星/);
  assert.match(seeds[100], /我最棒的顶级制作人/);

  const routeSelector = readFunction("specialBondRoutesFor");
  assert.match(routeSelector, /idolName === "十王星南"[\s\S]*seinaBondRoutes/);
});

test("Saki has dedicated two-choice bond route seeds", () => {
  const routes = readObjectLiteral("sakiBondRoutes");
  assert.deepEqual(Object.keys(routes).map(Number), [20, 40, 60, 80]);
  assert.match(routes[20].canonAnchor, /追不上佑芽/);
  assert.match(routes[40].objective, /谎言变成真实/);
  assert.match(routes[60].canonAnchor, /保姆式辅导/);
  assert.match(routes[80].resolution, /顶级偶像的证明/);

  const seeds = readObjectLiteral("affinityRouteSeeds")["花海咲季"];
  assert.match(seeds[0], /世界第一/);
  assert.match(seeds[40], /期末考试输给佑芽/);
  assert.match(seeds[80], /无法被复制/);
  assert.match(seeds[100], /共犯关系/);

  const routeSelector = readFunction("specialBondRoutesFor");
  assert.match(routeSelector, /idolName === "花海咲季"[\s\S]*sakiBondRoutes/);
});

test("Ume has dedicated two-choice bond route seeds", () => {
  const routes = readObjectLiteral("umeBondRoutes");
  assert.deepEqual(Object.keys(routes).map(Number), [20, 40, 60, 80]);
  assert.match(routes[20].canonAnchor, /宿敌/);
  assert.match(routes[40].objective, /突破口/);
  assert.match(routes[60].canonAnchor, /禁止说我输了/);
  assert.match(routes[80].resolution, /成为世界第一/);

  const seeds = readObjectLiteral("affinityRouteSeeds")["花海佑芽"];
  assert.match(seeds[0], /候补入学/);
  assert.match(seeds[40], /枷锁/);
  assert.match(seeds[80], /对等的对手/);
  assert.match(seeds[100], /成为姐姐的目标/);

  const routeSelector = readFunction("specialBondRoutesFor");
  assert.match(routeSelector, /idolName === "花海佑芽"[\s\S]*umeBondRoutes/);
});

test("China has dedicated two-choice bond route seeds", () => {
  const routes = readObjectLiteral("chinaBondRoutes");
  assert.deepEqual(Object.keys(routes).map(Number), [20, 40, 60, 80]);
  assert.match(routes[20].canonAnchor, /讨人喜欢/);
  assert.match(routes[40].objective, /放弃/);
  assert.match(routes[60].canonAnchor, /首场演唱会/);
  assert.match(routes[80].resolution, /First Live|被开除/);

  const seeds = readObjectLiteral("affinityRouteSeeds")["仓本千奈"];
  assert.match(seeds[0], /讨人喜欢/);
  assert.match(seeds[40], /绝不甘休/);
  assert.match(seeds[100], /吉娃娃/);
  assert.doesNotMatch(seeds[80], /N\.I\.A|FINALE/);

  const routeSelector = readFunction("specialBondRoutesFor");
  assert.match(routeSelector, /idolName === "仓本千奈"[\s\S]*chinaBondRoutes/);
});

test("Lilja has dedicated two-choice bond route seeds", () => {
  const routes = readObjectLiteral("liljaBondRoutes");
  assert.deepEqual(Object.keys(routes).map(Number), [20, 40, 60, 80]);
  assert.match(routes[20].canonAnchor, /顶级偶像/);
  assert.match(routes[40].objective, /清夏/);
  assert.match(routes[60].canonAnchor, /清夏到场观看/);
  assert.match(routes[80].resolution, /First Live/);

  const seeds = readObjectLiteral("affinityRouteSeeds")["葛城莉莉娅"];
  assert.match(seeds[0], /清夏/);
  assert.match(seeds[60], /清夏在观众席/);
  assert.match(seeds[100], /引导我的光|指路/);

  const routeSelector = readFunction("specialBondRoutesFor");
  assert.match(routeSelector, /idolName === "葛城莉莉娅"[\s\S]*liljaBondRoutes/);
});

test("Sumika has dedicated two-choice bond route seeds", () => {
  const routes = readObjectLiteral("sumikaBondRoutes");
  assert.deepEqual(Object.keys(routes).map(Number), [20, 40, 60, 80]);
  assert.match(routes[20].canonAnchor, /莉莉娅/);
  assert.match(routes[40].resolution, /负责到底/);
  assert.match(routes[60].canonAnchor, /芭蕾/);
  assert.match(routes[80].resolution, /First Live/);

  const seeds = readObjectLiteral("affinityRouteSeeds")["紫云清夏"];
  assert.match(seeds[0], /Pっち/);
  assert.match(seeds[40], /别再扰乱我的心/);
  assert.match(seeds[100], /一起变强/);

  const routeSelector = readFunction("specialBondRoutesFor");
  assert.match(routeSelector, /idolName === "紫云清夏"[\s\S]*sumikaBondRoutes/);
});

test("Mao has dedicated two-choice bond route seeds", () => {
  const routes = readObjectLiteral("maoBondRoutes");
  assert.deepEqual(Object.keys(routes).map(Number), [20, 40, 60, 80]);
  assert.match(routes[20].canonAnchor, /可爱偶像/);
  assert.match(routes[40].resolution, /喜欢.*自己/);
  assert.match(routes[60].canonAnchor, /女仆咖啡厅/);
  assert.match(routes[80].resolution, /First Live/);

  const seeds = readObjectLiteral("affinityRouteSeeds")["有村麻央"];
  assert.match(seeds[0], /小王子/);
  assert.match(seeds[40], /够了/);
  assert.match(seeds[100], /喜欢上自己/);

  const routeSelector = readFunction("specialBondRoutesFor");
  assert.match(routeSelector, /idolName === "有村麻央"[\s\S]*maoBondRoutes/);
});

test("Rinami has dedicated two-choice bond route seeds", () => {
  const routes = readObjectLiteral("rinamiBondRoutes");
  assert.deepEqual(Object.keys(routes).map(Number), [20, 40, 60, 80]);
  assert.match(routes[20].canonAnchor, /妹妹/);
  assert.match(routes[40].objective, /自然/);
  assert.match(routes[60].canonAnchor, /启明星/);
  assert.match(routes[80].resolution, /First Live|姐姐开关/);

  const seeds = readObjectLiteral("affinityRouteSeeds")["姬崎莉波"];
  assert.match(seeds[0], /莉波噗哟|成为我的姐姐/);
  assert.match(seeds[40], /琴音/);
  assert.match(seeds[100], /启明星/);
  assert.doesNotMatch(seeds[60], /N\.I\.A|四音/);

  const routeSelector = readFunction("specialBondRoutesFor");
  assert.match(routeSelector, /idolName === "姬崎莉波"[\s\S]*rinamiBondRoutes/);
});

test("Hiro has dedicated two-choice bond route seeds", () => {
  const routes = readObjectLiteral("hiroBondRoutes");
  assert.deepEqual(Object.keys(routes).map(Number), [20, 40, 60, 80]);
  assert.match(routes[20].canonAnchor, /HP1/);
  assert.match(routes[40].objective, /兴趣/);
  assert.match(routes[60].resolution, /常规训练/);
  assert.match(routes[80].canonAnchor, /明天开演唱会/);

  const seeds = readObjectLiteral("affinityRouteSeeds")["筱泽广"];
  assert.match(seeds[0], /最不适合我的/);
  assert.match(seeds[100], /从今往后，每天都要在一起哦/);

  const routeSelector = readFunction("specialBondRoutesFor");
  assert.match(routeSelector, /idolName === "筱泽广"[\s\S]*hiroBondRoutes/);
});
