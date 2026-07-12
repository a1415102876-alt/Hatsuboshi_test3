import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadPortraitApi() {
  const sandbox = { globalThis: {} };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(
    readFileSync(new URL("appearance/portrait-wardrobe.js", root), "utf8"),
    sandbox,
    { filename: "appearance/portrait-wardrobe.js" }
  );
  return sandbox.HatsuPortraits;
}

test("appearance normalization preserves valid equipped refs and drops invalid keys", () => {
  const api = loadPortraitApi();
  const result = api.normalizeAppearanceState({
    schemaVersion: 1,
    equipped: {
      producer: {
        assetId: "asset-1",
        characterKey: "producer",
        url: "/user/files/a.png",
        name: "私服",
        source: "user",
        transform: { scale: 3, offsetX: -300, offsetY: 25 }
      },
      bad: { url: "javascript:alert(1)" }
    }
  });

  assert.equal(result.schemaVersion, 2);
  assert.deepEqual(clone(result.bindings), { producer: { aliases: [] } });
  assert.equal(result.equipped.producer.transform.scale, 2);
  assert.equal(result.equipped.producer.transform.offsetX, -100);
  assert.equal(result.equipped.producer.transform.offsetY, 25);
  assert.equal(result.equipped.bad, undefined);
});

test("producer aliases migrate normalize deduplicate and enforce limits", () => {
  const api = loadPortraitApi();
  const result = api.normalizeAppearanceState({
    schemaVersion: 1,
    equipped: {},
    bindings: {
      producer: {
        aliases: ["  Coach  ", "coach", "A".repeat(41), ...Array.from({ length: 15 }, (_, index) => `alias-${index}`)]
      }
    }
  });

  assert.equal(result.schemaVersion, 2);
  assert.equal(result.bindings.producer.aliases[0], "Coach");
  assert.equal(result.bindings.producer.aliases.includes("coach"), false);
  assert.equal(result.bindings.producer.aliases.includes("A".repeat(41)), false);
  assert.equal(result.bindings.producer.aliases.length, 12);
});

test("portrait resolution uses chat equipment then builtin fallback", () => {
  const api = loadPortraitApi();
  const builtins = {
    producer: "./assets/novel-standees/producer.png",
    "idol:藤田琴音": "./assets/novel-standees/kotone.png"
  };
  const appearance = api.normalizeAppearanceState({
    equipped: {
      producer: {
        assetId: "asset-1",
        characterKey: "producer",
        url: "/user/files/a.png",
        name: "私服",
        source: "user",
        transform: { scale: 1.1, offsetX: 4, offsetY: -2 }
      }
    }
  });

  assert.equal(api.resolvePortrait("producer", appearance, builtins).url, "/user/files/a.png");
  assert.equal(api.resolvePortrait("idol:藤田琴音", appearance, builtins).source, "builtin");
  assert.equal(api.resolvePortrait("producer", appearance, builtins, new Set(["/user/files/a.png"])).source, "builtin");
});

test("character keys distinguish producer aliases from canonical idols", () => {
  const api = loadPortraitApi();
  const canonicalize = (name) => name === "琴音" ? "藤田琴音" : name;
  const hasIdol = (name) => name === "藤田琴音";

  assert.equal(api.characterKeyForSpeaker("制作人", "小林", canonicalize, hasIdol), "producer");
  assert.equal(api.characterKeyForSpeaker("小林", "小林", canonicalize, hasIdol), "producer");
  assert.equal(api.characterKeyForSpeaker("琴音", "小林", canonicalize, hasIdol), "idol:藤田琴音");
  assert.equal(api.characterKeyForSpeaker("路人", "小林", canonicalize, hasIdol), "" );
  assert.equal(api.characterKeyForSpeaker("Custom Coach", "producer-name", canonicalize, hasIdol, ["custom coach"]), "producer" );
  const fullCustomList = Array.from({ length: 12 }, (_, index) => "alias-" + index);
  assert.equal(api.characterKeyForSpeaker("alias-11", "producer-name", canonicalize, hasIdol, fullCustomList), "producer");
});
test("decoded image validation enforces format byte pixel and edge limits", () => {
  const api = loadPortraitApi();

  assert.deepEqual(clone(api.validateDecodedImageMeta({ type: "image/png", size: 1024, width: 1200, height: 2000 })), { ok: true });
  assert.equal(api.validateDecodedImageMeta({ type: "image/gif", size: 1024, width: 10, height: 10 }).error, "unsupported_type");
  assert.equal(api.validateDecodedImageMeta({ type: "image/png", size: 20 * 1024 * 1024 + 1, width: 10, height: 10 }).error, "file_too_large");
  assert.equal(api.validateDecodedImageMeta({ type: "image/png", size: 1024, width: 9000, height: 10 }).error, "edge_too_large");
  assert.equal(api.validateDecodedImageMeta({ type: "image/png", size: 1024, width: 8000, height: 6000 }).error, "pixel_count_too_large");
  assert.equal(api.validateDecodedImageMeta({ type: "image/png", size: 1024, width: 0, height: 10 }).error, "decode_failed");
});

test("library merge increments revision without removing concurrent assets", () => {
  const api = loadPortraitApi();
  const latest = {
    schemaVersion: 1,
    libraryRevision: 4,
    updatedAt: 10,
    assets: {
      old: {
        assetId: "old",
        operationId: "op-old",
        characterKey: "producer",
        name: "旧素材",
        url: "/user/files/old.png",
        mimeType: "image/png",
        width: 100,
        height: 200,
        size: 1000,
        transform: { scale: 1, offsetX: 0, offsetY: 0 },
        archived: false,
        createdAt: 5,
        updatedAt: 5
      }
    }
  };
  const merged = api.mergeLibraryAsset(latest, {
    assetId: "new",
    operationId: "op-1",
    characterKey: "producer",
    name: "新素材",
    url: "/user/files/new.png",
    mimeType: "image/png",
    width: 120,
    height: 240,
    size: 1200,
    transform: { scale: 1, offsetX: 0, offsetY: 0 },
    archived: false
  }, 20);

  assert.equal(merged.libraryRevision, 5);
  assert.deepEqual(Object.keys(merged.assets).sort(), ["new", "old"]);
  assert.equal(merged.assets.new.createdAt, 20);
  assert.equal(merged.assets.old.updatedAt, 5);
});

test("archiving hides one asset without removing its file reference", () => {
  const api = loadPortraitApi();
  const library = api.mergeLibraryAsset(null, {
    assetId: "asset-1",
    operationId: "op-1",
    characterKey: "producer",
    name: "私服",
    url: "/user/files/a.png",
    mimeType: "image/png",
    width: 100,
    height: 200,
    size: 1000,
    transform: { scale: 1, offsetX: 0, offsetY: 0 },
    archived: false
  }, 10);
  const archived = api.archiveLibraryAsset(library, "asset-1", 20);

  assert.equal(archived.assets["asset-1"].archived, true);
  assert.equal(archived.assets["asset-1"].url, "/user/files/a.png");
  assert.equal(archived.libraryRevision, 2);
});

test("operation ids and file names are deterministic and filesystem safe", () => {
  const api = loadPortraitApi();
  const operationId = api.createOperationId(1720000000000, 0.25);

  assert.match(operationId, /^[a-z0-9-]+$/);
  assert.equal(api.createAssetId(operationId), `portrait:${operationId}`);
  assert.equal(api.createUploadFileName(operationId, "image/jpeg"), `hatsu-portrait-${operationId}.jpg`);
  assert.equal(api.createUploadFileName(operationId, "image/png"), `hatsu-portrait-${operationId}.png`);
});
