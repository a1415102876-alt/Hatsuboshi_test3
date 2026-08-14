import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const extensionSource = readFileSync(
  new URL("../../scripts/extensions/third-party/hatsuboshi-produce/index.js", import.meta.url),
  "utf8"
);
const extensionStyle = readFileSync(
  new URL("../../scripts/extensions/third-party/hatsuboshi-produce/style.css", import.meta.url),
  "utf8"
);

function readFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const next = source.indexOf("\nfunction ", start + 1);
  return source.slice(start, next === -1 ? source.length : next);
}

test("local extension supports toggling chat floor hide like st.html", () => {
  assert.match(extensionSource, /id="hatsuboshi-produce-toggle-floors"/);
  assert.match(extensionSource, /let floorsHidden = true/);
  assert.match(readFunction(extensionSource, "updateHatsuboshiActiveState"), /hatsuboshi-floor-hide-enabled/);
  assert.match(readFunction(extensionSource, "updateHatsuboshiActiveState"), /querySelector\('\.mes\[mesid="0"\]'\)/);
  assert.match(readFunction(extensionSource, "updateHatsuboshiActiveState"), /取消隐藏下方楼层/);
  assert.match(readFunction(extensionSource, "bindChatDomObserver"), /MutationObserver/);
  assert.match(extensionStyle, /body\.hatsuboshi-active\.hatsuboshi-floor-hide-enabled/);
  assert.doesNotMatch(extensionStyle, /body\.hatsuboshi-active \.mes\[mesid\]:not\(\[mesid="0"\]\)/);
});
