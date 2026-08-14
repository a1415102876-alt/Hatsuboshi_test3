import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../hcg-tags.js", import.meta.url), "utf8");
const context = { globalThis: {} };
vm.runInNewContext(source, context);
const HatsuHcg = context.globalThis.HatsuHcg;

test("HatsuHcg exposes Saki pose whitelist and asset paths", () => {
  assert.ok(HatsuHcg);
  assert.equal(HatsuHcg.resolveCharacterSlug("花海咲季"), "saki");
  assert.ok(HatsuHcg.listPoseIds("花海咲季").includes("cowgirl"));
  const asset = HatsuHcg.resolveHcgAsset("花海咲季", "cowgirl");
  assert.equal(asset.id, "saki_nsfw_cowgirl_v01");
  assert.equal(asset.characterSlug, "saki");
  assert.equal(asset.poseId, "cowgirl");
  assert.equal(asset.label, "骑乘");
  assert.equal(asset.fallbackPoseId, "missionary");
  assert.equal(asset.path, "./assets/hcg/saki/cowgirl_v01.png");
  assert.equal(HatsuHcg.resolveHcgAsset("花海咲季", "not_a_pose"), null);
});

test("HatsuHcg exposes Kotone pose whitelist and asset paths", () => {
  assert.equal(HatsuHcg.resolveCharacterSlug("藤田琴音"), "kotone");
  assert.equal(HatsuHcg.resolveCharacterSlug("琴音"), "kotone");
  assert.equal(HatsuHcg.resolveCharacterSlug("藤田ことね"), "kotone");
  assert.equal(HatsuHcg.resolveCharacterSlug("藤田琴音(平常待机)"), "kotone");
  assert.ok(HatsuHcg.listPoseIds("藤田琴音").includes("cowgirl"));
  assert.ok(HatsuHcg.listPoseIds("藤田琴音").includes("chair"));
  const cowgirl = HatsuHcg.resolveHcgAsset("藤田琴音", "cowgirl");
  assert.equal(cowgirl.id, "kotone_nsfw_cowgirl_v01");
  assert.equal(cowgirl.path, "./assets/hcg/kotone/cowgirl_v01.png");
  const kiss = HatsuHcg.resolveHcgAsset("藤田琴音", "kissing_makeout");
  assert.equal(kiss.path, "./assets/hcg/kotone/kissing_makeout_v01.png");
  const chair = HatsuHcg.resolveHcgAsset("藤田琴音", "chair");
  assert.equal(chair.path, "./assets/hcg/kotone/chair_v01.png");
  assert.equal(HatsuHcg.resolveHcgAsset("藤田琴音", "titjob").fallbackPoseId, "handjob");
  assert.equal(HatsuHcg.resolveHcgAsset("藤田琴音", "missionary_legs_up").fallbackPoseId, "missionary");
  assert.equal(HatsuHcg.resolveHcgAsset("藤田琴音", "missionary_mating_press").fallbackPoseId, "missionary");
  assert.equal(HatsuHcg.resolveHcgAsset("藤田琴音", "aftercare_embrace").fallbackPoseId, "kissing_makeout");
  assert.equal(HatsuHcg.resolveHcgAsset("藤田琴音", "lotus").fallbackPoseId, "cowgirl");
});

test("HatsuHcg exposes Ume pose whitelist and asset paths", () => {
  assert.equal(HatsuHcg.resolveCharacterSlug("花海佑芽"), "ume");
  assert.equal(HatsuHcg.resolveCharacterSlug("花海祐芽"), "ume");
  assert.equal(HatsuHcg.resolveCharacterSlug("花海佑芽(意外动摇)"), "ume");
  assert.ok(HatsuHcg.listPoseIds("花海佑芽").includes("cowgirl"));
  assert.ok(HatsuHcg.listPoseIds("花海佑芽").includes("cowgirl_bounce"));
  assert.ok(HatsuHcg.listPoseIds("花海佑芽").includes("nipple_suck"));
  const cowgirl = HatsuHcg.resolveHcgAsset("花海佑芽", "cowgirl");
  assert.equal(cowgirl.id, "ume_nsfw_cowgirl_v01");
  assert.equal(cowgirl.path, "./assets/hcg/Ume/cowgirl_v01.png");
  const bounce = HatsuHcg.resolveHcgAsset("花海佑芽", "cowgirl_bounce");
  assert.equal(bounce.path, "./assets/hcg/Ume/cowgirl_bounce_v01.png");
  const kiss = HatsuHcg.resolveHcgAsset("花海佑芽", "kissing_makeout");
  assert.equal(kiss.fallbackPoseId, "nipple_suck");
});

