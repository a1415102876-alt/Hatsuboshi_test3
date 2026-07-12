(function mountHatsuMessageLauncher() {
  "use strict";

  const CONTROLLER_KEY = "__hatsuPersistentLauncherV1";
  const SHELL_ID = "hatsu-persistent-game-shell";
  const FRAME_ID = "hatsu-persistent-game-frame";
  const EXIT_ID = "hatsu-persistent-game-exit";
  const DEFAULT_FRONTEND_URL = "http://127.0.0.1:8000/hatsu-produce-local/st.html";

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

    function ensureShell() {
      if (shell && frame) return { shell, frame };

      shell = hostDocument.getElementById(SHELL_ID);
      frame = hostDocument.getElementById(FRAME_ID);
      if (shell && frame) return { shell, frame };

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

      exitButton.addEventListener("click", () => controller.hide());
      shell.appendChild(frame);
      shell.appendChild(exitButton);
      hostDocument.body.appendChild(shell);
      return { shell, frame };
    }

    const controller = {
      open() {
        const mounted = ensureShell();
        mounted.shell.hidden = false;
        return mounted.frame;
      },
      hide() {
        const currentShell = shell || hostDocument.getElementById(SHELL_ID);
        if (currentShell) currentShell.hidden = true;
      },
      getStatus() {
        const currentShell = shell || hostDocument.getElementById(SHELL_ID);
        if (!currentShell) return "not_started";
        return currentShell.hidden ? "hidden" : "visible";
      }
    };

    hostWindow[CONTROLLER_KEY] = controller;
    return controller;
  }

  function renderEntryStatus(controller) {
    if (!entryStatus || !entryButton) return;
    const status = controller.getStatus();
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
  renderEntryStatus(controller);
  entryButton?.addEventListener("click", () => {
    controller.open();
    renderEntryStatus(controller);
  });
})();
