(function registerHanamiSakiNiaRoute(root) {
  "use strict";

  const routes = root.HatsuNiaRoutes;
  if (!routes || routes.getById("hanami-saki")) return;

  routes.register({
    schemaVersion: 1,
    routeId: "hanami-saki",
    idolName: "花海咲季",
    status: "available",
    assets: {
      avatar: "./assets/avatars/hanami-saki.png",
      finaleVideo: "assets/campusmode/Hanami-Saki-Campusmode.mp4"
    },
    inheritedAffinity: {
      value: 100,
      max: 100,
      tag: "AFF_SAKI_100",
      relationshipSummary: "制作人与咲季已经是共同创造奇迹、共同见证她与佑芽未来的高度信赖搭档。",
      promises: "无论是冠军还是胜利，都要由制作人与咲季一起夺取；共同见证咲季与佑芽作为对手继续成长。",
      memories: "一起完成《初》剧本与 First Live，咲季承认制作人是陪她把最强姐姐的坚持变成真实的人。"
    },
    rounds: [
      { round: 1, stageName: "第一轮试镜", isFinale: false, opponent: null },
      {
        round: 2,
        stageName: "第二轮试镜",
        isFinale: false,
        opponent: { id: "kaya-rinha", name: "贺阳燐羽", avatar: "./assets/avatars/kaya-rinha.png" }
      },
      {
        round: 3,
        stageName: "FINALE",
        isFinale: true,
        opponent: { id: "hanami-ume", name: "花海佑芽", avatar: "./assets/avatars/hanami-ume.png" }
      }
    ],
    episodes: [
      { eventId: "nia-saki-fans-5000", episode: 12, trigger: { type: "fans", threshold: 5000 }, title: "N.I.A · 好感剧情", subtitle: "咲季的 N.I.A 第 12 话剧情", background: "./assets/scenes/Producer_Office.png" },
      { eventId: "nia-saki-fans-10000", episode: 13, trigger: { type: "fans", threshold: 10000 }, title: "N.I.A · 好感剧情", subtitle: "咲季的 N.I.A 第 13 话剧情", background: "./assets/scenes/Producer_Office.png" },
      { eventId: "nia-saki-round2-audition-eve", episode: 14, trigger: { type: "round_day_complete", round: 2, day: 5 }, title: "N.I.A · 第二轮强敌登场", subtitle: "咲季的 N.I.A 第 14 话剧情", background: "./assets/scenes/Auditorium.png" },
      { eventId: "nia-saki-round2-quartet-opening", episode: 15, trigger: { type: "audition_eve", round: 2 }, title: "N.I.A · 第二轮选拔前夜", subtitle: "咲季的 N.I.A 第 15 话剧情", background: "./assets/scenes/NIA_Stage_Backstage.png" },
      { eventId: "nia-saki-round2-quartet-victory", episode: 16, trigger: { type: "audition_complete", round: 2 }, title: "N.I.A · QUARTET 胜利之后", subtitle: "咲季的 N.I.A 第 16 话剧情", background: "./assets/scenes/NIA_Stage_Backstage.png" },
      { eventId: "nia-saki-round3-first-business", episode: 17, trigger: { type: "first_business_complete", round: 3 }, title: "N.I.A · FINALE 约定", subtitle: "咲季的 N.I.A 第 17 话剧情", background: "./assets/scenes/Producer_Office.png" },
      { eventId: "nia-saki-round3-finale-eve", episode: 18, trigger: { type: "schedule_complete", round: 3 }, title: "N.I.A · FINALE 前夜", subtitle: "咲季的 N.I.A 第 18 话剧情", background: "./assets/scenes/NIA_Stage_Backstage.png" },
      { eventId: "nia-saki-finale-sisters-aftermath", episode: 19, trigger: { type: "finale_complete" }, title: "N.I.A · 姐妹的下一场胜负", subtitle: "咲季的 N.I.A 第 19 话剧情", background: "./assets/scenes/NIA_Finale.png" },
      { eventId: "nia-saki-finale-partner-epilogue", episode: 20, trigger: { type: "finale_complete" }, title: "N.I.A · 命中注定的搭档", subtitle: "咲季的 N.I.A 第 20 话剧情", background: "./assets/scenes/NIA_Stage_Backstage.png" }
    ],
    promptProvider: "hanami-saki"
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
