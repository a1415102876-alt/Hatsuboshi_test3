(function (global) {
  "use strict";

  const CHRONICLE_ENTRY_COMMENT = "编年史";
  const CHRONICLE_LINE_RE = /^(\d+)\.\s*(.+)$/;
  const MAX_CHRONICLE_SUM_LENGTH = 100;

  function normalizeChronicleSummary(value) {
    const summary = String(value || "").replace(/\s+/g, " ").trim();
    if (Array.from(summary).length > MAX_CHRONICLE_SUM_LENGTH) return "";
    return summary;
  }

  function extractSumText(value) {
    const raw = String(value || "");
    const matches = [...raw.matchAll(/<sum\b[^>]*>([\s\S]*?)<\/sum>/gi)];
    if (!matches.length) return "";
    return normalizeChronicleSummary(matches[matches.length - 1][1]);
  }

  // 兼容两种编号：SillyTavern chat index 常是 0-based（2/4/6...），可见楼层说明常是 1-based（3/5/7...）。
  const DIRECTOR_SIGNAL_KEYS = ["facts", "playerChoices", "observations", "hooksCreated", "hooksResolved"];
  const MAX_DIRECTOR_SIGNAL_ITEMS = 3;
  const MAX_DIRECTOR_SIGNAL_LENGTH = 160;

  function emptyDirectorSignals() {
    return { facts: [], playerChoices: [], observations: [], hooksCreated: [], hooksResolved: [] };
  }

  function summaryOnlyDirectorEvent() {
    return { evidenceQuality: "summary_only", signals: emptyDirectorSignals() };
  }

  function extractDirectorEvent(value) {
    const raw = String(value || "");
    const matches = [...raw.matchAll(/<director_event\b[^>]*>([\s\S]*?)<\/director_event>/gi)];
    if (!matches.length) return summaryOnlyDirectorEvent();
    let parsed;
    try {
      parsed = JSON.parse(matches[matches.length - 1][1]);
    } catch (error) {
      return summaryOnlyDirectorEvent();
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return summaryOnlyDirectorEvent();
    if (Object.keys(parsed).some((key) => !DIRECTOR_SIGNAL_KEYS.includes(key))) return summaryOnlyDirectorEvent();

    const signals = emptyDirectorSignals();
    for (const key of DIRECTOR_SIGNAL_KEYS) {
      const items = parsed[key] === undefined ? [] : parsed[key];
      if (!Array.isArray(items) || items.length > MAX_DIRECTOR_SIGNAL_ITEMS) return summaryOnlyDirectorEvent();
      for (const item of items) {
        const text = String(item || "").replace(/\s+/g, " ").trim();
        if (!text || Array.from(text).length > MAX_DIRECTOR_SIGNAL_LENGTH) return summaryOnlyDirectorEvent();
        if (!signals[key].includes(text)) signals[key].push(text);
      }
    }
    const hasSignals = DIRECTOR_SIGNAL_KEYS.some((key) => signals[key].length > 0);
    return hasSignals ? { evidenceQuality: "structured", signals } : summaryOnlyDirectorEvent();
  }
  function assistantMessageIdToEntryNo(messageId) {
    const id = Number(messageId);
    if (!Number.isInteger(id) || id < 2) return 0;
    if (id % 2 === 0) return id / 2;
    if (id >= 3) return (id - 1) / 2;
    return 0;
  }

  function parseChronicleContent(content) {
    const entries = new Map();
    String(content || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => {
        const match = line.match(CHRONICLE_LINE_RE);
        if (!match) return;
        const no = Number(match[1]);
        const text = String(match[2] || "").trim();
        if (!Number.isInteger(no) || no <= 0 || !text) return;
        entries.set(no, text);
      });
    return entries;
  }

  function formatChronicleContent(entries) {
    return [...entries.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([no, text]) => `${no}. ${text}`)
      .join("\n");
  }

  function upsertChronicleContent(content, entryNo, sumText, options = {}) {
    const no = Number(entryNo);
    const summary = normalizeChronicleSummary(sumText);
    if (!Number.isInteger(no) || no <= 0 || !summary) {
      return String(content || "").trim();
    }
    const entries = parseChronicleContent(content);
    const existed = entries.has(no);
    entries.set(no, summary);
    if (options.pruneAfterReroll !== false && existed) {
      [...entries.keys()].forEach((key) => {
        if (key > no) entries.delete(key);
      });
    }
    return formatChronicleContent(entries);
  }

  function pruneChronicleContentAfter(content, entryNo) {
    const no = Number(entryNo);
    if (!Number.isInteger(no) || no <= 0) return String(content || "").trim();
    const entries = parseChronicleContent(content);
    [...entries.keys()].forEach((key) => {
      if (key > no) entries.delete(key);
    });
    return formatChronicleContent(entries);
  }

  function findChronicleEntryUid(entries) {
    if (!entries || typeof entries !== "object") return null;
    for (const [uid, entry] of Object.entries(entries)) {
      const comment = String(entry?.comment || "").trim();
      if (comment === CHRONICLE_ENTRY_COMMENT) return uid;
      const keys = Array.isArray(entry?.key) ? entry.key.map((item) => String(item).trim()) : [];
      if (keys.includes(CHRONICLE_ENTRY_COMMENT)) return uid;
    }
    return null;
  }

  function buildCheckpointFromMessage(message, fallbackIndex = 0) {
    const messageId = Number.isInteger(message?.message_id)
      ? message.message_id
      : Number.isInteger(message?.mesid)
        ? message.mesid
        : fallbackIndex;
    const role = String(message?.role || "");
    const isAssistant = role === "assistant" || message?.is_user === false;
    if (!isAssistant) return null;
    const text = String(message?.message || message?.mes || message?.content || "");
    const summary = extractSumText(text);
    if (!summary) return null;
    const entryNo = assistantMessageIdToEntryNo(messageId);
    return {
      messageId,
      entryNo,
      summary,
      label: entryNo > 0 ? `节点 ${entryNo}` : `楼层 ${messageId}`
    };
  }

  function buildChronicleEntryTemplate(uid) {
    return {
      uid,
      key: [CHRONICLE_ENTRY_COMMENT],
      keysecondary: [],
      comment: CHRONICLE_ENTRY_COMMENT,
      content: "",
      constant: true,
      vectorized: false,
      selective: false,
      selectiveLogic: 0,
      addMemo: false,
      order: 120,
      position: 0,
      disable: false,
      ignoreBudget: false,
      excludeRecursion: false,
      preventRecursion: false,
      matchPersonaDescription: false,
      matchCharacterDescription: false,
      matchCharacterPersonality: false,
      matchCharacterDepthPrompt: false,
      matchScenario: false,
      matchCreatorNotes: false,
      delayUntilRecursion: 0,
      probability: 100,
      useProbability: true,
      depth: 4,
      outletName: "",
      group: "",
      groupOverride: false,
      groupWeight: 100,
      scanDepth: null,
      caseSensitive: null,
      matchWholeWords: null,
      useGroupScoring: null,
      automationId: "",
      role: 0,
      sticky: null,
      cooldown: null,
      delay: null,
      triggers: []
    };
  }

  function nextWorldInfoEntryUid(entries) {
    const uids = Object.keys(entries || {})
      .map((uid) => Number(uid))
      .filter((uid) => Number.isInteger(uid));
    const maxUid = uids.length ? Math.max(...uids) : 0;
    return maxUid + 1;
  }

  global.HatsuChronicle = {
    CHRONICLE_ENTRY_COMMENT,
    extractSumText,
    extractDirectorEvent,
    assistantMessageIdToEntryNo,
    parseChronicleContent,
    formatChronicleContent,
    upsertChronicleContent,
    pruneChronicleContentAfter,
    findChronicleEntryUid,
    buildCheckpointFromMessage,
    buildChronicleEntryTemplate,
    nextWorldInfoEntryUid
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
