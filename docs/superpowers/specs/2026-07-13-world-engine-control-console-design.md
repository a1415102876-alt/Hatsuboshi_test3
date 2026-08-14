# 初星世界引擎底层控制台设计

## 目标

将“初星世界引擎”作为公共世界生成系统的统一观察与调节入口。次 API、公共世界、委托生成和 Director 共用同一套底层运行通道，因此配置与诊断不再放在玩家侧的委托弹窗中。

本次同时解决两个已确认问题：

- 手动重新生成委托会意外继续一个 `dirty / retryable_failed` Director job。
- Director 请求超过前后端超时后仍可能停留在 `generating`，用户无法判断请求是否发出、是否返回或是否被门禁拒绝。

## 产品边界

### 玩家侧

委托系统继续负责：

- 展示本日委托。
- 接受、查看和完成委托。
- 显示委托来源与生成状态。
- 提供“重新生成本日委托”操作。

委托系统不再展示：

- 次 API 地址、模型或 API Key。
- 次 API 连接测试。
- 底层请求日志。
- Director 运行与恢复操作。

### 世界引擎侧

世界引擎继续保留三个常用视图：

- `今日`：本日叙事方向。
- `压力线`：当前 Drama Pressure。
- `运行`：模块状态、当前任务、revision、收发结果与恢复状态。

右上角增加齿轮按钮，进入独立的“高级设置”视图。高级设置与常用视图分离，避免普通玩家误改接口或终止任务。

## 高级设置界面

高级设置使用手机应用内部的全屏滚动视图，不增加第四个顶部 Tab。

包含以下区域：

1. `次 API`
   - 启用开关。
   - 接口地址。
   - 模型。
   - API Key 密码输入框。
   - 保存配置。
   - 测试连接。

2. `生成模块`
   - 公共世界：当前来源和状态。
   - 委托生成：当前来源和状态。
   - Director：启用状态、dirty 状态和当前 job 状态。

3. `手动操作`
   - 重新生成本日委托。
   - 手动推演本日走向。
   - 刷新并对账当前运行状态。

4. `连接诊断`
   - 当前 owner kind。
   - owner 已运行时长。
   - saveScope 是否匹配。
   - requestId 短后缀。
   - 最近 send、reply、reject、release 和 timeout 原因。
   - Prompt 长度与回复长度，不展示正文。

高级设置不得展示 Prompt、回复正文、完整 requestId、完整 leaseId 或 API Key 明文。

## 委托重新生成语义

“重新生成本日委托”必须只表达委托刷新，不得自动触发 Director。

统一世界层模式仍可复用现有 Daily World 生成请求以获得委托数据，但该请求携带运行时选项 `suppressDirectorFollowup: true`。它完成、失败或解析失败后均不得调用 `maybeRequestWorldDirector()`。

正常日切生成保持现有语义：公共世界生成完成后可以继续已经准备好的 Director job。

手动 Director 只由“手动推演本日走向”触发。

该选项只保存在当前请求的 runtime metadata 中，不写入存档，不改变 Prompt 文案与输出结构。

## Director 超时与恢复

保留现有两层超时：

- 宿主 fetch：180 秒，返回 `director_timeout`。
- 前端 secondary owner watchdog：210 秒，进入现有失败处理。

增加运行时兜底对账：

- 打开世界引擎、点击刷新或进入运行页时执行对账。
- `generating / validating` job 没有精确匹配 owner 时，转为 `retryable_failed`。
- job 与当前 saveScope 不一致时，转为 `retryable_failed / scope_changed`。
- 精确匹配的 Director owner 已超过 210 秒时，走现有 `handleSecondaryAiReply()` 超时路径，不复制第二套失败状态机。
- 旧 owner 只能由 `jobId + requestId + saveScope` 精确释放。
- 任何恢复都不自动重发。

运行页在 job 或 owner 超过 210 秒后显示“结束卡住的推演”。按钮需要二次确认，并复用同一超时失败入口。正常关闭页面、切换 Tab 或返回手机主页不得结束 job。

## 可观测性

当前 Director 回复在进入专用处理前没有完整记录，身份门禁拒绝也会静默返回。调整后必须记录以下无正文事件：

- `director.acquire`
- `director.send`
- `director.reply_received`
- `director.reply_rejected`
- `director.validating`
- `director.committed`
- `director.retryable_failed`
- `director.release`
- `director.timeout`

每条记录只允许包含时间、kind、状态、时长、文本长度、解析结果、错误原因和标识短后缀。

运行页根据这些记录区分：

- 尚未发送。
- 已发送、等待 API。
- API 返回失败。
- 回复被身份门禁拒绝。
- 回复格式验证失败。
- 已提交。
- 已超时并可重试。

## 数据与兼容性

- 继续使用现有 secondary API 配置字段，不新增配置迁移。
- API Key 继续只保存在现有浏览器本地状态，不写入 Prompt、trace 或宿主聊天正文。
- 旧存档缺少运行诊断字段时按空历史处理。
- 不修改 `persistenceRevision`、`hostSaveSequence`、Director revision 或 Chronicle revision 的语义。
- 不修改现有 Prompt builder、数值结算、时间推进或世界输出解析协议。

## 测试边界

至少覆盖：

- 委托弹窗不再包含 API 配置控件。
- 高级设置能读取、保存和测试现有次 API 配置。
- API Key 不进入诊断记录或渲染 HTML。
- 手动委托重生成在成功、失败和解析失败时均不触发 Director。
- 正常日切公共世界生成仍可触发准备好的 Director。
- 210 秒以上的精确 Director owner 可通过对账走统一超时收尾。
- 旧 owner 不能释放新 owner。
- 收到但被拒绝的 Director 回复会留下无正文诊断记录。
- 普通关闭、返回和切 Tab 不会结束推演。
- 旧存档与现有次 API 配置无需迁移即可继续使用。

## 不在本次范围

- 不拆分多个次 API provider。
- 不引入请求队列或自动重试。
- 不修改委托 Prompt、Director Prompt 或生成协议。
- 不改变委托接受与完成规则。
- 不迁移广播、SNS 或其他玩家功能到世界引擎 UI。
- 不重构 secondary channel owner 状态机。
