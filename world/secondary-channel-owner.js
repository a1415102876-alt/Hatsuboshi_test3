(function (global) {
  "use strict";

  const ALLOWED_KINDS = new Set(["world", "daily", "tier", "test", "director"]);

  function normalizeSecondaryOwner(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const owner = {
      jobId: String(value.jobId || "").trim(),
      requestId: String(value.requestId || "").trim(),
      kind: String(value.kind || "").trim(),
      saveScope: String(value.saveScope || "").trim(),
      acquiredAt: Number(value.acquiredAt)
    };
    if (
      !owner.jobId
      || !owner.requestId
      || !ALLOWED_KINDS.has(owner.kind)
      || !owner.saveScope
      || !Number.isFinite(owner.acquiredAt)
      || owner.acquiredAt < 0
    ) return null;
    return owner;
  }

  function isSecondaryOwnerMatch(owner, identity) {
    const current = normalizeSecondaryOwner(owner);
    if (!current || !identity || typeof identity !== "object") return false;
    return current.jobId === String(identity.jobId || "")
      && current.requestId === String(identity.requestId || "")
      && current.saveScope === String(identity.saveScope || "")
      && (!identity.kind || current.kind === String(identity.kind));
  }

  function acquireSecondaryOwner(currentOwner, intent) {
    const current = normalizeSecondaryOwner(currentOwner);
    if (current) return { acquired: false, owner: current, reason: "secondary_busy" };
    const owner = normalizeSecondaryOwner(intent);
    if (!owner) return { acquired: false, owner: null, reason: "invalid_secondary_intent" };
    return { acquired: true, owner, reason: "" };
  }

  function releaseSecondaryOwner(currentOwner, identity) {
    const current = normalizeSecondaryOwner(currentOwner);
    if (!current || !isSecondaryOwnerMatch(current, identity)) {
      return { released: false, owner: current, reason: "secondary_owner_mismatch" };
    }
    return { released: true, owner: null, reason: "" };
  }

  function isSecondaryOwnerTimedOut(owner, now, timeoutMs) {
    const current = normalizeSecondaryOwner(owner);
    const timestamp = Number(now);
    const timeout = Number(timeoutMs);
    return Boolean(current && Number.isFinite(timestamp) && Number.isFinite(timeout) && timeout >= 0 && timestamp - current.acquiredAt >= timeout);
  }

  global.HatsuWorld = global.HatsuWorld || {};
  global.HatsuWorld.secondaryChannelOwner = {
    normalizeSecondaryOwner,
    isSecondaryOwnerMatch,
    acquireSecondaryOwner,
    releaseSecondaryOwner,
    isSecondaryOwnerTimedOut
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
