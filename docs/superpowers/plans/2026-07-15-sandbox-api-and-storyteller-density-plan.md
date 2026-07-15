# Sandbox API Setup and Storyteller Density Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the optional secondary API setup step before sandbox play, raise configurable daily Storyteller budgets to at least five ordinary events, expose today's Attach audit, and ensure the static sandbox first day has a Storyteller Plan.

**Architecture:** Keep configuration normalization and budget resolution in `world/storyteller/plan.js`, and keep the read-only audit projection in `world/storyteller/phone-view.js`. `app.js` coordinates persisted state, launch transitions, settings actions, and DOM rendering while reusing the existing secondary API save/test path. Existing plans remain immutable for their day; saved density is consumed only when the next plan is built.

**Tech Stack:** Vanilla HTML/CSS/JavaScript, browser local storage, Node.js built-in test runner, `vm`-based unit tests.

---

## File Map

- Modify `index.html`: add the sandbox API setup panel and Storyteller density settings controls.
- Modify `style.css`: style the new launch panel, density segmented control, custom numeric controls, budget summary, and Attach audit rows.
- Modify `app.js`: persist/recover the sandbox setup step, reuse secondary API operations, save density settings, pass density into plan generation, render the audit, bind controls, and create the static first-day plan.
- Modify `world/storyteller/plan.js`: normalize density configuration and resolve preset/custom budgets when building a plan.
- Modify `world/storyteller/phone-view.js`: build a bounded, escaped-by-consumer, player-safe budget and Attach audit model.
- Create `tests/sandbox-secondary-api-setup.test.mjs`: cover launch markup, state transitions, skip/save/test behavior, recovery, and produce-mode isolation.
- Modify `tests/storyteller-plan.test.mjs`: cover presets, custom validation, pacing, crisis major limits, and deterministic plan identity.
- Modify `tests/storyteller-phone-view.test.mjs`: cover current-day candidate aggregation, deduplication, statuses, counters, sorting, and redaction.
- Modify `tests/world-engine-phone-app.test.mjs`: cover density settings bindings and safe event-page rendering.
- Modify `tests/storyteller-integration.test.mjs`: cover density input to plan construction and static sandbox first-day plan creation.
- Modify `docs/current-handoff.md`: record the completed behavior, commits, and verification baseline.

### Task 1: Sandbox Secondary API Setup State and Markup

**Files:**
- Create: `tests/sandbox-secondary-api-setup.test.mjs`
- Modify: `index.html`
- Modify: `style.css`
- Modify: `app.js`

- [ ] **Step 1: Write the failing launch-flow tests**

Create source-level and extracted-function tests that assert:

```js
test("sandbox producer submission enters recoverable API setup before invite", () => {
  assert.match(html, /id="sandboxApiPanel"/);
  assert.match(html, /id="sandboxApiEnabled"/);
  assert.match(html, /id="sandboxApiBaseUrl"/);
  assert.match(html, /id="sandboxApiModel"/);
  assert.match(html, /id="sandboxApiKey"/);
  assert.match(html, /id="sandboxApiTestBtn"/);
  assert.match(html, /id="sandboxApiSkipBtn"/);
  assert.match(html, /id="sandboxApiContinueBtn"/);
  const submit = producerSubmitBlock();
  assert.match(submit, /apiSetupPending:\s*true/);
  assert.match(submit, /pendingIdol:\s*selectedIdol/);
  assert.doesNotMatch(submit, /if \(isSandboxLaunch\(\)\)[\s\S]*startSandboxInviteStory\(selectedIdol\)/);
});

test("produce mode still starts the original opening directly", () => {
  const submit = producerSubmitBlock();
  assert.match(submit, /state\.launchMode = "produce"/);
  assert.match(submit, /startOpeningStory\("签署合约"\)/);
});
```

Use extracted functions with a small fake DOM to verify that refresh recovery reads `state.sandbox.pendingIdol`, and that opening the setup panel prefills `state.tasks.secondaryApi` plus the locally stored Key.

