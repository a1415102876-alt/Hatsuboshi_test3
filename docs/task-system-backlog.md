# 沙盒任务系统 · 进度与待办清单

> 用途：Agent 会话中断后，开新会话时把本文 + `AGENTS.md` 交给 Agent，即可从当前进度继续。
> 最后更新：2026-06-29（P0～P6 已完成，剩 P5/P7）

---

## 一句话目标

在 **沙盒模式**（`launchMode === "sandbox"`）内实现三套任务：**主线**（你定死剧情）、**支线**（每日偶像工作，次 API 后接）、**校园**（上课+训练每日合计 3 次）。**任务专用 UI 外接，后置**；当前只做内核与钩子。

---

## 已定设计（勿随意改）

| 项 | 决定 |
|----|------|
| 范围 | 仅沙盒；经典 22 天育成 / First Live 后自由模式本阶段不动 |
| 数值 | 与主育成同一套 `stamina / stress / trust / Vo / Da / Vi / growth`（不用独立 sandboxStats） |
| 校园课 | 上课+训练 **合计每天 3 次**；翘课无额外惩罚，不做=机会损失 |
| 支线 | 每天 3 条偶像工作；失败档有最小安慰奖；次 API **尚未做**，先用静态池 |
| 金钱 | 先 `wallet.money` 记账；商店后做 |
| 主线并行 | scout 成功后三条个人主线 **同时 active**，可同步推进 |
| 美铃和好 | **AI 判定**；和好时输出 `【初星任务完成】temari_main_02`（或 `<quest_complete id="temari_main_02" />`） |
| GKMS 参考 | 手毬好感 1～10 话文本在 `e:\GKMS.SKILL\TTMR\好感剧情\手毬\` |

### 手毬前期三条个人主线（GKMS 1～10 参考）

| ID | 矛盾 | 完成方式（当前实现） |
|----|------|---------------------|
| `temari_main_01` | 体力锻炼到能在舞台上唱完 | stamina≥85、Vo≥baseline+40、野外舞台试唱 flag |
| `temari_main_02` | 和美铃和好 | AI 标签 `temari_main_02` |
| `temari_main_03` | 饮食与体态 | Vi≥baseline+35、stress≤40、饮食方案 flag、健康餐≥2 次 |

### 主线链

```
scout_temari（物色成功，邀请剧情结束）
  → temari_main_01 / 02 / 03 并行 active
  → （未来）Lv11+ 主线、手毬个人线后续章节
