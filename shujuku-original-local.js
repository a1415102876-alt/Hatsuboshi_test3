const SHUJUKU_ORIGINAL_READY_TIMEOUT_MS = 15000;
const SHUJUKU_ORIGINAL_LOADER_VERSION = '20260803-5';

function getGlobalObject() {
  return typeof window !== 'undefined' ? window : globalThis;
}

function hasPublicApi(api) {
  return Boolean(api
    && typeof api.triggerUpdate === 'function'
    && typeof api.exportTableAsJson === 'function'
    && typeof api.refreshDataAndWorldbook === 'function');
}

function getAccessibleApis(global = getGlobalObject()) {
  const candidates = [];
  try { candidates.push(global.AutoCardUpdaterAPI); } catch (error) {}
  try { candidates.push(global.parent?.AutoCardUpdaterAPI); } catch (error) {}
  try { candidates.push(global.top?.AutoCardUpdaterAPI); } catch (error) {}
  return [...new Set(candidates.filter(Boolean))];
}

async function waitForPublicApi(timeoutMs = SHUJUKU_ORIGINAL_READY_TIMEOUT_MS) {
  const startedAt = Date.now();
  const global = getGlobalObject();
  while (Date.now() - startedAt < timeoutMs) {
    const api = getAccessibleApis(global).find(hasPublicApi);
    if (api) return api;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('shujuku_original_api_unavailable');
}

const global = getGlobalObject();
if (global.HATSU_SHUJUKU_ORIGINAL_LOADER_VERSION !== SHUJUKU_ORIGINAL_LOADER_VERSION) {
  global.HATSU_SHUJUKU_ORIGINAL_LOADER_VERSION = SHUJUKU_ORIGINAL_LOADER_VERSION;
  global.HATSU_SHUJUKU_ORIGINAL_READY = (async () => {
    return await waitForPublicApi();
  })();
}

export { getAccessibleApis, hasPublicApi, waitForPublicApi };