- [ ] **Step 2: Run the tests and verify red state**

Run: `node --test tests/sandbox-secondary-api-setup.test.mjs`

Expected: FAIL because the panel IDs and setup functions do not exist and sandbox producer submission still starts the invite immediately.

- [ ] **Step 3: Add the sandbox setup panel**

Add `#sandboxApiPanel` as a sibling of `#producerPanel` inside `#selectionStage`. Include:

```html
<section class="select-panel is-hidden" id="sandboxApiPanel" aria-label="沙盒次 API 设置">
  <div class="panel-head">
    <div><p class="ui-kicker">World Setup</p><h2>次 API 设置</h2></div>
    <svg><use href="#icon-settings"></use></svg>
  </div>
  <div class="producer-form sandbox-api-form">
    <label class="world-engine-toggle" for="sandboxApiEnabled"><span><strong>启用次 API</strong><small>用于每日世界层、委托与 Director 推演</small></span><input id="sandboxApiEnabled" type="checkbox"></label>
    <label class="world-engine-field" for="sandboxApiBaseUrl"><span>接口地址</span><input id="sandboxApiBaseUrl" type="text" placeholder="https://api.openai.com/v1" spellcheck="false"></label>
    <label class="world-engine-field" for="sandboxApiModel"><span>模型</span><input id="sandboxApiModel" type="text" placeholder="gpt-4o-mini" spellcheck="false"></label>
    <label class="world-engine-field" for="sandboxApiKey"><span>API Key（仅存浏览器本地）</span><input id="sandboxApiKey" type="password" placeholder="sk-..." autocomplete="off"></label>
    <p id="sandboxApiStatus" class="world-engine-settings-status">可测试连接，也可暂不填写。</p>
    <div class="sandbox-api-actions">
      <button id="sandboxApiTestBtn" type="button" class="confirm-idol-btn secondary-action">测试连接</button>
      <button id="sandboxApiSkipBtn" type="button" class="confirm-idol-btn secondary-action">暂不填写</button>
      <button id="sandboxApiContinueBtn" type="button" class="confirm-idol-btn">保存并继续</button>
    </div>
  </div>
</section>
```

Add responsive styles that reuse the selection panel dimensions, keep actions visible without overlap, and stack the three commands on narrow screens.

- [ ] **Step 4: Implement recoverable panel state and prefill**

Normalize these optional sandbox fields without replacing unrelated sandbox state:

```js
state.sandbox.apiSetupPending = Boolean(state.sandbox.apiSetupPending);
state.sandbox.pendingIdol = canonicalIdolName(state.sandbox.pendingIdol) || "";
```

Add focused functions:

```js
function populateSandboxApiSetupForm() {
  const config = getSecondaryApiConfig();
  document.getElementById("sandboxApiEnabled").checked = config.enabled;
  document.getElementById("sandboxApiBaseUrl").value = config.baseUrl;
  document.getElementById("sandboxApiModel").value = config.model;
  document.getElementById("sandboxApiKey").value = config.apiKey;
  document.getElementById("sandboxApiStatus").textContent = config.enabled
    ? `次 API 已启用${config.apiKey ? " · Key 已保存" : " · 未保存 Key"}`
    : "可测试连接，也可暂不填写。";
}

function openSandboxApiSetupPanel(idolName) {
  const canonical = canonicalIdolName(idolName);
  if (!canonical) return false;
  selectedIdol = canonical;
  state.sandbox = { ...state.sandbox, apiSetupPending: true, pendingIdol: canonical };
  document.getElementById("selectPanel")?.classList.add("is-hidden");
  document.getElementById("producerPanel")?.classList.add("is-hidden");
  document.getElementById("sandboxApiPanel")?.classList.remove("is-hidden");
  populateSandboxApiSetupForm();
  return true;
}

function restorePendingSandboxApiSetup() {
  if (!isSandboxLaunch() || !state.sandbox?.apiSetupPending) return false;
  return openSandboxApiSetupPanel(state.sandbox.pendingIdol);
}

function readSandboxApiSetupForm() {
  return {
    enabled: Boolean(document.getElementById("sandboxApiEnabled")?.checked),
    baseUrl: String(document.getElementById("sandboxApiBaseUrl")?.value || "").trim(),
    model: String(document.getElementById("sandboxApiModel")?.value || "").trim(),
    apiKey: String(document.getElementById("sandboxApiKey")?.value || "").trim()
  };
}
```

