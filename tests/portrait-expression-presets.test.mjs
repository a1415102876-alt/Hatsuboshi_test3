import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

await import("../appearance/portrait-expression-presets.js");

const expressions = globalThis.HatsuPortraitExpressions;
const expectedPresets = new Map([
  ["自信说明", "confident_explanation.png"],
  ["冷静思考", "thoughtful_assessment.png"],
  ["被夸陶醉", "praise_delighted.png"],
  ["被夸慌张", "praise_flustered.png"],
  ["恳切请求", "earnest_plea.png"],
  ["正面挑战", "direct_challenge.png"],
  ["激动强调", "excited_emphasis.png"],
  ["不服审视", "defiant_assessment.png"],
  ["真诚表态", "sincere_declaration.png"],
  ["沮丧低落", "dejected.png"],
  ["平常待机", "neutral_standby.png"],
  ["意外动摇", "surprised_concern.png"],
  ["慌张解释", "flustered_explanation.png"],
  ["震惊失语", "shocked_speechless.png"],
  ["振奋宣言", "determined_rally.png"],
  ["得意大笑", "triumphant_laugh.png"],
  ["温柔喜悦", "gentle_joy.png"],
  ["凑近追问", "leaning_in_question.png"]
]);
const expectedKotonePresets = new Map([
  ["俏皮推销", "playful_sales_pitch.png"],
  ["委屈求饶", "flustered_plea.png"],
  ["黑脸无语", "bright_confidence.png"],
  ["精明盘算", "thoughtful_calculation.png"],
  ["意外发愣", "startled_reaction.png"],
  ["平常待机", "neutral_standby.png"],
  ["认真审视", "serious_assessment.png"],
  ["诚恳请求", "earnest_appeal.png"],
  ["害羞躲闪", "shy_hiding.png"],
  ["灿烂欢呼", "delighted_cheer.png"],
  ["得意吐槽", "smug_teasing.png"],
  ["振奋宣言", "energetic_declaration.png"],
  ["沮丧低落", "dejected.png"],
  ["真诚表态", "sincere_statement.png"],
  ["委屈忍耐", "hurt_endurance.png"],
  ["含泪抗议", "tearful_protest.png"],
  ["生气抗议", "angry_protest.png"],
  ["温柔喜悦", "gentle_joy.png"]
]);
const expectedUmePresets = new Map([
  ["真诚说明", "sincere_explanation.png"],
  ["惊讶解释", "surprised_explanation.png"],
  ["羞涩待机", "bashful_standby.png"],
  ["轻微不满", "mildly_annoyed.png"],
  ["尴尬困惑", "awkward_confusion.png"],
  ["温柔好奇", "gentle_curiosity.png"],
  ["俏皮提问", "playful_question.png"],
  ["恳切请求", "earnest_plea.png"],
  ["自信站姿", "confident_stance.png"],
  ["严肃追问", "stern_question.png"],
  ["振奋宣言", "determined_rally.png"],
  ["认真思考", "thoughtful_assessment.png"],
  ["温柔喜悦", "gentle_joy.png"],
  ["开朗挥手", "cheerful_wave.png"],
  ["害羞微笑", "bashful_smile.png"],
  ["不安询问", "anxious_question.png"],
  ["羞恼抗议", "bashful_anger.png"],
  ["沮丧低落", "dejected.png"],
  ["慌张不安", "flustered_anxiety.png"],
  ["得意欢呼", "triumphant_cheer.png"],
  ["凑近问候", "leaning_greeting.png"],
  ["温暖问候", "warm_greeting.png"],
  ["倾慕陶醉", "lovestruck_admiration.png"],
  ["沉思怀疑", "pensive_doubt.png"]
]);

test("all canonical Saki visual tags resolve to existing preset assets", () => {
  assert.ok(expressions);
  assert.deepEqual(expressions.SAKI_VISUAL_TAGS, [...expectedPresets.keys()]);
  for (const [tag, fileName] of expectedPresets) {
    const parsed = expressions.parseSpeakerVisualCue(`花海咲季(${tag})`);
    assert.equal(parsed.speaker, "花海咲季");
    assert.equal(parsed.visualTag, tag);
    assert.equal(parsed.fileName, fileName);
    assert.equal(parsed.matched, true);
    assert.equal(existsSync(new URL(`../assets/novel-standees/Saki_Standees_Altered/${fileName}`, import.meta.url)), true);
  }
});

test("speaker visual cue accepts full-width parentheses", () => {
  const parsed = expressions.parseSpeakerVisualCue("花海咲季（被夸慌张）");
  assert.equal(parsed.speaker, "花海咲季");
  assert.equal(parsed.visualTag, "被夸慌张");
  assert.equal(parsed.fileName, "praise_flustered.png");
});

