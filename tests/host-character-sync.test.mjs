import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const normalize = (value) => JSON.parse(JSON.stringify(value));

function readFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const bodyStart = source.indexOf("{", source.indexOf(")", start));
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'" || char === "`") quote = char;
    else if (char === "{") depth += 1;
    else if (char === "}" && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`Could not parse ${name}`);
}

function loadApplyHostCharacter(sandbox) {
  sandbox.globalThis = sandbox;
  vm.runInNewContext(`${readFunction(appSource, "applyHostCharacter")}; this.applyHostCharacter = applyHostCharacter;`, sandbox);
  return sandbox.applyHostCharacter;
}

test("same-scope character refresh preserves live state and model owners", () => {
  const liveState = {
    marker: "live",
    boundCharacter: null,
    freeMode: {
      world: {
        director: {
          activeJob: {
            jobId: "director-job",
            requestId: "director-request",
            saveScope: "scope-a",
            status: "generating"
          }
        }
      }
    }
  };
  const fail = (name) => () => assert.fail(`${name} must not run for same-scope refresh`);
  const sandbox = {
    state: liveState,
    hostStateReady: true,
    activeHostSaveScope: "scope-a",
    pendingAiRequestId: "primary-request",
    getPrimaryModelChannelOwner: () => ({ requestId: "primary-request", saveScope: "scope-a" }),
    getSecondaryModelChannelOwner: () => ({ jobId: "director-job", requestId: "director-request", saveScope: "scope-a" }),
    switchStorageScope: fail("switchStorageScope"),
    resolveHostState: fail("resolveHostState"),
    ensureStateShape: fail("ensureStateShape"),
    releasePrimaryModelChannel: fail("releasePrimaryModelChannel"),
    releaseSecondaryModelChannel: fail("releaseSecondaryModelChannel"),
    saveState: fail("saveState"),
    render: fail("render")
  };

  loadApplyHostCharacter(sandbox)(
    { name: "初星学园", avatar: "avatar.png" },
    "scope-a",
    { marker: "stale" },
    true
  );

  assert.equal(sandbox.state.marker, "live");
  assert.equal(sandbox.state.freeMode.world.director.activeJob.requestId, "director-request");
  assert.equal(sandbox.hostStateReady, true);
  assert.equal(sandbox.activeHostSaveScope, "scope-a");
  assert.equal(sandbox.pendingAiRequestId, "primary-request");
  assert.deepEqual(normalize(sandbox.state.boundCharacter), { name: "初星学园", avatar: "avatar.png" });
});

test("same-storage-scope refresh survives a transient host rebind without loading a stale snapshot", () => {
  const liveState = {
    marker: "generating",
    boundCharacter: null,
    freeMode: { world: { director: { activeJob: {
      jobId: "director-job",
      requestId: "director-request",
      saveScope: "scope-a",
      status: "generating",
      attempts: 1
    } } } }
  };
  const fail = (name) => () => assert.fail(`${name} must not run during transient same-scope rebind`);
  const sandbox = {
    state: liveState,
    hostStateReady: false,
    activeHostSaveScope: "",
    activeStorageKey: "hatsuProduceLocalState:scope-a",
    pendingAiRequestId: "",
    storageKeyForScope: (scope) => `hatsuProduceLocalState:${scope}`,
    getPrimaryModelChannelOwner: () => null,
    getSecondaryModelChannelOwner: () => ({ jobId: "director-job", requestId: "director-request", saveScope: "scope-a" }),
    switchStorageScope: fail("switchStorageScope"),
    resolveHostState: fail("resolveHostState"),
    ensureStateShape: fail("ensureStateShape"),
    releasePrimaryModelChannel: fail("releasePrimaryModelChannel"),
    releaseSecondaryModelChannel: fail("releaseSecondaryModelChannel"),
    saveState: fail("saveState"),
    render: fail("render")
  };

  loadApplyHostCharacter(sandbox)(
    { name: "初星学园", avatar: "avatar-new.png" },
    "scope-a",
    { marker: "prepared" },
    true
  );

  assert.equal(sandbox.state.marker, "generating");
  assert.equal(sandbox.state.freeMode.world.director.activeJob.requestId, "director-request");
  assert.equal(sandbox.state.freeMode.world.director.activeJob.attempts, 1);
  assert.equal(sandbox.activeHostSaveScope, "scope-a");
  assert.equal(sandbox.hostStateReady, true);
  assert.deepEqual(normalize(sandbox.state.boundCharacter), { name: "初星学园", avatar: "avatar-new.png" });
});

test("changed-scope character sync releases old owners and restores remote state", () => {
  const calls = { primaryRelease: [], secondaryRelease: [], ensure: [], save: 0, render: 0, recovery: 0 };
  const remoteState = { marker: "remote", uiVersion: 7, idol: "", freeMode: { world: { director: null } } };
  const sandbox = {
    state: { marker: "live", uiVersion: 7, idol: "" },
    baseState: { marker: "base", uiVersion: 7, idol: "", boundCharacter: null },
    UI_VERSION: 7,
    idols: {},
    hostStateReady: true,
    activeHostSaveScope: "scope-old",
    activeStorageKey: "old-storage",
    storageKeyForScope: (scope) => `storage:${scope}`,
    pendingAiRequestId: "primary-old",
    getPrimaryModelChannelOwner: () => ({ requestId: "primary-old", channelLeaseId: "lease-old", saveScope: "scope-old" }),
    getSecondaryModelChannelOwner: () => ({ jobId: "director-old", requestId: "secondary-old", saveScope: "scope-old" }),
    releasePrimaryModelChannel: (...args) => { calls.primaryRelease.push(args); return true; },
    releaseSecondaryModelChannel: (...args) => { calls.secondaryRelease.push(args); return true; },
    switchStorageScope: (scope) => { sandbox.activeStorageKey = `storage:${scope}`; return true; },
    resolveHostState: (remote) => ({ source: "remote", state: remote, shouldMigrate: false }),
    clone: (value) => normalize(value),
    ensureStateShape: (options = {}) => { calls.ensure.push(normalize(options)); },
    canonicalIdolName: () => "",
    saveState: () => { calls.save += 1; },
    render: () => { calls.render += 1; },
    requestAnimationFrame: (callback) => callback(),
    maybeShowHarnessRecoveryPrompt: () => { calls.recovery += 1; },
    resumeOpeningIfNeeded: () => {},
    showToast: () => {},
    localStorage: { setItem: () => assert.fail("remote state must not use empty-state storage path") }
  };

  loadApplyHostCharacter(sandbox)({ name: "初星学园" }, "scope-new", remoteState, true);

  assert.deepEqual(calls.primaryRelease, [["primary-old", "lease-old", "save_scope_changed"]]);
  assert.deepEqual(calls.secondaryRelease, [["director-old", "secondary-old", "scope-old", "save_scope_changed"]]);
  assert.equal(sandbox.pendingAiRequestId, "");
  assert.equal(sandbox.activeHostSaveScope, "scope-new");
  assert.equal(sandbox.hostStateReady, true);
  assert.equal(sandbox.state.marker, "remote");
  assert.deepEqual(calls.ensure, [{ recoverDirectorAttempt: true }]);
  assert.equal(calls.save, 1);
  assert.equal(calls.render, 1);
  assert.equal(calls.recovery, 1);
});