On sandbox producer submission, save the producer profile, set `apiSetupPending: true` and `pendingIdol`, persist, and open this panel. Do not call `startSandboxInviteStory()` yet. Produce mode remains unchanged.

- [ ] **Step 5: Run the launch tests**

Run: `node --test tests/sandbox-secondary-api-setup.test.mjs tests/producer-profile.test.mjs tests/launch-mode.test.mjs`

Expected: new launch tests PASS; existing known producer-profile baseline failure may remain only if it is unchanged from the recorded baseline.

- [ ] **Step 6: Commit the state and markup slice**

```powershell
git add -- index.html style.css app.js tests/sandbox-secondary-api-setup.test.mjs
git commit -m "Add sandbox secondary API setup step"
```

### Task 2: Sandbox API Setup Actions

**Files:**
- Modify: `tests/sandbox-secondary-api-setup.test.mjs`
- Modify: `app.js`

- [ ] **Step 1: Write failing action tests**

Test the exact contracts:

```js
test("save and continue persists fields clears pending state and starts exact idol invite", () => {
  const result = context.continueSetup();
  assert.equal(result, true);
  assert.deepEqual(calls.savePatch, { enabled: true, baseUrl: "https://api.test/v1", model: "model-a", apiKey: "secret" });
  assert.equal(state.sandbox.apiSetupPending, false);
  assert.equal(state.sandbox.pendingIdol, "");
  assert.deepEqual(calls.invites, ["藤田琴音"]);
});

test("skip disables API but preserves address model and local key", () => {
  context.skipSetup();
  assert.equal(calls.savePatch.enabled, false);
  assert.equal(calls.savePatch.baseUrl, "https://api.test/v1");
  assert.equal(calls.savePatch.model, "model-a");
  assert.equal(calls.savePatch.apiKey, "secret");
});

test("test saves form and reuses runSecondaryApiTest without continuing", () => {
  context.testSetup();
  assert.equal(calls.tests, 1);
  assert.equal(state.sandbox.apiSetupPending, true);
  assert.deepEqual(calls.invites, []);
});
```

Also assert that failed/missing connection results never disable the Continue button.

- [ ] **Step 2: Run the action tests and verify failure**

Run: `node --test tests/sandbox-secondary-api-setup.test.mjs`

Expected: FAIL because the setup action handlers are absent.

- [ ] **Step 3: Implement save, skip, test, and continue**

Add:

```js
function saveSandboxApiSetupForm(enabledOverride) {
  const form = readSandboxApiSetupForm();
  saveSecondaryApiSettings({ ...form, enabled: enabledOverride ?? form.enabled });
  return form;
}

function finishSandboxApiSetup() {
  const idol = canonicalIdolName(state.sandbox?.pendingIdol);
  if (!idol) return false;
  state.sandbox = { ...state.sandbox, apiSetupPending: false, pendingIdol: "" };
  saveState("sandbox.api_setup_complete");
  startSandboxInviteStory(idol);
  return true;
}
```

`continueSandboxApiSetup()` saves current enabled state then finishes. `skipSandboxApiSetup()` saves the same fields with `enabled: false` then finishes. `testSandboxApiConnection()` saves current fields, sets `#sandboxApiStatus` to “测试请求发送中…”, calls the existing `runSecondaryApiTest()`, and does not finish. Add `updateSandboxApiTestStatus(message)` and call it from the existing `meta.kind === "test"` reply branch with the same success/failure message used by `secondaryApiDebug.lastMessage`. The status update must not disable Continue. Bind all three IDs once with the other launch events.

