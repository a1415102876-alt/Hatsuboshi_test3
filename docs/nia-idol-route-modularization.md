# N.I.A 偶像路线模块化方案

## 目标

把当前花海咲季 N.I.A 流程拆成“通用引擎 + 偶像路线包”。以后接入新偶像时，只新增路线配置、剧情提示词和美术资源，不复制或改写日程、营业、试镜、恢复、结算等核心状态机。

本轮迁移只调整代码组织，不改变现有玩法、咲季剧情、数值和存档格式。

## 模块边界

### 通用引擎继续负责

- N.I.A 轮次、天数和日程状态机。
- 日程分享、手机回复、失败重试和刷新恢复。
- 训练、上课、制作人工作、晚间公寓和外出。
- 直播、广播、初星圈、电视节目等营业流程。
- 四段试镜、排名、奖励、赛后复盘和 FINALE 流程。
- 主模型通道、回复解析、存档和界面切换。
- 营业等级、粉丝门槛和通用数值规则。

### 偶像路线包负责

- 偶像身份、资源路径和显示名称。
- 从《初》或其他前置剧本继承的好感度与关系摘要。
- 每轮固定对手、头像、舞台名及是否为 FINALE。
- 路线专属固定剧情、触发条件、播放顺序和 UI 标题。
- 每话剧情提示词或提示词构建器。
- 角色可用的立绘情绪功能词与输出约束。
- 路线专属连续性事实、关键约定和不可改写事实。

### 世界书继续负责

- 人物性格、说话方式、关系经历和世界观事实。
- 角色长期行为约束及立绘情绪标记规则。
- 不负责决定前端按钮、轮次推进、奖励和剧情是否已经播放。

前端路线包是流程权威来源，世界书是角色扮演和叙事权威来源；两者不互相替代。

## 建议目录

```text
nia/
  route-schema.js
  routes/
    registry.js
    hanami-saki.js
    {new-idol}.js
  episodes/
    hanami-saki.js
    {new-idol}.js
```

路线文件使用经典脚本注册到 `globalThis.HatsuNiaRoutes`，同时兼容 `index.html` 独立入口和 `st.html` SillyTavern 内嵌入口。

## 路线配置草案

```js
HatsuNiaRoutes.register({
  schemaVersion: 1,
  routeId: "hanami-saki",
  idolName: "花海咲季",

  assets: {
    avatar: "./assets/avatars/hanami-saki.png",
    standeeId: "hanami-saki"
  },

  inheritedAffinity: {
    value: 100,
    max: 100,
    tag: "AFF_SAKI_100",
    relationshipSummary: "制作人与咲季已经是共同创造奇迹、共同见证她与佑芽未来的高度信赖搭档。"
  },

  rounds: [
    {
      round: 1,
      stageName: "第一轮试镜",
      opponent: null
    },
    {
      round: 2,
      stageName: "第二轮试镜",
      opponent: {
        id: "kaya-rinha",
        name: "贺阳燐羽",
        avatar: "./assets/avatars/kaya-rinha.png"
      }
    },
    {
      round: 3,
      stageName: "FINALE",
      isFinale: true,
      opponent: {
        id: "hanami-ume",
        name: "花海佑芽",
        avatar: "./assets/avatars/hanami-ume.png"
      }
    }
  ],

  episodes: [
    {
      eventId: "nia-saki-fans-5000",
      episode: 12,
      trigger: { type: "fans", threshold: 5000 },
      title: "N.I.A · 好感剧情",
      subtitle: "第12话"
    }
  ],

  promptProvider: "hanami-saki"
});
```

实际实现时所有路线配置需在注册阶段校验并冻结，不能让运行时状态意外修改静态路线资料。

## 通用触发类型

首版只支持现有流程已经需要的触发类型：

| 类型 | 含义 | 必要参数 |
| --- | --- | --- |
| `fans` | 达到粉丝门槛 | `threshold` |
| `round_day_complete` | 指定轮次某日结束 | `round`, `day` |
| `audition_eve` | 指定轮次试镜开始前 | `round` |
| `audition_complete` | 指定轮次试镜结算完成 | `round` |
| `first_business_complete` | 指定轮次第一次营业完成 | `round` |
| `schedule_complete` | 指定轮次全部日程完成 | `round` |
| `finale_complete` | FINALE 结算完成 | 无 |

同一触发点存在多话剧情时，按路线包中 `episodes` 的顺序串行播放。核心状态机不再根据 `nia-saki-*` 事件 ID 写专属判断。

## 咲季路线迁移映射

咲季现有事件 ID 必须原样保留，以兼容旧存档：

| 话数 | 事件 ID | 触发条件 |
| --- | --- | --- |
| 12 | `nia-saki-fans-5000` | 粉丝达到 5000 |
| 13 | `nia-saki-fans-10000` | 粉丝达到 10000 |
| 14 | `nia-saki-round2-audition-eve` | 第二轮第5日结束 |
| 15 | `nia-saki-round2-quartet-opening` | 第二轮试镜前 |
| 16 | `nia-saki-round2-quartet-victory` | 第二轮试镜成功后 |
| 17 | `nia-saki-round3-first-business` | 第三轮第一次营业后 |
| 18 | `nia-saki-round3-finale-eve` | 第三轮日程完成、FINALE 前 |
| 19 | `nia-saki-finale-sisters-aftermath` | FINALE 后，先播放 |
| 20 | `nia-saki-finale-partner-epilogue` | FINALE 后，接第19话播放 |

