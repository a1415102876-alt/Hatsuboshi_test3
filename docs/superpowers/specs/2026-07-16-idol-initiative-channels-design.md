# 偶像主动行为与投递渠道设计

## 目标

补齐世界引擎路线图中尚未实现的 `CharacterIntent`，并让偶像主动行为通过 LINE 私信、初星圈 SNS 和制作人公寓来访三种渠道落地。

本功能复用现有 Director、Storyteller `IncidentCandidate`、事件预算、通知收件箱、主模型所有权、Harness、Recovery 和存档事务，不建立第二套 Initiative 引擎或聊天系统。

## 覆盖角色

主动行为只覆盖：

- 当前所有已签约担当偶像；
- 玩家已认识的其他偶像，包括 LINE 好友或已有关系记录的偶像。

尚未接触、未加入关系网络的偶像不能主动私信、发起针对玩家的 SNS 行为或来访。

## CharacterIntent

每日 Director 输出增加受约束的 `characterIntents`。每个合法角色每天最多一条：

```ts
interface CharacterIntent {
  intentId: string;
  dayKey: string;
  saveScope: string;
  actorId: string;
  targetIds: string[];
  goal: string;
  motive: string;
  urgency: "low" | "normal" | "high";
  visibility: "private" | "public";
  preferredChannels: Array<"phone" | "sns" | "invite">;
  sourcePressureIds: string[];
  sourceRefs: string[];
  publicPostDraft: string;
  expiresDayKey: string;
}
```

意图只能表达角色短期想法、动机、联系目标和渠道偏好。它不能决定玩家回应、行动结果、任务完成、好感度变化、资源、时间或任何权威数值。

Director 验证器必须检查角色已认识、目标存在、Pressure 和 sourceRef 有效、文本有长度上限、SNS 文本只用于 `public` 意图，且所有字段来自允许列表。整份 Director patch 仍保持原子验证和提交。

没有次 API、生成失败或意图全部非法时，使用本地保守回退：只从担当关系、好感阶段、活跃任务和相关 DramaPressure 推导短期意图，不创造新事实，也不阻塞换日。

## 主动候选

不新增独立 `InitiativeCandidate` 队列。Storyteller 将合法 `CharacterIntent` 转换为现有 `IncidentCandidate`，增加以下来源元数据：

```ts
origin: "character_intent";
intentId: string;
```

候选直接使用现有 `phone`、`sns`、`invite` channel、状态机、指纹、冷却、审计和精确所有权。状态中保存一个有上限的主动候选列表，用于同时保留当天最多两个不同渠道候选；它是现有候选集合的持久化视图，不是新事件总线。

### 预算

- 主动行为计入现有每日事件总预算。
- 每日为主动行为保留至少一个合法名额，最多选择两个。
- 没有合法意图时不制造占位事件，未用名额可供普通 Attach/Invite 使用。
- 同一角色每天最多一个主动行为。
- 角色、主题和渠道分别参与冷却与指纹去重。
- 主动候选不能覆盖尚未解决的普通事件候选，也不能绕过 minor/moderate/major 预算。

选择对相同 `planId/dayKey/saveScope/intentId` 必须确定性一致。

## 投递渠道

### LINE 私信

`phone` 候选进入对应偶像的现有 LINE 线程，并显示未读预览。系统不在后台调用主模型。

玩家打开线程时才获取 `phone_chat` 主模型 owner，并使用冻结的意图、候选和角色上下文生成首条消息。通道忙、发送失败或回复非法时保持同一候选未读并允许 Recovery；不得重抽意图或重复投递。

有效首条消息提交后，候选进入 `resolved`，聊天线程继续沿用现有可写私聊功能。

### 初星圈 SNS

`sns` 只接受 `visibility: "public"` 的意图。验证后的 `publicPostDraft` 作为短帖进入当日 SNS 时间线，不调用主模型，不暴露私有 Pressure、任务内部状态或系统术语。

帖子使用稳定 `intentId/candidateId` 去重。成功写入时间线后候选进入 `resolved`。用户界面按普通动态显示，只有世界引擎审计页标记其主动意图来源。

### 公寓来访

`invite` 主动候选只在合法公寓时间和玩家到达制作人公寓后显示门铃入口，不强制打断其他行动，也不自动把偶像加入场景。

玩家可以：

- 接待：获取主模型 owner，创建独立公寓事件回合；
- 稍后：沿用现有 `deferred` 状态和再次提醒规则；
- 婉拒：沿用现有忽略/过期审计。

接待成功后可复用公寓同行聊天表现，但候选的事件回合、Prompt、回复 gate 和 Recovery 必须绑定同一 `intentId/candidateId/saveScope/dayKey`。

## 界面

### 世界引擎

- “今日”页显示各偶像的短期意图摘要、紧迫度和偏好渠道。
- “事件”页显示主动行为预算、候选渠道、当前状态和最近投递记录。
- 内部 ID、完整 Prompt、私有 Pressure 正文和 API 信息不得显示。

### 未读提醒

LINE 主动私信创建后：

- 手机主按钮显示红色数字徽标；
- `1` 到 `9` 显示具体数量，超过九条显示 `9+`；
- LINE 聊天列表和世界引擎同步显示未读状态；
- 单纯打开手机不清除未读；
- 打开对应线程并成功载入主动消息后才清除该条未读。

### SNS 与公寓

主动 SNS 帖沿用普通动态卡片。公寓门铃使用明确入口和接待弹窗，不与玩家主动邀请偶像的按钮混用。

## 安全与事务边界

- 每日 Director 仍是唯一生成 CharacterIntent 的次 API job，不增加按行动后台调用。
- 私信和来访只有在玩家打开或接受时才调用主模型。
- acquire 成功前不写 loading、未读消费、候选状态、聊天消息或公寓场景。
- accepted final 后才原子提交消息、事件正文、候选状态、Chronicle 和必要观察。
- stale request、旧 scope、旧 day、旧 candidate、刷新和切聊天后的回复必须拒绝。
- SNS 发布是本地确定性提交，不占主模型通道。
- CharacterIntent 只作为相关角色 Prompt 的软约束注入，明确写成“倾向或考虑”，不能强迫角色已经行动。

## 存档迁移

旧存档迁移为空 `characterIntents`、空主动候选列表和零未读索引。现有 `pendingCandidate`、recent candidates、Attach/Invite、LINE 消息、SNS Buzz 和公寓状态保持不变。

归一化必须幂等，并按 `saveScope/dayKey` 清理过期意图和候选。

## 验证

测试至少覆盖：

1. 多担当与已认识非担当可生成意图，陌生偶像被拒绝；
2. Director schema、原子 patch、非法引用和本地回退；
3. 存在合法意图时每日主动行为最少一个、最多两个且共享事件预算；
4. 同角色每日上限、渠道冷却、主题指纹和确定性重试；
5. 私有意图不能发布 SNS；
6. LINE 未读徽标 `1-9/9+`、线程级清除和主模型所有权；
7. 私信非法回复、超时、刷新和 Recovery 不重复投递；
8. SNS 稳定 ID 去重与隐私过滤；
9. 公寓门铃的接待、稍后、婉拒、时间合法性和事件 Recovery；
10. 主动候选不覆盖普通未解决候选；
11. 旧存档迁移、scope/day 隔离和幂等归一化；
12. 现有 Director、Storyteller、Attach/Invite、LINE、SNS、公寓、Harness 与世界引擎测试无回归。