- [ ] **Step 4: Run action and secondary-channel tests**

Run: `node --test tests/sandbox-secondary-api-setup.test.mjs tests/secondary-channel-owner.test.mjs tests/world-gen-api.test.mjs`

Expected: PASS except no unrelated baseline failures.

- [ ] **Step 5: Commit the action slice**

```powershell
git add -- app.js tests/sandbox-secondary-api-setup.test.mjs
git commit -m "Wire sandbox secondary API setup actions"
```

### Task 3: Storyteller Density Model and Plan Budgets

**Files:**
- Modify: `world/storyteller/plan.js`
- Modify: `tests/storyteller-plan.test.mjs`
- Modify: `app.js`
- Modify: `tests/storyteller-integration.test.mjs`

- [ ] **Step 1: Write failing density normalization tests**

Add tests for these public APIs and exact budgets:

```js
assert.deepEqual(api.normalizeEventDensityConfig(), {
  mode: "standard",
  customBudget: { minor: 4, moderate: 3, major: 1 }
});
assert.deepEqual(api.resolveEventDensityBudget({ mode: "low" }, "normal"), { minor: 3, moderate: 2, major: 0 });
assert.deepEqual(api.resolveEventDensityBudget({ mode: "standard" }, "normal"), { minor: 4, moderate: 3, major: 0 });
assert.deepEqual(api.resolveEventDensityBudget({ mode: "high" }, "normal"), { minor: 6, moderate: 3, major: 0 });
assert.deepEqual(api.resolveEventDensityBudget({ mode: "standard" }, "crisis_allowed"), { minor: 4, moderate: 3, major: 1 });
```

Verify custom `{ minor: 7, moderate: 5, major: 1 }` is accepted, totals below 5 or above 12 fall back to standard, and non-crisis pacing always forces major to 0. Update old normalization bounds expectations from minor 6/moderate 3 to the new per-field ceiling required to preserve a valid total of 12.

- [ ] **Step 2: Run plan tests and verify failure**

Run: `node --test tests/storyteller-plan.test.mjs`

Expected: FAIL because density APIs are not exported and current plan budgets are 2/1 or 1/0.

- [ ] **Step 3: Implement density normalization and resolution**

In `plan.js`, add immutable presets and focused APIs:

```js
const EVENT_DENSITY_PRESETS = Object.freeze({
  low: Object.freeze({ minor: 3, moderate: 2, major: 1 }),
  standard: Object.freeze({ minor: 4, moderate: 3, major: 1 }),
  high: Object.freeze({ minor: 6, moderate: 3, major: 1 })
});

function normalizeEventDensityConfig(value) {
  const mode = ["low", "standard", "high", "custom"].includes(value?.mode)
    ? value.mode
    : "standard";
  const customBudget = {
    minor: boundedInt(value?.customBudget?.minor, 0, 12, 4),
    moderate: boundedInt(value?.customBudget?.moderate, 0, 12, 3),
    major: boundedInt(value?.customBudget?.major, 0, 1, 1)
  };
  const total = customBudget.minor + customBudget.moderate;
  return mode === "custom" && (total < 5 || total > 12)
    ? { mode: "standard", customBudget: { minor: 4, moderate: 3, major: 1 } }
    : { mode, customBudget };
}

function resolveEventDensityBudget(config, pacing) {
  const normalized = normalizeEventDensityConfig(config);
  const selected = normalized.mode === "custom"
    ? normalized.customBudget
    : EVENT_DENSITY_PRESETS[normalized.mode];
  return {
    minor: selected.minor,
    moderate: selected.moderate,
    major: pacing === "crisis_allowed" ? selected.major : 0
  };
}
```

Pass `input.eventDensityConfig` through `buildStorytellerPlan()`, include normalized density in plan identity, and replace pacing-dependent 1/0 or 2/1 budgets with `resolveEventDensityBudget()`. Export the two APIs and preset table. Preserve old committed plans during normalization.

