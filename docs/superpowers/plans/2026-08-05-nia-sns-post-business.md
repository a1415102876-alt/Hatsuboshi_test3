# N.I.A 初星圈单帖营业 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a one-post Hatsuboshi social campaign as a third N.I.A business type, with preset images, assisted/manual writing, audience comments, one interaction, retry-safe AI stages, and one-time settlement.

**Architecture:** Keep social posting separate from live and radio in `nia-sns-business-core.js` and `nia-sns-business-api.js`. The core owns pure runtime transitions and one-time fan settlement; the API owns two tagged JSON contracts. `app.js` owns session/request routing and the phone UI, while the planning draft only serializes a compatible `approach` string.

**Tech Stack:** Browser ES modules, Node `node:test`, existing SillyTavern host bridge, HTML/CSS phone UI.

---

### Task 1: Social Post Runtime Core

**Files:**
- Create: `nia-sns-business-core.js`
- Create: `tests/nia-sns-business-core.test.mjs`

- [ ] **Step 1: Write failing runtime transition tests**

```js
const runtime = sns.createSnsPostRuntime({ businessId: 'sns-1', baseFans: 1200 });
assert.equal(runtime.status, 'composing');
assert.equal(sns.beginPostGeneration(runtime, { mode: 'manual', imageId: 'training-log', manualText: '训练结束。' }).ok, true);
assert.equal(sns.applyPostPayload(runtime, { businessId: 'sns-1', postText: '训练结束。', comments: [{ id: 'c1', text: '加油', tone: 'positive' }] }).runtime.status, 'awaiting_interaction');
```

- [ ] **Step 2: Run the new core test**

Run: `node --test tests/nia-sns-business-core.test.mjs`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement normalized runtime and guarded transitions**

```js
createSnsPostRuntime({ businessId, baseFans })
beginPostGeneration(runtime, draft)
applyPostPayload(runtime, payload)
submitInteraction(runtime, interaction)
beginResultGeneration(runtime)
applyResultPayload(runtime, payload)
recoverInterruptedSnsPost(runtime)
settleSnsPostOnce(runtime, businessId)
```

Use statuses `composing`, `generating_post`, `awaiting_interaction`, `generating_result`, `retryable_failed`, `settled`. Preserve `draft`, `post`, and `interaction` across retries. Map `bonusTier` using the existing `none/small/medium/large` fan tiers and return duplicate settlement without increasing fans twice.

- [ ] **Step 4: Run core tests**

Run: `node --test tests/nia-sns-business-core.test.mjs`

Expected: PASS.

### Task 2: Structured Social Post API

**Files:**
- Create: `nia-sns-business-api.js`
- Create: `tests/nia-sns-business-api.test.mjs`

- [ ] **Step 1: Write failing parser and prompt tests**

```js
assert.match(buildSnsPostPrompt(context, runtime), /<NIA_SNS_POST>/);
assert.match(buildSnsPostPrompt(context, runtime), /manual.*原样/);
assert.equal(parseSnsPostPayload(validPost, { businessId: 'sns-1', manualText: '原文' }).data.postText, '原文');
assert.equal(parseSnsPostResultPayload(validResult, { businessId: 'sns-1' }).ok, true);
```

- [ ] **Step 2: Run the API test**

Run: `node --test tests/nia-sns-business-api.test.mjs`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement two last-tagged JSON contracts**

```js
buildSnsPostPrompt(context, runtime)
parseSnsPostPayload(payload, expected)
buildSnsPostResultPrompt(context, runtime)
parseSnsPostResultPayload(payload, expected)
```

Require matching `businessId`, a selected preset image id, 3-6 bounded comments, and allowed tone values. In manual mode overwrite returned `postText` with the player input after validating a nonempty response contract. Result parsing accepts only `off|partial|strong` and `none|small|medium|large`; reject all other values.

- [ ] **Step 4: Run API tests**

Run: `node --test tests/nia-sns-business-api.test.mjs`

Expected: PASS.

### Task 3: Planning Choice and Business Precondition

**Files:**
- Modify: `nia-prototype.html`
- Modify: `nia-prototype.js`
- Modify: `tests/nia-prototype.test.mjs`
- Modify: `nia-producer-work-core.js`
- Modify: `tests/nia-producer-work-core.test.mjs`

- [ ] **Step 1: Write failing tests for the third planning method and preparation**

```js
assert.match(html, /id="businessMethodSnsPost"/);
assert.match(source, /sns_post/);
assert.equal(workCore.resolveBusinessPreparation(work, 'sns_post', { title: '初星圈发帖' }).ok, true);
```

- [ ] **Step 2: Run planning and core tests**

Run: `node --test tests/nia-prototype.test.mjs tests/nia-producer-work-core.test.mjs`