test("nsfw_mode and pose tags bind to the following dialogue page", () => {
  const story = `
<nsfw_mode>on</nsfw_mode>
<pose id="kissing_makeout"/>
<narration>她靠近过来。</narration>
<dialogue char="花海咲季">“……别移开视线。”</dialogue>
<pose id="cowgirl"/>
<narration>动作切换到骑乘。</narration>
<pose action="hide"/>
<nsfw_mode>off</nsfw_mode>
<narration>夜色重新安静下来。</narration>
`.trim();

  const baseSlides = [
    { type: "narration", speaker: "", text: "她靠近过来。" },
    { type: "dialogue", speaker: "花海咲季", text: "“……别移开视线。”" },
    { type: "narration", speaker: "", text: "动作切换到骑乘。" },
    { type: "narration", speaker: "", text: "夜色重新安静下来。" }
  ];
  const slides = HatsuHcg.attachControlEventsToSlides(baseSlides, story);

  assert.equal(slides[0].nsfwMode, "on");
  assert.equal(slides[0].hcgAction, "show");
  assert.equal(slides[0].poseId, "kissing_makeout");
  assert.equal(slides[1].poseId, undefined);
  assert.equal(slides[2].hcgAction, "show");
  assert.equal(slides[2].poseId, "cowgirl");
  assert.equal(slides[3].hcgAction, "hide");
  assert.equal(slides[3].nsfwMode, "off");

  const first = HatsuHcg.deriveHcgStateFromSlides(slides, 0);
  assert.equal(first.nsfwMode, true);
  assert.equal(first.poseId, "kissing_makeout");
  assert.equal(first.endedExplicitly, false);
  const mid = HatsuHcg.deriveHcgStateFromSlides(slides, 2);
  assert.equal(mid.nsfwMode, true);
  assert.equal(mid.poseId, "cowgirl");
  assert.equal(mid.endedExplicitly, false);
  const end = HatsuHcg.deriveHcgStateFromSlides(slides, 3);
  assert.equal(end.nsfwMode, false);
  assert.equal(end.poseId, "");
  assert.equal(end.endedExplicitly, true);
});

test("nsfw_mode on without new pose does not end HCG state", () => {
  const story = `
<nsfw_mode>on</nsfw_mode>
<narration>她仍停在刚才的姿势里。</narration>
`.trim();
  const slides = HatsuHcg.attachControlEventsToSlides(
    [{ type: "narration", speaker: "", text: "她仍停在刚才的姿势里。" }],
    story
  );
  const state = HatsuHcg.deriveHcgStateFromSlides(slides, 0);
  assert.equal(state.nsfwMode, true);
  assert.equal(state.poseId, "");
  assert.equal(state.endedExplicitly, false);
});

test("pose hide alone ends HCG explicitly", () => {
  const story = `
<pose id="cowgirl"/>
<narration>骑乘。</narration>
<pose action="hide"/>
<narration>画面收回。</narration>
`.trim();
  const slides = HatsuHcg.attachControlEventsToSlides(
    [
      { type: "narration", speaker: "", text: "骑乘。" },
      { type: "narration", speaker: "", text: "画面收回。" }
    ],
    story
  );
  const shown = HatsuHcg.deriveHcgStateFromSlides(slides, 0);
  assert.equal(shown.poseId, "cowgirl");
  assert.equal(shown.endedExplicitly, false);
  const hidden = HatsuHcg.deriveHcgStateFromSlides(slides, 1);
  assert.equal(hidden.nsfwMode, false);
  assert.equal(hidden.poseId, "");
  assert.equal(hidden.endedExplicitly, true);
});

test("pose without nsfw_mode still activates HCG visual state", () => {
  const story = `
<pose id="missionary_mating_press"/>
<narration>那一瞬间被吞没。</narration>
<dialogue char="花海咲季(意外动摇)">“啊……！！”</dialogue>
`.trim();
  const baseSlides = [
    { type: "narration", speaker: "", text: "那一瞬间被吞没。" },
    { type: "dialogue", speaker: "花海咲季(意外动摇)", text: "“啊……！！”" }
  ];
  const slides = HatsuHcg.attachControlEventsToSlides(baseSlides, story);
  assert.equal(slides[0].hcgAction, "show");
  assert.equal(slides[0].poseId, "missionary_mating_press");
  const state = HatsuHcg.deriveHcgStateFromSlides(slides, 0);
  assert.equal(state.nsfwMode, true);
  assert.equal(state.poseId, "missionary_mating_press");
  const later = HatsuHcg.deriveHcgStateFromSlides(slides, 1);
  assert.equal(later.nsfwMode, true);
  assert.equal(later.poseId, "missionary_mating_press");
});