- [ ] **Step 4: Pass saved density into every new plan**

Normalize `storyteller.eventDensityConfig` in `ensureStateShape()`. In `ensureStorytellerPlanForCheckpoint()`, pass:

```js
eventDensityConfig: storyteller.eventDensityConfig
```

to `buildStorytellerPlan()`. Add an integration assertion that the call input contains the saved config and that an already-current plan is not rebuilt.

- [ ] **Step 5: Run plan and major-event tests**

Run: `node --test tests/storyteller-plan.test.mjs tests/storyteller-major-incidents.test.mjs tests/storyteller-incidents.test.mjs tests/storyteller-integration.test.mjs`

Expected: PASS with the new budget expectations; major legality and cooldown behavior remain unchanged.

- [ ] **Step 6: Commit the density model slice**

```powershell
git add -- world/storyteller/plan.js app.js tests/storyteller-plan.test.mjs tests/storyteller-integration.test.mjs
git commit -m "Add configurable Storyteller event density"
```

### Task 4: World Engine Density Settings

**Files:**
- Modify: `index.html`
- Modify: `style.css`
- Modify: `app.js`
- Modify: `tests/world-engine-phone-app.test.mjs`

- [ ] **Step 1: Write failing settings UI tests**

Assert stable IDs for four mode buttons or radio inputs, custom minor/moderate/major numeric inputs, status text, and save command. Extract and execute the settings functions to verify:

```js
assert.equal(saveDensity({ mode: "custom", minor: 2, moderate: 2, major: 1 }), false); // total 4
assert.equal(saveDensity({ mode: "custom", minor: 7, moderate: 5, major: 1 }), true);
assert.deepEqual(state.freeMode.world.storyteller.eventDensityConfig.customBudget, { minor: 7, moderate: 5, major: 1 });
assert.deepEqual(state.freeMode.world.storyteller.plan.severityBudget, { minor: 4, moderate: 3, major: 0 });
```

The final assertion proves saving does not mutate today's committed plan.

- [ ] **Step 2: Run the UI tests and verify failure**

Run: `node --test tests/world-engine-phone-app.test.mjs`

Expected: FAIL because density controls and handlers do not exist.

- [ ] **Step 3: Add the settings section and styles**

Insert an “事件密度” section before the secondary API section. Use a segmented control for `low`, `standard`, `high`, `custom`; numeric inputs use `min="0"`, `max="12"`, `step="1"`. Keep the custom block hidden unless custom is selected. Add `#worldEngineDensityStatus` and `#worldEngineDensitySaveBtn`.

- [ ] **Step 4: Implement settings projection, validation, and persistence**

Add:

```js
function setWorldEngineDensityMode(mode) {
  document.querySelectorAll("[data-world-engine-density]").forEach((button) => {
    const active = button.dataset.worldEngineDensity === mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  setElementHidden("worldEngineDensityCustom", mode !== "custom");
}

function updateWorldEngineDensitySettingsUI() {
  const api = globalThis.HatsuWorldStorytellerPlan;
  const config = api.normalizeEventDensityConfig(state.freeMode?.world?.storyteller?.eventDensityConfig);
  setWorldEngineDensityMode(config.mode);
  document.getElementById("worldEngineDensityMinor").value = String(config.customBudget.minor);
  document.getElementById("worldEngineDensityModerate").value = String(config.customBudget.moderate);
  document.getElementById("worldEngineDensityMajor").value = String(config.customBudget.major);
}

function saveWorldEngineDensitySettings() {
  const selected = document.querySelector("[data-world-engine-density].is-active")?.dataset.worldEngineDensity || "standard";
  const raw = {
    mode: selected,
    customBudget: {
      minor: Number(document.getElementById("worldEngineDensityMinor")?.value),
      moderate: Number(document.getElementById("worldEngineDensityModerate")?.value),
      major: Number(document.getElementById("worldEngineDensityMajor")?.value)
    }
  };
  const total = raw.customBudget.minor + raw.customBudget.moderate;
  const integers = [raw.customBudget.minor, raw.customBudget.moderate, raw.customBudget.major].every(Number.isInteger);
  if (selected === "custom" && (!integers || total < 5 || total > 12 || ![0, 1].includes(raw.customBudget.major))) {
    showToast("无法保存", "轻微与中等合计须为 5 至 12，重大须为 0 或 1。", "warn");
    return false;
  }
  state.freeMode.world.storyteller.eventDensityConfig = globalThis.HatsuWorldStorytellerPlan.normalizeEventDensityConfig(raw);
  saveState("storyteller.density_saved");
  updateWorldEngineDensitySettingsUI();
  renderWorldEnginePhoneApp();
  showToast("事件密度已保存", "新预算将在次日计划生效。", "info");
  return true;
}
```

