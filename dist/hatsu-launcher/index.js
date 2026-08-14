(function mountHatsuLauncherScript() {
  if (window.__hatsuLauncherScriptMounted) return;
  window.__hatsuLauncherScriptMounted = true;

  const config = window.HatsuLauncherConfig || {};
  const frontendUrl = String(config.frontendUrl || "/hatsu-produce-local/index.html");
  const launcherText = String(config.launcherText || "初");
  const launcherSize = Number(config.launcherSize) > 0 ? Number(config.launcherSize) : 44;
  const zIndexBase = Number.isFinite(Number(config.zIndexBase)) ? Number(config.zIndexBase) : 36000;
  const rightOffset = String(config.rightOffset || "max(14px, env(safe-area-inset-right))");
  const bottomOffset = String(config.bottomOffset || "max(14px, env(safe-area-inset-bottom))");

  const style = document.createElement("style");
  style.id = "hatsu-launcher-script-style";
  style.textContent = `
    #hatsu-launcher-script-btn {
      position: fixed;
      right: ${rightOffset};
      bottom: ${bottomOffset};
      z-index: ${zIndexBase};
      width: ${launcherSize}px;
      height: ${launcherSize}px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.22);
      background: rgba(18, 20, 30, 0.9);
      color: #fff;
      font-size: ${Math.max(14, Math.round(launcherSize * 0.38))}px;
      font-weight: 800;
      line-height: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.32);
      backdrop-filter: blur(8px);
      cursor: pointer;
    }

    #hatsu-launcher-script-panel {
      position: fixed;
      inset: 0;
      z-index: ${zIndexBase - 1};
      background: rgba(8, 10, 18, 0.45);
    }

    #hatsu-launcher-script-panel[hidden] {
      display: none !important;
    }

    #hatsu-launcher-script-controls {
      position: fixed;
      top: max(10px, env(safe-area-inset-top));
      right: ${rightOffset};
      z-index: ${zIndexBase + 1};
      display: flex;
      gap: 8px;
    }

    #hatsu-launcher-script-close-btn {
      min-height: 34px;
      padding: 0 12px;
      border: 1px solid rgba(255, 255, 255, 0.22);
      border-radius: 999px;
      background: rgba(16, 18, 24, 0.76);
      color: #fff;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
    }

    #hatsu-launcher-script-iframe {
      width: 100%;
      height: 100%;
      border: none;
      background: #0f1018;
    }
  `;
  document.head.appendChild(style);

  const launcherBtn = document.createElement("button");
  launcherBtn.id = "hatsu-launcher-script-btn";
  launcherBtn.type = "button";
  launcherBtn.setAttribute("aria-label", "打开初星前端");
  launcherBtn.textContent = launcherText;

  const panel = document.createElement("section");
  panel.id = "hatsu-launcher-script-panel";
  panel.hidden = true;
  panel.innerHTML = `
    <div id="hatsu-launcher-script-controls">
      <button id="hatsu-launcher-script-close-btn" type="button">关闭</button>
    </div>
    <iframe id="hatsu-launcher-script-iframe" title="Hatsuboshi Produce"></iframe>
  `;

  const iframe = panel.querySelector("#hatsu-launcher-script-iframe");
  const closeBtn = panel.querySelector("#hatsu-launcher-script-close-btn");
  let iframeLoaded = false;

  function setOpen(open) {
    panel.hidden = !open;
    launcherBtn.hidden = open;
  }

  launcherBtn.addEventListener("click", () => {
    if (!iframeLoaded && iframe) {
      iframe.src = frontendUrl;
      iframeLoaded = true;
    }
    setOpen(true);
  });

  closeBtn?.addEventListener("click", () => setOpen(false));
  panel.addEventListener("click", (event) => {
    if (event.target === panel) setOpen(false);
  });

  document.body.appendChild(panel);
  document.body.appendChild(launcherBtn);
})();
