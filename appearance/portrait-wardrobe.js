(function (global) {
  "use strict";

  const DEFAULT_TRANSFORM = Object.freeze({ scale: 1, offsetX: 0, offsetY: 0 });
  const LIBRARY_URL = "/user/files/hatsu-produce-portrait-library.json";
  const LIBRARY_FILE_NAME = "hatsu-produce-portrait-library.json";
  const MAX_FILE_BYTES = 20 * 1024 * 1024;
  const MAX_PIXELS = 40_000_000;
  const MAX_EDGE = 8192;
  const ALLOWED_MIME_TYPES = new Set(["image/png", "image/webp", "image/jpeg"]);
  const USER_FILE_URL = /^\/user\/files\/[^?#]+$/;

  function finiteNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function normalizeTransform(value) {
    const input = value && typeof value === "object" ? value : {};
    return {
      scale: clamp(finiteNumber(input.scale, DEFAULT_TRANSFORM.scale), 0.5, 2),
      offsetX: clamp(finiteNumber(input.offsetX, DEFAULT_TRANSFORM.offsetX), -100, 100),
      offsetY: clamp(finiteNumber(input.offsetY, DEFAULT_TRANSFORM.offsetY), -100, 100)
    };
  }

  function isValidCharacterKey(value) {
    return value === "producer" || (typeof value === "string" && value.startsWith("idol:") && value.length > 5);
  }

  function normalizeAsset(value, fallbackKey) {
    if (!value || typeof value !== "object") return null;
    const characterKey = typeof value.characterKey === "string" ? value.characterKey : fallbackKey;
    if (!isValidCharacterKey(characterKey) || !USER_FILE_URL.test(String(value.url || ""))) return null;
    const assetId = String(value.assetId || "").trim();
    if (!assetId) return null;
    return {
      ...value,
      assetId,
      operationId: String(value.operationId || ""),
      characterKey,
      name: String(value.name || "").slice(0, 120),
      url: String(value.url),
      source: "user",
      transform: normalizeTransform(value.transform),
      archived: value.archived === true
    };
  }

  function normalizeAppearanceState(value) {
    const equipped = {};
    const source = value && typeof value === "object" && value.equipped && typeof value.equipped === "object"
      ? value.equipped
      : {};
    Object.entries(source).forEach(([key, asset]) => {
      if (!isValidCharacterKey(key)) return;
      const normalized = normalizeAsset(asset, key);
      if (normalized && normalized.characterKey === key) equipped[key] = normalized;
    });
    return { schemaVersion: 1, equipped };
  }

  function normalizeLibrary(value) {
    const source = value && typeof value === "object" ? value : {};
    const assets = {};
    const sourceAssets = source.assets && typeof source.assets === "object" ? source.assets : {};
    Object.entries(sourceAssets).forEach(([key, asset]) => {
      const normalized = normalizeAsset(asset, asset?.characterKey);
      if (normalized && normalized.assetId === key) assets[key] = normalized;
    });
    return {
      schemaVersion: 1,
      libraryRevision: Math.max(0, Math.floor(finiteNumber(source.libraryRevision, 0))),
      updatedAt: Math.max(0, finiteNumber(source.updatedAt, 0)),
      assets
    };
  }

  function characterKeyForSpeaker(speaker, producerName, canonicalize, hasIdol) {
    const raw = String(speaker || "").trim();
    if (!raw) return "";
    const producerAliases = new Set(["制作人", "producer", "producer-san", "p", String(producerName || "").trim()]);
    if (producerAliases.has(raw) || producerAliases.has(raw.toLowerCase())) return "producer";
    const canonical = typeof canonicalize === "function" ? canonicalize(raw) : raw;
    return typeof hasIdol === "function" && hasIdol(canonical) ? `idol:${canonical}` : "";
  }

  function validateDecodedImageMeta({ type, size, width, height } = {}) {
    if (!ALLOWED_MIME_TYPES.has(String(type || "").toLowerCase())) return { ok: false, error: "unsupported_type" };
    if (!Number.isFinite(size) || size < 0 || size > MAX_FILE_BYTES) return { ok: false, error: "file_too_large" };
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return { ok: false, error: "decode_failed" };
    if (width > MAX_EDGE || height > MAX_EDGE) return { ok: false, error: "edge_too_large" };
    if (width * height > MAX_PIXELS) return { ok: false, error: "pixel_count_too_large" };
    return { ok: true };
  }

  function mergeLibraryAsset(library, asset, now = Date.now()) {
    const normalizedLibrary = normalizeLibrary(library);
    const normalizedAsset = normalizeAsset(asset, asset?.characterKey);
    if (!normalizedAsset) return normalizedLibrary;
    const previous = normalizedLibrary.assets[normalizedAsset.assetId];
    return {
      ...normalizedLibrary,
      libraryRevision: normalizedLibrary.libraryRevision + 1,
      updatedAt: now,
      assets: {
        ...normalizedLibrary.assets,
        [normalizedAsset.assetId]: {
          ...normalizedAsset,
          createdAt: finiteNumber(previous?.createdAt, now),
          updatedAt: now
        }
      }
    };
  }

  function archiveLibraryAsset(library, assetId, now = Date.now()) {
    const normalizedLibrary = normalizeLibrary(library);
    const existing = normalizedLibrary.assets[assetId];
    if (!existing) return normalizedLibrary;
    return {
      ...normalizedLibrary,
      libraryRevision: normalizedLibrary.libraryRevision + 1,
      updatedAt: now,
      assets: {
        ...normalizedLibrary.assets,
        [assetId]: { ...existing, archived: true, updatedAt: now }
      }
    };
  }

  function resolvePortrait(characterKey, appearance, builtins, invalidUrls = new Set()) {
    const fallbackUrl = builtins && typeof builtins[characterKey] === "string" ? builtins[characterKey] : "";
    const equipped = normalizeAppearanceState(appearance).equipped[characterKey];
    if (equipped && !invalidUrls.has(equipped.url)) return { ...equipped, fallbackUrl };
    return { characterKey, url: fallbackUrl, fallbackUrl, source: "builtin", transform: { ...DEFAULT_TRANSFORM } };
  }

  function createOperationId(now = Date.now(), random = Math.random()) {
    const timePart = Math.max(0, Math.floor(Number(now) || 0)).toString(36);
    const randomPart = Math.floor(clamp(Number(random) || 0, 0, 0.999999999999) * 0x100000000).toString(36);
    return `${timePart}-${randomPart}`;
  }

  function createAssetId(operationId) {
    return `portrait:${operationId}`;
  }

  function createUploadFileName(operationId, mimeType) {
    const extension = mimeType === "image/jpeg" ? "jpg" : mimeType === "image/webp" ? "webp" : "png";
    const safeId = String(operationId || "").toLowerCase().replace(/[^a-z0-9-]/g, "-");
    return `hatsu-portrait-${safeId}.${extension}`;
  }

  global.HatsuPortraits = Object.freeze({
    DEFAULT_TRANSFORM,
    LIBRARY_URL,
    LIBRARY_FILE_NAME,
    MAX_FILE_BYTES,
    MAX_PIXELS,
    MAX_EDGE,
    characterKeyForSpeaker,
    normalizeTransform,
    normalizeAppearanceState,
    normalizeLibrary,
    validateDecodedImageMeta,
    mergeLibraryAsset,
    archiveLibraryAsset,
    resolvePortrait,
    createOperationId,
    createAssetId,
    createUploadFileName
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
