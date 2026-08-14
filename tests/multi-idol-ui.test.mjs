import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../style.css", import.meta.url), "utf8");

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

test("assigned-idol page provides stable paging and responsibility controls", () => {
  [
    "affinityPrevIdolBtn",
    "affinityNextIdolBtn",
    "affinityIdolCounter",
    "affinityResponsibleBadge",
    "affinitySetResponsibleBtn"
  ].forEach((id) => assert.match(html, new RegExp(`id=["']${id}["']`)));
  assert.match(html, /affinityPrevIdolBtn[\s\S]*icon-chevron-left/);
  assert.match(html, /affinityNextIdolBtn[\s\S]*icon-chevron-right/);
  assert.match(css, /\.affinity-idol-page-btn[\s\S]*width:\s*40px[\s\S]*height:\s*40px/);
  assert.match(css, /\.affinity-idol-counter[\s\S]*(min-width|width):/);
});

test("opening starts on the responsible idol and paging never changes state.idol", () => {
  assert.match(source, /let viewedAffinityIdolName/);
  const open = readFunction("openAffinityOverlay");
  const cycle = readFunction("cycleViewedAffinityIdol");
  const render = readFunction("renderAffinityOverlay");
  assert.match(open, /responsibleIdol/);
  assert.match(cycle, /viewedAffinityIdolName/);
  assert.match(cycle, /%/);
  assert.doesNotMatch(cycle, /state\.idol\s*=/);
  assert.match(render, /getViewedAffinityIdolName/);
});

test("responsibility controls reflect the viewed idol and use the guarded switch", () => {
  const render = readFunction("renderAffinityRosterControls");
  assert.match(render, /affinityResponsibleBadge/);
  assert.match(render, /affinitySetResponsibleBtn/);
  assert.match(render, /getResponsibleIdolSwitchBlockReason/);
  assert.match(source, /affinitySetResponsibleBtn[\s\S]*switchResponsibleIdolFromUi/);
});

test("other people excludes every assigned idol", () => {
  const body = readFunction("buildSecondaryRelationshipRows");
  assert.match(body, /assignedIdols/);
  assert.match(body, /!assignedIdols\.has\(idolName\)/);
});

test("relationship network includes every assigned idol and marks responsibility", () => {
  const body = readFunction("buildRelationshipNetworkRows");
  assert.match(body, /assignedIdols/);
  assert.match(body, /forEach/);
  assert.match(body, /当前负责/);
  assert.match(body, /担当/);
});

test("commission surfaces show the frozen owner and reject mismatched journeys", () => {
  const overlay = readFunction("renderSideQuestOverlay");
  const taskPanel = readFunction("renderTaskPanelOverlay");
  const journey = readFunction("startSideQuestJourney");
  assert.match(overlay, /ownerIdol/);
  assert.match(overlay, /负责/);
  assert.match(taskPanel, /ownerIdol/);
  assert.match(journey, /owner_mismatch/);
});

test("mobile affinity layout contains roster controls and renders trusted tag markup", () => {
  const render = readFunction("renderAffinityOverlay");
  assert.match(css, /\.affinity-panel[\s\S]*box-sizing:\s*border-box/);
  assert.match(css, /\.affinity-body[\s\S]*overflow-x:\s*hidden/);
  assert.match(render, /tagEl\.innerHTML/);
});
