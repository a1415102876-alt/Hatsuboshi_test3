import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);

function loadWorldGenModules() {
  const files = [
    "world/cast-track.js",
    "world/events-pool.js",
    "world/buzz-pool.js",
    "world/campus-behavior.js",
    "world/injection.js",
    "world/daily-tick.js",
    "tasks/side-pool.js",
    "tasks/sandbox-tasks.js",
    "world/world-gen-api.js"
  ];
  const sandbox = { globalThis: {}, console };
  sandbox.globalThis = sandbox;
  for (const file of files) {
    const code = readFileSync(new URL(file, root), "utf8");
    vm.runInNewContext(code, sandbox, { filename: file });
  }
  return sandbox.globalThis;
}

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("world gen api is registered in html and app wiring", () => {
  assert.match(html, /world\/world-gen-api\.js/);
  assert.match(appSource, /shouldUseSecondaryWorldGen/);
  assert.match(appSource, /maybeRequestDailyWorldGeneration/);
  assert.match(appSource, /syncDailyWorldGeneration/);
  assert.match(appSource, /meta\.kind === "world"/);
});

test("world gen prompt includes world summary scope and side quests when sandbox ready", () => {
  const ctx = loadWorldGenModules();
  const state = {
    launchMode: "sandbox",
    idol: "月村手毬",
    sandbox: { inviteComplete: true },
    tasks: { secondaryApi: { enabled: true, baseUrl: "https://x", model: "m" } },
    freeMode: {
      postLiveDay: 2,
      clockMinutes: 600,
      world: { macro_phase: "first_live", kotone_seina_proxy: "pending", school_events: [] }
    }
  };
  ctx.HatsuTasks.ensureTasksShape(state);
  const helpers = {
    idolNames: ["月村手毬", "藤田琴音", "花海咲季"],
    canonicalIdolName: (name) => name,
    getDayKey: () => "campus+2",
    formatClock: () => "10:00",
    isSandboxLaunch: () => true,
    isSandboxScoutPhase: () => false
  };
  const prompt = ctx.HatsuWorld.worldGen.buildDailyWorldPrompt(state, {
    dayKey: "campus+2",
    dayLabel: "学园第 2 天"
  }, helpers);
  assert.match(prompt, /每日世界层批量生成/);
  assert.match(prompt, /sideQuests/);
  assert.match(prompt, /商业委托|对外商演/);
  assert.match(prompt, /月村手毬/);
  assert.match(prompt, /学园公开层概况|SNS 角色口吻参考/);
});

test("world gen parses and applies daily batch payload", () => {
  const ctx = loadWorldGenModules();
  const state = {
    launchMode: "sandbox",
    idol: "月村手毬",
    sandbox: { inviteComplete: true },
    tasks: {
      secondaryApi: { enabled: true },
      side: { dayKey: "", slots: [], genStatus: "loading", source: "" }
    },
    freeMode: {
      postLiveDay: 2,
      clockMinutes: 600,
      world: {
        macro_phase: "first_live",
        kotone_seina_proxy: "pending",
        school_events: [],
        broadcast: { today: null, history: [], pendingRequestId: "" },
        buzz: { items: [], buzzDayKey: "", hotTopic: "" },
        dailyGen: { dayKey: "campus+2", status: "loading", source: "", pendingRequestId: "req-1" }
      }
    }
  };
  ctx.HatsuTasks.ensureTasksShape(state);
  const text = `【初星日报开始】
{
  "broadcast": {
    "title": "训练场早课见闻",
    "brief": "真诚优带听众聊清晨训练场的公开花絮与一年级干劲。",
    "categoryLabel": "学园日常",
    "guests": ["花海咲季"]
  },
  "buzz": [
    {"author":"花海咲季","text":"训练场今天也很燃。","heat":"high","scope":"campus","broadcastHint":"训练场早课见闻"},
    {"author":"月村手毬","text":"……只是路过。","heat":"normal","scope":"campus","broadcastHint":""}
  ],
  "sideQuests":[
    {"title":"清晨慢跑","desc":"陪担当完成校园跑道有氧跑。","tag":"stamina"},
    {"title":"发声练习","desc":"在教室走廊练气息与发声。","tag":"syngup"},
    {"title":"健康便当","desc":"在学食试做低油便当。","tag":"diet"}
  ]
}
【初星日报结束】`;
  const helpers = {
    idolNames: ["月村手毬", "藤田琴音", "花海咲季"],
    canonicalIdolName: (name) => name
  };
  const parsed = ctx.HatsuWorld.worldGen.parseDailyWorldResponse(text, {
    dayKey: "campus+2",
    includeSideQuests: true,
    idolNames: helpers.idolNames,
    canonicalIdolName: helpers.canonicalIdolName,
    idol: state.idol
  });
  assert.ok(parsed);
  assert.equal(parsed.broadcast.title, "训练场早课见闻");
  assert.equal(parsed.buzz.length, 2);
  assert.equal(parsed.sideQuests.length, 3);

  const applied = ctx.HatsuWorld.worldGen.applyDailyWorldGeneration(state, parsed, helpers, "campus+2");
  assert.equal(applied, true);
  assert.equal(state.freeMode.world.dailyGen.status, "ready");
  assert.equal(state.freeMode.world.dailyGen.source, "secondary");
  assert.equal(state.freeMode.world.broadcast.today.title, "训练场早课见闻");
  assert.equal(state.freeMode.world.buzz.items.length, 2);
  assert.equal(state.freeMode.world.buzz.hotTopic, "训练场今天也很燃。");
  assert.equal(state.tasks.side.slots.length, 3);
  assert.equal(state.tasks.side.source, "secondary");
});

test("daily tick defers static buzz while world gen is loading", () => {
  const ctx = loadWorldGenModules();
  const state = {
    idol: "藤田琴音",
    freeMode: {
      postLiveDay: 1,
      world: {
        broadcast: { today: null, history: [] },
        buzz: { items: [], buzzDayKey: "", hotTopic: "" },
        dailyGen: { dayKey: "live+1", status: "loading", source: "", pendingRequestId: "x" }
      }
    }
  };
  const helpers = { getDayKey: () => "live+1", idolNames: ["藤田琴音"], canonicalIdolName: (n) => n };
  const buzz = ctx.HatsuWorld.dailyTick.rollDailyBuzz(state, helpers);
  assert.deepEqual(buzz, []);
  const episode = ctx.HatsuWorld.dailyTick.rollDailyBroadcast(state, helpers);
  assert.equal(episode, null);
});