On success call `saveState("storyteller.density_saved")`, refresh settings and event views, and show “已保存，次日生效”. Do not call `ensureStorytellerPlanForCheckpoint()`, Director, or either model channel. Bind the segmented controls and save button in `bindPhoneWorldEngineEvents()`.

- [ ] **Step 5: Run settings tests**

Run: `node --test tests/world-engine-phone-app.test.mjs tests/storyteller-plan.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit the settings slice**

```powershell
git add -- index.html style.css app.js tests/world-engine-phone-app.test.mjs
git commit -m "Add world engine event density settings"
```

### Task 5: Player-Safe Attach Audit View Model

**Files:**
- Modify: `world/storyteller/phone-view.js`
- Modify: `tests/storyteller-phone-view.test.mjs`

- [ ] **Step 1: Write failing audit-model tests**

Build a fixture containing a current attached candidate, duplicate resolved history entry, an expired Attach, an Invite, observations with world minutes, and secret internal fields. Assert:

```js
assert.deepEqual(model.eventAudit.budget.minor, { used: 2, total: 4 });
assert.equal(model.eventAudit.channels.attach, 2);
assert.equal(model.eventAudit.channels.invite, 1);
assert.equal(model.eventAudit.attachEvents.length, 2);
assert.deepEqual(model.eventAudit.attachEvents.map((row) => row.statusLabel), ["叙事已完成", "已过期"]);
assert.doesNotMatch(JSON.stringify(model.eventAudit), /SECRET|prompt|saveScope|requestId|leaseId|definitionId|incidentId|sourceTurnId/);
```

Also cover `pending -> 待附着`, `attached -> 已附着到 Prompt`, current-day/current-plan filtering, chronological sorting, deduplication by internal incident identity before redaction, and public empty reasons for plan unavailable, legality, cooldown, fingerprint, and diversity.

- [ ] **Step 2: Run phone-view tests and verify failure**

Run: `node --test tests/storyteller-phone-view.test.mjs`

Expected: FAIL because `eventAudit` is absent.

- [ ] **Step 3: Implement bounded aggregation and redaction**

Add private helpers for current-plan matching, status labels, action/location/category/severity/archetype/style labels, observation lookup, and public failure mapping. Build `eventAudit` from `pendingCandidate`, `recentCandidates`, and `observations`; deduplicate internally, then return only player-facing fields:

```js
{
  budget: { minor: { used, total }, moderate: { used, total }, major: { used, total } },
  channels: { attach, invite },
  attachEvents: [{ timeLabel, sourceLabel, locationLabel, categoryLabel, severityLabel, skeletonLabel, actorLabels, styleLabel, statusLabel }],
  emptyReason: ""
}
```

Cap returned rows to the existing bounded history size and never copy raw candidate objects into the view model.

- [ ] **Step 4: Run phone-view tests**

Run: `node --test tests/storyteller-phone-view.test.mjs tests/storyteller-observations.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit the audit model slice**

```powershell
git add -- world/storyteller/phone-view.js tests/storyteller-phone-view.test.mjs
git commit -m "Expose player-safe Storyteller attach audit"
```

### Task 6: World Engine Event Audit Rendering

