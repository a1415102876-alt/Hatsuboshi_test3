# 初星学园前端当前工作交接

更新时间：2026-07-15

## 1. 工作区与 Git 状态

- 实际目录：`G:\SillyTavern\SillyTavern\public\hatsu-produce-local`
- 当前分支：`codex/world-engine-control-console`
- 主远程：`origin -> https://github.com/a1415102876-alt/Hatsuboshi_.git`
- 测试仓库远程：`hatsuboshi-test -> https://github.com/a1415102876-alt/Hatsuboshi_Test.git`
- 当前工作区有大量已跟踪和未跟踪修改，来自连续完成的 Harness、Shujuku 桥接、衣柜、世界引擎和 Storyteller 工作。
- 新会话不得执行 `git reset --hard`、`git checkout -- .` 或覆盖式同步，也不要删除无法确认来源的未跟踪文件。
- 最近这轮没有提交或推送。

主要修改文件包括：

- `app.js`
- `index.html`
- `st.html`
- `style.css`
- `tasks/sandbox-tasks.js`
- `world/director-api.js`
- `world/director-injection.js`
- `world/director-state.js`
- `world/storyteller/`
- 多个 `tests/*.test.mjs`

## 2. 当前加载方式

SillyTavern 正则楼层中应显式提供资源根目录和宿主生成适配器：

```html
<body>
  <script>
    window.HATSU_ASSET_BASE =
      'http://127.0.0.1:8000/hatsu-produce-local/';

    window.HATSU_HOST_GENERATION_ADAPTER =
      'current_transactional';

    $('body').load(
      'http://127.0.0.1:8000/hatsu-produce-local/st.html'
    );
  </script>
</body>
```

不显式设置 `HATSU_ASSET_BASE` 时，blob iframe 可能读取错误资源路径，表现为行动不触发宿主生成或远程前端无法提取正文。

## 3. Harness 当前状态

Harness Phase 1、Recovery、Phase 1.5 和 Phase 1.6 已实现。

核心能力：

- `state.harness` 持久状态。
- `turnId`、`sessionEpoch`、`persistenceRevision`、`hostSaveSequence`。
- 普通 `lesson/training/rest` 全局单飞锁。
- 当前回复只接受 `activeTurn.requestId`，`requestIds` 仅用于审计。
- 主模型 owner/lease，使用 `requestId + channelLeaseId` 精确释放。
- 普通行动、Recovery、手机、广播、闲聊、偶像互动、手动 Prompt 和非 choice regenerate 已接入 ownership。
- 同 `saveScope` 的宿主保存严格按 `hostSaveSequence` 接收。
- 刷新后的普通行动叙事恢复：新 requestId、保留原 turnId 和冻结 Prompt，不重复结算。
- 关闭恢复弹窗不会自动 abandoned；放弃需要专用按钮和二次确认。
- stale reply 不得写入编年史。

相关文档：

- `docs/harness-preview.md`
- `docs/harness-phase1-completion.md`
- `docs/harness-phase1.5-completion.md`
- `docs/harness-phase1.6-plan.md`
- `docs/harness-recovery-plan.md`

仍未全面迁移的入口包括 gift、经典 First Live、部分地图/委托 continuation 和其他 legacy_main 旁支。不要未经产品语义确认就统一迁移。

## 4. Shujuku 数据库桥接状态

桥接代码和 Harness 适配已并入当前目录，相关计划与验收清单：

- `docs/superpowers/plans/2026-07-11-shujuku-harness-bridge.md`
- `docs/shujuku-harness-manual-acceptance.md`
- `tests/shujuku-harness-bridge.test.mjs`

已知未解决问题：

- Shujuku 开始填表后可能触发 SillyTavern 楼层刷新，导致楼层内前端重新加载。
- 更换浏览器、SillyTavern 环境和关闭数据库后曾仍出现楼层刷新，说明原因不一定只在 Shujuku。
- 该问题目前暂停，没有形成可靠根因，不要把它直接归因于数据库插件。
- 后续应在真实 ST 中记录触发刷新前后的消息事件、DOM 重建、正则执行和插件事件，而不是先改业务代码。

## 5. 立绘衣柜状态

已实现制作人立绘上传、设为当前和 Speaker Name 别名绑定。

- 衣柜入口位于制作人公寓右侧功能区。
- 当前只支持制作人自定义立绘，不扩展偶像换装。
- 用户文件通过 SillyTavern 用户文件接口保存，并有 saveScope 校验。
- 可以给制作人立绘追加多个 Speaker Name，用于匹配 AI 输出中的说话者名称。
- UI 已中文化，并增加显式“添加”按钮。

