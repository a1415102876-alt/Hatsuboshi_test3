import { writeFileSync } from "node:fs";

const outputPath = new URL("../TavernDB_template_HATSUBOSHI_IDOL.json", import.meta.url);

const standardUpdateConfig = {
  uiSentinel: -1,
  contextDepth: -1,
  updateFrequency: -1,
  batchSize: -1,
  skipFloors: -1,
  sendLatestRows: -1,
  groupId: 1,
};

const chronicleUpdateConfig = {
  ...standardUpdateConfig,
  groupId: 1,
};

function exportConfig({
  entryName,
  keywords,
  extraIndexEntryName,
  extraIndexColumns,
  extraIndexColumnModes,
  injectionTemplate,
  extraIndexInjectionTemplate,
  depth,
  indexDepth,
  order,
  indexOrder,
}) {
  return {
    enabled: true,
    splitByRow: true,
    entryName,
    entryType: "keyword",
    keywords,
    preventRecursion: true,
    injectionTemplate,
    extraIndexEnabled: true,
    extraIndexEntryName,
    extraIndexColumns,
    extraIndexColumnModes,
    extraIndexInjectionTemplate,
    entryPlacement: {
      position: "at_depth_as_system",
      depth,
      order,
    },
    extraIndexPlacement: {
      position: "at_depth_as_system",
      depth: indexDepth,
      order: indexOrder,
    },
    fixedEntryPlacement: {
      position: "at_depth_as_system",
      depth: 9999,
      order: 99990,
    },
    fixedIndexPlacement: {
      position: "at_depth_as_system",
      depth: 9999,
      order: 99991,
    },
  };
}

