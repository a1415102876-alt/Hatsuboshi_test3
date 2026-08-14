import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const registrySource = fs.readFileSync(new URL("nia/routes/registry.js", root), "utf8");
const sakiSource = fs.readFileSync(new URL("nia/routes/hanami-saki.js", root), "utf8");
const kotoneSource = fs.readFileSync(new URL("nia/routes/fujita-kotone.js", root), "utf8");
const html = fs.readFileSync(new URL("index.html", root), "utf8");
const st = fs.readFileSync(new URL("st.html", root), "utf8");

function loadRoutes() {
  const context = {};
  vm.createContext(context);
  vm.runInContext(registrySource, context);
  vm.runInContext(sakiSource, context);
  vm.runInContext(kotoneSource, context);
  return context.HatsuNiaRoutes;
}

test("Saki route registers affinity, rounds, opponents, and episodes", () => {
  const routes = loadRoutes();
  const route = routes.getByIdol("花海咲季");
  assert.equal(route.routeId, "hanami-saki");
  assert.equal(route.inheritedAffinity.tag, "AFF_SAKI_100");
  assert.equal(routes.getRound("花海咲季", 2).opponent.name, "贺阳燐羽");
  assert.equal(routes.getRound("花海咲季", 3).opponent.name, "花海佑芽");
  assert.deepEqual(Array.from(routes.getEpisodes("花海咲季"), (entry) => entry.episode), [12, 13, 14, 15, 16, 17, 18, 19, 20]);
});

test("Kotone route registers inherited affinity, QUARTET opponents, and episode order", () => {
  const routes = loadRoutes();
  const route = routes.getByIdol("藤田琴音");
  assert.equal(route.routeId, "fujita-kotone");
  assert.equal(route.inheritedAffinity.tag, "AFF_KOTONE_100");
  assert.equal(route.inheritedAffinity.value, 100);
  assert.deepEqual([...route.rounds.find((entry) => entry.round === 2).opponents].map((entry) => String(entry.name)), ["蓝井抚子", "白草四音"]);
  assert.deepEqual(Array.from(routes.getEpisodes("藤田琴音"), (entry) => entry.episode), [12, 13, 14, 15, 16, 17, 18, 19, 20]);
  assert.equal(route.opening.episode, 11);
});

test("registry rejects incomplete routes and duplicates", () => {
  const routes = loadRoutes();
  assert.throws(() => routes.register({ routeId: "bad" }), /idolName/);
  assert.throws(() => routes.register({
    routeId: "hanami-saki",
    idolName: "other",
    inheritedAffinity: { value: 0, max: 100, tag: "AFF_OTHER_0", relationshipSummary: "none" }
  }), /Duplicate/);
});

test("route scripts load before N.I.A cores and app in both entries", () => {
  assert.ok(html.indexOf("nia/routes/registry.js") < html.indexOf("nia-training-core.js"));
  assert.ok(html.indexOf("nia/routes/hanami-saki.js") < html.indexOf("app.js"));
  assert.ok(html.indexOf("nia/routes/fujita-kotone.js") < html.indexOf("nia-training-core.js"));
  assert.ok(st.indexOf("'nia/routes/registry.js'") < st.indexOf("abs('nia-training-core.js')"));
  assert.ok(st.indexOf("'nia/routes/hanami-saki.js'") < st.indexOf("abs('app.js')"));
  assert.ok(st.indexOf("'nia/routes/fujita-kotone.js'") < st.indexOf("abs('nia-training-core.js')"));
});