相关计划位于：

- `docs/superpowers/plans/2026-07-12-portrait-wardrobe-plan.md`
- `docs/superpowers/plans/2026-07-12-producer-portrait-aliases-plan.md`
- `docs/superpowers/plans/2026-07-12-wardrobe-ui-localization-plan.md`

## 6. 世界引擎与 Storyteller 状态

世界引擎已直接集成到当前前端，而不是独立服务。

当前组成：

- World Director：次 API 生成 DailyDirection 与 Drama Pressure。
- Storyteller S0-S5：观察、日计划、候选事件、地图覆盖、反馈质量、通知 Inbox 和重大事件。
- Storyteller 风格混合：王道故事、恋爱故事、怪文书占位，可配置比例。
- 手机内“初星世界引擎”应用：查看 Director、Storyteller、次 API 调试、委托和手动推演。
- Director 输出已有严格 JSON 契约与解析失败诊断。
- 正文 Prompt 可注入当前有效 Director/Storyteller 上下文。

核心目录：

- `world/director-*.js`
- `world/storyteller/`
- `world/director-phone-view.js`
- `docs/superpowers/specs/2026-07-13-storyteller-engine-design.md`
- `docs/superpowers/specs/2026-07-14-storyteller-style-mix-design.md`

当前产品边界：

- Storyteller 负责节奏、事件类别、强度、合法性和事件实例建议。
- 前端保留数值、时间、随机结果、任务和权威状态裁定。
- AI 不得重新判定已结算结果。
- 怪文书风格仍是占位，尚未完成具体议题生成规则。

## 7. 最新完成：校内舞台 First Live

设计与计划：

- `docs/superpowers/specs/2026-07-14-sandbox-first-live-dormitory-design.md`
- `docs/superpowers/plans/2026-07-15-sandbox-first-live-dormitory-plan.md`

地图新增 `campus_stage`，位于讲堂上方。

规则：

- 19:00 后开放。
- 消耗 180 分钟。
- Vo/Da/Vi 各贡献三分之一权重。
- 单项 `<400` 贡献 0%。
- `400-499` 贡献 50%。
- `500-599` 贡献 80%。
- `>=600` 贡献 100%。
- 三项平均得到最终成功率。
- 玩家确认后只进行一次 `Math.random()`，结果被冻结到 active attempt。
- 失败冷却 2 个游戏日，之后可重新挑战。
- 成功同步 `state.firstLive`，并通过现有任务数值检查完成 `first_live_success`。

Harness/AI：

- 使用独立 `sandbox_first_live` owner，不调用经典 `startFirstLive()`。
- lease 必须在随机、时间、日志和任务写入前取得。
- AI Prompt 冻结前端属性、成功率、roll 和结果。
- 回复必须完整包含 `live_pre` 与 `live_post` 两个区块。
- 缺块、截断、空回复或超时进入 `recovery_required`。
- Recovery 使用新 requestId，保留原 turnId、attemptId、Prompt、roll 和结算结果。
- 有效双区块验证完成后才写编年史。
- 当前确认 UI 使用浏览器原生 `window.confirm()`，尚未换成专用视觉弹窗。

主要函数：

- `defaultSandboxFirstLiveChallenge()`
- `normalizeSandboxFirstLiveChallenge()`
- `getSandboxFirstLiveContributionRate()`
- `calculateSandboxFirstLiveSuccessRate()`
- `buildSandboxFirstLiveSettlement()`
- `prepareSandboxFirstLiveAttempt()`
- `confirmSandboxFirstLiveAttempt()`
- `buildSandboxFirstLivePrompt()`
- `extractSandboxFirstLiveNarrative()`
- `startSandboxFirstLiveNarrative()`
- `handleSandboxFirstLiveReply()`

## 8. 最新完成：学生宿舍

地图新增 `student_dormitory`，位于食堂上方。

最终规则：

- 不设 20:00 门禁。
- 只要仍在地图可行动时段内即可进入。
- 休息消耗 120 分钟。
- 复用普通 `rest` Harness、Prompt、AI 和 Recovery。
- 体力恢复 30，上限 100。
- 满体力时拒绝，不创建 Harness、不保存、不推进时间。
- 不占用每日三次校园上课/训练计数。
- 当前没有取消训练次数限制；那是后续独立改造。

主要函数：

- `getHybridFacilityKind()`
- `getHybridFacilityActionMinutes()`
- `openHybridFacility()`
- `updateMapLocationEntryActions()`
- `settleAction()`
- `renderActionButtons()`

## 9. 最近验证结果

最新专项验证：

