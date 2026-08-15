import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const hostHtml = await readFile(new URL('../st.html', import.meta.url), 'utf8');
const prototypeJs = await readFile(new URL('../nia-prototype.js', import.meta.url), 'utf8');
const indexHtml = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const appJs = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const styleCss = await readFile(new URL('../style.css', import.meta.url), 'utf8');
const businessApiJs = await readFile(new URL('../nia-business-api.js', import.meta.url), 'utf8');
const radioApiJs = await readFile(new URL('../nia-radio-business-api.js', import.meta.url), 'utf8');
const auditionApiJs = await readFile(new URL('../nia-audition-api.js', import.meta.url), 'utf8');

test('N.I.A host messages are forwarded to embedded frames', () => {
  assert.match(hostHtml, /function postCommittedReply[\s\S]*?postToFrame\(payload\);/);
  assert.match(hostHtml, /function postPrimaryAiError[\s\S]*?postToFrame\(\{/);
  assert.match(hostHtml, /getElementById\('hatsu-nia-prototype-frame'\)/);
});

test('formal N.I.A view delegates plan generation to the shared app harness', () => {
  assert.doesNotMatch(prototypeJs, /type:\s*['"]sendPrompt['"]/);
  assert.doesNotMatch(prototypeJs, /channelLeaseId|saveScope|sessionEpoch/);
  assert.match(prototypeJs, /source:\s*'hatsuboshi-produce-nia-view'/);
  assert.match(prototypeJs, /type:\s*'niaPlanSubmit'/);
  assert.match(appJs, /data\.source === "hatsuboshi-produce-nia-view"/);
  assert.match(appJs, /event\.source !== niaFrame\?\.contentWindow/);
  assert.match(appJs, /data\.type === "niaPlanSubmit"[\s\S]{0,180}submitNiaPlanFromView\(data\)/);
  assert.match(appJs, /ownerKind:\s*"nia_plan"/);
});

test('N.I.A iframe launch has one owner while host messaging remains in st.html', () => {
  assert.match(hostHtml, /let bridgeReadyPromise = null;/);
  assert.doesNotMatch(hostHtml, /niaPrototypeEntry\.addEventListener/);
  assert.match(hostHtml, /hatsu-nia-prototype-frame/);
  assert.match(appJs, /function openNiaPrototype/);
});

test('N.I.A view binds the state-sync sender and never assumes the direct parent', () => {
  assert.match(prototypeJs, /function postToHost/);
  assert.match(prototypeJs, /hostWindow = event\.source/);
  assert.match(prototypeJs, /type:\s*'niaViewReady'/);
  assert.match(appJs, /type:\s*"niaStateSync"/);
  assert.match(appJs, /data\.type === "niaTrainingStart"/);
});

test('first-round briefing completion is persisted and projected to the N.I.A tablet', () => {
  assert.match(appJs, /firstRoundBriefingSeen:\s*false/);
  assert.match(appJs, /firstRoundBriefingSeen:\s*Boolean\(source\.firstRoundBriefingSeen\)/);
  assert.match(appJs, /firstRoundBriefingSeen:\s*nia\.firstRoundBriefingSeen/);
  assert.match(appJs, /data\.type === "niaFirstRoundBriefingComplete"/);
  assert.match(appJs, /firstRoundBriefingSeen:\s*true/);
  assert.match(appJs, /saveState\("nia\.first_round_briefing_complete"\)/);
  assert.match(appJs, /saveState\("nia\.first_round_briefing_complete"\)[\s\S]{0,120}postNiaStateSync\(\)/);
});

test('standalone N.I.A preview blocks fake generation but keeps draft editing', () => {
  assert.match(prototypeJs, /if \(!hostConnected\)/);
  assert.match(prototypeJs, /独立预览不能建立企划/);
  assert.doesNotMatch(prototypeJs, /compileSakiDraft|本地规则兜底/);
});

test('N.I.A is a formal produce scenario and keeps the host page alive', () => {
  assert.doesNotMatch(indexHtml, /id="launchNiaBtn"/);
  assert.match(indexHtml, /id="scenarioPanel"/);
  assert.match(indexHtml, /data-scenario="nia"/);
  assert.doesNotMatch(indexHtml, /N\.I\.A Prototype|N\.I\.A 企划测试/);
  assert.match(appJs, /state\.produceScenario === "nia"/);
  assert.match(indexHtml, /id="niaInheritancePanel"/);
  assert.match(appJs, /function completeNiaProducerSetup\(/);
  assert.match(appJs, /triggerNiaEntryTransition\(\(\) => startNiaOpeningStory\("确认前情并签署 N\.I\.A 合约"\)\)/);
});

test('host prompt dispatch appends route markers for conditional worldbook loading', () => {
  assert.match(appJs, /function buildHatsuRouteMarkers\(options = \{\}\)/);
  assert.match(appJs, /<HATSU_ROUTE>\$\{route\}<\/HATSU_ROUTE>/);
  assert.match(appJs, /<HATSU_IDOL>\$\{idolCode\}<\/HATSU_IDOL>/);
  assert.match(appJs, /<HATSU_PHASE>\$\{phase\}<\/HATSU_PHASE>/);
  assert.match(appJs, /<HATSU_CONTEXT>\$\{route\}:\$\{idolCode\}:\$\{phase\}<\/HATSU_CONTEXT>/);
  assert.match(appJs, /withNiaAffinityContext\(appendHatsuRouteMarkers\(rawPrompt, options\)\)/);
  assert.match(appJs, /ownerKind\.includes\("nia_opening"\)/);
});

test('N.I.A opening has its own persisted lifecycle and primary API contract', () => {
  assert.match(appJs, /openingStatus:\s*"idle"/);
  assert.match(appJs, /openingStory:\s*""/);
  assert.match(appJs, /openingRequest:\s*null/);
  assert.match(appJs, /openingStatuses\s*=\s*\["idle", "generating", "ready", "completed", "retryable_failed"\]/);
  assert.match(appJs, /function buildNiaOpeningPrompt\(\)/);
  assert.match(appJs, /NEXT IDOL AUDITION/);
  assert.match(appJs, /粉丝投票机制/);
  assert.match(appJs, /吸引粉丝是参赛的起点/);
  assert.match(appJs, /吸粉、选拔和排名视为新的战斗/);
  assert.match(appJs, /佑芽登场/);
  assert.match(appJs, /各自积累粉丝/);
  assert.match(appJs, /FINALE 正面对决/);
  assert.match(appJs, /不要提前描写选拔结果或 FINALE 胜负/);
  assert.match(appJs, /function startNiaOpeningStory\(source = "startNiaOpeningStory"\)/);
  assert.match(appJs, /ownerKind:\s*"nia_opening"/);
  assert.match(appJs, /type:\s*"niaOpening"/);
});

test('confirmed N.I.A scenario fades through the final logo card without sliders', () => {
  assert.match(indexHtml, /id="niaEntryTransition"/);
  assert.match(indexHtml, /class="nia-entry-camera"/);
  assert.match(indexHtml, /class="nia-entry-logo-card"/);
  assert.match(indexHtml, /class="nia-entry-logo"/);
  assert.match(indexHtml, /class="nia-entry-logo" role="img" aria-label="NIA"/);
  assert.match(indexHtml, /class="nia-entry-logo-image" src="\.\/UI\/nia-logo\.png"/);
  assert.match(indexHtml, /class="nia-entry-logo-shimmer" src="\.\/UI\/nia-logo\.png"/);
  assert.match(indexHtml, /NEXT IDOL AUDITION/);
  assert.match(indexHtml, /class="nia-entry-logo-subtitle" aria-label="NEXT IDOL AUDITION"/);
  assert.match(indexHtml, /class="nia-entry-subtitle-art" viewBox="0 329 2009 136" aria-hidden="true"/);
  assert.equal([...indexHtml.matchAll(/<g class="nia-entry-subtitle-char"/g)].length, 16);
  assert.match(indexHtml, /style="--char-index:0"[\s\S]{0,180}href="\.\/UI\/nia-subtitle\.png"/);
  assert.doesNotMatch(indexHtml, /nia-entry-slider|nia-entry-fragments|nia-entry-ribbon|新企划启动/);
  assert.match(styleCss, /\.nia-entry-transition\.is-playing/);
  assert.match(styleCss, /@keyframes niaEntryLogoCard/);
  assert.match(styleCss, /\.nia-entry-camera\s*\{[\s\S]{0,240}transform-origin:\s*55% 45\.5%/);
  assert.match(styleCss, /@keyframes niaEntryCameraPullback[\s\S]{0,500}11\.25%[\s\S]{0,220}scale\(1\.5\)[\s\S]{0,220}42\.5%[\s\S]{0,220}scale\(1\)/);
  assert.match(styleCss, /\.nia-entry-logo-card\s*\{[\s\S]{0,500}linear-gradient\(90deg,\s*#d47ce9 0%,\s*#c971e4 18%,\s*#7542c7 34%/);
  assert.doesNotMatch(styleCss, /\.nia-entry-logo-card\s*\{[\s\S]{0,500}radial-gradient/);
  assert.match(styleCss, /\.nia-entry-transition\.is-playing \.nia-entry-logo[\s\S]{0,180}niaEntryLogoAppear 1\.6s/);
  assert.match(styleCss, /@keyframes niaEntryLogoAppear[\s\S]{0,260}opacity:\s*1/);
  assert.match(styleCss, /\.nia-entry-logo-image,[\s\S]{0,500}top:\s*-165\.9%[\s\S]{0,180}width:\s*135\.1%/);
  assert.match(styleCss, /\.nia-entry-logo-shimmer\s*\{[\s\S]{0,300}clip-path:\s*inset\(0 100% 0 0\)/);
  assert.match(styleCss, /@keyframes niaEntryGoldShimmer/);
  assert.match(styleCss, /\.nia-entry-subtitle-char[\s\S]{0,500}calc\(\.38s \+ var\(--char-index\) \* 25ms\)/);
  assert.match(styleCss, /\.nia-entry-logo-card[\s\S]{0,300}padding-inline:\s*clamp\(/);
  assert.match(styleCss, /\.nia-entry-logo\s*\{[\s\S]{0,360}aspect-ratio:\s*379 \/ 129[\s\S]{0,180}scaleX\(1\.08\)/);
  assert.match(indexHtml, /<div class="nia-entry-logo-star" aria-hidden="true">/);
  assert.match(indexHtml, /nia-entry-star-base[^"]*" src="\.\/UI\/nia-yellow-star\.png"/);
  assert.equal([...indexHtml.matchAll(/src="\.\/UI\/nia-yellow-star\.png"/g)].length, 5);
  assert.match(indexHtml, /nia-entry-star-trail-one/);
  assert.match(indexHtml, /nia-entry-star-white/);
  assert.match(indexHtml, /nia-entry-star-gold/);
  assert.match(styleCss, /\.nia-entry-star-layer\s*\{[\s\S]{0,400}object-fit:\s*contain/);
  assert.doesNotMatch(styleCss, /\.nia-entry-logo-star\s*\{[\s\S]{0,500}(?:clip-path|linear-gradient|drop-shadow)/);
  assert.match(styleCss, /@keyframes niaEntryStarFrames[\s\S]{0,1600}9\.375%[\s\S]{0,300}11\.46%[\s\S]{0,300}13\.54%[\s\S]{0,700}23\.94%/);
  assert.match(styleCss, /@keyframes niaEntryStarWhiteWipe[\s\S]{0,700}23\.94%[\s\S]{0,300}32\.5%/);
  assert.match(styleCss, /@keyframes niaEntryStarGoldWipe[\s\S]{0,700}32\.5%[\s\S]{0,400}55%/);
  assert.match(styleCss, /@keyframes niaEntryStarTrailOne/);
  assert.match(styleCss, /@keyframes niaEntryStarTrailTwo/);
  assert.match(styleCss, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.nia-entry-transition\.is-playing \.nia-entry-camera[\s\S]{0,180}animation:\s*none[\s\S]{0,180}scale\(1\)/);
  assert.match(styleCss, /@keyframes niaEntryLogoCard\s*\{\s*0% \{ opacity: 0; \}\s*22%, 68% \{ opacity: 1; \}\s*100% \{ opacity: 0; \}\s*\}/);
  assert.match(styleCss, /@keyframes niaEntryStarReduced[\s\S]{0,300}translate\(-50%, -50%\)/);
  assert.match(styleCss, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.nia-entry-transition/);
  assert.match(appJs, /function triggerNiaEntryTransition\(callback\)/);
  assert.match(appJs, /const openDelay = reducedMotion \? 60 : 1180/);
  assert.match(appJs, /const finishDelay = reducedMotion \? 120 : 1600/);
  assert.match(appJs, /function completeNiaProducerSetup\([\s\S]{0,2600}triggerNiaEntryTransition\(\(\) => startNiaOpeningStory\("确认前情并签署 N\.I\.A 合约"\)\)/);
});

test('N.I.A fullscreen mode provides a way back to the launch menu', () => {
  assert.match(appJs, /function getNiaPrototypeMountTarget\(\)[\s\S]*?getElementById\("hatsu-fullscreen-overlay"\)[\s\S]*?document\.body/);
  assert.match(appJs, /const mountTarget = getNiaPrototypeMountTarget\(\)/);
  assert.match(appJs, /mountTarget\.appendChild\(frame\)/);
  assert.match(appJs, /mountTarget\.appendChild\(closeButton\)/);
  assert.match(appJs, /id = "hatsu-nia-prototype-close"/);
  assert.match(appJs, /setNiaPrototypeVisible\(visible\)[\s\S]*?closeButton\.hidden = !visible/);
  assert.match(appJs, /hatsu-nia-prototype-close[\s\S]*?setNiaPrototypeVisible\(false\)/);
});

test('formal N.I.A state is normalized, persisted, and reply-gated by harness identity', () => {
  assert.match(appJs, /function createDefaultNiaState\(\)/);
  assert.match(appJs, /function normalizeNiaState\(raw\)/);
  assert.match(appJs, /state\.nia = normalizeNiaState\(state\.nia\)/);
  assert.match(appJs, /state\.harness\.activeTurn = \{[\s\S]{0,800}kind:\s*"nia_plan"/);
  assert.match(appJs, /nia\.activeRequest\.saveScope === String\(activeHostSaveScope/);
  assert.match(appJs, /nia\.activeRequest\.sessionEpoch === String\(runtimeSessionEpoch/);
  assert.match(appJs, /planStatuses = \["idle", "generating", "reviewing", "retryable_failed", "committed"\]/);
  assert.match(appJs, /pendingReviewPlan:/);
  assert.match(appJs, /saveState\("nia\.plan_review_ready"\)/);
});

test('restored N.I.A contracts resume the N.I.A route instead of the Hatsu opening', () => {
  const resumeOpeningStart = appJs.indexOf('function resumeOpeningIfNeeded');
  const resumeOpeningEnd = appJs.indexOf('\n  function ', resumeOpeningStart + 1);
  const resumeOpening = appJs.slice(resumeOpeningStart, resumeOpeningEnd);
  const applyHostStart = appJs.indexOf('function applyHostCharacter');
  const applyHostEnd = appJs.indexOf('\n  function ', applyHostStart + 1);
  const applyHostCharacter = appJs.slice(applyHostStart, applyHostEnd);
  const resumeNiaStart = appJs.indexOf('function resumeNiaModeIfNeeded');
  const resumeNiaEnd = appJs.indexOf('\n  function ', resumeNiaStart + 1);
  const resumeNia = appJs.slice(resumeNiaStart, resumeNiaEnd);

  assert.match(resumeOpening, /state\.launchMode === "nia" \|\| state\.produceScenario === "nia"/);
  assert.match(appJs, /function resumeNiaModeIfNeeded\(\)/);
  assert.match(appJs, /state\.produceScenario !== "nia" \|\| !state\.idol/);
  assert.match(appJs, /state\.launchMode = "nia"/);
  assert.match(appJs, /resumeNiaPlanReviewIfNeeded\(\)/);
  assert.match(resumeNia, /if \(isNiaTrainingActive\(\)\) \{[\s\S]*resumeNiaProducerWorkIfNeeded\(\);/);
  assert.match(resumeNia, /openingStatus === "idle" \|\| nia\.openingStatus === "retryable_failed"/);
  assert.match(resumeNia, /startNiaOpeningStory\("恢复 N\.I\.A 开场"\)/);
  assert.match(resumeNia, /openingStatus === "ready"[\s\S]*openNiaOpeningVn/);
  assert.match(resumeNia, /openingStatus === "generating"[\s\S]*openingStatus: "retryable_failed"/);
  assert.match(resumeNia, /openingStatus === "completed"[\s\S]*openNiaPrototype\(\)/);
  assert.match(applyHostCharacter, /render\(\);[\s\S]{0,240}resumeNiaModeIfNeeded\(\)[\s\S]{0,160}resumeOpeningIfNeeded\(\)/);
});

test('restored N.I.A live business takes priority after host state hydration', () => {
  const resumeNiaStart = appJs.indexOf('function resumeNiaModeIfNeeded');
  const resumeNiaEnd = appJs.indexOf('\n  function ', resumeNiaStart + 1);
  const resumeNia = appJs.slice(resumeNiaStart, resumeNiaEnd);
  const liveResume = resumeNia.indexOf('if (resumeNiaLiveBusinessIfNeeded()) return true;');
  const trainingRoute = resumeNia.indexOf('if (isNiaTrainingActive())');
  const ordinaryPrototype = resumeNia.lastIndexOf('openNiaPrototype()');

  assert.ok(liveResume >= 0, 'the hydrated N.I.A route must attempt to restore live business');
  assert.ok(liveResume < trainingRoute, 'live business must resume before training subflows');
  assert.ok(liveResume < ordinaryPrototype, 'live business must resume before the ordinary N.I.A tablet');
});

test('N.I.A opening replies are saved, played, and confirmed before planning day', () => {
  const closeStart = appJs.indexOf('function closeEventOverlay');
  const closeEnd = appJs.indexOf('\n  function ', closeStart + 1);
  const closeEventOverlay = appJs.slice(closeStart, closeEnd);
  assert.match(appJs, /function isCurrentNiaOpeningReply\(requestId\)/);
  assert.match(appJs, /function handleNiaOpeningAiReply\(text, rawText, renderedText, requestId, isFinal\)/);
  assert.match(appJs, /openingStatus:\s*"ready"/);
  assert.match(appJs, /openingStory:\s*reply/);
  assert.match(appJs, /openNiaOpeningVn\(reply\)/);
  assert.match(appJs, /node\?\.type === "niaOpening"[\s\S]{0,100}"进入企划日"/);
  assert.match(closeEventOverlay, /state\.activeStoryNode\?\.type === "niaOpening"/);
  assert.match(closeEventOverlay, /openingStatus:\s*"completed"/);
  assert.match(closeEventOverlay, /openNiaPrototype\(\)/);
  const applyReplyStart = appJs.indexOf('function applyAiReply');
  const niaOpeningRoute = appJs.indexOf('isCurrentNiaOpeningReply(requestId)', applyReplyStart);
  const niaPlanRoute = appJs.indexOf('isCurrentNiaPlanReply(requestId)', applyReplyStart);
  assert.ok(niaOpeningRoute > applyReplyStart && niaOpeningRoute < niaPlanRoute, 'N.I.A opening reply must route before ordinary N.I.A plan handling');
});

test('completed N.I.A plans play Asari review before the ready projection', () => {
  const replyStart = appJs.indexOf('async function handleNiaPlanAiReply');
  const replyEnd = appJs.indexOf('function getNiaPrototypeMountTarget', replyStart);
  const replyFlow = appJs.slice(replyStart, replyEnd);
  assert.match(replyFlow, /planStatus: "reviewing"/);
  assert.match(replyFlow, /pendingReviewPlan: plan/);
  assert.match(replyFlow, /openNiaPlanReviewVn\(plan\)/);
  assert.doesNotMatch(replyFlow.slice(0, replyFlow.indexOf('function completeNiaPlanReview')), /phase: "plan_ready"/);
  assert.match(appJs, /function buildNiaPlanReviewSlides\(plan\)[\s\S]*parts\.accepted[\s\S]*parts\.gap[\s\S]*parts\.advice/);
  assert.match(appJs, /speaker: "亚纱里老师"/);
  assert.match(appJs, /function completeNiaPlanReview\(\)[\s\S]*phase: "plan_ready"[\s\S]*planStatus: "committed"/);
  assert.match(appJs, /setNiaPrototypeVisible\(true\)[\s\S]*saveState\("nia\.plan_committed_after_review"\)[\s\S]*postNiaStateSync\(\)/);
  assert.match(appJs, /function resumeNiaPlanReviewIfNeeded\(\)/);
  const resumeNiaStart = appJs.indexOf('function resumeNiaModeIfNeeded');
  const resumeNiaEnd = appJs.indexOf('\n  function ', resumeNiaStart + 1);
  assert.match(appJs.slice(resumeNiaStart, resumeNiaEnd), /resumeNiaPlanReviewIfNeeded\(\)/);
});

test('N.I.A business API is registered synchronously before app.js in the embedded loader', () => {
  const businessLoad = hostHtml.indexOf("const businessApiUrl = abs('nia-business-api.js')");
  const appLoad = hostHtml.indexOf("fetch(abs('app.js')");
  assert.ok(businessLoad >= 0, 'st.html must load nia-business-api.js');
  assert.ok(businessLoad < appLoad, 'business API must be registered before app.js is evaluated');
  assert.match(hostHtml, /function convertNiaBusinessModuleToClassic\(sourceText\)/);
  assert.match(hostHtml, /window\.HATSU_NIA_BUSINESS_READY = Promise\.resolve\(niaBusinessModuleLoaded\)/);
  assert.doesNotMatch(hostHtml, /moduleScript\.type = "module"/);
});

test('embedded loader conversion executes the real business API as a browser global', () => {
  const functionStart = hostHtml.indexOf('function convertNiaBusinessModuleToClassic');
  const functionEnd = hostHtml.indexOf('\n  async function probeEmbedAssetBase', functionStart);
  assert.ok(functionStart >= 0 && functionEnd > functionStart);
  const convert = new Function(`${hostHtml.slice(functionStart, functionEnd)}\nreturn convertNiaBusinessModuleToClassic;`)();
  const browserGlobal = {};
  new Function('globalThis', convert(businessApiJs))(browserGlobal);
  assert.equal(typeof browserGlobal.HatsuNiaBusiness?.buildNiaLiveSegmentPrompt, 'function');
});

test('embedded loader registers the radio core and API before app.js', () => {
  const coreLoad = hostHtml.indexOf("abs('nia-radio-business-core.js')");
  const apiLoad = hostHtml.indexOf("const radioApiUrl = abs('nia-radio-business-api.js')");
  const appLoad = hostHtml.indexOf("fetch(abs('app.js')");
  assert.ok(coreLoad >= 0 && coreLoad < appLoad);
  assert.ok(apiLoad >= 0 && apiLoad < appLoad);
  const functionStart = hostHtml.indexOf('function convertNiaBusinessModuleToClassic');
  const functionEnd = hostHtml.indexOf('\n  async function probeEmbedAssetBase', functionStart);
  const convert = new Function(`${hostHtml.slice(functionStart, functionEnd)}\nreturn convertNiaBusinessModuleToClassic;`)();
  const browserGlobal = {};
  new Function('globalThis', convert(radioApiJs))(browserGlobal);
  assert.equal(typeof browserGlobal.HatsuNiaRadioApi?.buildNiaRadioSegmentPrompt, 'function');
});

test('embedded loader registers the audition core and API before app.js', () => {
  const coreLoad = hostHtml.indexOf("abs('nia-audition-core.js')");
  const apiLoad = hostHtml.indexOf("const auditionApiUrl = abs('nia-audition-api.js')");
  const appLoad = hostHtml.indexOf("fetch(abs('app.js')");
  assert.ok(coreLoad >= 0 && coreLoad < appLoad);
  assert.ok(apiLoad >= 0 && apiLoad < appLoad);
  const functionStart = hostHtml.indexOf('function convertNiaBusinessModuleToClassic');
  const functionEnd = hostHtml.indexOf('\n  async function probeEmbedAssetBase', functionStart);
  const convert = new Function(`${hostHtml.slice(functionStart, functionEnd)}\nreturn convertNiaBusinessModuleToClassic;`)();
  const browserGlobal = {};
  new Function('globalThis', convert(auditionApiJs))(browserGlobal);
  assert.equal(typeof browserGlobal.HatsuNiaAuditionApi?.buildNiaAuditionSegmentPrompt, 'function');
});

test('embedded loader provides the N.I.A training core before app.js starts', () => {
  const trainingLoad = hostHtml.indexOf('nia-training-core.js');
  const appLoad = hostHtml.indexOf("fetch(abs('app.js')");
  assert.ok(trainingLoad >= 0, 'st.html must load nia-training-core.js');
  assert.ok(trainingLoad < appLoad, 'training core must be available before app.js is evaluated');
});

test('embedded loader validates JavaScript bodies instead of accepting HTML fallbacks', () => {
  assert.match(hostHtml, /function isJavaScriptResponse\(response, sourceText\)/);
  assert.match(hostHtml, /!isJavaScriptResponse\(getRes, sourceText\)/);
  assert.match(hostHtml, /!isJavaScriptResponse\(modRes, sourceText\)/);
});
