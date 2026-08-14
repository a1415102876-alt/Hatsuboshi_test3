(function (global) {
  "use strict";

  function extractLastCompleteTag(source, tagName) {
    const text = String(source || "");
    const tag = String(tagName || "").trim();
    if (!tag) return { ok: false, reason: "tag_missing", content: "" };
    const openRe = new RegExp("<" + tag + "\\b[^>]*>", "gi");
    const closeRe = new RegExp("</" + tag + ">", "gi");
    const opens = [...text.matchAll(openRe)];
    const closes = [...text.matchAll(closeRe)];
    for (let i = closes.length - 1; i >= 0; i -= 1) {
      const close = closes[i];
      const open = opens.filter((candidate) => candidate.index < close.index).at(-1);
      if (!open) continue;
      const start = open.index + open[0].length;
      return { ok: true, reason: "ok", content: text.slice(start, close.index), raw: text.slice(open.index, close.index + close[0].length) };
    }
    return { ok: false, reason: opens.length ? "tag_incomplete" : "tag_missing", content: "" };
  }

  function parseLastTableEdit(source) {
    const extracted = extractLastCompleteTag(source, "tableEdit");
    if (!extracted.ok) return { ...extracted, value: null };
    const body = extracted.content.trim();
    if (!body) return { ...extracted, ok: false, reason: "reply_empty", value: null };
    try {
      const value = JSON.parse(body);
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("tableEdit_not_object");
      return { ...extracted, value };
    } catch (error) {
      return { ...extracted, ok: false, reason: "table_edit_parse_failed", value: null, error: String(error?.message || error) };
    }
  }

  function classifyDatabaseFailure(error, source) {
    const message = String(error?.code || error?.message || error || "").toLowerCase();
    if (/429|too many requests|rate.?limit/.test(message)) return "api_rate_limited";
    if (/busy|in.?progress|updater/.test(message)) return "updater_busy";
    if (source != null && !String(source).trim()) return "reply_empty";
    if (source != null && /<tableEdit\b/i.test(String(source))) {
      const parsed = parseLastTableEdit(source);
      if (!parsed.ok) {
        if (parsed.reason === "table_edit_parse_failed") return parsed.reason;
        return "table_edit_" + String(parsed.reason || "invalid").replace(/^tag_/, "");
      }
    }
    if (source != null && !/<tableEdit\b/i.test(String(source))) return "table_edit_missing";
    if (/ddl|header|column|mismatch/.test(message)) return "ddl_header_mismatch";
    if (/sql|row|insert|update|delete|constraint/.test(message)) return "sql_operation_failed";
    return "database_update_failed";
  }

  global.HatsuShujukuOutputParser = { extractLastCompleteTag, parseLastTableEdit, classifyDatabaseFailure };
})(typeof globalThis !== "undefined" ? globalThis : window);
