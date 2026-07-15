import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const appJs = readFileSync(join(root, "app.js"), "utf8");
const html = readFileSync(join(root, "index.html"), "utf8");

assert.match(html, /id="launchStage"/);
assert.match(html, /id="launchProduceBtn"/);
assert.match(html, /id="launchSandboxBtn"/);
assert.match(html, /id="selectLaunchBackBtn"/);
assert.match(appJs, /launchMode:\s*null/);
assert.match(appJs, /function chooseLaunchMode\(/);
assert.match(appJs, /function startSandboxAsariOpening\(/);
assert.match(appJs, /function enterSandboxCampusAfterOpening\(/);
assert.match(appJs, /SANDBOX_SELECTABLE_IDOLS/);
assert.match(appJs, /const SANDBOX_SELECTABLE_IDOLS = \["\u6708\u6751\u624b\u6bec", "\u85e4\u7530\u7434\u97f3", "\u82b1\u6d77\u54b2\u5b63", "\u79e6\u8c37\u7f8e\u94c3", "\u7b71\u6cfd\u5e7f", "\u845b\u57ce\u8389\u8389\u5a05"\]/);
assert.match(appJs, /isSandboxScoutActive/);
assert.match(appJs, /getSandboxScoutTargetAtLocation/);
assert.match(appJs, /macro_phase = "scout"/);
assert.match(appJs, /syncSandboxMacroPhase/);
assert.match(appJs, /SANDBOX_INVITE_STORY/);
assert.match(appJs, /function startSandboxInviteStory\(/);
assert.match(appJs, /inviteComplete/);
assert.match(appJs, /sandboxInvite/);
assert.match(appJs, /launchMode === "sandbox" && Boolean\(state\.sandbox\?\.openingComplete\)/);
assert.match(appJs, /亚纱里老师/);
assert.match(appJs, /Producer_Class\.png/);
assert.match(appJs, /function returnToLaunchMenu\(/);
assert.match(appJs, /function shouldShowLaunchStage\(/);
assert.match(html, /id="launchResumeBtn"/);
assert.match(appJs, /launchMenuPaused/);
assert.match(appJs, /function resumeFromLaunchMenu\(/);
assert.match(appJs, /function restoreBackupSave\(/);

console.log("launch-mode.test.mjs passed");
