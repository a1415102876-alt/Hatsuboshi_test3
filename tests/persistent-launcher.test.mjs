import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const launcherSource = readFileSync(
  new URL("../dist/hatsu-launcher/message-entry.js", import.meta.url),
  "utf8"
);
let launcherHtml = "";
try {
  launcherHtml = readFileSync(new URL("../launcher.html", import.meta.url), "utf8");
} catch (error) {
  launcherHtml = "";
}
const readmeSource = readFileSync(new URL("../README.md", import.meta.url), "utf8");

const EXPECTED_FRONTEND_URL = "http://127.0.0.1:8000/hatsu-produce-local/st.html";

class FakeElement {
  constructor(tagName, ownerDocument) {
    this.tagName = String(tagName || "div").toUpperCase();
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.parentNode = null;
    this.style = {};
    this.hidden = false;
    this.id = "";
    this.src = "";
    this.textContent = "";
    this.attributes = {};
    this.listeners = new Map();
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  remove() {
    if (!this.parentNode) return;
    const index = this.parentNode.children.indexOf(this);
    if (index >= 0) this.parentNode.children.splice(index, 1);
    this.parentNode = null;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name === "id") this.id = String(value);
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  click() {
    for (const listener of this.listeners.get("click") || []) {
      listener({ currentTarget: this, target: this });
    }
  }
}

class FakeDocument {
  constructor() {
    this.documentElement = new FakeElement("html", this);
    this.head = new FakeElement("head", this);
    this.body = new FakeElement("body", this);
    this.documentElement.appendChild(this.head);
    this.documentElement.appendChild(this.body);
  }

  createElement(tagName) {
    return new FakeElement(tagName, this);
  }

