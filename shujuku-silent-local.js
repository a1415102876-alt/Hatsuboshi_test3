const SHUJUKU_SPV37_URL = 'https://gcore.jsdelivr.net/gh/AlbusKen/shujuku@spv3.7/index.js';
const ACU_INSTANCE_FLAG = '__ACU_STAR_DB_III_LOADED__';
const CORE_READY_TIMEOUT_MS = 10000;

function buildSilentApiInjection() {
  return `
    let hatsuExternalCommitStatus = null;
    api.__hatsuSilentOwnerWindow = window;
    api.isExternalGenerationReady = function() {
      return Boolean(coreApisAreReady_ACU && SillyTavern_API_ACU && TavernHelper_API_ACU);
    };
    api.getLastExternalCommitStatus = function() {
      return hatsuExternalCommitStatus ? { ...hatsuExternalCommitStatus } : null;
    };

    api.prepareExternalGeneration = async function(input) {
      input = input && typeof input === 'object' ? input : {};
      const messageId = Number(input.userMessageId);
      const chat = SillyTavern_API_ACU?.chat;
      const message = Array.isArray(chat) && Number.isInteger(messageId) ? chat[messageId] : null;
      if (!message || message.is_user !== true) {
        throw new Error('shujuku_external_user_missing');
      }
      const result = await orchestrateAfterCommandsStrategy1_ACU(
        message,
        messageId,
        runOptimizationLogicWithUI_ACU
      );
      if (result?.action === 'aborted' || result?.action === 'loop_retry') {
        throw new Error('shujuku_external_planning_' + result.action);
      }
      const prompt = String(
        result?.action === 'planned'
          ? result.finalMessage
          : input.prompt || message.mes || ''
      ).trim();
      if (!prompt) throw new Error('shujuku_external_prompt_empty');
      message.mes = prompt;
      await saveChatToHost_ACU();
      return { prompt: prompt };
    };

    api.commitExternalAssistant = async function(input) {
      input = input && typeof input === 'object' ? input : {};
      const messageId = Number(input.assistantMessageId);
      const chat = SillyTavern_API_ACU?.chat;
      const message = Array.isArray(chat) && Number.isInteger(messageId) ? chat[messageId] : null;
      if (!message || message.is_user === true) {
        throw new Error('shujuku_external_assistant_missing');
      }
      await saveChatToHost_ACU();
      await loadAllChatMessages_ACU();
      const liveChat = getChatArray_ACU();
      const updateDecision = evaluateNewMessageAction_ACU(
        liveChat,
        isAutoUpdatingCard_ACU,
        coreApisAreReady_ACU,
        wasStoppedByUser_ACU,
        settings_ACU.contentOptimizationSettings
      );
      const updatePreCheck = checkAutoUpdatePreConditions_ACU(
        settings_ACU,
        coreApisAreReady_ACU,
        isAutoUpdatingCard_ACU,
        currentJsonTableData_ACU,
        allChatMessages_ACU.length
      );
      const updatePlan = updatePreCheck.canProceed
        ? buildAutoUpdatePlan_ACU(
          liveChat,
          currentJsonTableData_ACU,
          settings_ACU,
          getCurrentIsolationKey_ACU()
        )
        : { tablesToUpdate: [] };
      hatsuExternalCommitStatus = {
        assistantMessageId: messageId,
        action: String(updateDecision?.action || 'unknown'),
        reason: String(updateDecision?.reason || ''),
        chatLength: Array.isArray(liveChat) ? liveChat.length : 0,
        loadedChatLength: allChatMessages_ACU.length,
        autoUpdateEnabled: settings_ACU.autoUpdateEnabled === true,
        apiMode: String(settings_ACU.apiMode || ''),
        preCheckCanProceed: updatePreCheck.canProceed === true,
        preCheckReason: String(updatePreCheck.reason || ''),
        plannedTableCount: Array.isArray(updatePlan.tablesToUpdate)
          ? updatePlan.tablesToUpdate.length
          : 0,
        completed: false
      };
      if (updateDecision?.action === 'skip') {
        console.warn('[Hatsu Shujuku Silent] database update skipped:', updateDecision.reason);
        hatsuExternalCommitStatus.completed = true;
        return { ok: true, assistantMessageId: messageId, update: { ...hatsuExternalCommitStatus } };
      }
      if (!updatePreCheck.canProceed || hatsuExternalCommitStatus.plannedTableCount === 0) {
        console.warn('[Hatsu Shujuku Silent] database update preflight:', hatsuExternalCommitStatus);
      }
      try {
        if (updateDecision.action === 'optimize_parallel') {
          await Promise.all([
            executeContentOptimization_ACU(updateDecision.lastMessageIndex),
            triggerAutomaticUpdateIfNeeded_ACU()
          ]);
        } else if (updateDecision.action === 'optimize_manual') {
          await executeContentOptimization_ACU(updateDecision.lastMessageIndex);
        } else if (updateDecision.action === 'optimize_then_update') {
          await executeContentOptimization_ACU(updateDecision.lastMessageIndex);
          await triggerAutomaticUpdateIfNeeded_ACU();
        } else {
          await triggerAutomaticUpdateIfNeeded_ACU();
        }
        hatsuExternalCommitStatus.completed = true;
        return { ok: true, assistantMessageId: messageId, update: { ...hatsuExternalCommitStatus } };
      } catch (error) {
        hatsuExternalCommitStatus.error = String(error?.message || error || 'database_update_failed');
        throw error;
      }
    };
  `;
}