Expected: FAIL because `sns_post` is unsupported.

- [ ] **Step 3: Add the method and reuse completed online work**

Add an `sns_post` radio option and stable approach text. Restore old drafts containing `初星圈`, `SNS`, or `发帖` to that option. In `resolveBusinessPreparation`, make `sns_post` use the same completed `online` task lookup as `online_live`, while preserving the existing radio-specific path.

- [ ] **Step 4: Run planning and core tests**

Run: `node --test tests/nia-prototype.test.mjs tests/nia-producer-work-core.test.mjs`

Expected: PASS.

### Task 4: Phone Composer and Inline Feed States

**Files:**
- Modify: `index.html`
- Modify: `style.css`
- Modify: `tests/nia-sns-business-ui.test.mjs`

- [ ] **Step 1: Write failing static UI tests**

```js
assert.match(html, /id="phoneSnsBusinessView"/);
assert.match(html, /name="snsComposeMode"/);
assert.match(html, /name="snsPresetImage"/);
assert.match(html, /id="phoneSnsPublishBtn"/);
assert.match(html, /id="phoneSnsInteractionForm"/);
```

- [ ] **Step 2: Run the UI test**

Run: `node --test tests/nia-sns-business-ui.test.mjs`

Expected: FAIL because the social business view does not exist.

- [ ] **Step 3: Build the phone-only social posting surfaces**

Keep the existing `phoneSnsApp` shell, tabs, and feed. Add a business card at the top of the feed that switches between three inline states: a composer card, the published post with comments, and a result card appended below the post. Use radio controls for `ai_expand` and `manual`, conditionally reveal a short theme input or full post textarea, and provide four preset-image cards. Add interaction controls for reply, like, and no response with a bounded reply input. Keep `customImageDescription` absent from UI and do not replace the SNS shell with a wizard or separate page.

- [ ] **Step 4: Run the UI test**

Run: `node --test tests/nia-sns-business-ui.test.mjs`

Expected: PASS.

### Task 5: App Session, Request Routing, and Settlement

**Files:**
- Modify: `app.js`
- Modify: `st.html`
- Create: `tests/nia-sns-business-flow.test.mjs`

- [ ] **Step 1: Write failing flow tests**

```js
assert.match(app, /businessType === "sns_post"/);
assert.match(app, /function requestNiaSnsPostGeneration\(/);
assert.match(app, /function requestNiaSnsResultGeneration\(/);
assert.match(app, /function handleNiaSnsAiReply\(/);
assert.match(app, /settleSnsPostOnce/);
```

- [ ] **Step 2: Run the flow test**

Run: `node --test tests/nia-sns-business-flow.test.mjs`

Expected: FAIL because no social business session exists.

- [ ] **Step 3: Load modules and route the current business day**

Load `nia-sns-business-core.js` and `nia-sns-business-api.js` before `app.js`. In `startCurrentNiaBusinessAction`, detect `planDay.businessType === "sns_post"`, validate `resolveBusinessPreparation(work, "sns_post", planDay)`, and begin a session with its own primary-model owner kind `nia_sns_business`.

- [ ] **Step 4: Implement compose, response, retry, recovery, and settlement handlers**

Implement `startNiaSnsBusinessSession`, `requestNiaSnsPostGeneration`, `requestNiaSnsResultGeneration`, `handleNiaSnsAiReply`, `failNiaSnsBusiness`, `resumeNiaSnsBusinessIfNeeded`, and `confirmNiaSnsResult`. Persist runtime/context under `state.nia`, clear the main channel on every final response, make invalid payloads immediately retryable, and call `settleSnsPostOnce` before advancing `training.actionIndex` exactly once.

- [ ] **Step 5: Run flow tests**

Run: `node --test tests/nia-sns-business-flow.test.mjs`

Expected: PASS.

### Task 6: Regression Verification

**Files:**
- Modify: `docs/superpowers/specs/2026-08-05-nia-sns-post-business-design.md` only if implementation reveals a required contract correction

- [ ] **Step 1: Run all affected test groups**

Run: `node --test tests/nia-sns-business-core.test.mjs tests/nia-sns-business-api.test.mjs tests/nia-sns-business-ui.test.mjs tests/nia-sns-business-flow.test.mjs tests/nia-prototype.test.mjs tests/nia-producer-work-core.test.mjs tests/nia-business-vn.test.mjs`

Expected: PASS with no failures.

- [ ] **Step 2: Run syntax and whitespace checks**

Run: `node --check nia-sns-business-core.js; node --check nia-sns-business-api.js; node --check app.js; git diff --check`

Expected: all commands exit 0.

- [ ] **Step 3: Review the changed contracts**

Confirm manually that manual post text remains player-authored, custom image upload is not exposed, invalid structured responses surface a retry action, and social settlement cannot run twice.