**Files:**
- Modify: `app.js`
- Modify: `style.css`
- Modify: `tests/world-engine-phone-app.test.mjs`

- [ ] **Step 1: Write failing renderer tests**

Extend the event renderer test with an audit model and assert output contains budget values, Attach/Invite counts, all four status labels, event skeleton, time, source, and empty reason. Feed malicious text through every player-facing field and assert the HTML contains escaped text only. Preserve the existing accept/defer/ignore commands when an Invite is available.

- [ ] **Step 2: Run renderer tests and verify failure**

Run: `node --test tests/world-engine-phone-app.test.mjs`

Expected: FAIL because `renderWorldEngineEvents()` only renders the Invite inbox or a single empty state.

- [ ] **Step 3: Compose budget, inbox, and Attach sections**

Refactor `renderWorldEngineEvents(model)` into read-only string renderers:

```js
function renderWorldEngineEventBudget(audit) {
  const item = (label, value) => `<div><span>${label}</span><strong>${value.used}/${value.total}</strong></div>`;
  return `<section class="world-engine-event-budget">
    ${item("轻微", audit.budget.minor)}${item("中等", audit.budget.moderate)}${item("重大", audit.budget.major)}
    <p>Attach ${audit.channels.attach} · Invite ${audit.channels.invite}</p>
  </section>`;
}

function renderWorldEngineAttachAudit(audit) {
  if (!audit.attachEvents.length) {
    return `<section class="world-engine-attach-empty"><h2>今日暂无 Attach</h2><p>${escapePhoneText(audit.emptyReason)}</p></section>`;
  }
  return `<section class="world-engine-attach-audit">${audit.attachEvents.map((row) => `
    <article class="world-engine-attach-row">
      <div><time>${escapePhoneText(row.timeLabel)}</time><strong>${escapePhoneText(row.statusLabel)}</strong></div>
      <h2>${escapePhoneText(row.skeletonLabel)}</h2>
      <p>${escapePhoneText(row.sourceLabel)} · ${escapePhoneText(row.locationLabel)} · ${escapePhoneText(row.categoryLabel)} · ${escapePhoneText(row.severityLabel)}</p>
      <p>${row.actorLabels.map(escapePhoneText).join(" / ")} · ${escapePhoneText(row.styleLabel)}</p>
    </article>`).join("")}</section>`;
}

function renderWorldEngineEventInbox(inbox) {
  if (!inbox?.available) return `<section class="world-engine-event-inbox-empty"><p>暂无待处理 Invite</p></section>`;
  return `<section class="world-engine-event-inbox">
    <h2>${escapePhoneText(inbox.archetypeLabel)}</h2>
    <div class="world-engine-event-actions">
      <button type="button" data-storyteller-event-action="accept">接受</button>
      <button type="button" data-storyteller-event-action="defer">稍后</button>
      <button type="button" data-storyteller-event-action="ignore">忽略</button>
    </div>
  </section>`;
}
function renderWorldEngineEvents(model) {
  const audit = model.storyteller?.eventAudit || {
    budget: { minor: { used: 0, total: 0 }, moderate: { used: 0, total: 0 }, major: { used: 0, total: 0 } },
    channels: { attach: 0, invite: 0 },
    attachEvents: [],
    emptyReason: "当前计划尚未建立。"
  };
  return renderWorldEngineEventBudget(audit)
    + renderWorldEngineEventInbox(model.storyteller?.inbox)
    + renderWorldEngineAttachAudit(audit);
}
```

Escape every model-derived string with `escapePhoneText()`. Add compact, unframed section styling suitable for the existing phone archive; do not nest cards or add new commands to audit rows.

- [ ] **Step 4: Run event-page tests**

Run: `node --test tests/world-engine-phone-app.test.mjs tests/storyteller-phone-view.test.mjs tests/storyteller-event-turn.test.mjs`

Expected: PASS; Invite actions and major confirmation remain intact.

- [ ] **Step 5: Commit the rendering slice**