function patchShujukuSource(sourceText) {
  const source = String(sourceText || '');
  const anchor = 'apiRef = api;';
  const anchorIndex = source.indexOf(anchor);
  if (anchorIndex < 0) throw new Error('shujuku_spv37_api_anchor_missing');
  return source.slice(0, anchorIndex)
    + buildSilentApiInjection()
    + source.slice(anchorIndex);
}

function getHostAutoCardUpdaterApi() {
  const candidates = [];
  try { candidates.push(window.AutoCardUpdaterAPI); } catch (error) {}
  try { candidates.push(window.parent?.AutoCardUpdaterAPI); } catch (error) {}
  try { candidates.push(window.top?.AutoCardUpdaterAPI); } catch (error) {}
  return candidates.find((api) => api && typeof api === 'object') || null;
}

function isReusableSilentApi(api, currentWindow) {
  return Boolean(api
    && typeof api.prepareExternalGeneration === 'function'
    && typeof api.commitExternalAssistant === 'function'
    && api.__hatsuSilentOwnerWindow === currentWindow);
}

function getAccessibleWindows() {
  const candidates = [window];
  try { candidates.push(window.parent); } catch (error) {}
  try { candidates.push(window.top); } catch (error) {}
  return [...new Set(candidates.filter(Boolean))];
}

function clearStaleSilentApi(api) {
  for (const candidate of getAccessibleWindows()) {
    try {
      if (candidate.AutoCardUpdaterAPI === api) delete candidate.AutoCardUpdaterAPI;
      delete candidate[ACU_INSTANCE_FLAG];
    } catch (error) {}
  }
}

async function waitForSilentBridgeReady(timeoutMs = CORE_READY_TIMEOUT_MS) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (window.HatsuShujukuSilentBridge?.isAvailable?.()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('shujuku_core_api_unavailable');
}

async function installLocalShujukuSilent() {
  const existingApi = getHostAutoCardUpdaterApi();
  if (existingApi) {
    if (typeof existingApi.prepareExternalGeneration !== 'function'
        || typeof existingApi.commitExternalAssistant !== 'function') {
      throw new Error('shujuku_already_loaded_without_silent_api');
    }
    if (!isReusableSilentApi(existingApi, window)) clearStaleSilentApi(existingApi);
  }
  if (!isReusableSilentApi(getHostAutoCardUpdaterApi(), window)) {
    const response = await fetch(SHUJUKU_SPV37_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`shujuku_source_http_${response.status}`);
    const patchedSource = patchShujukuSource(await response.text());
    new Function(`${patchedSource}\n//# sourceURL=shujuku-spv3.7-silent.js`)();
  }
  await import(new URL('./shujuku-silent-bridge.js?v=20260803-4', import.meta.url).href);
  await waitForSilentBridgeReady();
}

window.HATSU_SHUJUKU_SILENT_READY = installLocalShujukuSilent();

export { buildSilentApiInjection, isReusableSilentApi, patchShujukuSource };
