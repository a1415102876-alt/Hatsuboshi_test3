import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const bridgeSource = readFileSync(new URL("../st.html", import.meta.url), "utf8");

function readFunction(source, functionName) {
  const functionStart = source.indexOf(`function ${functionName}`);
  assert.notEqual(functionStart, -1, `${functionName} must exist`);
  const asyncStart = source.lastIndexOf("async ", functionStart);
  const start = asyncStart >= 0 && source.slice(asyncStart + 6, functionStart).trim() === "" ? asyncStart : functionStart;
  const parametersStart = source.indexOf("(", start);
  let parameterDepth = 0;
  let parametersEnd = -1;
  for (let index = parametersStart; index < source.length; index += 1) {
    if (source[index] === "(") parameterDepth += 1;
    else if (source[index] === ")") {
      parameterDepth -= 1;
      if (parameterDepth === 0) {
        parametersEnd = index;
        break;
      }
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
    else if (character === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`Could not parse ${functionName}`);
}

function loadHelpers() {
  const sandbox = {
    TextEncoder,
    btoa: (value) => Buffer.from(value, "binary").toString("base64"),
    globalThis: null
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext([
    readFunction(bridgeSource, "normalizePortraitFileOperation"),
    readFunction(bridgeSource, "encodePortraitUtf8Base64"),
    readFunction(bridgeSource, "getHostRequestHeaders"),
    readFunction(bridgeSource, "executePortraitFileOperation"),
    readFunction(bridgeSource, "postPortraitFileOperationResult"),
    "this.normalize = normalizePortraitFileOperation;",
    "this.execute = executePortraitFileOperation;",
    "this.postResult = postPortraitFileOperationResult;"
  ].join("\n"), sandbox);
  return sandbox;
}

function validRequest(overrides = {}) {
  return {
    source: "hatsuboshi-produce",
    type: "portraitFileOperation",
    operationId: "op-1",
    saveScope: "scope-a",
    action: "upload",
    payload: { name: "hatsu-portrait-op-1.png", data: "YWJj" },
    ...overrides
  };
}

test("host portrait upload verifies scope and posts exact operation reply", async () => {
  const helpers = loadHelpers();
  const calls = [];
  const result = await helpers.execute(validRequest(), {
    getCurrentScope: () => "scope-a",
    requestHeaders: () => ({ "Content-Type": "application/json", "X-CSRF-Token": "token" }),
    fetch: async (url, options) => {
      calls.push({ url, options });
      return { ok: true, json: async () => ({ path: "/user/files/hatsu-portrait-op-1.png" }) };
    }
  });

  assert.equal(result.ok, true);
  assert.equal(result.url, "/user/files/hatsu-portrait-op-1.png");
  assert.equal(calls[0].url, "/api/files/upload");
  assert.equal(JSON.parse(calls[0].options.body).name, "hatsu-portrait-op-1.png");

  let posted;
  helpers.postResult(validRequest(), result, (payload) => { posted = payload; });
  assert.deepEqual(JSON.parse(JSON.stringify(posted)), {
    source: "hatsuboshi-produce-host",
    type: "portraitFileOperationResult",
    operationId: "op-1",
    saveScope: "scope-a",
    action: "upload",
    ok: true,
    url: "/user/files/hatsu-portrait-op-1.png"
  });
});

test("host portrait operation rejects a changed save scope before fetch", async () => {
  const helpers = loadHelpers();
  let fetched = false;
  const result = await helpers.execute(validRequest(), {
    getCurrentScope: () => "scope-b",
    requestHeaders: () => ({}),
    fetch: async () => { fetched = true; }
  });
  assert.equal(result.error, "save_scope_changed");
  assert.equal(fetched, false);
});

test("host portrait verify reports deterministic file existence", async () => {
  const helpers = loadHelpers();
  const calls = [];
  const result = await helpers.execute(validRequest({
    action: "verify",
    payload: { url: "/user/files/hatsu-portrait-op-1.png" }
  }), {
    getCurrentScope: () => "scope-a",
    requestHeaders: () => ({ "Content-Type": "application/json" }),
    fetch: async (url, options) => {
      calls.push({ url, options });
      return { ok: true, json: async () => ({ "/user/files/hatsu-portrait-op-1.png": true }) };
    }
  });
  assert.deepEqual(JSON.parse(JSON.stringify(result)), { ok: true, exists: true });
  assert.equal(calls[0].url, "/api/files/verify");
});

test("host portrait library read is cache-busted and treats 404 as empty", async () => {
  const helpers = loadHelpers();
  let requestedUrl = "";
  const result = await helpers.execute(validRequest({ action: "readLibrary", payload: {} }), {
    getCurrentScope: () => "scope-a",
    now: () => 1234,
    normalizeLibrary: (value) => value || { schemaVersion: 1, libraryRevision: 0, updatedAt: 0, assets: {} },
    fetch: async (url) => {
      requestedUrl = url;
      return { ok: false, status: 404 };
    }
  });
  assert.equal(requestedUrl, "/user/files/hatsu-produce-portrait-library.json?t=1234");
  assert.deepEqual(JSON.parse(JSON.stringify(result.library)), { schemaVersion: 1, libraryRevision: 0, updatedAt: 0, assets: {} });
});

test("host portrait library write uploads UTF-8 JSON to the fixed file", async () => {
  const helpers = loadHelpers();
  let uploaded;
  const library = { schemaVersion: 1, libraryRevision: 2, updatedAt: 9, assets: {} };
  const result = await helpers.execute(validRequest({ action: "writeLibrary", payload: { library } }), {
    getCurrentScope: () => "scope-a",
    requestHeaders: () => ({ "Content-Type": "application/json" }),
    normalizeLibrary: (value) => value,
    fetch: async (url, options) => {
      uploaded = { url, body: JSON.parse(options.body) };
      return { ok: true, json: async () => ({ path: "/user/files/hatsu-produce-portrait-library.json" }) };
    }
  });
  assert.equal(result.ok, true);
  assert.equal(uploaded.url, "/api/files/upload");
  assert.equal(uploaded.body.name, "hatsu-produce-portrait-library.json");
  assert.deepEqual(JSON.parse(Buffer.from(uploaded.body.data, "base64").toString("utf8")), library);
});

test("host portrait operation rejects malformed input and a scope change after I/O", async () => {
  const helpers = loadHelpers();
  assert.equal(helpers.normalize(validRequest({ operationId: "bad id" })).error, "invalid_operation_id");
  assert.equal(helpers.normalize(validRequest({ action: "delete" })).error, "invalid_action");

  let scopeReads = 0;
  const result = await helpers.execute(validRequest(), {
    getCurrentScope: () => (++scopeReads === 1 ? "scope-a" : "scope-b"),
    requestHeaders: () => ({ "Content-Type": "application/json" }),
    fetch: async () => ({ ok: true, json: async () => ({ path: "/user/files/hatsu-portrait-op-1.png" }) })
  });
  assert.equal(result.error, "save_scope_changed");
});

test("portrait file messages bypass the primary prompt queue", () => {
  const start = bridgeSource.indexOf("const messageHandler = async (event) =>");
  const end = bridgeSource.indexOf("if (data.type === 'sendPrompt')", start);
  const prefix = bridgeSource.slice(start, end);
  assert.match(prefix, /data\.type === 'portraitFileOperation'/);
  assert.doesNotMatch(prefix, /queuePromptTask/);
});

test("portrait file messages are normalized exactly once by the executor", () => {
  const start = bridgeSource.indexOf("if (data.type === 'portraitFileOperation')");
  const end = bridgeSource.indexOf("if (data.type === 'sendPrompt')", start);
  const route = bridgeSource.slice(start, end);
  assert.match(route, /executePortraitFileOperation\(data\)/);
  assert.doesNotMatch(route, /executePortraitFileOperation\(request\)/);
});
