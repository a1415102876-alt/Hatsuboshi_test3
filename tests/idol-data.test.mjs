import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../app.js", import.meta.url), "utf8");

function readObjectLiteral(constName) {
  const declaration = `const ${constName} =`;
  const declarationIndex = source.indexOf(declaration);
  assert.notEqual(declarationIndex, -1, `${constName} declaration must exist`);

  const start = source.indexOf("{", declarationIndex + declaration.length);
  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      quote = character;
    } else if (character === "{") {
      depth += 1;
    } else if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        return vm.runInNewContext(`(${source.slice(start, index + 1)})`);
      }
    }
  }

  throw new Error(`Could not parse ${constName}`);
}

const idols = readObjectLiteral("idols");
const idolPresets = readObjectLiteral("idolPresets");
const affinityRouteSeeds = readObjectLiteral("affinityRouteSeeds");

const expected = {
  "雨夜燕": [115, 125, 100, 20, 23, 17],
  "姬崎莉波": [85, 120, 125, 13, 21.5, 25.5],
  "葛城莉莉娅": [80, 100, 115, 18, 20, 18],
  "有村麻央": [125, 90, 100, 22, 8, 23],
  "紫云清夏": [100, 115, 90, 9, 23, 23],
  "仓本千奈": [75, 115, 125, 10, 24, 20.5]
};

test("十王星南 uses her in-game stat profile and matching final live limits", () => {
  assert.deepEqual(Array.from(idolPresets["十王星南"].slice(0, 6)), [175, 125, 140, 15, 8, 20.5]);
  assert.deepEqual(Array.from(idolPresets["十王星南"].slice(6, 12)), [1280, 1050, 1500, 1930, 1650, 2200]);
});

for (const [name, suppliedStats] of Object.entries(expected)) {
  test(`${name} has a complete playable configuration`, () => {
    assert.equal(typeof idols[name]?.core, "string");
    assert.ok(idols[name].core.length > 10);
    assert.deepEqual(Object.keys(idols[name].styles).sort(), ["companion", "lesson", "outing", "rest", "training"]);
    assert.equal(idolPresets[name].length, 12);
    assert.deepEqual(Array.from(idolPresets[name].slice(0, 6)), suppliedStats);
    assert.ok(idolPresets[name].every(Number.isFinite));
    assert.deepEqual(Object.keys(affinityRouteSeeds[name]).map(Number).sort((a, b) => a - b), [0, 20, 40, 60, 80, 100]);
  });
}

