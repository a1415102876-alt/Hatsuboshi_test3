(function registerHanamiUmeNiaRoute(root) {
  "use strict";

  const routes = root.HatsuNiaRoutes;
  if (!routes || routes.getById("hanami-ume")) return;

  routes.register({
    schemaVersion: 1,
    routeId: "hanami-ume",
    idolName: "花海佑芽",
    status: "available",
    assets: {
      avatar: "./assets/avatars/hanami-ume.png"
    },
    inheritedAffinity: {
      value: 100,
      max: 100,
      tag: "AFF_UME_100",
      relationshipSummary: "制作人与佑芽已经共同走过初期剧情；佑芽把制作人视为值得信任、能陪她追上姐姐并让她独自成长的搭档。",
      promises: "姐妹在 N.I.A 的 FINALE 正面对决；佑芽要靠自己的力量追上并战胜咲季，制作人负责陪她走完这条路。",
      memories: "姐妹从小一起训练和竞争，制作人见证佑芽第一次真正平等地与咲季对决，也见证她在 N.I.A 中逐渐拥有自己的偶像愿望。"
    },
    opening: {
      episode: 11,
      title: "N.I.A · 花海佑芽的参赛宣言",
      anchors: [
        "制作人向佑芽说明 NEXT IDOL AUDITION 的粉丝投票机制，以及积累粉丝是进入最终舞台的必要条件。",
        "咲季得知后决定参战，制作人要求姐妹把直接胜负留到 N.I.A FINALE。",
        "佑芽回忆过去与咲季平局时既不甘心又开心，因为那是第一次真正平等的对决。",
        "姐妹约定在 N.I.A FINALE 正面对决；明确 H.I.F 是未来的另一座舞台，不是本次 N.I.A。",
        "结尾进入第一轮企划准备，不推进日程或数值。"
      ]
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
        opponent: { id: "hanami-saki", name: "花海咲季", avatar: "./assets/avatars/hanami-saki.png" }
      }
    ],
    episodes: [
      {
        eventId: "nia-ume-fans-5000", episode: 12,
        trigger: { type: "fans", threshold: 5000 },
        title: "N.I.A · 第一次失利", subtitle: "佑芽的 N.I.A 第 12 话剧情",
        background: "./assets/scenes/Producer_Office.png",
        promptAnchors: [
          "佑芽开始认真积累粉丝，制作人锁定极月学园偶像作为对手。",
          "佑芽意外输给贺阳燐羽，咲季前来安慰并承诺替她复仇。",
          "燐羽原本准备结束合同工作，却因咲季的挑衅暂时留下，并表示自己也是佑芽的粉丝。"
        ]
      },
      {
        eventId: "nia-ume-fans-10000", episode: 13,
        trigger: { type: "fans", threshold: 10000 },
        title: "N.I.A · 姐姐的复仇", subtitle: "佑芽的 N.I.A 第 13 话剧情",
        background: "./assets/scenes/Producer_Office.png",
        promptAnchors: [
          "咲季与燐羽正式对决，佑芽在旁观看。",
          "咲季击败能力全面领先的燐羽，并说明燐羽缺少作为偶像的重要东西。",
          "咲季说自己和妹妹约好了要替她复仇，当姐姐不能说话不算话；这句话明显触动燐羽。",
          "燐羽被触动后亲吻佑芽，佑芽极度震惊并表示最讨厌燐羽。"
        ]
      },
      {
        eventId: "nia-ume-round2-audition-eve", episode: 14,
        trigger: { type: "round_day_complete", round: 2, day: 5 },
        title: "N.I.A · 复仇宣言", subtitle: "佑芽的 N.I.A 第 14 话剧情",
        background: "./assets/scenes/Producer_Office.png",
        promptAnchors: [
          "佑芽仍因燐羽的亲吻极度生气，决定在第二轮试镜中击败燐羽复仇。",
          "制作人安排她观摩大量强力偶像的演出，计划约十次，以学习并提升自己的表现。",
          "制作人联系大型制作公司的社长，为佑芽争取更好的未来环境；佑芽表示等赢过燐羽、再赢过咲季后再考虑。"
        ]
      },
      {
        eventId: "nia-ume-round2-quartet-opening", episode: 15,
        trigger: { type: "audition_eve", round: 2 },
        title: "N.I.A · 特别训练", subtitle: "佑芽的 N.I.A 第 15 话剧情",
        background: "./assets/scenes/NIA_Stage_Backstage.png",
        promptAnchors: [
          "佑芽持续观摩强力偶像，知名度、粉丝和实力明显上涨，但制作人判断仍不足以击败燐羽。",
          "制作人安排特殊唱歌训练，燐羽作为特别讲师出现。",
          "佑芽因为信任制作人接受燐羽训练；燐羽用模仿佑芽声音的方式刺激她。",
          "佑芽受到刺激，宣言一定要追上并击败燐羽。"
        ]
      },
      {
        eventId: "nia-ume-round2-quartet-victory", episode: 16,
        trigger: { type: "audition_complete", round: 2 },
        title: "N.I.A · 击败燐羽之后", subtitle: "佑芽的 N.I.A 第 16 话剧情",
        background: "./assets/scenes/NIA_Audition1.png",
        promptAnchors: [
          "佑芽赢过燐羽；燐羽承认自己不是偶像，并将自己的粉丝托付给佑芽。",
          "佑芽感谢燐羽，但仍对她之前的行为不满；燐羽再次亲吻佑芽，祝她演出加油，佑芽称她为变态。"
        ]
      },
      {
        eventId: "nia-ume-round3-first-business", episode: 17,
        trigger: { type: "first_business_complete", round: 3 },
        title: "N.I.A · 与姐姐并肩", subtitle: "佑芽的 N.I.A 第 17 话剧情",
        background: "./assets/scenes/Producer_Office.png",
        promptAnchors: [
          "佑芽完成出色演出，咲季前来观看并认可她的成长。",
          "制作人赠送 N.I.A 限定咲季周边，佑芽因制作人也是咲季粉丝而产生轻微嫉妒，并确认制作人负责的偶像只有自己。",
          "姐妹确认即将履行 FINALE 约定；咲季承认制作人帮助佑芽成长，并称制作人是自己的敌人。"
        ]
      },
      {
        eventId: "nia-ume-round3-finale-eve", episode: 18,
        trigger: { type: "schedule_complete", round: 3 },
        title: "N.I.A · FINALE 宣言", subtitle: "佑芽的 N.I.A 第 18 话剧情",
        background: "./assets/scenes/NIA_Stage_Backstage.png",
        promptAnchors: [
          "佑芽得知即将参加 FINALE，认为这是人生至今的集大成，也是追上姐姐、实现童年梦想的时刻。",
          "佑芽明确宣言：这次一定要赢过咲季。"
        ]
      },
      {
        eventId: "nia-ume-finale-victory", episode: 19,
        trigger: { type: "finale_complete" },
        title: "N.I.A · 终于赢过姐姐", subtitle: "佑芽的 N.I.A 第 19 话剧情",
        background: "./assets/scenes/NIA_Finale.png",
        promptAnchors: [
          "佑芽赢得 FINALE，正式击败咲季，因为实现十五年的梦想而哭泣。",
          "她害怕咲季离开、害怕这次胜利成为最后一次姐妹对决；咲季承诺不会离开，也会继续当偶像。",
          "姐妹约定未来在更大的舞台再次决胜；咲季准备在 H.I.F 前回老家特训，H.I.F 是后续目标而非本次 N.I.A。"
        ]
      },
      {
        eventId: "nia-ume-finale-epilogue", episode: 20,
        trigger: { type: "finale_complete" },
        title: "N.I.A · 成为自己的偶像", subtitle: "佑芽的 N.I.A 第 20 话剧情",
        background: "./assets/scenes/NIA_Stage_Backstage.png",
        promptAnchors: [
          "佑芽总结 N.I.A 的成长，确认自己已经拥有与咲季对等的条件。",
          "她不再只把咲季当作唯一目标，开始产生自己的偶像愿望：唱不同的歌、穿不同的服装、尝试不同的工作。",
          "佑芽确认自己真正喜欢偶像，后续目标是 H.I.F 优胜、成为一番星，并在未来再次与咲季对决。"
        ]
      }
    ],
    promptProvider: "route-anchors"
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
