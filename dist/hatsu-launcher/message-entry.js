(function mountHatsuMessageLauncher() {
  "use strict";

  const CONTROLLER_KEY = "__hatsuPersistentLauncherV3";
  const PREVIOUS_CONTROLLER_KEYS = ["__hatsuPersistentLauncherV2", "__hatsuPersistentLauncherV1"];
  const SHELL_ID = "hatsu-persistent-game-shell";
  const FRAME_ID = "hatsu-persistent-game-frame";
  const EXIT_ID = "hatsu-persistent-game-exit";
  const TOGGLE_ID = "hatsu-persistent-game-toggle";
  const LEGACY_FRAME_ID = "hatsu-produce-persistent-frame";
  const DEFAULT_FRONTEND_URL = "http://127.0.0.1:8000/hatsu-produce-local/st.html";
  const DRAG_THRESHOLD_PX = 6;
  const VIEWPORT_MARGIN_PX = 8;
  const TOGGLE_SIZE_PX = 44;

  const entryButton = document.getElementById("hatsu-launcher-start-btn");
  const entryStatus = document.getElementById("hatsu-launcher-status");
  const config = window.HatsuMessageLauncherConfig || {};
  const frontendUrl = String(config.frontendUrl || DEFAULT_FRONTEND_URL);

  function getAccessibleHostWindow() {
    const candidates = [window.top, window.parent];
    for (const candidate of candidates) {
      if (!candidate || candidate === window) continue;
      try {
        if (candidate.document?.body && candidate.document?.createElement) return candidate;
      } catch (error) {
        // Cross-origin candidates are not valid SillyTavern hosts for this launcher.
      }
    }
    return null;
  }

  function setStyles(element, styles) {
    Object.assign(element.style, styles);
  }

  function createController(hostWindow) {
    if (hostWindow[CONTROLLER_KEY]) return hostWindow[CONTROLLER_KEY];

    const hostDocument = hostWindow.document;
    let shell = null;
    let frame = null;
    let toggleButton = null;
    let ignoreNextPointerClick = false;
    const dragState = {
      pointerId: null,
      startX: 0,
      startY: 0,
      moved: false
    };


    function bindExitButton(exitButton) {
      if (!exitButton) return;
      exitButton.hidden = true;
      exitButton.style.display = "none";
      exitButton.setAttribute("aria-hidden", "true");
      if (exitButton.__hatsuPersistentLauncherV3Bound) return;
      exitButton.__hatsuPersistentLauncherV3Bound = true;
      exitButton.addEventListener("click", () => controller.hide());
    }

    const statusListeners = new Set();

    function syncToggleState() {
      if (!toggleButton) return;
      const isVisible = controller.getStatus() === "visible";
      const label = isVisible ? "\u6536\u8d77\u6e38\u620f" : "\u5c55\u5f00\u6e38\u620f";
      toggleButton.textContent = isVisible ? "\u2212" : "+";
      toggleButton.title = label;
      toggleButton.setAttribute("aria-label", label);
    }

    function clamp(value, minimum, maximum) {
      return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
    }

    function setTogglePosition(left, top) {
      if (!toggleButton) return;
      const maxLeft = Number(hostWindow.innerWidth || 0) - TOGGLE_SIZE_PX - VIEWPORT_MARGIN_PX;
      const maxTop = Number(hostWindow.innerHeight || 0) - TOGGLE_SIZE_PX - VIEWPORT_MARGIN_PX;
      toggleButton.style.right = "auto";
      toggleButton.style.transform = "none";
      toggleButton.style.left = `${clamp(left, VIEWPORT_MARGIN_PX, maxLeft)}px`;
      toggleButton.style.top = `${clamp(top, VIEWPORT_MARGIN_PX, maxTop)}px`;
    }

    function clampToggleToViewport() {
      if (!toggleButton) return;
      const bounds = toggleButton.getBoundingClientRect();
      setTogglePosition(bounds.left, bounds.top);
    }

    function resetDragState() {
      dragState.pointerId = null;
      dragState.moved = false;
    }

    function bindToggleGestures(button) {
      if (button.__hatsuPersistentLauncherV3GesturesBound) return;
      button.__hatsuPersistentLauncherV3GesturesBound = true;

      button.addEventListener("pointerdown", (event) => {
        if (event.button !== undefined && event.button !== 0) return;
        ignoreNextPointerClick = false;
        dragState.pointerId = event.pointerId;
        dragState.startX = event.clientX;
        dragState.startY = event.clientY;
        dragState.moved = false;
        button.setPointerCapture?.(event.pointerId);
        event.preventDefault?.();
      });

      button.addEventListener("pointermove", (event) => {
        if (dragState.pointerId !== event.pointerId) return;
        const deltaX = event.clientX - dragState.startX;
        const deltaY = event.clientY - dragState.startY;
        if (!dragState.moved && Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD_PX) return;
        dragState.moved = true;
        setTogglePosition(
          event.clientX - TOGGLE_SIZE_PX / 2,
          event.clientY - TOGGLE_SIZE_PX / 2
        );
        event.preventDefault?.();
      });

      button.addEventListener("pointerup", (event) => {
        if (dragState.pointerId !== event.pointerId) return;
        const shouldToggle = !dragState.moved;
        button.releasePointerCapture?.(event.pointerId);
        ignoreNextPointerClick = true;
        resetDragState();
        if (shouldToggle) controller.toggle();
        event.preventDefault?.();
      });

      button.addEventListener("pointercancel", (event) => {
        if (dragState.pointerId !== event.pointerId) return;
        button.releasePointerCapture?.(event.pointerId);
        resetDragState();
      });

      button.addEventListener("click", (event) => {
        if (event.detail > 0 && ignoreNextPointerClick) {
          ignoreNextPointerClick = false;
          return;
        }
        controller.toggle();
      });

      hostWindow.addEventListener?.("resize", clampToggleToViewport);
    }

    function ensureToggle() {
      toggleButton = hostDocument.getElementById(TOGGLE_ID);
      if (!toggleButton) {
        toggleButton = hostDocument.createElement("button");
        toggleButton.id = TOGGLE_ID;
        toggleButton.type = "button";
        toggleButton.hidden = true;
        setStyles(toggleButton, {
          position: "fixed",
          width: `${TOGGLE_SIZE_PX}px`,
          height: `${TOGGLE_SIZE_PX}px`,
          padding: "0",
          border: "1px solid rgba(255, 255, 255, 0.38)",
          borderRadius: "50%",
          background: "#f7c948",
          color: "#20262d",
          font: "700 24px/1 system-ui, sans-serif",
          cursor: "pointer",
          boxShadow: "0 5px 18px rgba(0, 0, 0, 0.42)",
          zIndex: "1000001",
          touchAction: "none"
        });
        hostDocument.body.appendChild(toggleButton);
        setTogglePosition(
          Number(hostWindow.innerWidth || 0) - TOGGLE_SIZE_PX - 12,
          (Number(hostWindow.innerHeight || 0) - TOGGLE_SIZE_PX) / 2
        );
      }
      if (!toggleButton.__hatsuPersistentLauncherV3Bound) {
        toggleButton.__hatsuPersistentLauncherV3Bound = true;
        bindToggleGestures(toggleButton);
      }
      syncToggleState();
      return toggleButton;
    }

    function ensureShell() {
      const legacyFrame = hostDocument.getElementById(LEGACY_FRAME_ID);
      if (legacyFrame) {
        legacyFrame.hidden = true;
        legacyFrame.style.display = "none";
        legacyFrame.setAttribute("aria-hidden", "true");
      }

      if (shell && frame) {
        ensureToggle();
        return { shell, frame };
      }

      shell = hostDocument.getElementById(SHELL_ID);
      frame = hostDocument.getElementById(FRAME_ID);
      if (shell && frame) {
        bindExitButton(hostDocument.getElementById(EXIT_ID));
        ensureToggle();
        return { shell, frame };
      }

      shell = hostDocument.createElement("section");
      shell.id = SHELL_ID;
      shell.hidden = true;
      shell.setAttribute("aria-label", "初星学园游戏界面");
      setStyles(shell, {
        position: "fixed",
        inset: "0",
        width: "100vw",
        height: "100vh",
        zIndex: "999999",
        background: "#101016"
      });

      const exitButton = hostDocument.createElement("button");
      exitButton.id = EXIT_ID;
      exitButton.type = "button";
      exitButton.textContent = "退出游戏";
      exitButton.setAttribute("aria-label", "隐藏初星学园并返回聊天");
      setStyles(exitButton, {
        position: "absolute",
        top: "max(12px, env(safe-area-inset-top))",
        right: "max(12px, env(safe-area-inset-right))",
        zIndex: "2",
        minHeight: "36px",
        padding: "0 14px",
        border: "1px solid rgba(255, 255, 255, 0.24)",
        borderRadius: "8px",
        background: "rgba(18, 20, 28, 0.82)",
        color: "#ffffff",
        font: "600 13px system-ui, sans-serif",
        cursor: "pointer"
      });

      frame = hostDocument.createElement("iframe");
      frame.id = FRAME_ID;
      frame.title = "初星学园";
      frame.src = frontendUrl;
      frame.setAttribute("allow", "autoplay; clipboard-read; clipboard-write");
      setStyles(frame, {
        display: "block",
        width: "100%",
        height: "100%",
        border: "0",
        background: "#101016"
      });

      bindExitButton(exitButton);
      shell.appendChild(frame);
      shell.appendChild(exitButton);
      hostDocument.body.appendChild(shell);
      ensureToggle();
      return { shell, frame };
    }

    function notifyStatus() {
      const status = controller.getStatus();
      for (const listener of statusListeners) {
        try {
          listener(status);
        } catch (error) {
          statusListeners.delete(listener);
        }
      }
    }

    const controller = {
      open() {
        const mounted = ensureShell();
        mounted.shell.hidden = false;
        ensureToggle().hidden = false;
        syncToggleState();
        notifyStatus();
        return mounted.frame;
      },
      hide() {
        const currentShell = shell || hostDocument.getElementById(SHELL_ID);
        if (currentShell) {
          currentShell.hidden = true;
          ensureToggle().hidden = false;
          syncToggleState();
          notifyStatus();
        }
      },
      toggle() {
        const currentShell = shell || hostDocument.getElementById(SHELL_ID);
        if (!currentShell || currentShell.hidden) return controller.open();
        controller.hide();
        return frame;
      },
      getStatus() {
        const currentShell = shell || hostDocument.getElementById(SHELL_ID);
        if (!currentShell) return "not_started";
        return currentShell.hidden ? "hidden" : "visible";
      },
      subscribe(listener) {
        if (typeof listener !== "function") return () => {};
        statusListeners.add(listener);
        listener(controller.getStatus());
        return () => statusListeners.delete(listener);
      }
    };

    hostWindow[CONTROLLER_KEY] = controller;
    return controller;
  }

  function renderEntryStatus(controller, currentStatus) {
    if (!entryStatus || !entryButton) return;
    const status = currentStatus || controller.getStatus();
    if (status === "visible") {
      entryStatus.textContent = "游戏已打开";
      entryButton.textContent = "返回游戏";
      return;
    }
    if (status === "hidden") {
      entryStatus.textContent = "游戏正在后台运行";
      entryButton.textContent = "继续游戏";
      return;
    }
    entryStatus.textContent = "尚未启动";
    entryButton.textContent = "启动游戏";
  }

  const hostWindow = getAccessibleHostWindow();
  if (!hostWindow) {
    if (entryStatus) entryStatus.textContent = "请在 SillyTavern 消息楼层中启动";
    if (entryButton) entryButton.disabled = true;
    return;
  }

  const controller = createController(hostWindow);
  const unsubscribe = controller.subscribe((status) => renderEntryStatus(controller, status));
  if (typeof window.addEventListener === "function") {
    const cleanup = () => unsubscribe();
    window.addEventListener("pagehide", cleanup, { once: true });
    window.addEventListener("beforeunload", cleanup, { once: true });
  }
  entryButton?.addEventListener("click", () => {
    controller.open();
  });
})();