test("every playable idol has a stable background filename", () => {
  const backgrounds = {
    "藤田琴音": "./assets/idols/fujita-kotone.png",
    "月村手毬": "./assets/idols/tsukimura-temari.png",
    "花海咲季": "./assets/idols/hanami-saki.png",
    "花海佑芽": "./assets/idols/hanami-ume.png",
    "筱泽广": "./assets/idols/shinosawa-hiro.png",
    "十王星南": "./assets/idols/juo-sena.png",
    "秦谷美铃": "./assets/idols/hataya-misuzu.png",
    "仓本千奈": "./assets/idols/kuramoto-china.png",
    "葛城莉莉娅": "./assets/idols/katsuragi-lilja.png",
    "紫云清夏": "./assets/idols/shiun-sumika.png",
    "有村麻央": "./assets/idols/arimura-mao.png",
    "姬崎莉波": "./assets/idols/himesaki-rinami.png",
    "雨夜燕": "./assets/idols/amaya-tsubame.png"
  };
  for (const [name, background] of Object.entries(backgrounds)) {
    assert.equal(idols[name].background, background);
  }
  for (const background of Object.values(backgrounds).filter((path) => ["fujita-kotone.png", "tsukimura-temari.png", "hanami-saki.png", "hataya-misuzu.png"].some((file) => path.endsWith(file)))) {
    assert.equal(existsSync(new URL(`../${background.replace("./", "")}`, import.meta.url)), true);
  }
  assert.match(source, /function applyIdolBackground\(/);
});


test("雨夜燕 uses the existing select background filename", () => {
  assert.match(source, /const selectBackgroundCodes = \{/);
  assert.match(source, /"雨夜燕": "amaya"/);
  assert.match(source, /selectBackgroundCodes\[idolName\] \|\| affinityIdolCodes\[idolName\]\?\.toLowerCase\(\)/);
});

test("configured BGM files exist", () => {
  const bgmConfig = readObjectLiteral("BGM_CONFIG");
  for (const path of Object.values(bgmConfig)) {
    assert.equal(existsSync(new URL(`../${path.replace("./", "")}`, import.meta.url)), true, `${path} must exist`);
  }
});

test("every playable idol has a stable avatar filename", () => {
  const avatars = {
    "藤田琴音": "./assets/avatars/fujita-kotone.png",
    "月村手毬": "./assets/avatars/tsukimura-temari.png",
    "花海咲季": "./assets/avatars/hanami-saki.png",
    "花海佑芽": "./assets/avatars/hanami-ume.png",
    "筱泽广": "./assets/avatars/shinosawa-hiro.png",
    "十王星南": "./assets/avatars/juo-sena.png",
    "秦谷美铃": "./assets/avatars/hataya-misuzu.png",
    "仓本千奈": "./assets/avatars/kuramoto-china.png",
    "葛城莉莉娅": "./assets/avatars/katsuragi-lilja.png",
    "紫云清夏": "./assets/avatars/shiun-sumika.png",
    "有村麻央": "./assets/avatars/arimura-mao.png",
    "姬崎莉波": "./assets/avatars/himesaki-rinami.png",
    "雨夜燕": "./assets/avatars/amaya-tsubame.png"
  };
  for (const [name, avatar] of Object.entries(avatars)) {
    assert.equal(idols[name].avatar, avatar);
  }
  assert.match(source, /class="idol-avatar"/);
  assert.match(source, /class="idol-card-copy"/);
});

test("葛城莉莉娅 uses episode-based affinity seeds and bond routes", () => {
  const routes = readObjectLiteral("liljaBondRoutes");
  assert.deepEqual(Object.keys(routes).map(Number), [20, 40, 60, 80]);
  assert.match(routes[40].canonAnchor, /清夏/);
  assert.match(routes[80].resolution, /First Live/);

  const seeds = affinityRouteSeeds["葛城莉莉娅"];
  assert.match(seeds[0], /迷路/);
  assert.match(seeds[40], /清夏/);
  assert.match(seeds[100], /顶级偶像/);
  assert.doesNotMatch(seeds[0], /^初遇：拘谨/);
});

test("仓本千奈 uses episode-based affinity seeds and bond routes", () => {
  const routes = readObjectLiteral("chinaBondRoutes");
  assert.deepEqual(Object.keys(routes).map(Number), [20, 40, 60, 80]);
  assert.match(routes[60].canonAnchor, /首场演唱会|相信老师/);
  assert.match(routes[80].resolution, /First Live|被开除/);

  const seeds = affinityRouteSeeds["仓本千奈"];
  assert.match(seeds[0], /亲自选择|委托/);
  assert.match(seeds[40], /绝不甘休/);
  assert.match(seeds[100], /吉娃娃|新手偶像/);
  assert.doesNotMatch(seeds[80], /N\.I\.A|FINALE/);
  assert.doesNotMatch(seeds[0], /^从家族安排的委托开始/);
});

test("姬崎莉波 uses episode-based affinity seeds and bond routes", () => {
  const routes = readObjectLiteral("rinamiBondRoutes");
  assert.deepEqual(Object.keys(routes).map(Number), [20, 40, 60, 80]);
  assert.match(routes[40].canonAnchor, /琴音/);
  assert.match(routes[80].resolution, /First Live|姐姐开关/);

  const seeds = affinityRouteSeeds["姬崎莉波"];
  assert.match(seeds[0], /成为我的姐姐/);
  assert.match(seeds[40], /琴音/);
  assert.match(seeds[100], /启明星/);
  assert.doesNotMatch(seeds[60], /N\.I\.A|四音/);
  assert.doesNotMatch(seeds[100], /月色真美/);
  assert.doesNotMatch(seeds[0], /^与制作人重逢后/);
});

test("雨夜燕 has a configured live video file", () => {
  const idolVideoFiles = readObjectLiteral("idolVideoFiles");
  assert.equal(idolVideoFiles["雨夜燕"], "amaya-tsubame-live.mp4");
});
