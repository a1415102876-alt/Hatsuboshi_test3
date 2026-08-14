# Director Job Mismatch 修复设计

**日期：** 2026-07-13  
**范围：** 同 saveScope 宿主状态回灌、Director mismatch 终止语义、次 API 调试显示

## 问题

Director 已收到可解析、可验证的有效回复，但回复提交前 `activeJob` 的 identity 被宿主 `character` 快照回灌改写，导致 `handleWorldDirectorReply()` 返回 `director_job_mismatch`。现有 mismatch 分支释放 owner 后立即调用 `resumeWorldDirectorAfterRelease()`，从而持续创建新请求。调试面板又把 `acquire`、`release` 等事件统一显示成“回复”，造成“0 字无效回复”的误判。

## 目标语义

### 宿主 character 同步

- 首次宿主同步：读取 chat metadata，建立 `activeHostSaveScope`，并把持久化中的在途 Director job 转为可恢复状态。
- saveScope 变化：释放旧 scope owner，切换本地存储并读取新 scope 的宿主存档。
- 当前页面内、相同非空 saveScope 的重复同步：不替换 `state`，不调用 `ensureStateShape({ recoverDirectorAttempt: true })`，不改变 primary/secondary owner、pending、日志或业务状态；只更新 `boundCharacter` 中的角色身份信息并保持 host ready。
- 页面刷新后内存变量会重新初始化，因此刷新后的第一次同步仍属于“首次宿主同步”，不会被同 scope 快速路径误判。

### Director mismatch

- owner 与返回 envelope 必须继续精确匹配。
- 如果 owner 匹配但 `activeJob` identity 不匹配，释放该 owner并记录 `director_job_mismatch`。
- mismatch 分支不得立即调用 `resumeWorldDirectorAfterRelease()`，不得自动重发。
- 若当前 `activeJob` 仍处于 `generating` 或 `validating` 且已无精确 owner，复用 `reconcileWorldDirectorAttempt("director_job_mismatch")` 将其转为 `retryable_failed`；用户可手动重新推演。
- 不提交收到的旧回复，不修改 Direction、Pressure、revision、Chronicle、时间或数值。

### 调试显示

- `send` 显示为发送。
- `acquire` 显示为取得通道，不再显示成“0 字回复”。
- `release` 显示释放原因。
- `reject` 显示拒绝原因。
- 只有 `reply` 显示有效性、解析状态和文本长度。
- 仍只显示 requestId 后缀，不记录 Prompt、正文、API Key 或完整 identity。

## 代码范围

- `app.js`
  - `applyHostCharacter()`：增加 same-scope in-memory 快速路径。
  - `handleWorldDirectorReply()`：mismatch 后停止自动重发并转为可手动恢复。
  - `renderSecondaryApiDebug()`：按 phase 渲染。
- `tests/world-director-integration.test.mjs`
  - 有效回复前发生同 scope character 同步时仍可提交。
  - mismatch 只释放精确 owner且不自动重发。
- `tests/chat-metadata-save.test.mjs` 或新增聚焦执行测试
  - 首次/切 scope 仍载入远端；同 scope 重复同步不覆盖内存状态。
- `tests/secondary-channel-owner.test.mjs`
  - acquire/release/reject/reply 的显示语义。

不修改 `st.html` 保存顺序、Director Prompt、validator、Pressure 规则、数值结算或 Chronicle 语义。

## 验收

1. 同一聊天中发送 Director 后再次收到 `character`，`activeJob.jobId/requestId/saveScope` 保持不变。
2. 有效 Director 回复只提交一次，revision 从 0 增至 1，停止自动重试。
3. 人为制造 job mismatch 时 owner 被精确释放，job 进入可重试状态，但不会自动发送。
4. 刷新页面与切聊天仍恢复各自宿主存档。
5. 调试日志不再出现由 acquire 伪装出的“0 字回复”。
6. Director 专项测试通过，全量测试不增加既有 6 项失败。
