import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const templatePath = new URL("../TavernDB_template_HATSUBOSHI_IDOL.json", import.meta.url);

function loadTemplate() {
  return JSON.parse(readFileSync(templatePath, "utf8"));
}

test("character-card TavernDB preset contains only the six intended tables", () => {
  const template = loadTemplate();
  const sheets = Object.values(template)
    .filter((value) => value && typeof value === "object" && value.uid?.startsWith("sheet_"))
    .sort((left, right) => left.orderNo - right.orderNo);

  assert.deepEqual(
    sheets.map((sheet) => sheet.name),
    ["角色动态状态表", "角色关系表", "约定与待办表", "纪要表", "偶像公众印象表", "营业履历表"],
  );
  assert.deepEqual(sheets.map((sheet) => sheet.orderNo), [0, 1, 2, 3, 4, 5]);
});

test("chronicle schema matches the source-code vector index contract", () => {
  const template = loadTemplate();
  const chronicle = template.sheet_chronicle;

  assert.deepEqual(chronicle.content[0], [
    "row_id",
    "时间跨度",
    "地点",
    "纪要",
    "概览",
    "编码索引",
  ]);
  assert.match(
    chronicle.sourceData.ddl,
    /row_id[\s\S]*time_span[\s\S]*location[\s\S]*chronicle_text[\s\S]*summary[\s\S]*code_index/,
  );
  assert.match(chronicle.sourceData.ddl, /location TEXT NOT NULL, -- 地点/);
  assert.equal(chronicle.exportConfig.enabled, true);
  assert.equal(chronicle.exportConfig.splitByRow, true);
  assert.equal(chronicle.exportConfig.entryType, "keyword");
  assert.equal(chronicle.exportConfig.keywords, "编码索引");
  assert.equal(chronicle.exportConfig.extraIndexEntryName, "纪要索引");
  assert.deepEqual(chronicle.exportConfig.extraIndexColumns, [
    "时间跨度",
    "地点",
    "概览",
    "编码索引",
  ]);
});

test("table headers, DDL columns, and update groups stay aligned", () => {
  const template = loadTemplate();
  const expected = {
    sheet_character_dynamic_state: {
      headers: ["row_id", "角色姓名", "当前身份状态", "当前目标", "当前情绪与态度", "当前关注事项", "尚未解决事项", "最近更新依据"],
      columns: ["row_id", "character_name", "current_role_state", "current_goal", "current_attitude", "current_focus", "unresolved_threads", "update_reason"],
      groupId: 1,
    },
    sheet_character_relationship: {
      headers: ["row_id", "主体角色", "关系对象", "熟悉阶段", "关系倾向", "当前态度", "关键共同经历", "当前关系基础", "未解决的矛盾或隔阂", "最近更新依据"],
      columns: ["row_id", "subject_name", "object_name", "familiarity_stage", "relationship_tone", "current_attitude", "key_shared_experiences", "relationship_basis", "unresolved_tension", "update_reason"],
      groupId: 1,
    },
    sheet_character_commitment: {
      headers: ["row_id", "约定类型", "提出者", "相关角色", "责任方", "约定内容", "约定成立场景", "履行条件或时间", "当前状态", "完成结果", "最近更新依据"],
      columns: ["row_id", "commitment_type", "initiator_name", "related_characters", "responsible_party", "commitment_content", "agreed_context", "due_condition", "status", "completion_result", "update_reason"],
      groupId: 1,
    },
    sheet_chronicle: {
      headers: ["row_id", "时间跨度", "地点", "纪要", "概览", "编码索引"],
      columns: ["row_id", "time_span", "location", "chronicle_text", "summary", "code_index"],
      groupId: 1,
    },
    sheet_idol_impression: {
      headers: ["row_id", "偶像姓名", "当前核心印象", "已被观众确认的魅力", "尚未被理解的一面", "已过度使用的表现方式", "当前舆论风险", "最近更新依据"],
      columns: ["row_id", "idol_name", "core_impression", "confirmed_charm", "misunderstood_side", "overused_style", "public_relation_risk", "update_reason"],
      groupId: 1,
    },
    sheet_business_history: {
      headers: ["row_id", "营业编号", "轮次与日期", "偶像姓名", "营业类型", "节目或活动名称", "本轮企划目标", "录制前总体策略", "计划外事件", "制作人临场指示", "偶像如何执行", "节目高光", "最终公众反应", "形成的新印象", "可供后续回收的伏笔"],
      columns: ["row_id", "business_id", "round_date", "idol_name", "business_type", "business_name", "plan_goal", "pre_strategy", "unexpected_event", "producer_instruction", "idol_response", "highlight", "audience_response", "impression_change", "followup_hook"],
      groupId: 1,
    },
  };

  for (const [sheetKey, contract] of Object.entries(expected)) {
    const sheet = template[sheetKey];
    assert.deepEqual(sheet.content[0], contract.headers, `${sheetKey} headers`);
    assert.equal(sheet.updateConfig.groupId, contract.groupId, `${sheetKey} groupId`);
    const ddlColumns = [...sheet.sourceData.ddl.matchAll(/^\s{2}([a-z_]+)\s+/gm)].map((match) => match[1]);
    assert.deepEqual(ddlColumns, contract.columns, `${sheetKey} DDL columns`);
  }
});

test("relationship data is directional and no longer duplicated in dynamic state", () => {
  const template = loadTemplate();
  const relationship = template.sheet_character_relationship;
  const dynamicState = template.sheet_character_dynamic_state;

  assert.match(relationship.sourceData.ddl, /UNIQUE\(subject_name, object_name\)/);
  assert.match(relationship.sourceData.note, /陌生、初识、熟悉、信赖、亲密/);
  assert.match(relationship.sourceData.note, /友好、尊敬、依赖、竞争、复杂、紧张、对立/);
  assert.equal(dynamicState.sourceData.ddl.includes("producer_relationship"), false);
  assert.equal(dynamicState.content[0].includes("与制作人的关系"), false);
});

test("commitments retain terminal states and only accept explicit agreements", () => {
  const template = loadTemplate();
  const commitment = template.sheet_character_commitment;

  assert.match(commitment.sourceData.note, /明确提出/);
  assert.match(commitment.sourceData.note, /明确接受/);
  assert.match(commitment.sourceData.note, /待履行、进行中、已完成、已取消、已失效/);
  assert.match(commitment.sourceData.deleteNode, /不得因约定已完成、已取消或已失效而删除/);
});

test("preset contains no obsolete business-history columns", () => {
  const source = readFileSync(templatePath, "utf8");
  for (const obsolete of ["round_no", "day_no", "producer_intervention", "result_summary"]) {
    assert.equal(source.includes(obsolete), false, obsolete);
  }
});
