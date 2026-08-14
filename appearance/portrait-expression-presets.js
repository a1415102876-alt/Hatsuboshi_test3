(function (global) {
  "use strict";

  const SAKI_NAME = "花海咲季";
  const KOTONE_NAME = "藤田琴音";
  const UME_NAME = "花海佑芽";
  const SAKI_PRESET_FILES = Object.freeze({
    "自信说明": "confident_explanation.png",
    "冷静思考": "thoughtful_assessment.png",
    "被夸陶醉": "praise_delighted.png",
    "被夸慌张": "praise_flustered.png",
    "恳切请求": "earnest_plea.png",
    "正面挑战": "direct_challenge.png",
    "激动强调": "excited_emphasis.png",
    "不服审视": "defiant_assessment.png",
    "真诚表态": "sincere_declaration.png",
    "沮丧低落": "dejected.png",
    "平常待机": "neutral_standby.png",
    "意外动摇": "surprised_concern.png",
    "慌张解释": "flustered_explanation.png",
    "震惊失语": "shocked_speechless.png",
    "振奋宣言": "determined_rally.png",
    "得意大笑": "triumphant_laugh.png",
    "温柔喜悦": "gentle_joy.png",
    "凑近追问": "leaning_in_question.png"
  });
  const KOTONE_PRESET_FILES = Object.freeze({
    "俏皮推销": "playful_sales_pitch.png",
    "委屈求饶": "flustered_plea.png",
    "黑脸无语": "bright_confidence.png",
    "精明盘算": "thoughtful_calculation.png",
    "意外发愣": "startled_reaction.png",
    "平常待机": "neutral_standby.png",
    "认真审视": "serious_assessment.png",
    "诚恳请求": "earnest_appeal.png",
    "害羞躲闪": "shy_hiding.png",
    "灿烂欢呼": "delighted_cheer.png",
    "得意吐槽": "smug_teasing.png",
    "振奋宣言": "energetic_declaration.png",
    "沮丧低落": "dejected.png",
    "真诚表态": "sincere_statement.png",
    "委屈忍耐": "hurt_endurance.png",
    "含泪抗议": "tearful_protest.png",
    "生气抗议": "angry_protest.png",
    "温柔喜悦": "gentle_joy.png"
  });
  const KOTONE_PRESET_ALIASES = Object.freeze({
    "开朗自信": "振奋宣言"
  });
  const UME_PRESET_FILES = Object.freeze({
    "真诚说明": "sincere_explanation.png",
    "惊讶解释": "surprised_explanation.png",
    "羞涩待机": "bashful_standby.png",
    "轻微不满": "mildly_annoyed.png",
    "尴尬困惑": "awkward_confusion.png",
    "温柔好奇": "gentle_curiosity.png",
    "俏皮提问": "playful_question.png",
    "恳切请求": "earnest_plea.png",
    "自信站姿": "confident_stance.png",
    "严肃追问": "stern_question.png",
    "振奋宣言": "determined_rally.png",
    "认真思考": "thoughtful_assessment.png",
    "温柔喜悦": "gentle_joy.png",
    "开朗挥手": "cheerful_wave.png",
    "害羞微笑": "bashful_smile.png",
    "不安询问": "anxious_question.png",
    "羞恼抗议": "bashful_anger.png",
    "沮丧低落": "dejected.png",
    "慌张不安": "flustered_anxiety.png",
    "得意欢呼": "triumphant_cheer.png",
    "凑近问候": "leaning_greeting.png",
    "温暖问候": "warm_greeting.png",
    "倾慕陶醉": "lovestruck_admiration.png",
    "沉思怀疑": "pensive_doubt.png"
  });
  const SAKI_VISUAL_TAGS = Object.freeze(Object.keys(SAKI_PRESET_FILES));
  const KOTONE_VISUAL_TAGS = Object.freeze(Object.keys(KOTONE_PRESET_FILES));
  const UME_VISUAL_TAGS = Object.freeze(Object.keys(UME_PRESET_FILES));
  const CHARACTER_PRESETS = Object.freeze({
    [SAKI_NAME]: Object.freeze({
      assetDirectory: "Saki_Standees_Altered",
      defaultTag: "平常待机",
      files: SAKI_PRESET_FILES
    }),
    [KOTONE_NAME]: Object.freeze({
      assetDirectory: "Kotone_Standees_Altered",
      defaultTag: "平常待机",
      files: KOTONE_PRESET_FILES
    }),
    [UME_NAME]: Object.freeze({
      assetDirectory: "Ume_Standees_Altered",
      defaultTag: "羞涩待机",
      files: UME_PRESET_FILES
    })
  });
  const VISUAL_SUFFIX = /^(.*?)\s*[（(]\s*([^()（）]+?)\s*[）)]\s*$/u;

  function parseSpeakerVisualCue(value) {
    const rawSpeaker = String(value || "").trim();
    const match = rawSpeaker.match(VISUAL_SUFFIX);
    const speaker = String(match?.[1] || rawSpeaker).trim();
    const requestedTag = String(match?.[2] || "").trim();
    const preset = CHARACTER_PRESETS[speaker];
    const canonicalTag = speaker === KOTONE_NAME
      ? String(KOTONE_PRESET_ALIASES[requestedTag] || requestedTag)
      : requestedTag;
    const fileName = String(preset?.files?.[canonicalTag] || "");
    return {
      rawSpeaker,
      speaker,
      requestedTag,
      visualTag: fileName ? canonicalTag : "",
      fileName,
      assetPath: fileName ? `./assets/novel-standees/${preset.assetDirectory}/${fileName}` : "",
      matched: Boolean(fileName)
    };
  }

  function getDefaultSpeakerVisualCue(value) {
    const speaker = String(value || "").trim();
    const preset = CHARACTER_PRESETS[speaker];
    return preset ? `${speaker}(${preset.defaultTag})` : speaker;
  }

  global.HatsuPortraitExpressions = Object.freeze({
    SAKI_VISUAL_TAGS,
    KOTONE_VISUAL_TAGS,
    UME_VISUAL_TAGS,
    parseSpeakerVisualCue,
    getDefaultSpeakerVisualCue
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
