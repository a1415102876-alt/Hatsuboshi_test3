(function installHatsuFixedStage(global) {
  'use strict';

  global.HatsuFixedStage?.destroy?.();

  const document = global.document;
  const STYLE_ID = 'hatsu-fixed-stage-style';
  const ACTIVE_CLASS = 'hatsu-fixed-stage-active';
  const DESIGN_WIDTH = 1600;
  const DESIGN_HEIGHT = 900;
  const MOBILE_BREAKPOINT = 700;
  const hostFrame = global.frameElement?.nodeType === 1 ? global.frameElement : null;
  let hostWindow = global;
  let hostResizeObserver = null;

  try {
    if (global.parent?.document?.documentElement) hostWindow = global.parent;
  } catch (_error) {
    hostWindow = global;
  }

  document.getElementById(STYLE_ID)?.remove();

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    html.${ACTIVE_CLASS},
    html.${ACTIVE_CLASS} body {
      width: 100% !important;
      height: var(--hatsu-fixed-viewport-height, 100dvh) !important;
      overflow: hidden !important;
      background: #101016 !important;
    }

    html.${ACTIVE_CLASS} #hatsu-fullscreen-overlay {
      inset: auto !important;
      left: 50% !important;
      top: 50% !important;
      width: ${DESIGN_WIDTH}px !important;
      height: ${DESIGN_HEIGHT}px !important;
      max-width: none !important;
      max-height: none !important;
      transform: translate(-50%, -50%) scale(var(--hatsu-fixed-stage-scale, 1)) translateZ(0) !important;
      transform-origin: center center !important;
      contain: layout paint !important;
      box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08), 0 24px 70px rgba(0, 0, 0, 0.42) !important;
    }

    html.${ACTIVE_CLASS} #hatsu-fullscreen-content,
    html.${ACTIVE_CLASS} #hatsu-st-page {
      width: 100% !important;
      height: 100% !important;
      min-height: 0 !important;
      max-width: none !important;
      overflow: hidden !important;
    }

    html.${ACTIVE_CLASS} #hatsu-st-page {
      margin: 0 !important;
    }

    html.${ACTIVE_CLASS} #hatsu-st-page > .produce-app {
      width: min(100%, 1180px) !important;
      height: ${DESIGN_HEIGHT}px !important;
      min-height: ${DESIGN_HEIGHT}px !important;
      overflow: hidden !important;
    }

    html.${ACTIVE_CLASS} #hatsu-st-page .launch-screen,
    html.${ACTIVE_CLASS} #hatsu-st-page .select-screen {
      height: ${DESIGN_HEIGHT}px !important;
      min-height: ${DESIGN_HEIGHT}px !important;
      overflow: hidden !important;
    }

    html.${ACTIVE_CLASS} #hatsu-st-page .game-stage {
      height: calc(${DESIGN_HEIGHT}px + var(--stage-top-crop, 100px)) !important;
      min-height: calc(${DESIGN_HEIGHT}px + var(--stage-top-crop, 100px)) !important;
      margin-bottom: calc(-1 * var(--stage-top-crop, 100px)) !important;
    }

    html.${ACTIVE_CLASS} #hatsu-st-page .free-mode-stage,
    html.${ACTIVE_CLASS} #hatsu-st-page .producer-apartment-stage {
      height: ${DESIGN_HEIGHT}px !important;
      min-height: ${DESIGN_HEIGHT}px !important;
      overflow: hidden !important;
    }

    /* Broadcast and TV normally use 100dvh. In this embedded entry that
       value belongs to the host viewport, so fill the fixed design canvas. */
    html.${ACTIVE_CLASS} #hatsu-st-page .nia-radio-overlay,
    html.${ACTIVE_CLASS} #hatsu-st-page .nia-radio-shell,
    html.${ACTIVE_CLASS} #hatsu-fullscreen-overlay > .nia-mini-live-overlay,
    html.${ACTIVE_CLASS} #hatsu-fullscreen-overlay > .nia-mini-live-overlay .nia-mini-live-shell,
    html.${ACTIVE_CLASS} #hatsu-fullscreen-overlay > .nia-live-overlay,
    html.${ACTIVE_CLASS} #hatsu-fullscreen-overlay > .nia-live-overlay .nia-live-shell,
    html.${ACTIVE_CLASS} #hatsu-st-page .live-theater-overlay {
      height: 100% !important;
      min-height: 0 !important;
      max-height: none !important;
    }

    html.${ACTIVE_CLASS} #hatsu-fullscreen-overlay > .nia-live-overlay {
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      max-width: none !important;
      max-height: none !important;
      padding: 0 !important;
    }

    html.${ACTIVE_CLASS} #hatsu-fullscreen-overlay > .nia-mini-live-overlay {
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      max-width: none !important;
      max-height: none !important;
      padding: 0 !important;
    }

    html.${ACTIVE_CLASS} #hatsu-st-page .nia-radio-main,
    html.${ACTIVE_CLASS} #hatsu-st-page .nia-live-main {
      min-height: 0 !important;
      height: auto !important;
    }

    html.${ACTIVE_CLASS} #hatsu-fullscreen-overlay:fullscreen {
      inset: 0 !important;
      left: 0 !important;
      top: 0 !important;
      width: 100vw !important;
      height: var(--hatsu-fixed-viewport-height, 100dvh) !important;
      max-height: var(--hatsu-fixed-viewport-height, 100dvh) !important;
      transform: none !important;
      contain: none !important;
      box-shadow: none !important;
    }

    @media (max-width: ${MOBILE_BREAKPOINT}px) {
      html.${ACTIVE_CLASS} #hatsu-fullscreen-overlay {
        inset: 0 !important;
        left: 0 !important;
        top: 0 !important;
        width: 100vw !important;
        height: var(--hatsu-fixed-viewport-height, 100dvh) !important;
        transform: none !important;
        contain: none !important;
        box-shadow: none !important;
      }
    }
  `;
  document.head.appendChild(style);

  function getViewportSize() {
    return {
      width: global.visualViewport?.width || global.innerWidth,
      height: global.visualViewport?.height || global.innerHeight,
    };
  }

  function getAvailableEmbedWidth() {
    const frameWidth = Number(hostFrame?.getBoundingClientRect().width || 0);
    if (frameWidth > 0) return frameWidth;
    try {
      const chatWidth = Number(hostWindow.document.querySelector('#chat')?.getBoundingClientRect().width || 0);
      if (chatWidth > 0) return Math.max(320, chatWidth - 24);
    } catch (_error) {
      // Cross-origin hosts fall back to the current document width.
    }
    return Number(document.documentElement.clientWidth || global.innerWidth || DESIGN_WIDTH);
  }

  function resizeHostFrame() {
    if (!hostFrame || document.fullscreenElement) return;
    const width = getAvailableEmbedWidth();
    const height = Math.round(width * DESIGN_HEIGHT / DESIGN_WIDTH);
    hostFrame.style.setProperty('display', 'block', 'important');
    hostFrame.style.setProperty('width', '100%', 'important');
    hostFrame.style.setProperty('height', `${height}px`, 'important');
    hostFrame.style.setProperty('min-height', `${height}px`, 'important');
    hostFrame.style.setProperty('max-height', 'none', 'important');
  }

  function updateStage() {
    resizeHostFrame();
    const embeddedWidth = hostFrame && !document.fullscreenElement ? getAvailableEmbedWidth() : 0;
    const viewport = embeddedWidth > 0
      ? { width: embeddedWidth, height: embeddedWidth * DESIGN_HEIGHT / DESIGN_WIDTH }
      : getViewportSize();
    const useFixedStage = viewport.width > MOBILE_BREAKPOINT && !document.fullscreenElement;
    document.documentElement.classList.toggle(ACTIVE_CLASS, useFixedStage);
    document.documentElement.style.setProperty('--hatsu-fixed-viewport-height', `${viewport.height}px`);

    if (!useFixedStage) return;

    const scale = Math.min(viewport.width / DESIGN_WIDTH, viewport.height / DESIGN_HEIGHT);
    document.documentElement.style.setProperty('--hatsu-fixed-stage-scale', String(scale));
  }

  global.addEventListener('resize', updateStage);
  global.visualViewport?.addEventListener('resize', updateStage);
  if (hostWindow !== global) hostWindow.addEventListener('resize', updateStage);
  document.addEventListener('fullscreenchange', updateStage);
  if (hostFrame && typeof ResizeObserver === 'function') {
    hostResizeObserver = new ResizeObserver(() => updateStage());
    hostResizeObserver.observe(hostFrame.parentElement || hostFrame);
  }
  updateStage();

  global.HatsuFixedStage = {
    update: updateStage,
    destroy() {
      global.removeEventListener('resize', updateStage);
      global.visualViewport?.removeEventListener('resize', updateStage);
      if (hostWindow !== global) hostWindow.removeEventListener('resize', updateStage);
      document.removeEventListener('fullscreenchange', updateStage);
      hostResizeObserver?.disconnect();
      document.documentElement.classList.remove(ACTIVE_CLASS);
      document.documentElement.style.removeProperty('--hatsu-fixed-viewport-height');
      document.documentElement.style.removeProperty('--hatsu-fixed-stage-scale');
      document.getElementById(STYLE_ID)?.remove();
      delete global.HatsuFixedStage;
    },
  };
})(window);
