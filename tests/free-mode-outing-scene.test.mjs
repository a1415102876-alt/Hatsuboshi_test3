import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const source = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const style = readFileSync(new URL("../style.css", import.meta.url), "utf8");
const stripeCount = (html.match(/class="wipe-stripe"/g) || []).length;

function readFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const next = source.indexOf("\n  function ", start + 1);
  return source.slice(start, next === -1 ? source.length : next);
}

test("shopping mall outing opens an entrance scene with facility guide", () => {
  assert.match(source, /const FREE_MODE_OUTING_VENUES =/);
  assert.match(source, /id: "shopping_mall"/);
  assert.match(source, /Shopping_Mall_Entrance\.png/);
  assert.match(source, /Game_Center\.png/);
  assert.match(source, /Karaoke\.png/);
  assert.match(source, /AnimeShop\.png/);
  assert.match(source, /Cinema\.png/);
  assert.match(source, /id: "fashion_store"/);
  assert.match(source, /name: "服装店"/);
  assert.match(source, /Shopping_Mall\.png/);
  assert.doesNotMatch(source, /name: "餐饮区"/);
  assert.match(source, /cinema/);

  assert.match(html, /id="freeModeOutingSceneOverlay"/);
  assert.match(html, /id="freeModeOutingSceneImage"/);
  assert.match(html, /id="freeModeOutingFacilityGuideBtn"/);
  assert.match(html, /id="freeModeOutingFacilityGuide"/);
  assert.match(html, /id="freeModeOutingSceneIdols"/);
  assert.match(html, /id="freeModeOutingSpeechBubble"/);
  assert.match(html, /id="freeModeOutingDialogueBar"/);
  assert.match(html, /id="freeModeOutingNarrationText"/);
  assert.match(html, /id="freeModeOutingProducerText"/);
  assert.match(html, /data-outing-dialogue-action="chat"/);
  assert.match(html, /data-outing-dialogue-action="explore"/);
  assert.match(html, /id="freeModeOutingDialogueCustomInput"/);
  assert.match(html, /id="freeModeOutingDialogueCustomSendBtn"/);
  assert.match(html, /id="freeModeOutingIdolActionMenu"/);

  assert.match(readFunction("confirmFreeModeOutingDestination"), /getFreeModeOutingVenueByDestination/);
  assert.match(readFunction("confirmFreeModeOutingDestination"), /openFreeModeOutingScene/);
  assert.match(readFunction("renderFreeModeOutingSceneIdols"), /resolvePortraitForSpeaker/);
  assert.match(readFunction("renderFreeModeOutingSceneDialogue"), /freeModeOutingSpeechBubble/);
  assert.match(readFunction("renderFreeModeOutingSceneDialogue"), /freeModeOutingDialogueBar/);
  assert.match(readFunction("handleFreeModeOutingIdolAction"), /requestFreeModeOutingSceneDialogue/);
  assert.match(readFunction("buildFreeModeOutingSceneDialoguePrompt"), /scene_narration/);
  assert.match(readFunction("buildFreeModeOutingSceneDialoguePrompt"), /<producer>/);
  assert.match(readFunction("buildFreeModeOutingSceneDialoguePrompt"), /<idol>/);
  assert.match(readFunction("buildFreeModeOutingSceneDialoguePrompt"), /customText/);
  assert.match(readFunction("buildFreeModeOutingSceneDialoguePrompt"), /用户自定义聊天内容/);
  assert.match(readFunction("extractFreeModeOutingSceneDialogue"), /scene_narration/);
  assert.match(readFunction("requestFreeModeOutingSceneDialogue"), /outing_scene_dialogue/);
  assert.match(readFunction("requestFreeModeOutingSceneDialogue"), /requestHostPromptSend/);
  assert.match(readFunction("requestFreeModeOutingSceneDialogue"), /showFreeModeOutingSceneDialogue/);
  assert.match(source, /function submitFreeModeOutingSceneCustomDialogue\(/);
  assert.match(source, /freeModeOutingDialogueCustomSendBtn[\s\S]*submitFreeModeOutingSceneCustomDialogue/);
  assert.match(source, /bindImeSafeTextInput\("freeModeOutingDialogueCustomInput", submitFreeModeOutingSceneCustomDialogue\)/);
  assert.match(source, /outing_scene_dialogue[\s\S]*extractFreeModeOutingSceneDialogue[\s\S]*renderFreeModeOutingSceneDialogue/);
  assert.match(source, /freeModeOutingSceneBackBtn[\s\S]*openFreeModeOutingOverlay/);
  assert.match(source, /freeModeOutingFacilityGuideBtn[\s\S]*openFreeModeOutingFacilityGuide/);
  assert.match(source, /freeModeOutingFacilityGuideCloseBtn[\s\S]*closeFreeModeOutingFacilityGuide/);
  assert.match(source, /data-outing-idol-action[\s\S]*handleFreeModeOutingIdolAction/);
  assert.match(readFunction("renderFreeModeOutingFacilityGuide"), /data-outing-facility-id/);
});


test("shopping street outing opens a full venue scene with daily-life facilities", () => {
  assert.match(source, /id: "shopping_street"/);
  assert.match(source, /stationId: "shopping_street"/);
  assert.match(source, /Shopping_Street\.png/);
  assert.match(source, /id: "ramen_shop"/);
  assert.match(source, /name: "拉面店"/);
  assert.match(source, /Ramen\.png/);
  assert.match(source, /id: "burger_shop"/);
  assert.match(source, /name: "琴音打工的快餐店"/);
  assert.match(source, /Burger_Shop\.png/);
  assert.match(source, /id: "grocery"/);
  assert.match(source, /name: "杂货店"/);
  assert.match(source, /grocery\.png/);
  assert.match(source, /id: "cake_shop"/);
  assert.match(source, /name: "甜品店"/);
  assert.match(source, /Cake_Shop\.png/);
});

test("Kuramoto home outing uses a gate, front hall, and bedroom venue", () => {
  assert.match(source, /\{ name: "仓本家", description:/);
  assert.match(source, /china_home:\s*\{/);
  assert.match(source, /stationId: "china_home"/);
  assert.match(source, /entranceFacilityId: "gate"/);
  assert.match(source, /id: "gate"/);
  assert.match(source, /id: "front_hall"/);
  assert.match(source, /id: "bedroom"/);
  assert.match(source, /sceneName: "仓本家大门"/);
  assert.match(source, /sceneName: "仓本家前厅"/);
  assert.match(source, /sceneName: "千奈卧室"/);
  assert.match(source, /id: "gate",[\s\S]*?image: "\.\/assets\/scenes\/kuramoto_house\.png"/);
  assert.match(source, /id: "front_hall",[\s\S]*?image: "\.\/assets\/scenes\/kuramoto_front\.png"/);
  assert.match(source, /id: "bedroom",[\s\S]*?image: "\.\/assets\/scenes\/Kuramoto_Bedroom\.png"/);
  [
    "../assets/scenes/kuramoto_house.png",
    "../assets/scenes/kuramoto_front.png",
    "../assets/scenes/Kuramoto_Bedroom.png"
  ].forEach((path) => assert.equal(existsSync(new URL(path, import.meta.url)), true, `${path} must exist`));
  assert.match(source, /function isChinaHomeScoutBedroomActive\(/);
  assert.match(readFunction("buildSandboxScoutExplorePrompt"), /FREE_MODE_OUTING_LOCATION_ID/);
  assert.match(readFunction("isChinaHomeScoutBedroomActive"), /facilityId === "bedroom"/);
  assert.match(html, /data-outing-idol-action="china_scout_talk"[^>]*>和千奈搭话<\/button>/);
  assert.match(style, /\.outing-idol-scout-talk\s*\{[\s\S]*grid-column:\s*1\s*\/\s*-1/);
  assert.match(source, /id: "front_hall",[\s\S]*?residentCharacters: \["冰渡香名江"\]/);
  const bedroom = source.match(/\{\s*id: "bedroom",[\s\S]*?\n        \}/)?.[0] || "";
  assert.doesNotMatch(bedroom, /residentCharacters/);
});

test("outing scenes render assigned idols and facility resident NPCs through one portrait resolver", () => {
  assert.match(source, /function getFreeModeOutingSceneCharacters\(/);
  assert.match(readFunction("getFreeModeOutingSceneCharacters"), /residentCharacters/);
  assert.match(readFunction("getFreeModeOutingSceneCharacters"), /isChinaHomeScoutBedroomActive/);
  assert.match(readFunction("renderFreeModeOutingSceneIdols"), /getFreeModeOutingSceneCharacters/);
  assert.match(readFunction("renderFreeModeOutingSceneIdols"), /resolvePortraitForSpeaker/);
  assert.match(readFunction("renderFreeModeOutingSceneIdols"), /applyResolvedPortraitToImage/);
  assert.match(readFunction("openFreeModeOutingIdolActionMenu"), /data-outing-idol-action="status"/);
  assert.match(readFunction("openFreeModeOutingIdolActionMenu"), /isChinaHomeScoutBedroomActive/);
  assert.match(readFunction("openFreeModeOutingIdolActionMenu"), /standardButtons/);
  assert.match(readFunction("openFreeModeOutingIdolActionMenu"), /scoutTalkButton/);
  assert.match(readFunction("handleFreeModeOutingIdolAction"), /action === "china_scout_talk"/);
  assert.match(readFunction("handleFreeModeOutingIdolAction"), /closeFreeModeOutingIdolActionMenu\(\)/);
  assert.match(readFunction("handleFreeModeOutingIdolAction"), /startFreeModeOutingFacilityExplore\("chat"\)/);
  assert.match(readFunction("buildFreeModeOutingSceneDialoguePrompt"), /当前互动角色/);
  assert.match(readFunction("buildFreeModeOutingSceneDialoguePrompt"), /isIdol/);
});
test("shopping mall outing scene uses the fullscreen page and shared wipe transition", () => {
  assert.equal(stripeCount, 6);
  assert.match(style, /\.wipe-stripe\s*\{[\s\S]*height:\s*calc\(100% \/ 6 \+ 2px\)/);
  assert.match(style, /\.wipe-stripe\s*\{[\s\S]*top:\s*calc\(var\(--i\) \* \(100% \/ 6\)\)/);
  assert.match(style, /\.free-mode-outing-scene-overlay\s*\{[\s\S]*place-items:\s*stretch/);
  assert.match(style, /\.free-mode-outing-scene-panel\s*\{[\s\S]*width:\s*100vw/);
  assert.match(style, /\.free-mode-outing-scene-panel\s*\{[\s\S]*height:\s*100svh/);
  assert.match(readFunction("openFreeModeOutingScene"), /triggerWipeTransition/);
  assert.match(readFunction("selectFreeModeOutingFacility"), /triggerWipeTransition/);
  assert.match(style, /\.free-mode-outing-scene-idols\s*\{[\s\S]*inset:\s*110px 32px -310px/);
  assert.match(style, /\.outing-scene-idol\s*\{[\s\S]*width:\s*min\(620px, 52vw\)/);
  assert.match(style, /\.outing-scene-idol\s*\{[\s\S]*height:\s*min\(1120px, 122svh\)/);
  assert.match(style, /\.outing-scene-idol span\s*\{[\s\S]*bottom:\s*316px/);
  assert.match(style, /\.outing-scene-speech-bubble/);
  assert.match(style, /\.outing-scene-dialogue-bar/);
  assert.doesNotMatch(style, /mallSceneEnter|mallSceneImageSettle/);
});
test("outing scene prompt includes current venue and facility context", () => {
  assert.match(readFunction("buildFreeModeOutingExplorePrompt"), /getActiveFreeModeOutingFacility/);
  assert.match(readFunction("buildFreeModeOutingExplorePrompt"), /当前设施/);
  assert.match(readFunction("buildFreeModeOutingExplorePrompt"), /当前场景/);
  assert.match(readFunction("startFreeModeOutingFacilityExplore"), /beginMapLocationExploreSession/);
  assert.match(readFunction("startFreeModeOutingFacilityExplore"), /returnTarget:\s*\{/);
  assert.match(readFunction("startFreeModeOutingFacilityExplore"), /type:\s*"outing_scene"/);
  assert.match(readFunction("beginMapLocationExploreSession"), /returnTarget\s*=\s*null/);
  assert.match(readFunction("beginMapLocationExploreSession"), /returnTarget/);
  assert.match(readFunction("appendMapLocationControlButtons"), /returnToFreeModeExploreOrigin/);
  assert.match(readFunction("handleMapLocationReturn"), /getMapExploreReturnTarget/);
  assert.match(readFunction("returnToFreeModeExploreOrigin"), /returnToFreeModeOutingScene/);
  assert.match(readFunction("returnToFreeModeOutingScene"), /openFreeModeOutingScene/);
});

test("outing scene dialogue parser ignores thinking footer and markdown body heading", () => {
  const fn = new Function(
    "stripAiThinkingBlocks",
    "cleanReplyText",
    `${readFunction("extractFreeModeOutingSceneDialogue")}; return extractFreeModeOutingSceneDialogue;`
  )(
    (value) => String(value || "").replace(/<thinking\b[^>]*>[\s\S]*?<\/thinking>/gi, ""),
    (value) => String(value || "").replace(/<(?!dialogue|narration|\/dialogue|\/narration)\/?[a-zA-Z_][\w:-]*\b[^>]*>/gi, "").trim()
  );
  const dialogue = fn(`</thinking>

### 正文

<scene_narration>抓娃娃机的机械爪在终点前无力地松开，里面的毛绒玩偶再次滑落下去。</scene_narration>
<producer>“果然空手而归了啊。怎么样，要不要我来帮你抓一次试试？”</producer>
<idol>“不用了。呵呵，亲眼看着它在最后一刻掉下去，这种不甘心的感觉……真的很棒。”</idol>`);

  assert.equal(dialogue.narration, "抓娃娃机的机械爪在终点前无力地松开，里面的毛绒玩偶再次滑落下去。");
  assert.equal(dialogue.producer, "“果然空手而归了啊。怎么样，要不要我来帮你抓一次试试？”");
  assert.equal(dialogue.idol, "“不用了。呵呵，亲眼看着它在最后一刻掉下去，这种不甘心的感觉……真的很棒。”");
  assert.doesNotMatch(`${dialogue.narration}\n${dialogue.producer}\n${dialogue.idol}`, /###\s*正文/);
});