const template = {
  mate: {
    type: "chatSheets",
    version: 1,
    globalInjectionConfig: {
      readableEntryPlacement: {
        position: "before_character_definition",
        depth: 2,
        order: 99981,
      },
      wrapperPlacement: {
        position: "before_character_definition",
        depth: 2,
        order: 99980,
      },
    },
    updateConfigUiSentinel: -1,
  },

  sheet_character_dynamic_state: {
    uid: "sheet_character_dynamic_state",
    name: "角色动态状态表",
    sourceData: {
      note: `【表用途】
记录已经登场的重要角色当前仍然有效的动态状态。静态人设、外貌和固定背景由角色卡或世界书负责，本表不得重复抄写。

【列定义】
列1=row_id（自动生成，禁止AI填写或修改）
列2=角色姓名 character_name（唯一标识，必须与正文及世界书姓名一致）
列3=当前身份状态 current_role_state
列4=当前目标 current_goal
列5=当前情绪与态度 current_attitude
列6=当前关注事项 current_focus
列7=尚未解决事项 unresolved_threads
列8=最近更新依据 update_reason

【填写约束】
- 每名角色只能存在一行；同名角色已经存在时必须更新，禁止重复新增。
- 只记录会影响后续互动的当前状态，不记录时间、地点、数值属性、公众印象或营业履历。
- 当前情绪与态度只写剧情已经表现出的状态，不推测隐藏想法。
- 多个事项使用“；”分隔；已经解决的事项应从尚未解决事项中移除。
- 更新时保留仍然有效的旧信息，只修改被本轮剧情改变的字段。
- update_reason 必须写明导致变化的具体事件，不写空泛评价。`,
      initNode: `当一名重要角色第一次实际登场并产生会延续到后续剧情的动态状态，且表中不存在同名角色时新增。
禁止仅因角色在企划书、回忆或他人口中被提及而初始化。
禁止填写 row_id。

SQL示例：
INSERT INTO character_dynamic_state (
  character_name,
  current_role_state,
  current_goal,
  current_attitude,
  current_focus,
  unresolved_threads,
  update_reason
)
SELECT
  '花海咲季',
  'N.I.A选拔准备期的担当偶像',
  '通过公开活动证明自己的实力与魅力',
  '训练后仍保持高昂斗志，对制作人的安排抱有期待',
  '下一次公开营业的准备',
  '尚未完成首次正式综艺录制',
  '完成直播企划讨论并接受下一阶段安排'
WHERE NOT EXISTS (
  SELECT 1 FROM character_dynamic_state WHERE character_name = '花海咲季'
);`,
      insertNode: `当此前未记录的重要角色第一次实际登场，并产生会影响后续互动的当前状态时新增一行。
同名角色已经存在时必须执行 UPDATE，禁止重复新增。禁止填写 row_id。

SQL示例：
INSERT INTO character_dynamic_state (
  character_name,
  current_role_state,
  current_goal,
  current_attitude,
  current_focus,
  unresolved_threads,
  update_reason
)
SELECT
  '真诚优',
  '初星学园广播部部长兼《初星放送部》主持人',
  '完成对花海咲季的首次校园广播访谈',
  '对企划保持专业兴趣，同时警惕恶意诱导式提问',
  '核对访谈提纲与现场互动尺度',
  '下午的广播部企划面谈尚未完成',
  '制作人提交了以公众印象反差为切入点的节目提纲'
WHERE NOT EXISTS (
  SELECT 1 FROM character_dynamic_state WHERE character_name = '真诚优'
);`,
      updateNode: `当已有角色的当前目标、态度、关系、关注事项或未解决事项被新剧情明确改变时更新。
不得修改 row_id 和 character_name；不得用尚未发生的计划覆盖当前事实。

SQL示例：
UPDATE character_dynamic_state
SET
  current_attitude = '确认企划没有恶意诱导后，对正式录制表现出积极态度',
  current_focus = '准备正式录制所需的提问卡与播出流程',
  unresolved_threads = '正式广播录制尚未开始',
  update_reason = '广播部面谈中确认了节目边界并通过企划'
WHERE character_name = '真诚优';`,
      deleteNode: `禁止AI自动删除记录。
角色暂时离场、结束一场活动或短期未登场时仍保留。只有用户明确要求清理错误数据或确认重复行时才允许删除。`,
      ddl: `CREATE TABLE IF NOT EXISTS character_dynamic_state ( -- 角色动态状态表
  row_id INTEGER PRIMARY KEY AUTOINCREMENT, -- 行号
  character_name TEXT NOT NULL UNIQUE, -- 角色姓名
  current_role_state TEXT, -- 当前身份状态
  current_goal TEXT, -- 当前目标
  current_attitude TEXT, -- 当前情绪与态度
  current_focus TEXT, -- 当前关注事项
  unresolved_threads TEXT, -- 尚未解决事项
  update_reason TEXT -- 最近更新依据
);`,
    },
    content: [[
      "row_id",
      "角色姓名",
      "当前身份状态",
      "当前目标",
      "当前情绪与态度",
      "当前关注事项",
      "尚未解决事项",
      "最近更新依据",
    ]],
    updateConfig: { ...standardUpdateConfig },
    exportConfig: exportConfig({
      entryName: "角色动态状态",
      keywords: "角色姓名",
      extraIndexEntryName: "角色动态状态索引",
      extraIndexColumns: ["角色姓名", "当前身份状态", "当前目标"],
      extraIndexColumnModes: {
        角色姓名: "both",
        当前身份状态: "index_only",
        当前目标: "index_only",
      },
      injectionTemplate: "<角色当前状态>\n$1\n</角色当前状态>",
      extraIndexInjectionTemplate: "<已记录角色当前状态索引>\n$1\n</已记录角色当前状态索引>",
      depth: 10000,
      indexDepth: 10000,
      order: 10000,
      indexOrder: 8000,
    }),
    orderNo: 0,
  },

  sheet_character_relationship: {
    uid: "sheet_character_relationship",
    name: "角色关系表",
    sourceData: {
      note: `【表用途】
记录任意重要角色对另一角色的当前关系认知。关系具有方向性，“A对B”与“B对A”是两条不同记录。

【列定义】
列1=row_id（自动生成，禁止AI填写或修改）
列2=主体角色 subject_name
列3=关系对象 object_name
列4=熟悉阶段 familiarity_stage
列5=关系倾向 relationship_tone
列6=当前态度 current_attitude
列7=关键共同经历 key_shared_experiences
列8=当前关系基础 relationship_basis
列9=未解决的矛盾或隔阂 unresolved_tension
列10=最近更新依据 update_reason

【枚举规则】
- familiarity_stage 只能填写：陌生、初识、熟悉、信赖、亲密。
- relationship_tone 只能从以下词中选择：友好、尊敬、依赖、竞争、复杂、紧张、对立。
- 同时存在多个关系倾向时使用“；”分隔，例如“竞争；尊敬”。

【填写约束】
- subject_name 与 object_name 的组合全表唯一；两者不得是同一角色。
- 只有角色实际互动、明确谈及对方并形成新认知，或当前上下文明示双方既有关系时才允许新增或更新。
- 不得因为同场出现、普通寒暄或制作人的主观猜测改变关系。
- 当前态度用自由文字记录主体对对象已经表现出的看法，不推测隐藏感情。
- 关键共同经历只保留最重要的3-5件，使用“；”分隔；新增时压缩已经失去持续影响的旧内容。
- 完整事件过程交给纪要表，本表只保留事件留下的关系结果。
- 没有未解决矛盾时填写“无”。`,
      initNode: `当两个重要角色的有方向关系第一次在正文中得到明确体现，且表中不存在相同 subject_name 与 object_name 组合时新增。禁止填写 row_id。

SQL示例：
INSERT INTO character_relationship (
  subject_name,
  object_name,
  familiarity_stage,
  relationship_tone,
  current_attitude,
  key_shared_experiences,
  relationship_basis,
  unresolved_tension,
  update_reason
)
SELECT
  '花海咲季',
  '花海佑芽',
  '亲密',
  '依赖；竞争',
  '深爱并保护妹妹，同时无法轻易接受佑芽在偶像能力上超过自己',
  '从小一起生活和训练；进入初星学园后继续互相追赶',
  '家人之间的深厚感情，以及身为姐姐的责任感',
  '咲季仍难以坦率面对佑芽快速成长带来的压力',
  '咲季在谈及竞争目标时再次明确表达了对妹妹的保护与胜负心'
WHERE NOT EXISTS (
  SELECT 1 FROM character_relationship
  WHERE subject_name = '花海咲季' AND object_name = '花海佑芽'
);`,
      insertNode: `角色实际互动或明确谈及对方，使一条此前不存在的有方向关系得到确认时新增。
不得同时自动补写反方向记录；只有反方向态度也有明确依据时才单独新增。禁止填写 row_id。
必须使用 WHERE NOT EXISTS 检查 subject_name 与 object_name 的组合，SQL写法与初始化示例一致。`,
      updateNode: `当已有关系的熟悉阶段、关系倾向、当前态度、关系基础、关键经历或未解决隔阂被新剧情明确改变时更新。
不得修改 row_id、subject_name 和 object_name；不得把一次普通互动夸大为阶段跃迁。

SQL示例：
UPDATE character_relationship
SET
  familiarity_stage = '信赖',
  relationship_tone = '尊敬；友好',
  current_attitude = '认可制作人的企划诚意和现场判断，愿意直接讨论节目边界',
  key_shared_experiences = '共同修改广播访谈提纲；在面谈中确认不会使用恶意诱导问题',
  relationship_basis = '对偶像与节目参与者的共同责任感',
  unresolved_tension = '正式录制中的临场尺度仍需继续观察',
  update_reason = '广播部企划面谈结束后，真诚优接受了制作人的修改方案'
WHERE subject_name = '真诚优' AND object_name = '沢田羽';`,
      deleteNode: `禁止AI因角色离场、短期未互动或关系变差而删除记录。
只有用户明确要求清理错误数据，或确认存在完全重复的同方向关系行时才允许删除。`,
      ddl: `CREATE TABLE IF NOT EXISTS character_relationship ( -- 角色关系表
  row_id INTEGER PRIMARY KEY AUTOINCREMENT, -- 行号
  subject_name TEXT NOT NULL, -- 主体角色
  object_name TEXT NOT NULL, -- 关系对象
  familiarity_stage TEXT NOT NULL CHECK(familiarity_stage IN ('陌生','初识','熟悉','信赖','亲密')), -- 熟悉阶段
  relationship_tone TEXT NOT NULL, -- 关系倾向
  current_attitude TEXT, -- 当前态度
  key_shared_experiences TEXT, -- 关键共同经历
  relationship_basis TEXT, -- 当前关系基础
  unresolved_tension TEXT, -- 未解决的矛盾或隔阂
  update_reason TEXT, -- 最近更新依据
  CHECK(subject_name <> object_name),
  UNIQUE(subject_name, object_name)
);`,
    },
    content: [[
      "row_id",
      "主体角色",
      "关系对象",
      "熟悉阶段",
      "关系倾向",
      "当前态度",
      "关键共同经历",
      "当前关系基础",
      "未解决的矛盾或隔阂",
      "最近更新依据",
    ]],
    updateConfig: { ...standardUpdateConfig },
    exportConfig: exportConfig({
      entryName: "角色关系",
      keywords: "主体角色,关系对象",
      extraIndexEntryName: "角色关系索引",
      extraIndexColumns: ["主体角色", "关系对象", "熟悉阶段", "关系倾向"],
      extraIndexColumnModes: {
        主体角色: "both",
        关系对象: "both",
        熟悉阶段: "index_only",
        关系倾向: "index_only",
      },
      injectionTemplate: "<角色关系>\n$1\n</角色关系>",
      extraIndexInjectionTemplate: "<角色关系索引>\n$1\n</角色关系索引>",
      depth: 9500,
      indexDepth: 9500,
      order: 10500,
      indexOrder: 8500,
    }),
    orderNo: 1,
  },

  sheet_character_commitment: {
    uid: "sheet_character_commitment",
    name: "约定与待办表",
    sourceData: {
      note: `【表用途】
记录角色之间已经明确成立、可以判断是否履行的约定、邀请、承诺、委托和待办。模糊意向与尚未接受的提议不得写入。

【列定义】
列1=row_id（自动生成，禁止AI填写或修改）
列2=约定类型 commitment_type
列3=提出者 initiator_name
列4=相关角色 related_characters
列5=责任方 responsible_party
列6=约定内容 commitment_content
列7=约定成立场景 agreed_context
列8=履行条件或时间 due_condition
列9=当前状态 status
列10=完成结果 completion_result
列11=最近更新依据 update_reason

【枚举规则】
- commitment_type 只能填写：约定、邀请、承诺、委托、待办。
- status 只能填写：待履行、进行中、已完成、已取消、已失效。

【填写约束】
- 写入必须同时满足：有人明确提出；对方明确接受，或责任方明确承诺执行；内容具体到以后能够判断是否完成。
- “以后有机会一起去”不写；约定了具体活动、条件或时间才写。
- related_characters 和 responsible_party 包含多人时使用中文逗号“，”分隔，便于关键词触发。
- 新增前检查是否已存在提出者、约定内容相同且状态为待履行或进行中的记录，禁止重复新增。
- 状态变为已完成、已取消或已失效后仍保留记录；完成时简短填写 completion_result。
- 完整过程交给纪要表，本表只维护约定的生命周期。`,
      initNode: `第一项明确约定成立，且不存在相同的未终止记录时新增。禁止填写 row_id。

SQL示例：
INSERT INTO character_commitment (
  commitment_type,
  initiator_name,
  related_characters,
  responsible_party,
  commitment_content,
  agreed_context,
  due_condition,
  status,
  completion_result,
  update_reason
)
SELECT
  '约定',
  '真诚优',
  '沢田羽，花海咲季',
  '真诚优，沢田羽，花海咲季',
  '按照修改后的提纲完成花海咲季首次《初星放送部》访谈',
  '广播部办公室的企划面谈',
  '正式广播录制日',
  '待履行',
  '',
  '真诚优确认节目边界后正式接受了录制企划'
WHERE NOT EXISTS (
  SELECT 1 FROM character_commitment
  WHERE initiator_name = '真诚优'
    AND commitment_content = '按照修改后的提纲完成花海咲季首次《初星放送部》访谈'
    AND status IN ('待履行','进行中')
);`,
      insertNode: `明确提议被接受，或责任方明确承诺执行具体事项时新增。
新增前必须检查相同提出者与约定内容是否已有待履行或进行中记录。禁止填写 row_id。
SQL写法与初始化示例一致，必须使用 WHERE NOT EXISTS 防止重复。`,
      updateNode: `约定开始执行、完成、被明确取消或因条件消失而失效时更新。
不得修改 row_id、initiator_name 和 commitment_content；不得仅因时间经过就擅自判定失效。

SQL示例：
UPDATE character_commitment
SET
  status = '已完成',
  completion_result = '三人按照确认后的提纲完成录制，节目正常收尾',
  update_reason = '《初星放送部》正式录制结束并确认可播出'
WHERE initiator_name = '真诚优'
  AND commitment_content = '按照修改后的提纲完成花海咲季首次《初星放送部》访谈'
  AND status IN ('待履行','进行中');`,
      deleteNode: `禁止AI自动删除记录，不得因约定已完成、已取消或已失效而删除。
只有用户明确要求清理错误数据，或确认同一约定被重复新增时才允许删除。`,
      ddl: `CREATE TABLE IF NOT EXISTS character_commitment ( -- 约定与待办表
  row_id INTEGER PRIMARY KEY AUTOINCREMENT, -- 行号
  commitment_type TEXT NOT NULL CHECK(commitment_type IN ('约定','邀请','承诺','委托','待办')), -- 约定类型
  initiator_name TEXT NOT NULL, -- 提出者
  related_characters TEXT NOT NULL, -- 相关角色
  responsible_party TEXT NOT NULL, -- 责任方
  commitment_content TEXT NOT NULL, -- 约定内容
  agreed_context TEXT, -- 约定成立场景
  due_condition TEXT, -- 履行条件或时间
  status TEXT NOT NULL CHECK(status IN ('待履行','进行中','已完成','已取消','已失效')), -- 当前状态
  completion_result TEXT, -- 完成结果
  update_reason TEXT -- 最近更新依据
);`,
    },
    content: [[
      "row_id",
      "约定类型",
      "提出者",
      "相关角色",
      "责任方",
      "约定内容",
      "约定成立场景",
      "履行条件或时间",
      "当前状态",
      "完成结果",
      "最近更新依据",
    ]],
    updateConfig: { ...standardUpdateConfig },
    exportConfig: exportConfig({
      entryName: "角色约定与待办",
      keywords: "提出者,相关角色,责任方",
      extraIndexEntryName: "角色约定与待办索引",
      extraIndexColumns: ["约定类型", "提出者", "相关角色", "责任方", "约定内容", "履行条件或时间", "当前状态"],
      extraIndexColumnModes: {
        约定类型: "both",
        提出者: "both",
        相关角色: "both",
        责任方: "both",
        约定内容: "both",
        履行条件或时间: "both",
        当前状态: "both",
      },
      injectionTemplate: "<角色约定与待办>\n$1\n</角色约定与待办>",
      extraIndexInjectionTemplate: "<角色约定与待办索引>\n$1\n</角色约定与待办索引>",
      depth: 9250,
      indexDepth: 9250,
      order: 10750,
      indexOrder: 8750,
    }),
    orderNo: 2,
  },

  sheet_chronicle: {
    uid: "sheet_chronicle",
    name: "纪要表",
    sourceData: {
      note: `【表用途】
记录每轮已经发生的剧情，为插件的纪要交火、向量索引和编码回溯提供长期记忆。

【列定义】
列1=row_id（自动生成，禁止AI填写或修改）
列2=时间跨度 time_span（YYYY-MM-DD HH:MM ~ YYYY-MM-DD HH:MM）
列3=地点 location（本轮主要发生地点的完整名称）
列4=纪要 chronicle_text（不少于300字）
列5=概览 summary（不超过40字）
列6=编码索引 code_index（AM0001 起递增，全表唯一）

【填写约束】
- 每轮交互结束后只插入一条记录；如果一轮包含多个连续片段，合并为一条。
- 只记录正文明确发生的事实，不补写未发生的情节，不把规划过程或格式说明写入纪要。
- 地点必须来自正文或前端状态；发生移动时填写本轮结束时的主要地点。
- 概览必须客观、明确，不包含纪要里没有的信息。
- 纪要使用第三方视角，保留关键行动、角色反应、关系变化、物品与伏笔，结尾不总结或升华。
- code_index 必须根据表内现有最大 AM 编号递增，不得重复或跳用已经存在的编号。`,
      initNode: `纪要表为空且第一轮剧情已经结束时插入 AM0001。禁止填写 row_id，由数据库自动生成。

SQL示例：
INSERT INTO chronicle (
  time_span,
  location,
  chronicle_text,
  summary,
  code_index
)
SELECT
  '2024-04-15 09:00 ~ 2024-04-15 10:00',
  '初星学园制作人科个人办公室',
  '上午，沢田羽独自在制作人科个人办公室整理花海咲季的个人直播申请。他根据咲季好胜、容易受到挑衅的性格，把弹幕风险划分为自动拦截、后台降权和人工处理三个等级，又准备了几句能自然转移话题的回应。咲季通过消息询问进度，并很快发来一段训练录像作为申请附件。沢田羽检查录像后，将能够证明训练稳定性的片段加入方案，补齐实时监督条款并打印材料。办公室外逐渐传来准备午餐的脚步声，他把装订好的文件放进资料夹，准备下午带去与老师面谈。',
  '制作人完成直播申请草案。',
  printf('AM%04d', COALESCE(MAX(CAST(SUBSTR(code_index, 3) AS INTEGER)), 0) + 1)
FROM chronicle;`,
      insertNode: `每轮交互结束后插入一条新记录。禁止 UPDATE 旧纪要，禁止填写 row_id。
code_index 必须通过现有最大编号计算；summary 不超过40字；chronicle_text 不少于300字；time_span 严格使用“YYYY-MM-DD HH:MM ~ YYYY-MM-DD HH:MM”。

SQL示例：
INSERT INTO chronicle (
  time_span,
  location,
  chronicle_text,
  summary,
  code_index
)
SELECT
  '2024-04-15 14:00 ~ 2024-04-15 14:30',
  '初星学园广播部办公室',
  '下午，沢田羽带着上午完成的企划书来到广播部办公室，与部长真诚优确认花海咲季的首次访谈安排。真诚优先检查提纲是否包含恶意诱导式问题，并指出广播节目不能为了制造话题故意让嘉宾难堪。沢田羽说明企划希望呈现咲季认真好胜之外的自然反应，不会隐瞒录制目的，也不会使用未经同意的素材。两人逐项调整了提问顺序，把容易造成误解的措辞改成对训练习惯和日常选择的直接询问。真诚优确认修改后的提纲符合节目原则，同意进入正式录制准备，并开始整理主持用的提问卡。',
  '广播部通过咲季访谈企划。',
  printf('AM%04d', COALESCE(MAX(CAST(SUBSTR(code_index, 3) AS INTEGER)), 0) + 1)
FROM chronicle;`,
      updateNode: "禁止更新旧纪要。出现内容错误时由用户明确指定修正，不得用后续剧情覆盖既有记录。",
      deleteNode: "禁止AI自动删除纪要。只有用户明确要求清理错误或重复记录时才允许删除。",
      ddl: `CREATE TABLE IF NOT EXISTS chronicle ( -- 纪要表
  row_id INTEGER PRIMARY KEY, -- 行号
  time_span TEXT NOT NULL, -- 时间跨度
  location TEXT NOT NULL, -- 地点
  chronicle_text TEXT NOT NULL, -- 纪要
  summary TEXT CHECK(summary IS NULL OR LENGTH(summary) <= 40), -- 概览
  code_index TEXT NOT NULL UNIQUE CHECK(code_index GLOB 'AM[0-9][0-9][0-9][0-9]') -- 编码索引
);`,
    },
    content: [["row_id", "时间跨度", "地点", "纪要", "概览", "编码索引"]],
    updateConfig: { ...chronicleUpdateConfig },
    exportConfig: exportConfig({
      entryName: "纪要",
      keywords: "编码索引",
      extraIndexEntryName: "纪要索引",
      extraIndexColumns: ["时间跨度", "地点", "概览", "编码索引"],
      extraIndexColumnModes: {
        时间跨度: "both",
        地点: "both",
        概览: "index_only",
        编码索引: "both",
      },
      injectionTemplate: "<记忆回溯>\n$1\n</记忆回溯>",
      extraIndexInjectionTemplate: "<已发生的事件概览>\n$1\n</已发生的事件概览>",
      depth: 999,
      indexDepth: 1000,
      order: 10000,
      indexOrder: 10010,
    }),
    orderNo: 3,
  },

  sheet_idol_impression: {
    uid: "sheet_idol_impression",
    name: "偶像公众印象表",
    sourceData: {
      note: `【表用途】
记录公开活动已经让观众确认的偶像形象。私人训练、私下交流和制作人的个人判断不能直接改变本表。

【列定义】
列1=row_id（自动生成，禁止AI填写或修改）
列2=偶像姓名 idol_name（每名偶像唯一）
列3=当前核心印象 core_impression
列4=已被观众确认的魅力 confirmed_charm
列5=尚未被理解的一面 misunderstood_side
列6=已过度使用的表现方式 overused_style
列7=当前舆论风险 public_relation_risk
列8=最近更新依据 update_reason

【填写约束】
- 每名偶像只能存在一行，同名偶像已存在时必须更新。
- 只有节目播出、网络直播、公开舞台、线下活动或明确的公开舆论才能初始化或更新。
- 多个项目使用“；”分隔；没有证据的字段保持空白。
- public_relation_risk 格式为“低/中/高｜具体原因”。
- 保留仍然有效的旧信息，只修改被新公开证据强化、削弱或推翻的部分。`,
      initNode: `担当偶像第一次完成产生明确观众反馈的公开活动，且表中不存在同名记录时初始化。禁止填写 row_id。

SQL示例：
INSERT INTO idol_impression (
  idol_name,
  core_impression,
  confirmed_charm,
  misunderstood_side,
  overused_style,
  public_relation_risk,
  update_reason
)
SELECT
  '花海咲季',
  '实力强大、认真好胜，同时具有自然可爱的反差',
  '面对挑战时投入而有感染力；被真诚夸奖后的反应亲切可爱',
  '部分观众仍把她理解为没有弱点、难以接近的优等生',
  '',
  '低｜首次公开活动未形成明显争议',
  '首次网络直播结束后，观众集中讨论她认真争胜与被夸后得意的反差'
WHERE NOT EXISTS (
  SELECT 1 FROM idol_impression WHERE idol_name = '花海咲季'
);`,
      insertNode: `此前未记录的偶像第一次通过公开营业产生明确观众反馈时新增。同名偶像已存在时必须 UPDATE。禁止填写 row_id。

SQL写法与初始化示例相同，必须使用 WHERE NOT EXISTS 防止重复。`,
      updateNode: `已有偶像通过新的公开活动产生明确公众反馈时更新。不得修改 row_id 和 idol_name，不得因私人事件更新。

SQL示例：
UPDATE idol_impression
SET
  core_impression = '实力强大、认真好胜，同时具有容易被夸得意忘形的可爱反差',
  confirmed_charm = CASE
    WHEN confirmed_charm IS NULL OR TRIM(confirmed_charm) = ''
      THEN '被真诚夸奖后自然流露的得意反应具有亲和力'
    WHEN INSTR(confirmed_charm, '被真诚夸奖后自然流露的得意反应具有亲和力') > 0
      THEN confirmed_charm
    ELSE confirmed_charm || '；被真诚夸奖后自然流露的得意反应具有亲和力'
  END,
  public_relation_risk = '低｜节目中的调侃得到正面回应，尚未形成明显争议',
  update_reason = '校园广播播出后，观众集中讨论咲季被主持人夸奖后的自然反应'
WHERE idol_name = '花海咲季';`,
      deleteNode: "禁止AI自动删除记录。偶像暂时停止活动或结束当前企划时仍保留；只有用户明确要求清理错误或重复数据时才允许删除。",
      ddl: `CREATE TABLE IF NOT EXISTS idol_impression ( -- 偶像公众印象表
  row_id INTEGER PRIMARY KEY AUTOINCREMENT, -- 行号
  idol_name TEXT NOT NULL UNIQUE, -- 偶像姓名
  core_impression TEXT, -- 当前核心印象
  confirmed_charm TEXT, -- 已被观众确认的魅力
  misunderstood_side TEXT, -- 尚未被理解的一面
  overused_style TEXT, -- 已过度使用的表现方式
  public_relation_risk TEXT, -- 当前舆论风险
  update_reason TEXT -- 最近更新依据
);`,
    },
    content: [[
      "row_id",
      "偶像姓名",
      "当前核心印象",
      "已被观众确认的魅力",
      "尚未被理解的一面",
      "已过度使用的表现方式",
      "当前舆论风险",
      "最近更新依据",
    ]],
    updateConfig: { ...standardUpdateConfig },
    exportConfig: exportConfig({
      entryName: "偶像公众印象",
      keywords: "偶像姓名",
      extraIndexEntryName: "偶像公众印象索引",
      extraIndexColumns: ["偶像姓名", "当前核心印象"],
      extraIndexColumnModes: {
        偶像姓名: "both",
        当前核心印象: "index_only",
      },
      injectionTemplate: "<偶像公众印象>\n$1\n</偶像公众印象>",
      extraIndexInjectionTemplate: "<偶像公众印象索引>\n$1\n</偶像公众印象索引>",
      depth: 9000,
      indexDepth: 9000,
      order: 11000,
      indexOrder: 9000,
    }),
    orderNo: 4,
  },

  sheet_business_history: {
    uid: "sheet_business_history",
    name: "营业履历表",
    sourceData: {
      note: `【表用途】
记录偶像已经完整结束的公开营业及其因果过程。每场营业一行，相同 business_id 只能存在一行。

【列定义】
列1=row_id（自动生成，禁止AI填写或修改）
列2=营业编号 business_id（必须使用前端提供的唯一编号）
列3=轮次与日期 round_date
列4=偶像姓名 idol_name
列5=营业类型 business_type
列6=节目或活动名称 business_name
列7=本轮企划目标 plan_goal
列8=录制前总体策略 pre_strategy
列9=计划外事件 unexpected_event
列10=制作人临场指示 producer_instruction
列11=偶像如何执行 idol_response
列12=节目高光 highlight
列13=最终公众反应 audience_response
列14=形成的新印象 impression_change
列15=可供后续回收的伏笔 followup_hook

【填写约束】
- 只有营业完整结束并产生最终结果时才允许写入；直播或节目的中间分段不得提前新增。
- business_id 必须来自前端，禁止AI自行编造、修改或复用。
- 同一场营业只结算、入库一次；相同 business_id 已存在时禁止再次 INSERT。
- 没有计划外事件或后续伏笔时填写“无”。
- 不得自行生成粉丝数、压力值或其他前端结算数值。
- 训练、外出、制作人工作和私人交流不属于营业履历。`,
      initNode: `第一场公开营业完整结束、已有最终观众反应，并且前端提供了明确 business_id 时初始化。禁止填写 row_id。

SQL示例：
INSERT INTO business_history (
  business_id,
  round_date,
  idol_name,
  business_type,
  business_name,
  plan_goal,
  pre_strategy,
  unexpected_event,
  producer_instruction,
  idol_response,
  highlight,
  audience_response,
  impression_change,
  followup_hook
)
SELECT
  'nia-training-business-af6b925e-7b0d-46f4-b9cf-f87614336701',
  'Round 1 / Day 4',
  '花海咲季',
  'online_live',
  '首期日常直播',
  '呈现咲季专业实力之外的自然可爱',
  '通过训练与日常内容呈现真实反差',
  '观众集中调侃咲季展示的自制便当外观',
  '建议她现场试吃，用直观反应回应质疑',
  '咲季接受指示，当众试吃并说明营养设计',
  '她红着脸坚持证明便当味道没有问题',
  '猎奇调侃逐渐转为对她认真好胜反应的喜爱',
  '增加了被激将后会认真自证的可爱反差',
  '观众开始期待她参加正式综艺节目'
WHERE NOT EXISTS (
  SELECT 1 FROM business_history
  WHERE business_id = 'nia-training-business-af6b925e-7b0d-46f4-b9cf-f87614336701'
);`,
      insertNode: `每当一场新的公开营业完整结束，且表中不存在相同 business_id 时新增一行。禁止填写 row_id。
必须使用前端提供的真实 business_id，并通过 WHERE NOT EXISTS 防止重复。SQL列名和顺序必须与初始化示例一致。
同一营业的不同生成段落不得分别新增记录。`,
      updateNode: `营业履历原则上不得因后续剧情改写。
只有同一 business_id 的正式结算补充了此前缺失信息、前端提供正式修正结果，或数据库存在明确内容错误时才允许更新。
不得修改 row_id、business_id、idol_name 或 round_date。

SQL示例：
UPDATE business_history
SET
  audience_response = '节目播出后，观众对咲季认真争胜与被夸后得意的反差反响良好',
  impression_change = '在可靠好胜的印象之外，增加了容易被真诚夸奖打动的亲切感',
  followup_hook = '主持人希望邀请她参加更高难度的竞赛企划'
WHERE business_id = 'nia-training-business-af6b925e-7b0d-46f4-b9cf-f87614336701';`,
      deleteNode: "禁止AI因时间经过、偶像退场、企划结束或后续印象变化而删除履历。只有用户明确要求清理错误或重复记录时才允许删除。",
      ddl: `CREATE TABLE IF NOT EXISTS business_history ( -- 营业履历表
  row_id INTEGER PRIMARY KEY AUTOINCREMENT, -- 行号
  business_id TEXT NOT NULL UNIQUE, -- 营业编号
  round_date TEXT NOT NULL, -- 轮次与日期
  idol_name TEXT NOT NULL, -- 偶像姓名
  business_type TEXT NOT NULL, -- 营业类型
  business_name TEXT NOT NULL, -- 节目或活动名称
  plan_goal TEXT, -- 本轮企划目标
  pre_strategy TEXT, -- 录制前总体策略
  unexpected_event TEXT, -- 计划外事件
  producer_instruction TEXT, -- 制作人临场指示
  idol_response TEXT, -- 偶像如何执行
  highlight TEXT, -- 节目高光
  audience_response TEXT, -- 最终公众反应
  impression_change TEXT, -- 形成的新印象
  followup_hook TEXT -- 可供后续回收的伏笔
);`,
    },
    content: [[
      "row_id",
      "营业编号",
      "轮次与日期",
      "偶像姓名",
      "营业类型",
      "节目或活动名称",
      "本轮企划目标",
      "录制前总体策略",
      "计划外事件",
      "制作人临场指示",
      "偶像如何执行",
      "节目高光",
      "最终公众反应",
      "形成的新印象",
      "可供后续回收的伏笔",
    ]],
    updateConfig: { ...standardUpdateConfig },
    exportConfig: exportConfig({
      entryName: "营业履历",
      keywords: "偶像姓名,营业编号",
      extraIndexEntryName: "营业履历索引",
      extraIndexColumns: ["轮次与日期", "偶像姓名", "节目或活动名称", "营业编号", "形成的新印象"],
      extraIndexColumnModes: {
        轮次与日期: "index_only",
        偶像姓名: "both",
        节目或活动名称: "index_only",
        营业编号: "both",
        形成的新印象: "index_only",
      },
      injectionTemplate: "<营业履历回溯>\n$1\n</营业履历回溯>",
      extraIndexInjectionTemplate: "<营业履历索引>\n$1\n</营业履历索引>",
      depth: 8000,
      indexDepth: 8000,
      order: 12000,
      indexOrder: 10000,
    }),
    orderNo: 5,
  },
};

writeFileSync(outputPath, `${JSON.stringify(template, null, 2)}\n`, "utf8");
console.log(`Wrote ${outputPath.pathname}`);
