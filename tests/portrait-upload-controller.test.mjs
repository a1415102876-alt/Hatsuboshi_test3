import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const portraitSource = readFileSync(new URL("../appearance/portrait-wardrobe.js", import.meta.url), "utf8");

function readFunction(source, functionName) {
  const functionStart = source.indexOf(`function ${functionName}`);
  assert.notEqual(functionStart, -1, `${functionName} must exist`);
  const asyncStart = source.lastIndexOf("async ", functionStart);
  const start = asyncStart >= 0 && source.slice(asyncStart + 6, functionStart).trim() === "" ? asyncStart : functionStart;
  const parametersStart = source.indexOf("(", functionStart);
  let parameterDepth = 0;
  let parametersEnd = -1;
  for (let index = parametersStart; index < source.length; index += 1) {
    if (source[index] === "(") parameterDepth += 1;
    else if (source[index] === ")" && --parameterDepth === 0) {
      parametersEnd = index;
      break;
    }
  }
  const bodyStart = source.indexOf("{", parametersEnd);
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
    else if (character === "}" && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`Could not parse ${functionName}`);
}

function createController() {
  const sandbox = {
    console,
    globalThis: null,
    setTimeout: () => 1,
    clearTimeout: () => {},
    state: { appearance: { schemaVersion: 1, equipped: {} } },
    activeHostSaveScope: "scope-a",
    saveCalls: 0,
    saveState: null,
    renderPortraitWardrobe() {},
    showToast() {},
    window: { parent: { postMessage() {} } },
    isSillyTavernHost: () => true
  };
  sandbox.globalThis = sandbox;
  sandbox.saveState = () => { sandbox.saveCalls += 1; };
  vm.runInNewContext(portraitSource, sandbox);
  vm.runInNewContext([
    "let state = globalThis.state;",
    "let activeHostSaveScope = globalThis.activeHostSaveScope;",
    "const portraitWardrobeState = { open: false, selectedCharacterKey: 'producer', library: HatsuPortraits.normalizeLibrary(null), pendingOperation: null, selectedAssetId: '', status: 'idle', invalidUrls: new Set(), previewUrl: '', selectedFile: null, selectedMeta: null, draftName: '', draftTransform: { scale: 1, offsetX: 0, offsetY: 0 }, timeoutId: 0 };",
    readFunction(appSource, "readPortraitFileAsBase64"),
    readFunction(appSource, "requestPortraitHostOperation"),
    readFunction(appSource, "selectPortraitPreviewFile"),
    readFunction(appSource, "beginPortraitCommit"),
    readFunction(appSource, "handlePortraitHostResult"),
    readFunction(appSource, "retryPortraitCommit"),
    readFunction(appSource, "handlePortraitOperationTimeout"),
    readFunction(appSource, "closePortraitWardrobe"),
    readFunction(appSource, "equipPortraitReference"),
    "this.controller = { state: portraitWardrobeState, selectPortraitPreviewFile, beginPortraitCommit, handlePortraitHostResult, retryPortraitCommit, handlePortraitOperationTimeout, closePortraitWardrobe };"
  ].join("\n"), sandbox);
  return sandbox;
}

function sampleFile() {
  return { name: "look.png", type: "image/png", size: 1200 };
}

test("file selection validates decoded metadata and creates preview without host I/O", async () => {
  const sandbox = createController();
  let posted = 0;
  const result = await sandbox.controller.selectPortraitPreviewFile(sampleFile(), {
    decodeImageMeta: async () => ({ width: 600, height: 1200 }),
    createObjectURL: () => "blob:preview",
    postMessage: () => { posted += 1; }
  });
  assert.equal(result.ok, true);
  assert.equal(sandbox.controller.state.previewUrl, "blob:preview");
  assert.equal(sandbox.controller.state.selectedMeta.width, 600);
  assert.equal(posted, 0);
});