  getElementById(id) {
    function visit(node) {
      if (node.id === id) return node;
      for (const child of node.children) {
        const found = visit(child);
        if (found) return found;
      }
      return null;
    }
    return visit(this.documentElement);
  }
}

function createEntryDocument() {
  const document = new FakeDocument();
  const status = document.createElement("p");
  status.id = "hatsu-launcher-status";
  const startButton = document.createElement("button");
  startButton.id = "hatsu-launcher-start-btn";
  document.body.appendChild(status);
  document.body.appendChild(startButton);
  return { document, status, startButton };
}

function runLauncherInHost(options = {}) {
  const hostDocument = options.hostWindow?.document || new FakeDocument();
  const hostWindow = options.hostWindow || { document: hostDocument };
  hostWindow.window = hostWindow;
  hostWindow.parent = hostWindow;
  hostWindow.top = hostWindow;

  const { document: entryDocument, status, startButton } = createEntryDocument();
  const entryWindow = {
    document: entryDocument,
    parent: hostWindow,
    top: hostWindow,
    HatsuMessageLauncherConfig: { frontendUrl: EXPECTED_FRONTEND_URL }
  };
  entryWindow.window = entryWindow;

  const entryFrame = hostDocument.createElement("iframe");
  entryFrame.id = `message-frame-${hostDocument.body.children.length}`;
  hostDocument.body.appendChild(entryFrame);

  vm.runInNewContext(launcherSource, {
    window: entryWindow,
    document: entryDocument,
    console
  });

  return {
    hostWindow,
    hostDocument,
    entryWindow,
    entryDocument,
    entryFrame,
    status,
    startButton
  };
}

function runLauncherWithoutHost() {
  const { document: entryDocument, status, startButton } = createEntryDocument();
  const entryWindow = {
    document: entryDocument,
    HatsuMessageLauncherConfig: { frontendUrl: EXPECTED_FRONTEND_URL }
  };
  entryWindow.window = entryWindow;
  entryWindow.parent = entryWindow;
  entryWindow.top = entryWindow;

  vm.runInNewContext(launcherSource, {
    window: entryWindow,
    document: entryDocument,
    console
  });

  return { entryWindow, entryDocument, status, startButton };
}

test("start mounts one persistent game iframe under the host body", () => {
  const env = runLauncherInHost();
  env.startButton.click();

  const shells = env.hostDocument.body.children.filter(
    (node) => node.id === "hatsu-persistent-game-shell"
  );
  assert.equal(shells.length, 1);
  assert.equal(
    env.hostDocument.getElementById("hatsu-persistent-game-frame").src,
    EXPECTED_FRONTEND_URL
  );
});

test("repeated launchers reuse the same host overlay and iframe", () => {
  const first = runLauncherInHost();
  first.startButton.click();
  const frame = first.hostDocument.getElementById("hatsu-persistent-game-frame");

  const second = runLauncherInHost({ hostWindow: first.hostWindow });
  second.startButton.click();

  assert.equal(first.hostDocument.getElementById("hatsu-persistent-game-frame"), frame);
  assert.equal(
    first.hostDocument.body.children.filter(
      (node) => node.id === "hatsu-persistent-game-shell"
    ).length,
    1
  );
});

test("exit updates a live launcher card to the background state", () => {
  const env = runLauncherInHost();
  env.startButton.click();
  assert.equal(env.status.textContent, "\u6e38\u620f\u5df2\u6253\u5f00");

  env.hostDocument.getElementById("hatsu-persistent-game-exit").click();

  assert.equal(env.status.textContent, "\u6e38\u620f\u6b63\u5728\u540e\u53f0\u8fd0\u884c");
  assert.equal(env.startButton.textContent, "\u7ee7\u7eed\u6e38\u620f");
});

test("exit hides the shell and resume preserves the iframe node and src", () => {
  const env = runLauncherInHost();
  env.startButton.click();
  const shell = env.hostDocument.getElementById("hatsu-persistent-game-shell");
  const frame = env.hostDocument.getElementById("hatsu-persistent-game-frame");

  env.hostDocument.getElementById("hatsu-persistent-game-exit").click();
  assert.equal(shell.hidden, true);

  env.startButton.click();
  assert.equal(shell.hidden, false);
  assert.equal(env.hostDocument.getElementById("hatsu-persistent-game-frame"), frame);
  assert.equal(frame.src, EXPECTED_FRONTEND_URL);
});

test("removing a message floor does not remove the host game shell", () => {
  const env = runLauncherInHost();
  env.startButton.click();
  env.entryFrame.remove();

  assert.ok(env.hostDocument.getElementById("hatsu-persistent-game-shell"));
});

test("direct launcher use shows a host warning and creates no local game owner", () => {
  const env = runLauncherWithoutHost();

  assert.match(env.status.textContent, /SillyTavern/);
  env.startButton.click();
  assert.equal(env.entryWindow.__hatsuPersistentLauncherV1, undefined);
  assert.equal(env.entryDocument.getElementById("hatsu-persistent-game-shell"), null);
});

test("launcher page is a compact entry and loads the message controller", () => {
  assert.match(launcherHtml, /id="hatsu-launcher-start-btn"/);
  assert.match(launcherHtml, /id="hatsu-launcher-status"/);
  assert.match(
    launcherHtml,
    /http:\/\/127\.0\.0\.1:8000\/hatsu-produce-local\/dist\/hatsu-launcher\/message-entry\.js/
  );
  assert.doesNotMatch(launcherHtml, /<iframe/i);
  assert.doesNotMatch(launcherHtml, /position:\s*fixed[\s\S]*inset:\s*0/i);
});

test("launcher page configures the canonical st bridge URL", () => {
  assert.match(
    launcherHtml,
    /http:\/\/127\.0\.0\.1:8000\/hatsu-produce-local\/st\.html/
  );
});

test("README documents the regex launcher and hide-only exit behavior", () => {
  assert.match(
    readmeSource,
    /\$\('body'\)\.load\('http:\/\/127\.0\.0\.1:8000\/hatsu-produce-local\/launcher\.html'\)/
  );
  assert.match(readmeSource, /Exit behavior: hide-only/i);
  assert.match(readmeSource, /does not cancel[^\n]*generation/i);
  assert.match(readmeSource, /shujuku[^\n]*floor refresh/i);
  assert.match(readmeSource, /SillyTavern[^\n]*full refresh[^\n]*Harness Recovery/i);
});
