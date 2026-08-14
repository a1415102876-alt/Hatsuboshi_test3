import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const entrySource = readFileSync(new URL('../st-fixed.html', import.meta.url), 'utf8');
const stageSource = readFileSync(new URL('../hatsu-fixed-stage.js', import.meta.url), 'utf8');
const startupSource = readFileSync(new URL('../shujuku-original-fixed-startup.html', import.meta.url), 'utf8');
const styleSource = readFileSync(new URL('../style.css', import.meta.url), 'utf8');

test('fixed stage entry layers on top of the existing st.html entry', () => {
  assert.match(entrySource, /import\(assetBase \+ 'hatsu-fixed-stage\.js/);
  assert.match(entrySource, /\.load\(assetBase \+ 'st\.html/);
});

test('fixed Shujuku startup preserves the existing bridge and selects only the fixed entry', () => {
  assert.match(startupSource, /shujuku-original-local\.js/);
  assert.match(startupSource, /shujuku-original-bridge\.js/);
  assert.match(startupSource, /\.load\(window\.HATSU_ASSET_BASE \+ 'st-fixed\.html/);
});

test('fixed stage keeps a 16:9 desktop viewport without changing mobile or fullscreen layout', () => {
  assert.match(stageSource, /const DESIGN_WIDTH = 1600/);
  assert.match(stageSource, /const DESIGN_HEIGHT = 900/);
  assert.match(stageSource, /const MOBILE_BREAKPOINT = 700/);
  assert.match(stageSource, /Math\.min\(viewport\.width \/ DESIGN_WIDTH, viewport\.height \/ DESIGN_HEIGHT\)/);
  assert.match(stageSource, /!document\.fullscreenElement/);
  assert.match(stageSource, /fullscreenchange/);
  assert.match(stageSource, /@media \(max-width: \$\{MOBILE_BREAKPOINT\}px\)/);
});

test('fixed stage constrains fixed overlays to the centered stage', () => {
  assert.match(stageSource, /#hatsu-fullscreen-overlay/);
  assert.match(stageSource, /translate\(-50%, -50%\) scale\(var\(--hatsu-fixed-stage-scale, 1\)\)/);
  assert.match(stageSource, /contain: layout paint/);
});

test('fixed stage removes document scrolling while preserving a complete produce canvas', () => {
  assert.match(stageSource, /#hatsu-fullscreen-content,[\s\S]*?overflow: hidden !important/);
  assert.match(stageSource, /#hatsu-st-page > \.produce-app/);
  assert.match(stageSource, /height: \$\{DESIGN_HEIGHT\}px !important/);
  assert.match(stageSource, /\.game-stage/);
  assert.match(stageSource, /height: calc\(\$\{DESIGN_HEIGHT\}px \+ var\(--stage-top-crop, 100px\)\)/);
});

test('fixed stage expands an embedded SillyTavern frame from its width before scaling', () => {
  assert.match(stageSource, /const hostFrame = global\.frameElement\?\.nodeType === 1/);
  assert.match(stageSource, /function getAvailableEmbedWidth\(/);
  assert.match(stageSource, /function resizeHostFrame\(/);
  assert.match(stageSource, /width \* DESIGN_HEIGHT \/ DESIGN_WIDTH/);
  assert.match(stageSource, /hostFrame\.style\.setProperty\('height', `\$\{height\}px`, 'important'\)/);
  assert.match(stageSource, /embeddedWidth \* DESIGN_HEIGHT \/ DESIGN_WIDTH/);
  assert.match(stageSource, /new ResizeObserver/);
});

test('fixed stage makes reused broadcast and TV shells fill the design canvas', () => {
  assert.match(stageSource, /\.nia-radio-overlay/);
  assert.match(stageSource, /\.nia-radio-shell/);
  assert.match(stageSource, /\.nia-live-overlay/);
  assert.match(stageSource, /#hatsu-fullscreen-overlay > \.nia-live-overlay/);
  assert.match(stageSource, /position: absolute !important/);
  assert.match(stageSource, /\.live-theater-overlay/);
  assert.match(stageSource, /height: 100% !important/);
  assert.match(stageSource, /\.nia-radio-main,[\s\S]*?\.nia-live-main/);
});

test('shared wipe stripes fill the scaled stage instead of mixing fixed and viewport coordinates', () => {
  const start = styleSource.indexOf('.wipe-stripe {');
  const end = styleSource.indexOf('}', start);
  const rule = styleSource.slice(start, end + 1);
  assert.match(rule, /position:\s*absolute/);
  assert.match(rule, /width:\s*100%/);
  assert.match(rule, /height:\s*calc\(100% \/ 6 \+ 2px\)/);
  assert.match(rule, /top:\s*calc\(var\(--i\) \* \(100% \/ 6\)\)/);
  assert.doesNotMatch(rule, /100v[wh]/);
});