```text
node --test tests/free-mode.test.mjs
25 tests / 25 pass / 0 fail

node --check app.js
pass

git diff --check
pass
```

First Live、Recovery 与 ownership 组合验证：

```text
node --test tests/free-mode.test.mjs tests/harness-recovery.test.mjs tests/primary-model-ownership.test.mjs
64 tests / 64 pass / 0 fail
```

最近全量测试：

```text
672 tests / 666 pass / 6 fail
```

6 个失败是实施前已有基线：

1. `selected idols are all required in a zero-cost interaction`
2. `producer profile includes gender in state, form, save flow, and prompts`
3. `st.html loader uses a responsive mobile viewport instead of a fixed desktop canvas`
4. `st.html pauses floor hiding when the opening floor is not mounted`
5. `advanceDay only advances schedule from summary round`
6. `day 21 summary round advances into First Live schedule`

## 10. 仍需真实 SillyTavern 验收

自动测试已完成，但以下内容尚未在本轮真实 ST 中完整操作验证：

1. 沙盒 19:00 前舞台按钮禁用，19:00 后可挑战。
2. First Live 确认后只抽一次 roll，刷新或 Recovery 不重抽。
3. 成功后 `first_live_success` 在任务面板完成。
4. 失败后显示冷却，两个游戏日后重新开放。
5. 模型缺少 `live_pre` 或 `live_post` 时进入恢复弹窗。
6. Recovery 新请求正常返回后完成叙事，不再次推进 3 小时。
7. 学生宿舍在早晨即可进入，恢复 30 体力并推进 2 小时。
8. 满体力进入宿舍不推进时间。

## 11. 建议下一步

优先顺序：

1. 在真实 SillyTavern 中完成上面的 First Live 与宿舍手工验收。
2. 若产品体验需要，把 First Live 的原生确认框替换为项目内专用弹窗，显示三项属性、各项贡献率、最终成功率、耗时和失败冷却说明。
3. 给 First Live 补执行级 ownership 测试：通道占用时确认 state、时间、日志和随机调用均不变化。
4. 再处理“取消每日三次训练限制，改由体力和时间限制”的独立设计，不要混入 First Live 修补。
5. Shujuku 楼层刷新问题单独诊断，不要与世界引擎或 First Live 一起修改。

## 12. 2026-07-15 沙盒次 API 启动页与 Storyteller 事件密度

已完成并提交：

- `c2e3233 Add sandbox secondary API setup flow`
- `f1dece6 Add configurable Storyteller event density`
- `1ec2be9 Show daily Storyteller attach audit`
- `8386641 Create Storyteller plan on static sandbox first day`
- `a15b13b Preserve unresolved Storyteller candidates`

### 沙盒次 API 启动页

沙盒启动顺序现为：

`选择担当 → 制作人档案 → 次 API 设置 → 邀请剧情`

新增状态：

- `state.sandbox.apiSetupPending`
- `state.sandbox.pendingIdol`

页面复用 `state.tasks.secondaryApi`、浏览器本地 API Key 和现有 `runSecondaryApiTest()`。测试失败或配置不完整不阻止“保存并继续”；“暂不填写”只保存 `enabled: false`，保留地址、模型和本地 Key。刷新时可根据 pending 状态恢复同一候选担当和设置页面。育成模式流程不变。

### Storyteller 事件密度

默认档位改为“标准”：普通日 `轻微 4 + 中等 3`，共 7 个预算；危机日额外开放重大 1 个。世界引擎高级设置提供：

- 较少：`3 + 2`
- 标准：`4 + 3`
- 较多：`6 + 3`
- 自定义：轻微与中等合计 5 至 12，重大只能为 0 或 1

配置保存在 `state.freeMode.world.storyteller.eventDensityConfig`，只在建立次日 Storyteller Plan 时读取。保存设置不会修改或重建当天计划。平静日不再把普通事件预算压到 5 以下；重大预算仍只在 `crisis_allowed` 生效。

### 今日 Attach 审计

世界引擎“事件”页现在同时显示：

- 轻微、中等、重大各自的已用/总量；
- 今日 Attach 与 Invite 已生成数量；
- Invite 收件箱；
- 今日全部 Attach 的时间、来源行动、地点、类别、强度、事件骨架、参与角色、文风和状态；
- 无 Attach 时最近一次公开的未生成原因。

审计模型由 `world/storyteller/phone-view.js` 合并 `pendingCandidate`、`recentCandidates` 和 `observations`，按当前日期与计划筛选并去重。输出不包含 Prompt、存档 scope、请求/租约标识或内部事件定义 ID。

未处理的 Invite 或 Attach 现在不能被下一次普通行动覆盖，避免候选和审计记录丢失。

