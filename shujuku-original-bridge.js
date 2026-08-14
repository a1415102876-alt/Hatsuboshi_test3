(function installHatsuShujukuOriginalBridge(global) {
  'use strict';

  let lastDiagnostics = null;
  const AUTO_UPDATE_SETTLE_DELAY_MS = 2600;
  const BUSY_UPDATE_RETRY_DELAY_MS = 2200;

  function getApi() {
    const candidates = [];
    try { candidates.push(global.AutoCardUpdaterAPI); } catch (error) {}
    try { candidates.push(global.parent?.AutoCardUpdaterAPI); } catch (error) {}
    try { candidates.push(global.top?.AutoCardUpdaterAPI); } catch (error) {}
    return candidates.find((api) => api && typeof api.triggerUpdate === 'function') || null;
  }

  function tableCount(data) {
    return Object.keys(data && typeof data === 'object' ? data : {})
      .filter((key) => key.startsWith('sheet_')).length;
  }

  function snapshot(api) {
    let tables = {};
    try { tables = api?.exportTableAsJson?.() || {}; } catch (error) {}
    let chatLength = null;
    try {
      const chat = global.parent?.SillyTavern_API_ACU?.chat || global.SillyTavern_API_ACU?.chat;
      chatLength = Array.isArray(chat) ? chat.length : null;
    } catch (error) {}
    let tableDigest = '';
    try { tableDigest = JSON.stringify(tables); } catch (error) {}
    return { tableCount: tableCount(tables), tableDigest, chatLength };
  }

  function isAvailable() {
    const api = getApi();
    return Boolean(api
      && typeof api.triggerUpdate === 'function'
      && typeof api.exportTableAsJson === 'function'
      && typeof api.refreshDataAndWorldbook === 'function');
  }

  async function commitExternalAssistant(input = {}) {
    const api = getApi();
    if (!isAvailable()) throw new Error('shujuku_original_api_unavailable');
    const before = snapshot(api);
    const startedAt = Date.now();
    let triggerResult = null;
    let errorCode = '';
    try {
      const settleDelay = Number.isFinite(Number(input.settleDelayMs))
        ? Math.max(0, Number(input.settleDelayMs))
        : AUTO_UPDATE_SETTLE_DELAY_MS;
      await new Promise((resolve) => setTimeout(resolve, settleDelay));
      const settled = snapshot(api);
      if (settled.tableDigest !== before.tableDigest) {
        lastDiagnostics = {
          tableCountBefore: before.tableCount,
          tableCountAfter: settled.tableCount,
          chatLengthBefore: before.chatLength,
          chatLengthAfter: settled.chatLength,
          assistantMessageId: Number.isInteger(Number(input.assistantMessageId)) ? Number(input.assistantMessageId) : null,
          triggerResult: 'automatic_update_detected',
          floorRefreshDetected: before.chatLength != null && settled.chatLength !== before.chatLength,
          iframeDisconnected: false,
          completed: true,
          durationMs: Math.max(0, Date.now() - startedAt),
          error: ''
        };
        return { ok: true, skipped: true, diagnostics: { ...lastDiagnostics } };
      }
      triggerResult = await api.triggerUpdate();
      if (triggerResult === false) {
        const retryDelay = Number.isFinite(Number(input.busyRetryDelayMs))
          ? Math.max(0, Number(input.busyRetryDelayMs))
          : BUSY_UPDATE_RETRY_DELAY_MS;
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        const retrySnapshot = snapshot(api);
        if (retrySnapshot.tableDigest === before.tableDigest) {
          triggerResult = await api.triggerUpdate();
        } else {
          triggerResult = 'automatic_update_detected_after_busy';
        }
      }
    } catch (error) {
      errorCode = String(error?.code || error?.message || 'trigger_update_failed').slice(0, 160);
      throw error;
    } finally {
      const after = snapshot(api);
      lastDiagnostics = {
        tableCountBefore: before.tableCount,
        tableCountAfter: after.tableCount,
        chatLengthBefore: before.chatLength,
        chatLengthAfter: after.chatLength,
        assistantMessageId: Number.isInteger(Number(input.assistantMessageId)) ? Number(input.assistantMessageId) : null,
        triggerResult: triggerResult == null ? null : typeof triggerResult,
        floorRefreshDetected: before.chatLength != null && after.chatLength !== before.chatLength,
        iframeDisconnected: false,
        completed: !errorCode,
        durationMs: Math.max(0, Date.now() - startedAt),
        error: errorCode
      };
    }
    return { ok: true, diagnostics: { ...lastDiagnostics } };
  }

  function getLastCommitDiagnostics() {
    return lastDiagnostics ? { ...lastDiagnostics } : null;
  }

  global.HatsuShujukuOriginalBridge = { isAvailable, commitExternalAssistant, getLastCommitDiagnostics };
})(typeof window !== 'undefined' ? window : globalThis);
