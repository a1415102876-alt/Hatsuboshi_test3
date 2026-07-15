import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

function readFunction(functionName) {
  const declaration = `function ${functionName}`;
  const start = source.indexOf(declaration);
  assert.notEqual(start, -1, `${functionName} must exist`);
  const bodyStart = source.indexOf("{", source.indexOf(")", start));
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'" || character === "`") quote = character;
    else if (character === "{") depth += 1;
    else if (character === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`Could not parse ${functionName}`);
}

test("app loads the multi-idol roster module before task and app code", () => {
  const rosterIndex = html.indexOf("sandbox/idol-roster.js");
  const tasksIndex = html.indexOf("tasks/sandbox-tasks.js");
  const appIndex = html.indexOf("app.js");
  assert.notEqual(rosterIndex, -1);
  assert.ok(rosterIndex < tasksIndex);
  assert.ok(tasksIndex < appIndex);
});

test("additional idol scouting preserves the responsible idol instead of applying a reset preset", () => {
  const body = readFunction("startSandboxInviteStory");
  assert.match(body, /additionalScout/);
  assert.match(body, /if \(!additionalScout\)[\s\S]*applyIdolPreset\(canonical, true\)/);
  assert.match(body, /scoutTargetIdol:\s*canonical/);
  assert.match(body, /additionalScout/);
});

test("additional scout intro closes back to campus without restarting the sandbox day", () => {
  const body = readFunction("closeEventOverlay");
  assert.match(body, /sandboxInvite[\s\S]*additionalScout/);
  assert.match(body, /additionalScout[\s\S]*setElementHidden\("eventOverlay", true\)[\s\S]*return/);
  assert.match(body, /enterSandboxCampusAfterOpening/);
});

test("accepted scout completion finalizes a profile and auto-switches responsibility", () => {
  const questBody = readFunction("processSandboxQuestFromReply");
  const finalizerBody = readFunction("finalizeConfirmedSandboxScouts");
  assert.match(questBody, /finalizeConfirmedSandboxScouts\(merged\)/);
  assert.match(finalizerBody, /createConfirmedIdolTaskState/);
  assert.match(finalizerBody, /confirmAssignedIdol/);
  assert.match(finalizerBody, /scoutTargetIdol/);
});

test("state normalization and saving keep the responsible profile authoritative", () => {
  assert.match(readFunction("ensureStateShape"), /normalizeSandboxIdolRoster/);
  assert.match(readFunction("saveState"), /saveResponsibleProfile/);
});

test("manual responsible-idol switching is blocked by every in-flight gameplay surface", () => {
  const guard = readFunction("getResponsibleIdolSwitchBlockReason");
  const switching = readFunction("switchResponsibleIdolFromUi");
  assert.match(guard, /getPrimaryModelChannelOwner/);
  assert.match(guard, /recovery_required/);
  assert.match(guard, /activeStoryNode/);
  assert.match(guard, /pendingActionContext/);
  assert.match(guard, /isLiveTheaterActive/);
  assert.match(switching, /switchResponsibleIdol/);
  assert.match(switching, /saveState/);
  assert.doesNotMatch(switching, /advanceFreeModeTime/);
});
