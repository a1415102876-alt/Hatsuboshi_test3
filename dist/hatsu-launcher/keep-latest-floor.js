(() => {
  const KEY = "__hatsuKeepLatestFloor";
  if (window[KEY]?.active) return;

  const config = {
    hardRemove: false,
    debounceMs: 120,
    reloadOnChatChanged: true,
    debug: false,
    ...(window.HatsuKeepLatestConfig || {})
  };

  const state = {
    active: true,
    timer: 0,
    observer: null,
    currentChatId: "",
    styleInjected: false
  };
  window[KEY] = state;

  const log = (...args) => {
    if (!config.debug) return;
    console.log("[Hatsu KeepLatest]", ...args);
  };

  const ensureStyle = () => {
    if (config.hardRemove || state.styleInjected) return;
    const styleId = "hatsu-keep-latest-style";
    if (document.getElementById(styleId)) {
      state.styleInjected = true;
      return;
    }
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      #chat > .mes.hatsu-hidden-floor {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
    state.styleInjected = true;
  };

  const getFloors = () => $("#chat > .mes");

  const keepLatestFloor = () => {
    const floors = getFloors();
    if (!floors.length) return;
    const latest = floors.last();

    if (config.hardRemove) {
      floors.not(latest).remove();
      return;
    }

    floors.addClass("hatsu-hidden-floor");
    latest.removeClass("hatsu-hidden-floor");
  };

  const scheduleKeepLatest = (reason = "unknown") => {
    if (!state.active) return;
    if (state.timer) window.clearTimeout(state.timer);
    state.timer = window.setTimeout(() => {
      state.timer = 0;
      ensureStyle();
      keepLatestFloor();
      log("updated by", reason);
    }, Math.max(0, Number(config.debounceMs) || 0));
  };

  const bindMutationObserver = () => {
    const chat = document.getElementById("chat");
    if (!chat || state.observer) return;
    state.observer = new MutationObserver(() => scheduleKeepLatest("mutation"));
    state.observer.observe(chat, { childList: true, subtree: false });
  };

  const bindChatChanged = () => {
    if (typeof eventOn !== "function" || !window.tavern_events?.CHAT_CHANGED) return;
    state.currentChatId = String(window.SillyTavern?.getCurrentChatId?.() || "");
    eventOn(window.tavern_events.CHAT_CHANGED, (chatId) => {
      const nextId = String(chatId || "");
      if (nextId === state.currentChatId) return;
      state.currentChatId = nextId;
      scheduleKeepLatest("chat_changed");
      if (config.reloadOnChatChanged && typeof window.reloadIframe === "function") {
        try {
          window.reloadIframe();
        } catch (error) {
          log("reloadIframe failed", error);
        }
      }
    });
  };

  const start = () => {
    ensureStyle();
    scheduleKeepLatest("startup");
    bindMutationObserver();
    bindChatChanged();
    log("started", config);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