test("commit freezes scope character transform name operation and file before verify", async () => {
  const sandbox = createController();
  const calls = [];
  await sandbox.controller.selectPortraitPreviewFile(sampleFile(), {
    decodeImageMeta: async () => ({ width: 600, height: 1200 }),
    createObjectURL: () => "blob:preview"
  });
  sandbox.controller.state.draftName = "演出服";
  sandbox.controller.state.draftTransform = { scale: 1.2, offsetX: 4, offsetY: -3 };
  const result = sandbox.controller.beginPortraitCommit({
    isHost: () => true,
    now: () => 1720000000000,
    random: () => 0.25,
    postMessage: (payload) => calls.push(payload),
    setTimer: () => 9
  });
  const operation = sandbox.controller.state.pendingOperation;
  assert.equal(result.ok, true);
  assert.equal(operation.saveScope, "scope-a");
  assert.equal(operation.characterKey, "producer");
  assert.deepEqual(JSON.parse(JSON.stringify(operation.transform)), { scale: 1.2, offsetX: 4, offsetY: -3 });
  assert.equal(operation.name, "演出服");
  assert.equal(operation.file.name, "look.png");
  assert.equal(calls[0].action, "verify");
});

test("stale scope or operation replies cannot save equip or change pending controls", async () => {
  const sandbox = createController();
  await sandbox.controller.selectPortraitPreviewFile(sampleFile(), {
    decodeImageMeta: async () => ({ width: 600, height: 1200 }), createObjectURL: () => "blob:preview"
  });
  sandbox.controller.beginPortraitCommit({ isHost: () => true, postMessage() {}, setTimer: () => 1, now: () => 1, random: () => 0.1 });
  const before = JSON.stringify(sandbox.controller.state.pendingOperation);
  const operationId = sandbox.controller.state.pendingOperation.operationId;
  assert.equal(await sandbox.controller.handlePortraitHostResult({ operationId, saveScope: "scope-b", action: "verify", ok: true, exists: true }), false);
  assert.equal(await sandbox.controller.handlePortraitHostResult({ operationId: "op-old", saveScope: "scope-a", action: "verify", ok: true, exists: true }), false);
  assert.equal(JSON.stringify(sandbox.controller.state.pendingOperation), before);
  assert.equal(sandbox.saveCalls, 0);
});

test("successful pipeline requires library read-back before equipping", async () => {
  const sandbox = createController();
  const calls = [];
  const deps = { postMessage: (payload) => calls.push(payload), setTimer: () => calls.length, clearTimer() {}, readFileBase64: async () => "YWJj" };
  await sandbox.controller.selectPortraitPreviewFile(sampleFile(), {
    decodeImageMeta: async () => ({ width: 600, height: 1200 }), createObjectURL: () => "blob:preview"
  });
  sandbox.controller.beginPortraitCommit({ ...deps, isHost: () => true, now: () => 10, random: () => 0.2 });
  const op = sandbox.controller.state.pendingOperation;
  await sandbox.controller.handlePortraitHostResult({ operationId: op.operationId, saveScope: op.saveScope, action: "verify", ok: true, exists: false }, deps);
  assert.equal(calls.at(-1).action, "upload");
  await sandbox.controller.handlePortraitHostResult({ operationId: op.operationId, saveScope: op.saveScope, action: "upload", ok: true, url: op.url }, deps);
  assert.equal(calls.at(-1).action, "readLibrary");
  await sandbox.controller.handlePortraitHostResult({ operationId: op.operationId, saveScope: op.saveScope, action: "readLibrary", ok: true, library: { assets: {} } }, deps);
  assert.equal(calls.at(-1).action, "writeLibrary");
  assert.equal(sandbox.saveCalls, 0);
  await sandbox.controller.handlePortraitHostResult({ operationId: op.operationId, saveScope: op.saveScope, action: "writeLibrary", ok: true }, deps);
  assert.equal(calls.at(-1).action, "readLibrary");
  const readBack = { schemaVersion: 1, libraryRevision: 1, assets: { [op.assetId]: op.asset } };
  await sandbox.controller.handlePortraitHostResult({ operationId: op.operationId, saveScope: op.saveScope, action: "readLibrary", ok: true, library: readBack }, deps);
  assert.equal(sandbox.state.appearance.equipped.producer.assetId, op.assetId);
  assert.equal(sandbox.saveCalls, 1);
  assert.equal(sandbox.controller.state.pendingOperation, null);
});