咲季固定继承：

- 好感度：`100/100`。
- 阶段标签：`AFF_SAKI_100`。
- 第二轮固定对手：贺阳燐羽。
- FINALE 固定对手：花海佑芽。

## 接入新偶像时需要提供的资料

### 必需资料

1. 偶像基础信息
   - 完整姓名、路线 ID、角色卡或世界书中的准确名称。
   - N.I.A 从哪个前置剧情接续。

2. 继承关系
   - 开始 N.I.A 时的好感度数值及上限。
   - 好感阶段标签，例如 `AFF_XXX_100`。
   - 制作人与偶像当前关系的一段权威摘要。
   - 已经定下的重要约定、共同经历和未解决矛盾。

3. 轮次设定
   - 每轮固定对手；没有固定对手可留空。
   - 对手头像路径。
   - FINALE 对手和舞台名称。
   - 是否沿用咲季的轮次天数、奖励和营业解锁规则。

4. 固定剧情
   - 每话原始剧情文本文件。
   - 触发节点与播放先后顺序。
   - 哪些事实必须保留，哪些部分允许 AI 根据当前经历改写。

5. 角色输出规则
   - 角色可用的立绘功能词清单。
   - 功能词到实际立绘资源的映射。
   - 对话 `speaker` 的准确格式。
   - 容易被 AI 写错的性格和关系约束。

6. 基础美术
   - 偶像头像。
   - 常用差分立绘。
   - 固定对手头像；剧情需要时提供对手立绘。

### 可选资料

- 路线专属营业主题、广播嘉宾池和电视节目方向。
- 路线专属 SNS 预设图。
- 专属场景背景和 BGM。
- 路线专属训练名称、属性倾向或数值规则。
- 特殊试镜规则；不提供则沿用通用四段试镜。

## 最小交付模板

以后可以按下面格式交付新路线，不需要描述代码如何修改：

```text
偶像姓名：
路线 ID：
前置剧情结束节点：
N.I.A 初始好感度：
好感阶段标签：
继承关系摘要：
关键约定与回忆：

第一轮对手：
第二轮对手：
FINALE 对手：

固定剧情：
- 第X话：文件路径 / 触发节点 / 必须保留的事实

头像路径：
立绘目录：
情绪功能词规则：

沿用通用规则：
- 日程天数：是/否
- 营业等级：是/否
- 四段试镜：是/否
- 奖励数值：是/否
```

## 注册表接口

```js
HatsuNiaRoutes.register(route);
HatsuNiaRoutes.getById(routeId);
HatsuNiaRoutes.getByIdol(idolName);
HatsuNiaRoutes.getDefaultRoute();
HatsuNiaRoutes.getRound(idolName, roundNumber);
HatsuNiaRoutes.getEpisodes(idolName);
HatsuNiaRoutes.getEpisode(idolName, eventId);
```

未知偶像不能静默回退到咲季路线。找不到路线时应保留通用 N.I.A 能力，但不注入咲季好感、对手、剧情或提示词，并在开发控制台给出明确警告。

## 存档兼容原则

- 不改现有 `state.nia` 主结构。
- 不改咲季现有固定剧情事件 ID。
- 旧档没有 `routeId` 时，通过规范化后的 `state.idol` 查找路线。
- 新档可额外保存 `routeId`，但运行时仍验证它和当前担当一致。
- 路线包只保存静态配置，已播放事件仍由存档状态记录。
- 未注册的新偶像不得被强制改回花海咲季。
- 路线升级后，已完成的剧情和结算不得重复触发。

## 加载顺序

两套入口必须保持同一顺序：

1. `nia/routes/registry.js`
2. `nia/episodes/hanami-saki.js`
3. `nia/routes/hanami-saki.js`
4. N.I.A 各类 core/API
5. `app.js`

`index.html` 使用普通 `<script>` 加载注册表与路线包；`st.html` 在注入 milestone、audition 和 `app.js` 前 fetch 并注入相同文件。

## 迁移顺序

1. 建立注册表、schema 和咲季路线包，不切换现有调用方。
2. 将好感继承改为读取当前路线。
3. 将试镜舞台名、固定对手和 FINALE 判断改为读取 `rounds`。
4. 将第12至20话队列和触发条件改为读取 `episodes`。
5. 将咲季每话提示词构建器迁到 `nia/episodes/hanami-saki.js`。
6. 删除核心代码中剩余的咲季强制选择和事件 ID 分支。
7. 使用一条最小测试路线验证未知偶像不会继承咲季内容。

每一步完成后都应保持咲季现有流程可运行，避免一次性重写整个 N.I.A。

## 验收标准

- 咲季旧存档可以继续推进第1轮至 FINALE。
- 第12至20话触发顺序、条件和事件 ID 不变。
- `AFF_SAKI_100` 继续进入咲季所有 N.I.A 主模型请求。
- 第二轮仍固定贺阳燐羽，FINALE 仍固定花海佑芽。
- 新路线只通过注册配置即可获得通用日程、营业和试镜。
- 未知偶像不会出现咲季姓名、好感标签、剧情或固定对手。
- `index.html` 与 `st.html` 都能正确加载路线注册表。
- 路线配置缺字段、事件 ID 重复、轮次重复或 trigger 非法时，注册阶段直接报错。
- 定向测试、修改文件语法检查和 `git diff --check` 全部通过。