### 沙盒首日

`enterSandboxCampusAfterOpening()` 在静态世界池路径完成 daily tick 后建立一次当前 Storyteller Plan。次 API 路径仍由原有异步完成回调建立计划，不重复调用。

### 验证

语法与专项验证：

```text
node --check app.js
node --check world/storyteller/plan.js
node --check world/storyteller/phone-view.js
git diff --check
专项套件：150 / 150 pass
候选生命周期补充套件：65 / 65 pass
```

全量验证：

```text
694 tests / 688 pass / 6 fail
```

6 项失败与修改前基线一致：

1. `selected idols are all required in a zero-cost interaction`
2. `producer profile includes gender in state, form, save flow, and prompts`
3. `st.html loader uses a responsive mobile viewport instead of a fixed desktop canvas`
4. `st.html pauses floor hiding when the opening floor is not mounted`
5. `advanceDay only advances schedule from summary round`
6. `day 21 summary round advances into First Live schedule`

本机没有 Playwright 依赖，以下项目仍需在真实 SillyTavern 手工验收：

1. 沙盒档案提交后显示次 API 页面，刷新后仍停留在该步骤。
2. 测试连接失败后仍可保存并继续。
3. 暂不填写后，在世界引擎高级设置中仍能看到之前填写的地址、模型和 Key。
4. 桌面与手机宽度下，密度控件和 Attach 列表无文字溢出或重叠。
5. 实际完成普通行动后，酒馆 Prompt 出现 `[Storyteller 事件骨架]`，事件页同步出现对应 Attach 状态。

## 13. 新会话建议开场指令

```text
请先阅读 docs/current-handoff.md，并检查当前 git status。
当前分支包含已提交的沙盒次 API 启动页、Storyteller 事件密度与 Attach 审计，不要 reset、checkout 或覆盖现有文件。
先在真实 SillyTavern 中验收沙盒次 API 启动流程、事件密度设置和 Attach 列表；如发现问题，先写复现测试，再做最小修复。
```

## 14. 2026-07-15 亚纱里老师 VN 立绘修复

根因是统一立绘衣柜解析器只识别制作人和 `idols` 中的偶像，`vnStandees` 中的 NPC 无法取得角色键，因此 `resolvePortraitForSpeaker("亚纱里老师")` 返回空 URL。

修复后：

- `getBuiltinPortraitMap()` 将非偶像的 `vnStandees` 条目登记为 `npc:<名称>`。
- `resolvePortraitForSpeaker()` 在制作人/偶像解析失败后，使用已登记的 NPC 内建立绘。
- 亚纱里解析为 `npc:亚纱里老师`，使用 `./assets/novel-standees/asari-sensei.png`。
- 未知 NPC 仍返回空立绘。
- NPC 不进入 `idols`、立绘衣柜角色列表或偶像业务逻辑。

验证：

```text
立绘与 VN 专项：35 / 35 pass
全量：695 tests / 689 pass / 6 fail
```

6 项失败与既有基线一致，没有新增失败。

## 15. 2026-07-15 沙盒 First Live 完整演出流程

根因是沙盒 First Live 虽然一次请求生成了 `live_pre` 与 `live_post`，但有效回复处理器直接把两段拼接到同一个事件窗口，没有调用育成模式已有的 Live Theater。

修复后成功与失败都按以下顺序展示：

```text
live_pre 上台前剧情
-> 玩家点击“Live 开始”
-> 播放当前担当的 Live 视频
-> 视频结束、跳过、加载失败或无视频
-> live_post 演后剧情
-> 返回沙盒
```

实现边界：

- 新增 `sandboxFirstLivePre` 与 `sandboxFirstLivePost` 展示节点。
- 复用现有 `idolLiveVideos`、`triggerWipeTransition()` 与 `playLiveVideo()`。
- 解析后的 `pre`、`post` 和 `presentationStage` 保存在当前 active attempt。
- 沙盒仍只进行一次模型请求，不调用经典 `startFirstLivePostStage()`。
- 不重复抽取 roll、不再次推进 3 小时、不重复任务或冷却结算，也不触发育成模式的自由模式解锁。
- 完整合并正文仍写入行动日志和 Chronicle，但玩家界面按三个阶段依次展示。

验证：

```text
语法：node --check app.js 通过
First Live / VN 专项：59 / 59 pass
First Live / Recovery / ownership 组合：98 / 98 pass
全量：698 tests / 692 pass / 6 fail
```

6 项失败与既有基线一致，没有新增失败。真实 SillyTavern 中仍需手工确认远程 Live 视频能够播放、跳过和在 CDN 加载失败时正常进入演后剧情。