```powershell
git add -- app.js style.css tests/world-engine-phone-app.test.mjs
git commit -m "Render daily attach audit in world engine"
```

### Task 7: Static Sandbox First-Day Storyteller Plan

**Files:**
- Modify: `app.js`
- Modify: `tests/storyteller-integration.test.mjs`

- [ ] **Step 1: Write the failing first-day orchestration test**

Extract `enterSandboxCampusAfterOpening()` and verify call order for both modes:

```js
assert.deepEqual(staticCalls, ["daily-tick", "ensure-plan:day_change", "save", "render"]);
assert.deepEqual(secondaryCalls.filter((item) => item.startsWith("ensure-plan")), []);
```

Add a source assertion that the plan call occurs after `runFreeModeWorldDailyTick()` and before `saveState()`. Existing `ensureStorytellerPlanForCheckpoint()` handles current-plan idempotency.

- [ ] **Step 2: Run integration tests and verify failure**

Run: `node --test tests/storyteller-integration.test.mjs tests/world-director-integration.test.mjs`

Expected: FAIL only for the missing static first-day plan call.

- [ ] **Step 3: Add the same static-mode gate used by later day changes**

Implement:

```js
const worldTickMode = runFreeModeWorldDailyTick();
if (worldTickMode !== "secondary" && typeof ensureStorytellerPlanForCheckpoint === "function") {
  ensureStorytellerPlanForCheckpoint("day_change");
}
```

Do not add a second call to the secondary completion path.

- [ ] **Step 4: Run orchestration and world-generation tests**

Run: `node --test tests/storyteller-integration.test.mjs tests/world-director-integration.test.mjs tests/world-gen-api.test.mjs tests/storyteller-notification-integration.test.mjs`

Expected: PASS except unchanged recorded baseline failures.

- [ ] **Step 5: Commit the first-day fix**

```powershell
git add -- app.js tests/storyteller-integration.test.mjs
git commit -m "Create Storyteller plan on static sandbox first day"
```

### Task 8: Combined Verification and Handoff

**Files:**
- Modify: `docs/current-handoff.md`

- [ ] **Step 1: Run syntax and whitespace checks**

Run:

```powershell
node --check app.js
node --check world/storyteller/plan.js
node --check world/storyteller/phone-view.js
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 2: Run the focused suite**

Run:

```powershell
node --test tests/sandbox-secondary-api-setup.test.mjs tests/storyteller-plan.test.mjs tests/storyteller-phone-view.test.mjs tests/world-engine-phone-app.test.mjs tests/storyteller-integration.test.mjs tests/storyteller-incidents.test.mjs tests/storyteller-major-incidents.test.mjs tests/storyteller-event-turn.test.mjs tests/secondary-channel-owner.test.mjs tests/world-gen-api.test.mjs tests/world-director-integration.test.mjs
```

Expected: all new and directly related tests pass.

- [ ] **Step 3: Run the complete baseline suite**

Run: `node --test tests/*.test.mjs`

Expected: no failures beyond the six documented pre-existing failures; record exact pass/fail totals rather than assuming the previous `669/675` count.

- [ ] **Step 4: Perform browser smoke checks**

Serve the project on a free localhost port and verify desktop and mobile widths:

1. Sandbox flow reaches API setup after producer profile and before invite.
2. Test failure leaves Save and Continue available.
3. Skip retains entered fields after reopening world-engine API settings.
4. Density fixed/custom controls fit without overlap and report next-day activation.
5. Event page shows budget summary, Invite inbox, Attach rows, and empty reason cleanly.

- [ ] **Step 5: Update the handoff**

Document the two completed specs, state fields, key functions, commits, focused/full verification totals, unchanged baseline failures, and remaining real SillyTavern checks.

- [ ] **Step 6: Commit final verification documentation and any test-only adjustments**

```powershell
git add -- docs/current-handoff.md
git commit -m "Document sandbox API and Storyteller density update"
```

- [ ] **Step 7: Confirm the worktree is clean**

Run: `git status --short`

Expected: no output.
