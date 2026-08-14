import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workerSource = readFileSync(new URL("../worker.js", import.meta.url), "utf8");
const stSource = readFileSync(new URL("../st.html", import.meta.url), "utf8");
const styleSource = readFileSync(new URL("../style.css", import.meta.url), "utf8");

function injectStHtmlAssetBase(html, origin) {
  const base = origin.endsWith("/") ? origin : `${origin}/`;
  let out = html;
  const marker = "/* HATSU_WORKER_INJECT_ASSET_BASE */";
  if (out.includes(marker)) {
    out = out.replace(marker, `window.HATSU_ASSET_BASE = "${base}";`);
  }
  out = out.replaceAll('data-asset-base=""', `data-asset-base="${base}"`);
  return out;
}

test("st.html exposes a unique worker injection marker", () => {
  assert.match(stSource, /\/\* HATSU_WORKER_INJECT_ASSET_BASE \*\//);
});

test("worker injects asset base via marker, not a loose includes check", () => {
  assert.match(workerSource, /HATSU_WORKER_INJECT_ASSET_BASE/);
  assert.doesNotMatch(workerSource, /includes\("window\.HATSU_ASSET_BASE"\)/);
});

test("task panel overlay has scrollable body layout", () => {
  assert.match(styleSource, /\.event-panel\.task-panel[\s\S]*min-height:\s*min\(520px/);
  assert.match(styleSource, /\.task-panel-body \.task-panel-sections[\s\S]*min-height:\s*180px/);
});

test("st.html overlay shields idol list cards from host button resets", () => {
  assert.match(stSource, /#hatsu-fullscreen-overlay \.idol-card/);
  assert.match(stSource, /display:\s*grid !important/);
});

test("st.html embed loader skips vercel and probes world modules", () => {
  assert.match(stSource, /isDeprecatedRemoteBase/);
  assert.match(stSource, /probeEmbedAssetBase/);
  assert.match(stSource, /酒馆内嵌忽略 Vercel 资源根/);
  assert.match(stSource, /world\/cast-track\.js/);
});

test("injectStHtmlAssetBase sets HATSU_ASSET_BASE and data-asset-base", () => {
  const origin = "https://hatsuboshitest.a1415102876.workers.dev";
  const injected = injectStHtmlAssetBase(stSource, origin);
  assert.match(
    injected,
    /window\.HATSU_ASSET_BASE = "https:\/\/hatsuboshitest\.a1415102876\.workers\.dev\/";/
  );
  assert.match(
    injected,
    /data-asset-base="https:\/\/hatsuboshitest\.a1415102876\.workers\.dev\/"/
  );
  assert.doesNotMatch(injected, /\/\* HATSU_WORKER_INJECT_ASSET_BASE \*\//);
});
