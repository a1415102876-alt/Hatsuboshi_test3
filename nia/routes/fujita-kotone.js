(function registerFujitaKotoneNiaRoute(root) {
  "use strict";

  const routes = root.HatsuNiaRoutes;
  if (!routes || routes.getById("fujita-kotone")) return;

  routes.register({
    schemaVersion: 1,
    routeId: "fujita-kotone",
    idolName: "藤田琴音",
    status: "available",
    assets: {
      avatar: "./assets/avatars/fujita-kotone.png"
    },
    draftDefaults: {
      goal: "让更多观众认识藤田琴音，并把她从星南的粉丝推向能够与星南竞争的一等星。",
      image: "认真追逐胜利、背负家庭责任，却会因为准确的夸奖和支持而迅速变得得意又可爱的实力派偶像。",
      approach: "通过广播、直播、电视节目和现场营业展示琴音的实力、责任感与逐渐成为竞争者的变化。"
    },
    inheritedAffinity: {
      value: 100,
      max: 100,
      tag: "AFF_KOTONE_100",
      relationshipSummary: "制作人与琴音已经共同经历过前置剧情，琴音把制作人视为能够带她走到顶点、同时必须对她的人生负责的搭档。",
      promises: "琴音要成为真正的一等星，并以成为顶级偶像后的成果十倍报答制作人。",
      memories: "两人共同走过初期偶像活动，琴音从紧张和不安中逐渐建立起对制作人的依赖与信任。"
    },
    opening: {
      episode: 11,
      title: "N.I.A · 藤田琴音的参赛宣言",
      anchors: [
        "制作人向琴音说明 NEXT IDOL AUDITION 的粉丝投票机制。",
        "把解决藤田家债务与贷款利息纳入琴音参加 N.I.A 的现实目标。",
        "琴音承诺即使成为顶级偶像，也会用一辈子十倍报答制作人。",
        "琴音接受 N.I.A 作为成为一等星的道路，结尾进入第一轮企划准备。"
      ]
    },
    rounds: [
      { round: 1, stageName: "第一轮试镜", isFinale: false, opponent: null },
      {
        round: 2,
        stageName: "第二轮试镜 · QUARTET",
        isFinale: false,
        opponents: [
          {
            id: "nia-round2-nadeshiko",
            name: "蓝井抚子",
            avatar: "./assets/avatars/aoi-nadeshiko.png"
          },
          {
            id: "nia-round2-shion",
            name: "白草四音",
            avatar: "./assets/avatars/shirakusa-shion.png"
          }
        ]
      },
      {
        round: 3,
        stageName: "FINALE",
        isFinale: true,
        opponent: {
          id: "nia-finale-tsukika",
          name: "白草月花",
          avatar: "./assets/avatars/shirakusa-tsukika.png"
        }
      }
    ],
    episodes: [
      { eventId: "nia-kotone-fans-5000", episode: 12, trigger: { type: "fans", threshold: 5000 }, title: "N.I.A · 星南的协助", subtitle: "琴音的 N.I.A 第 12 话剧情", background: "./assets/scenes/Saki_Bedroom.png" },
      { eventId: "nia-kotone-fans-5000-followup", episode: 13, trigger: { type: "fans", threshold: 5000 }, title: "N.I.A · 一等星宣言", subtitle: "琴音的 N.I.A 第 13 话剧情", background: "./assets/scenes/Saki_Bedroom.png" },
      { eventId: "nia-kotone-round2-audition-eve", episode: 14, trigger: { type: "round_day_complete", round: 2, day: 5 }, title: "N.I.A · QUARTET 宣战", subtitle: "琴音的 N.I.A 第 14 话剧情", background: "./assets/scenes/Saki_Bedroom.png" },
      { eventId: "nia-kotone-round2-quartet-opening", episode: 15, trigger: { type: "audition_eve", round: 2 }, title: "N.I.A · 试镜前的最佳状态", subtitle: "琴音的 N.I.A 第 15 话剧情", background: "./assets/scenes/Producer_Office.png" },
      { eventId: "nia-kotone-round2-quartet-victory", episode: 16, trigger: { type: "audition_complete", round: 2 }, title: "N.I.A · QUARTET 胜利之后", subtitle: "琴音的 N.I.A 第 16 话剧情", background: "./assets/scenes/NIA_Audition1.png" },
      { eventId: "nia-kotone-round3-first-business", episode: 17, trigger: { type: "first_business_complete", round: 3 }, title: "N.I.A · 竞争者的资格", subtitle: "琴音的 N.I.A 第 17 话剧情", background: "./assets/scenes/Producer_Office.png" },
      { eventId: "nia-kotone-round3-finale-eve", episode: 18, trigger: { type: "schedule_complete", round: 3 }, title: "N.I.A · Finale 前夜", subtitle: "琴音的 N.I.A 第 18 话剧情", background: "./assets/scenes/NIA_Stage_Backstage.png" },
      { eventId: "nia-kotone-finale-victory", episode: 19, trigger: { type: "finale_complete" }, title: "N.I.A · 一等星之战", subtitle: "琴音的 N.I.A 第 19 话剧情", background: "./assets/scenes/NIA_Finale.png" },
      { eventId: "nia-kotone-finale-epilogue", episode: 20, trigger: { type: "finale_complete" }, title: "N.I.A · 家人与下一场挑战", subtitle: "琴音的 N.I.A 第 20 话剧情", background: "./assets/scenes/Producer_Apartment.png" }
    ],
    promptProvider: "fujita-kotone"
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