test("all canonical Kotone visual tags resolve to existing preset assets", () => {
  assert.deepEqual(expressions.KOTONE_VISUAL_TAGS, [...expectedKotonePresets.keys()]);
  for (const [tag, fileName] of expectedKotonePresets) {
    const parsed = expressions.parseSpeakerVisualCue(`藤田琴音(${tag})`);
    assert.equal(parsed.speaker, "藤田琴音");
    assert.equal(parsed.visualTag, tag);
    assert.equal(parsed.fileName, fileName);
    assert.equal(parsed.assetPath, `./assets/novel-standees/Kotone_Standees_Altered/${fileName}`);
    assert.equal(parsed.matched, true);
    assert.equal(existsSync(new URL(`../assets/novel-standees/Kotone_Standees_Altered/${fileName}`, import.meta.url)), true);
  }
});

test("Kotone defaults to neutral standby and unknown tags fall back", () => {
  assert.equal(expressions.getDefaultSpeakerVisualCue("藤田琴音"), "藤田琴音(平常待机)");
  const unknown = expressions.parseSpeakerVisualCue("藤田琴音(开心)");
  assert.equal(unknown.speaker, "藤田琴音");
  assert.equal(unknown.requestedTag, "开心");
  assert.equal(unknown.assetPath, "");
  assert.equal(unknown.matched, false);
});

test("legacy Kotone confidence tag resolves to the energetic declaration asset", () => {
  const parsed = expressions.parseSpeakerVisualCue("藤田琴音(开朗自信)");
  assert.equal(parsed.requestedTag, "开朗自信");
  assert.equal(parsed.visualTag, "振奋宣言");
  assert.equal(parsed.fileName, "energetic_declaration.png");
  assert.equal(parsed.matched, true);
});

test("all canonical Ume visual tags resolve to existing preset assets", () => {
  assert.deepEqual(expressions.UME_VISUAL_TAGS, [...expectedUmePresets.keys()]);
  for (const [tag, fileName] of expectedUmePresets) {
    const parsed = expressions.parseSpeakerVisualCue(`花海佑芽(${tag})`);
    assert.equal(parsed.speaker, "花海佑芽");
    assert.equal(parsed.visualTag, tag);
    assert.equal(parsed.fileName, fileName);
    assert.equal(parsed.assetPath, `./assets/novel-standees/Ume_Standees_Altered/${fileName}`);
    assert.equal(parsed.matched, true);
    assert.equal(existsSync(new URL(`../assets/novel-standees/Ume_Standees_Altered/${fileName}`, import.meta.url)), true);
  }
});

test("Ume defaults to bashful standby and accepts full-width visual cues", () => {
  assert.equal(expressions.getDefaultSpeakerVisualCue("花海佑芽"), "花海佑芽(羞涩待机)");
  const parsed = expressions.parseSpeakerVisualCue("花海佑芽（得意欢呼）");
  assert.equal(parsed.fileName, "triumphant_cheer.png");
  assert.equal(parsed.matched, true);
});

test("missing and unknown visual tags preserve the base speaker and fall back", () => {
  assert.deepEqual(
    expressions.parseSpeakerVisualCue("花海咲季"),
    { rawSpeaker: "花海咲季", speaker: "花海咲季", requestedTag: "", visualTag: "", fileName: "", assetPath: "", matched: false }
  );
  const unknown = expressions.parseSpeakerVisualCue("花海咲季(开心)");
  assert.equal(unknown.speaker, "花海咲季");
  assert.equal(unknown.requestedTag, "开心");
  assert.equal(unknown.assetPath, "");
  assert.equal(unknown.matched, false);
});

test("unregistered idols do not resolve expression presets", () => {
  const parsed = expressions.parseSpeakerVisualCue("月村手毬(被夸陶醉)");
  assert.equal(parsed.speaker, "月村手毬");
  assert.equal(parsed.assetPath, "");
  assert.equal(parsed.matched, false);
});

test("Saki live scenes start from the neutral standby preset", () => {
  assert.equal(expressions.getDefaultSpeakerVisualCue("花海咲季"), "花海咲季(平常待机)");
  assert.equal(expressions.getDefaultSpeakerVisualCue("月村手毬"), "月村手毬");
});

test("expression preset module loads before app.js in direct and SillyTavern launches", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const loader = readFileSync(new URL("../st.html", import.meta.url), "utf8");
  assert.ok(html.indexOf("appearance/portrait-expression-presets.js") < html.indexOf("app.js"));
  assert.match(loader, /["']appearance\/portrait-expression-presets\.js["']/);
});