```

---

## 已完成（P0）

- [x] `tasks/sandbox-tasks.js` — `HatsuTasks` 模块
- [x] `state.tasks` 结构与 `ensureStateShape` 迁移
- [x] scout 开学指引 → `scout_temari` active
- [x] 邀请剧情结束 → scout 完成 + 三条个人主线并行解锁 + baseline 快照
- [x] AI 回复解析任务完成标签（正文内标签会被剥掉不显示）
- [x] 主线①：野外舞台（`outstage`）地图选项收尾后 `outstage_full_song`
- [x] 主线①③：数值门槛检测（上课/训练结算后、`applyAiReply` final 时）
- [x] `getTaskPanelSnapshot()` — 给外接 UI 只读
- [x] `index.html` / `st.html` 加载 `tasks/sandbox-tasks.js`
- [x] `tests/tasks-sandbox.test.mjs`（6 项）
- [x] `produceDev` 手测：`getTaskSnapshot`、`markDietPlan`、`recordHealthyMeal`、`completeQuestTag`、`setCampusUsed`

### P1 已完成（校园每日 3 次）

- [x] 上课+训练合计每天 3 次，仅沙盒计数
- [x] 地图/设施入口与行动栏在用尽后禁用
- [x] `getTaskPanelSnapshot().campus.remainingToday`

### 关键文件

| 路径 | 说明 |
|------|------|
| `tasks/side-pool.js` | 支线静态池、四档奖励表 |
| `app.js` | 钩子：`processSandboxQuestFromReply`、`notifyQuestCompletions`、`onScoutInviteComplete` 等 |
| `tasks/sandbox-tasks.js` | 任务状态、判定、快照、门槛常量、支线结算 |
| `tests/tasks-sandbox.test.mjs` | 回归测试 |
| `docs/task-system-backlog.md` | 本文 |

### 门槛常量（`HatsuTasks.THRESHOLDS`）

- 主线①：`staminaMin 85`，`voGain 40`
- 主线③：`viGain 35`，`stressMax 40`，`healthyMealsMin 2`

### 验证命令

```powershell
cd public/hatsu-produce-local
node --check app.js
node --test tests/tasks-sandbox.test.mjs
```

### 手测速查

1. 沙盒模式 → 走完邀请进地图
2. 控制台：`produceDev.getTaskSnapshot()` — 三条 `active`，scout `completed`
3. 模拟和好：`produceDev.completeQuestTag("temari_main_02")`
4. 模拟饮食：`produceDev.markDietPlan()` + `produceDev.recordHealthyMeal(2)`
5. 主线①：调数值 + 野外舞台探索一轮选项后看是否完成

---

## 待办清单（按推荐顺序）

### P1 · 校园每日 3 次

- [x] `state.tasks.campus.usedCount` 与 `postLiveDay` 同步（换日重置）
- [x] 沙盒混合校园：每次 `settleAction(lesson|training)` 在 `usedCount < 3` 时 +1
- [x] 满 3 次后：设施入口禁用 / toast「今日校园次数已用完」
- [x] 与 `HYBRID_FACILITY_ACTION_MINUTES`（+60 分）行为保持一致
- [x] scout 邀请完成后可进上课/训练设施（`inviteComplete` 后开放设施入口）
- [x] 测试：`tests/tasks-sandbox.test.mjs` 校园用例

### P2 已完成（支线静态池）

- [x] `tasks/side-pool.js` — 12 条静态模板（tag：stamina / syngup / diet / stage）
- [x] 日刷新：`postLiveDay` 变更 / `syncSideQuestDay` 抽 3 条
- [x] 四档结算表：失败 / 勉强 / 完成 / 完美 → `money` + 微量 Vo/Da/Vi
- [x] 玩家选档 UI：`sideQuestOverlay` 四按钮 overlay
- [x] 失败档安慰奖 80 初星币（非 0）
- [x] `tag=diet` 且档位≥完成时 `recordHealthyMeal`（主线③）
- [x] 地图「今日工作」按钮（邀请完成后显示）
- [x] `produceDev.refreshSideQuests` / `applySideTier`

### P2 · 支线（静态池，无次 API）

- [x] `tasks/side-pool.js` 或配置表：每日 3 条模板（可带 tag：`stamina` / `syngup` / `diet`）
- [x] 日刷新：`advanceFreeModeToNextDay` / `postLiveDay` 变更时抽 3 条
- [x] 四档结算：失败（安慰奖）/ 勉强 / 完成 / 完美 → 前端表驱动 `money` + 微量 Vo/Da/Vi
- [x] 玩家选档 UI（event overlay 四按钮，非外接任务 UI）
- [x] 失败档 ≠ 0 奖励

### P3 已完成（主线玩法挂钩）

- [x] 主线③：`diet_plan_active` — 食堂/P科/特教地图选项关键词 + AI `【初星任务标记】diet_plan_active`
- [x] 主线③：`healthy_meal_count` — 食堂/小卖部健康餐选项 + 支线 diet 档（P2）+ AI `【初星任务标记】healthy_meal`
- [x] 主线②：和美铃 prompt 片段写入 `buildMapLocationExplorePrompt`（`buildSandboxMainQuestPromptBlock`）
- [x] 主线①：进度提示对齐 GKMS 5/6/9 话；野外试唱关键词 + AI `【初星任务标记】outstage_full_song`
- [x] `state.tasks.main[id].step` 多段节点（0～3）

### P3 · 主线内容挂钩（玩法，非 UI）

- [x] 主线③：`diet_plan_active` 由指定 VN/地图节点触发（非仅 dev）
- [x] 主线③：`healthy_meal_count` 由食堂探索健康选项 / 支线 tag 累计
- [x] 主线②：和美铃相关 prompt 片段（SyngUp、食堂同场）写入 `buildMapLocationExplorePrompt` 或专用主线 prompt
- [x] 主线①：提示文案对齐 GKMS 第 5/6/9 话（体力、Live 不安）
- [x] 可选：主线进度写入 `state.tasks.main[id].step` 多段节点（目前 mainly status + flags）

### P4 已完成（次 API 支线生成）

- [x] `st.html` 桥接 `sendSecondaryPrompt` → OpenAI 兼容 `/chat/completions`（不写入角色卡对话）
- [x] `tasks/side-quest-api.js` 每日 3 条 + 四档文案 prompt/解析
- [x] 失败回退静态池（P2）
- [x] 今日工作 overlay 内次 API 配置面板
- [x] `produceDev.setSecondaryApi` / `forceSideQuestApi`

### P4 · 次 API 支线生成

- [x] SillyTavern / `st.html` 桥接次 API 通道（参考 tavernlike `api-router` 思路）
- [x] 每日 3 条由次 API 生成摘要 + 情境；次 API 出四档选项文案
- [x] 档位 → 奖励仍由前端表结算（AI 不写具体数字）

### P5 · 商店

- [ ] `wallet.money` 消费点
- [ ] 与地图 / 外出 / 道具挂钩（设计未定）

### P6 已完成（外接任务 UI）

- [x] `taskPanelOverlay` 独立面板，只读 `getTaskPanelSnapshot()`
- [x] 三区：主线 / 今日工作(3) / 校园(剩余 x/3)
- [x] 地图「任务」按钮；「打开今日工作结算」调 `openSideQuestOverlay`

### P6 · 外接任务 UI

- [x] 独立面板读取 `getTaskPanelSnapshot()`
- [x] 三区：主线 / 今日工作(3) / 校园(剩余 x/3)
- [x] 不接业务逻辑，只调已有 action / overlay

### P7 · 主线剧本表（你填内容）

- [ ] 手毬 Lv11+ 主线章节
- [ ] 各 `step` 的 VN 文本 / `storyId`（GKMS 文本作 reference，非逐句复制要求）
- [ ] 三条前期主线与 GKMS 话数对照表（1～3 饮食、4～5 体力/SyngUp、8～10 美铃/和好）

---

## 给新会话 Agent 的指令模板

复制下面一段即可：

```
继续 hatsu-produce-local 沙盒任务系统。先读：
- public/hatsu-produce-local/docs/task-system-backlog.md
- public/hatsu-produce-local/AGENTS.md（若在上级目录）
- .cursor/skills/hatsuboshi-produce-frontend/SKILL.md

P0 已完成。请从 backlog 里的 P___ 开始实现。
约束：仅沙盒、中文无 emoji、数值前端结算、改 app.js 要 node --check + 相关 tests。
任务 UI 外接后置，不要先做专用任务面板。
```

---

## 已知缺口 / 注意

- `README.md` 仍写 18 天，代码为 22 天 First Live（文档滞后，与任务无关）
- 旧存档：`syncSandboxQuestProgress` 在加载时若已有 `inviteComplete` 会自动补 scout 完成 + 解锁三条主线（仅一次）
- 任务完成 toast 在加载时若数值已达标可能触发（极端测试存档）
- 次 API、商店 **均未做**；外接任务 UI 已完成（P6）

---

## 相关对话设计摘要

- 三套任务定义：主线（迫切矛盾）、支线（每日偶像工作）、校园（每日 3 次课/训）
- scout 手毬为首条主线；scout 成功解锁个人主线三条并行
- 外接 UI 显式后置
- GKMS.SKILL 中 1～10 话为剧情参考，非游戏内等级条
