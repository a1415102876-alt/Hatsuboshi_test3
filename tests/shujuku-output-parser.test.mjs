import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../shujuku-output-parser.js", import.meta.url), "utf8");
function api() {
  const sandbox = {};
  sandbox.globalThis = sandbox;
  vm.runInNewContext(source, sandbox);
  return sandbox.HatsuShujukuOutputParser;
}

test("extracts the last complete tableEdit block", () => {
  const result = api().parseLastTableEdit('<tableEdit>{"old":1}</tableEdit>思考<tableEdit>{"new":2}</tableEdit>');
  assert.equal(result.ok, true);
  assert.deepEqual(JSON.parse(JSON.stringify(result.value)), { new: 2 });
});

test("rejects incomplete or missing tableEdit without handing down partial JSON", () => {
  const parser = api();
  assert.equal(parser.parseLastTableEdit('<tableEdit>{"new":2').reason, "tag_incomplete");
  assert.equal(parser.parseLastTableEdit('{"new":2}').reason, "tag_missing");
});

test("classifies API, parser, schema, SQL and busy failures separately", () => {
  const parser = api();
  assert.equal(parser.classifyDatabaseFailure(new Error("429 Too Many Requests")), "api_rate_limited");
  assert.equal(parser.classifyDatabaseFailure(new Error("updater busy")), "updater_busy");
  assert.equal(parser.classifyDatabaseFailure(new Error("DDL column mismatch")), "ddl_header_mismatch");
  assert.equal(parser.classifyDatabaseFailure(new Error("SQL insert constraint failed")), "sql_operation_failed");
  assert.equal(parser.classifyDatabaseFailure(null, "<tableEdit>{bad}</tableEdit>"), "table_edit_parse_failed");
});
