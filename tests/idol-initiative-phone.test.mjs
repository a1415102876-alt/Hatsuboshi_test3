import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");

function readFunction(name) {
  const start = appSource.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const bodyStart = appSource.indexOf("{", appSource.indexOf(")", start));
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = bodyStart; index < appSource.length; index += 1) {
    const char = appSource[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") quote = char;
    else if (char === "{") depth += 1;
    else if (char === "}" && --depth === 0) return appSource.slice(start, index + 1);
  }
  throw new Error(`Could not parse ${name}`);
}

test("phone launcher renders a stable numeric initiative badge with a 9+ cap", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const css = readFileSync(new URL("../style.css", import.meta.url), "utf8");
  assert.match(html, /id="phoneUnreadBadge"[^>]*hidden/);
  assert.match(css, /\.phone-unread-badge\s*\{/);
  const badge = { hidden: true, textContent: "", labels: {}, setAttribute(name, value) { this.labels[name] = value; } };
  const sandbox = {
    document: { getElementById: () => badge },
    getPhoneInitiativeUnreadCount: () => 12
  };
  const update = vm.runInNewContext(`(${readFunction("updatePhoneUnreadBadge")})`, sandbox);
  assert.equal(update(), 12);
  assert.equal(badge.hidden, false);
  assert.equal(badge.textContent, "9+");
});

test("initiative LINE delivery is lazy, freezes identity, and resolves only after line delivery completes", () => {
  const open = readFunction("openPhoneThread");
  const dispatch = readFunction("dispatchPhoneInitiativeForThread");
  const reply = readFunction("handlePhoneChatAiReply");
  const resolve = readFunction("resolvePhoneInitiativeDelivery");
  assert.match(open, /dispatchPhoneInitiativeForThread\(threadId\)/);
  assert.match(dispatch, /tryAcquirePrimaryModelChannel/);
  for (const field of ["candidateId", "intentId", "saveScope", "dayKey", "planId"]) assert.match(dispatch, new RegExp(field));
  assert.match(reply, /startPhoneChatLineDelivery\([\s\S]*resolvePhoneInitiativeDelivery/);
  assert.match(resolve, /transitionInitiativeCandidate[\s\S]*"resolve"/);
  assert.match(resolve, /updatePhoneUnreadBadge\(\)/);
});

test("opening the phone alone does not clear initiative unread state", () => {
  const openOverlay = readFunction("openPhoneOverlay");
  const renderList = readFunction("renderPhoneChatList");
  assert.doesNotMatch(openOverlay, /transitionInitiativeCandidate|resolvePhoneInitiativeDelivery/);
  assert.match(renderList, /updatePhoneUnreadBadge\(\)/);
  assert.match(appSource, /getPhoneInitiativeCandidateForThread\(threadId\) \? "有一条新消息"/);
});

test("proactive LINE prompts include relationship role, grounded chronology, and recent thread history", () => {
  const prompt = readFunction("buildPhoneInitiativePrompt");
  assert.match(prompt, /relationshipRole/);
  assert.match(prompt, /relationshipStage/);
  assert.match(prompt, /contextSummaries/);
  assert.match(prompt, /getPhoneThreadMessages/);
  assert.match(prompt, /不是对方的制作人|当前负责偶像/);
});

test("successful proactive delivery persists a temporary contact without auto-adding a friend", () => {
  assert.match(appSource, /initiativeContacts:\s*\[\]/);
  const resolve = readFunction("resolvePhoneInitiativeDelivery");
  assert.match(resolve, /initiativeContacts/);
  assert.doesNotMatch(resolve, /phoneChat\.friends\.push/);
  const threads = readFunction("buildPhoneThreadDefinitions");
  assert.match(threads, /initiativeContacts/);
});