test("invalid or unknown control tags are ignored", () => {
  assert.equal(HatsuHcg.parseNsfwModeTag("", "maybe"), null);
  assert.equal(HatsuHcg.parsePoseTag('id="cowgirl" action="hide"'), null);
  assert.equal(HatsuHcg.parsePoseTag('id="totally_fake_pose"')?.poseId, "totally_fake_pose");
  const stripped = HatsuHcg.stripControlTags('<nsfw_mode>on</nsfw_mode><narration>正文</narration><pose id="cowgirl"/>');
  assert.match(stripped, /<narration>正文<\/narration>/);
  assert.doesNotMatch(stripped, /nsfw_mode|pose id/);
});

test("NSFW intimacy prompts include visual tag contract", () => {
  const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
  assert.match(appSource, /function buildNsfwHcgPromptSection/);
  assert.match(appSource, /buildNsfwHcgPromptSection\(targetIdol\)/);
  assert.match(appSource, /nsfw_mode 与 pose 视觉标签/);
  assert.match(appSource, /cleanReplyText[\s\S]*nsfw_mode\|pose/);
  assert.match(appSource, /syncVnHcgStateToIndex/);
});

test("VN keeps sticky HCG until next pose or explicit end", () => {
  const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
  assert.match(appSource, /let vnStickyHcgPoseId = ""/);
  assert.match(appSource, /function shouldHoldVnHcgVisual\(/);
  assert.match(appSource, /endedExplicitly/);
  assert.match(appSource, /无新姿势（含仅 nsfw_mode=on、等待页、下一轮纯对话）/);
  assert.match(appSource, /if \(!\(vnStickyHcgPoseId \|\| vnStickyHcgMode\)\)/);
  assert.match(appSource, /resetVnHcgVisual\(\{ clearSticky: false \}\)/);
});

test("launch screen exposes NSFW CG test lab entry", () => {
  const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /id="launchNsfwTestBtn"/);
  assert.match(html, /id="nsfwCgTestOverlay"/);
  assert.match(appSource, /function openNsfwCgTestLab\(/);
  assert.match(appSource, /function previewNsfwCgTest\(/);
  assert.match(appSource, /function startNsfwCgTestInvite\(/);
  assert.match(appSource, /nsfwCgTest:\s*true/);
  assert.match(appSource, /launchNsfwTestBtn[\s\S]*openNsfwCgTestLab/);
});

test("NSFW CG test stays isolated from normal apartment invite", () => {
  const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
  assert.match(appSource, /function buildNsfwCgTestLockPromptSection\(/);
  assert.match(appSource, /if \(!actionContext\?\.nsfwCgTest\) return ""/);
  assert.match(appSource, /故意不设 apartmentInvite/);
  assert.match(appSource, /&& !Boolean\(state\.pendingActionContext\?\.actionContext\?\.nsfwCgTest\)/);
  assert.match(appSource, /if \(context\.actionContext\?\.nsfwCgTest\) return false;/);
  assert.match(appSource, /仅 CG 测试流程提供换姿势；普通公寓邀约不受影响/);
  assert.match(appSource, /if \(isNsfwCgTestActive\(\)\) \{\s*const poseBtn/);
  assert.match(appSource, /apartmentInvite = Boolean\(actionContext\.apartmentInvite\) && !isCgTest/);
  assert.match(appSource, /function startApartmentNsfwInvite\(/);
  assert.match(
    appSource,
    /function startApartmentNsfwInvite\(idolName\) \{[\s\S]*?apartmentInvite:\s*true,\s*inviteIdol:\s*targetIdol,\s*intimacyMode:\s*"nsfw"\s*\};/
  );
  assert.doesNotMatch(
    appSource.slice(
      appSource.indexOf("function startApartmentNsfwInvite"),
      appSource.indexOf("function completeNiaEveningAfterSleep")
    ),
    /nsfwCgTest|lockedPoseId|更换姿势/
  );
});