test("timeout becomes retryable and retry reuses operation and file ids", async () => {
  const sandbox = createController();
  const calls = [];
  await sandbox.controller.selectPortraitPreviewFile(sampleFile(), {
    decodeImageMeta: async () => ({ width: 600, height: 1200 }), createObjectURL: () => "blob:preview"
  });
  const deps = { isHost: () => true, postMessage: (payload) => calls.push(payload), setTimer: () => 1, now: () => 10, random: () => 0.2 };
  sandbox.controller.beginPortraitCommit(deps);
  const before = { operationId: sandbox.controller.state.pendingOperation.operationId, fileName: sandbox.controller.state.pendingOperation.fileName };
  sandbox.controller.handlePortraitOperationTimeout(before.operationId, "verify");
  assert.equal(sandbox.controller.state.status, "retryable");
  sandbox.controller.retryPortraitCommit(deps);
  assert.equal(sandbox.controller.state.pendingOperation.operationId, before.operationId);
  assert.equal(sandbox.controller.state.pendingOperation.fileName, before.fileName);
  assert.equal(calls.at(-1).action, "verify");
});

test("closing preview revokes object URL without posting or saving", async () => {
  const sandbox = createController();
  let revoked = "";
  await sandbox.controller.selectPortraitPreviewFile(sampleFile(), {
    decodeImageMeta: async () => ({ width: 600, height: 1200 }), createObjectURL: () => "blob:preview"
  });
  sandbox.controller.closePortraitWardrobe({ revokeObjectURL: (url) => { revoked = url; } });
  assert.equal(revoked, "blob:preview");
  assert.equal(sandbox.saveCalls, 0);
});

test("non-host preview cannot commit and never creates a pending operation", async () => {
  const sandbox = createController();
  let posted = 0;
  await sandbox.controller.selectPortraitPreviewFile(sampleFile(), {
    decodeImageMeta: async () => ({ width: 600, height: 1200 }), createObjectURL: () => "blob:preview"
  });
  const result = sandbox.controller.beginPortraitCommit({ isHost: () => false, postMessage: () => { posted += 1; } });
  assert.equal(result.error, "host_required");
  assert.equal(sandbox.controller.state.pendingOperation, null);
  assert.equal(posted, 0);
});

test("file read failure becomes retryable without advancing the pipeline", async () => {
  const sandbox = createController();
  await sandbox.controller.selectPortraitPreviewFile(sampleFile(), {
    decodeImageMeta: async () => ({ width: 600, height: 1200 }), createObjectURL: () => "blob:preview"
  });
  sandbox.controller.beginPortraitCommit({ isHost: () => true, postMessage() {}, setTimer: () => 1, now: () => 1, random: () => 0.1 });
  const operation = sandbox.controller.state.pendingOperation;
  const accepted = await sandbox.controller.handlePortraitHostResult({
    operationId: operation.operationId,
    saveScope: operation.saveScope,
    action: "verify",
    ok: true,
    exists: false
  }, { clearTimer() {}, readFileBase64: async () => { throw new Error("file_read_failed"); } });
  assert.equal(accepted, true);
  assert.equal(sandbox.controller.state.status, "retryable");
  assert.equal(operation.lastError, "file_read_failed");
});

test("late reply for an earlier action is rejected after the pipeline advances", async () => {
  const sandbox = createController();
  const calls = [];
  await sandbox.controller.selectPortraitPreviewFile(sampleFile(), {
    decodeImageMeta: async () => ({ width: 600, height: 1200 }), createObjectURL: () => "blob:preview"
  });
  const deps = { isHost: () => true, postMessage: (payload) => calls.push(payload), setTimer: () => 1, readFileBase64: async () => "YWJj", now: () => 1, random: () => 0.1 };
  sandbox.controller.beginPortraitCommit(deps);
  const operation = sandbox.controller.state.pendingOperation;
  const verifyReply = { operationId: operation.operationId, saveScope: operation.saveScope, action: "verify", ok: true, exists: false };
  await sandbox.controller.handlePortraitHostResult(verifyReply, deps);
  assert.equal(calls.at(-1).action, "upload");
  assert.equal(await sandbox.controller.handlePortraitHostResult(verifyReply, deps), false);
  assert.equal(calls.at(-1).action, "upload");
});

test("portrait host replies route before AI reply deduplication", () => {
  const route = readFunction(appSource, "routeHostAiPayload");
  const portraitIndex = route.indexOf('payload.type === "portraitFileOperationResult"');
  const dedupIndex = route.indexOf("shouldSkipCommittedReply(payload)");
  assert.notEqual(portraitIndex, -1);
  assert.ok(portraitIndex < dedupIndex);
});
