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

  removeEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    this.listeners.set(
      type,
      listeners.filter((candidate) => candidate !== listener)
    );
  }

  dispatchEvent(event) {
    const payload = {
      currentTarget: this,
      target: this,
      preventDefault() {},
      ...event
    };
    for (const listener of this.listeners.get(payload.type) || []) {
      listener(payload);
    }
    return true;
  }

  setPointerCapture(pointerId) {
    this.capturedPointerId = pointerId;
  }

  releasePointerCapture(pointerId) {
    if (this.capturedPointerId === pointerId) this.capturedPointerId = null;
  }

  getBoundingClientRect() {
    const left = Number.parseFloat(this.style.left) || 0;
    const top = Number.parseFloat(this.style.top) || 0;
    const width = Number.parseFloat(this.style.width) || 44;
    const height = Number.parseFloat(this.style.height) || 44;
    return { left, top, width, height, right: left + width, bottom: top + height };
  }

  click() {
    this.dispatchEvent({ type: "click" });
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
  const hostListeners = hostWindow.__testListeners || new Map();
  hostWindow.__testListeners = hostListeners;
  hostWindow.innerWidth ||= 1024;
  hostWindow.innerHeight ||= 768;
  hostWindow.addEventListener ||= (type, listener) => {
    const listeners = hostListeners.get(type) || [];
    listeners.push(listener);
    hostListeners.set(type, listeners);
  };
  hostWindow.removeEventListener ||= (type, listener) => {
    const listeners = hostListeners.get(type) || [];
    hostListeners.set(type, listeners.filter((candidate) => candidate !== listener));
  };
  hostWindow.dispatchEvent ||= (event) => {
    for (const listener of hostListeners.get(event.type) || []) listener(event);
  };
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

function dispatchPointer(element, type, overrides = {}) {
  element.dispatchEvent({
    type,
    pointerId: 1,
    pointerType: "mouse",
    button: 0,
    clientX: 0,
    clientY: 0,
    detail: 1,
    preventDefault() {},
    ...overrides
  });
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

test("start mounts a host-body floating toggle above the shell", () => {
  const env = runLauncherInHost();
  env.startButton.click();

  const shell = env.hostDocument.getElementById("hatsu-persistent-game-shell");
  const toggle = env.hostDocument.getElementById("hatsu-persistent-game-toggle");

  assert.ok(toggle);
  assert.equal(toggle.parentNode, env.hostDocument.body);
  assert.notEqual(toggle.parentNode, shell);
  assert.ok(Number(toggle.style.zIndex) > Number(shell.style.zIndex));
  assert.equal(toggle.hidden, false);
});

test("floating toggle hides and restores the same iframe without changing src", () => {
  const env = runLauncherInHost();
  env.startButton.click();

  const shell = env.hostDocument.getElementById("hatsu-persistent-game-shell");
  const frame = env.hostDocument.getElementById("hatsu-persistent-game-frame");
  const toggle = env.hostDocument.getElementById("hatsu-persistent-game-toggle");
  const src = frame.src;

  toggle.click();
  assert.equal(shell.hidden, true);
  assert.equal(toggle.hidden, false);

  toggle.click();
  assert.equal(shell.hidden, false);
  assert.equal(env.hostDocument.getElementById("hatsu-persistent-game-frame"), frame);
  assert.equal(frame.src, src);
});

test("dragging the floating toggle moves it without hiding the game", () => {
  const env = runLauncherInHost();
  env.startButton.click();

  const shell = env.hostDocument.getElementById("hatsu-persistent-game-shell");
  const toggle = env.hostDocument.getElementById("hatsu-persistent-game-toggle");

  dispatchPointer(toggle, "pointerdown", { clientX: 900, clientY: 300 });
  dispatchPointer(toggle, "pointermove", { clientX: 700, clientY: 500 });
  dispatchPointer(toggle, "pointerup", { clientX: 700, clientY: 500 });

  assert.equal(shell.hidden, false);
  assert.equal(toggle.style.left, "678px");
  assert.equal(toggle.style.top, "478px");
});

test("drag position is clamped again after viewport resize", () => {
  const env = runLauncherInHost();
  env.startButton.click();

  const toggle = env.hostDocument.getElementById("hatsu-persistent-game-toggle");

  dispatchPointer(toggle, "pointerdown", { clientX: 900, clientY: 300 });
  dispatchPointer(toggle, "pointermove", { clientX: 1000, clientY: 700 });
  dispatchPointer(toggle, "pointerup", { clientX: 1000, clientY: 700 });

  assert.equal(toggle.style.left, "972px");
  assert.equal(toggle.style.top, "678px");

  env.hostWindow.innerWidth = 320;
  env.hostWindow.innerHeight = 240;
  env.hostWindow.dispatchEvent({ type: "resize" });

  assert.equal(toggle.style.left, "268px");
  assert.equal(toggle.style.top, "188px");
});

test("a touch tap toggles once and ignores the synthesized pointer click", () => {
  const env = runLauncherInHost();
  env.startButton.click();

  const shell = env.hostDocument.getElementById("hatsu-persistent-game-shell");
  const toggle = env.hostDocument.getElementById("hatsu-persistent-game-toggle");

  dispatchPointer(toggle, "pointerdown", {
    pointerType: "touch",
    clientX: 900,
    clientY: 300
  });
  dispatchPointer(toggle, "pointerup", {
    pointerType: "touch",
    clientX: 900,
    clientY: 300
  });
  toggle.dispatchEvent({ type: "click", detail: 1 });

  assert.equal(shell.hidden, true);
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
  assert.equal(
    first.hostDocument.body.children.filter(
      (node) => node.id === "hatsu-persistent-game-toggle"
    ).length,
    1
  );
});

test("a v3 launcher redirects a stale v2 controller and preserves its iframe", () => {
  const hostDocument = new FakeDocument();
  const shell = hostDocument.createElement("section");
  shell.id = "hatsu-persistent-game-shell";
  shell.hidden = false;
  const frame = hostDocument.createElement("iframe");
  frame.id = "hatsu-persistent-game-frame";
  const exitButton = hostDocument.createElement("button");
  exitButton.id = "hatsu-persistent-game-exit";
  shell.appendChild(frame);
  shell.appendChild(exitButton);
  hostDocument.body.appendChild(shell);

  let staleOpenCalls = 0;
  const staleController = {
    open() {
      staleOpenCalls += 1;
    },
    hide() {},
    getStatus() {
      return "visible";
    },
    subscribe(listener) {
      listener("visible");
      return () => {};
    }
  };
  const hostWindow = {
    document: hostDocument,
    __hatsuPersistentLauncherV2: staleController
  };

  const env = runLauncherInHost({ hostWindow });
  env.startButton.click();
  shell.hidden = true;
  staleController.open();

  assert.equal(staleOpenCalls, 0);
  assert.ok(hostWindow.__hatsuPersistentLauncherV3);
  assert.equal(env.hostDocument.getElementById("hatsu-persistent-game-frame"), frame);
  assert.equal(shell.hidden, false);
  assert.equal(exitButton.hidden, true);
  assert.equal(exitButton.style.display, "none");
  assert.equal(exitButton.attributes["aria-hidden"], "true");
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

test("opening the new launcher hides the legacy persistent iframe", () => {
  const hostDocument = new FakeDocument();
  const legacyFrame = hostDocument.createElement("iframe");
  legacyFrame.id = "hatsu-produce-persistent-frame";
  legacyFrame.style.display = "block";
  hostDocument.body.appendChild(legacyFrame);

  const env = runLauncherInHost({ hostWindow: { document: hostDocument } });
  env.startButton.click();
  env.hostDocument.getElementById("hatsu-persistent-game-exit").click();

  assert.equal(legacyFrame.hidden, true);
  assert.equal(legacyFrame.style.display, "none");
  assert.equal(
    env.hostDocument.getElementById("hatsu-persistent-game-shell").hidden,
    true
  );
});

test("removing a message floor does not remove the host game shell", () => {
  const env = runLauncherInHost();
  env.startButton.click();
  env.entryFrame.remove();

  assert.ok(env.hostDocument.getElementById("hatsu-persistent-game-shell"));
  assert.ok(env.hostDocument.getElementById("hatsu-persistent-game-toggle"));
});

test("direct launcher use shows a host warning and creates no local game owner", () => {
  const env = runLauncherWithoutHost();

  assert.match(env.status.textContent, /SillyTavern/);
  env.startButton.click();
  assert.equal(env.entryWindow.__hatsuPersistentLauncherV1, undefined);
  assert.equal(env.entryWindow.__hatsuPersistentLauncherV3, undefined);
  assert.equal(env.entryDocument.getElementById("hatsu-persistent-game-shell"), null);
  assert.equal(env.entryDocument.getElementById("hatsu-persistent-game-toggle"), null);
});

test("launcher page is a compact entry and loads the message controller", () => {
  assert.match(launcherHtml, /id="hatsu-launcher-start-btn"/);
  assert.match(launcherHtml, /id="hatsu-launcher-status"/);
  assert.match(
    launcherHtml,
    /http:\/\/127\.0\.0\.1:8000\/hatsu-produce-local\/dist\/hatsu-launcher\/message-entry\.js/
  );
  assert.match(
    launcherHtml,
    /message-entry\.js\?v=3/
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

test("README documents the draggable host toggle and hide-only behavior", () => {
  assert.match(
    readmeSource,
    /\$\('body'\)\.load\('http:\/\/127\.0\.0\.1:8000\/hatsu-produce-local\/launcher\.html'\)/
  );
  assert.match(readmeSource, /draggable.*floating toggle/i);
  assert.match(readmeSource, /host-level.*toggle/i);
  assert.doesNotMatch(readmeSource, /Exit behavior:/i);
  assert.match(readmeSource, /does not cancel[^\n]*generation/i);
  assert.match(readmeSource, /shujuku[^\n]*floor refresh/i);
  assert.match(readmeSource, /SillyTavern[^\n]*full refresh[^\n]*Harness Recovery/i);
});
