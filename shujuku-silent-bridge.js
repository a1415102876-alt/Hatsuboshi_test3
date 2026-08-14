(function installHatsuShujukuSilentBridge(global) {
  'use strict';

  function getApi() {
    const candidates = [];
    try { candidates.push(global.AutoCardUpdaterAPI); } catch (error) {}
    try { candidates.push(global.parent?.AutoCardUpdaterAPI); } catch (error) {}
    try { candidates.push(global.top?.AutoCardUpdaterAPI); } catch (error) {}
    return candidates.find((api) => api && typeof api === 'object') || null;
  }

  function isAvailable() {
    const api = getApi();
    return Boolean(api
      && typeof api.prepareExternalGeneration === 'function'
      && typeof api.commitExternalAssistant === 'function'
      && (typeof api.isExternalGenerationReady !== 'function'
        || api.isExternalGenerationReady()));
  }

  async function prepareExternalGeneration(input) {
    const api = getApi();
    if (!api || typeof api.prepareExternalGeneration !== 'function') {
      throw new Error('shujuku_external_prepare_unavailable');
    }
    const envelope = input?.envelope || {};
    const attempt = input?.attempt || {};
    const result = await api.prepareExternalGeneration({
      requestId: String(envelope.requestId || ''),
      saveScope: String(envelope.saveScope || ''),
      attemptKey: String(attempt.attemptKey || ''),
      userMessageId: Number(attempt.userMessageId),
      prompt: String(envelope.prompt || '')
    });
    const prompt = String(result?.prompt || result || '').trim();
    if (!prompt) throw new Error('shujuku_external_prompt_empty');
    return { prompt };
  }

  async function commitExternalAssistant(input) {
    const api = getApi();
    if (!api || typeof api.commitExternalAssistant !== 'function') {
      throw new Error('shujuku_external_commit_unavailable');
    }
    return api.commitExternalAssistant({
      requestId: String(input?.envelope?.requestId || ''),
      saveScope: String(input?.envelope?.saveScope || ''),
      attemptKey: String(input?.attempt?.attemptKey || ''),
      assistantMessageId: Number(input?.assistantMessageId),
      text: String(input?.text || '')
    });
  }

  global.HatsuShujukuSilentBridge = {
    isAvailable,
    prepareExternalGeneration,
    commitExternalAssistant
  };
})(typeof window !== 'undefined' ? window : globalThis);
