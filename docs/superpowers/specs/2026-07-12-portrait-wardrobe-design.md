# 自定义立绘与衣柜设计

日期：2026-07-12
状态：已完成交互确认，待书面规格复核

## 1. 目标

在现有初星学园前端中加入制作人和已担当偶像的自定义立绘功能。用户可以在制作人公寓打开衣柜，选择本地图片、预览并调整位置，然后将素材上传到当前 SillyTavern 用户目录并装备到当前聊天存档。

第一版只改变视觉立绘，不修改 Prompt、AI 上下文、数值结算或叙事规则。

## 2. 范围

### 包含

- 制作人公寓中的衣柜入口与衣柜界面。
- 制作人始终可管理。
- 偶像列表只显示当前存档已担当角色。
- PNG、WebP、JPEG 本地预览与上传。
- 缩放、水平位置、垂直位置调整。
- 全局素材库和每个聊天存档独立装备。
- VN 大立绘和公寓同行偶像大立绘替换。
- 文件缺失、索引缺失和旧存档的默认立绘回退。
- 归档素材，不物理删除图片文件。

### 不包含

- 不替换地图、SNS、手机、广播、列表头像。
- 不让 AI 感知服装或立绘变化。
- 不修改 Prompt builder、Harness ownership、Recovery 或主模型请求。
- 不做 AI 抠图、自动裁剪、图片转码或画质压缩。
- 不修改 SillyTavern 核心，不增加服务端插件、数据库、队列或锁服务。
- 不支持不同场景自动换装、服装标签规则或批量导入。

## 3. 已确认的产品行为

### 3.1 入口与角色范围

衣柜入口放在制作人公寓。制作人始终出现在角色切换栏。偶像候选由当前存档的担当关系计算，第一版不展示未担当角色。

### 3.2 上传时机

选择文件后仅创建本地 Object URL 预览，不立即上传。用户可以修改套装名称、缩放和位置。只有点击“设为当前”才开始上传、写入素材库并装备。

关闭衣柜时，如果本地预览尚未确认，则释放 Object URL，不上传文件，也不修改存档。

### 3.3 文件限制

- MIME：`image/png`、`image/webp`、`image/jpeg`。
- 单文件最大 20 MB。
- 像素总量最大 40 MP。
- 任一边最大 8192 px。
- 上传前必须实际解码图片，拒绝伪造 MIME 或损坏文件。
- 保留原始文件内容，不转码。

### 3.4 素材删除

第一版只有“归档”。归档素材不再出现在普通套装列表，但文件仍保留，其他聊天中的装备引用继续有效。恢复默认仅更改当前聊天装备，不删除或归档素材。

## 4. 现有接入点

### `app.js`

- `baseState`：新增当前聊天的 `appearance` 默认值。
- `ensureStateShape()`：规范化旧存档、角色键、装备引用和 transform。
- `resolveIdolStandeeSrc()`：保留为内置偶像立绘回退来源。
- `renderProducerApartmentStage()`：公寓同行偶像立绘改用统一解析结果。
- VN 幻灯片渲染区（当前约 `app.js:15355`）：制作人与偶像大立绘改用统一解析结果。
- `routeHostAiPayload()`：扩展为处理独立的衣柜文件操作回复；回复不进入 AI reply 分支。
- 页面 `message` 监听：继续使用现有来源校验。
- 初始化事件绑定区：绑定衣柜入口、角色切换、上传、滑杆、归档和确认按钮。

### `st.html`

- 现有 `messageHandler`：新增衣柜文件操作类型。
- 使用 ST 原生 `/api/files/upload` 和 `/api/files/verify`。
- 不接入 `queuePromptTask()`，不占用主模型通道。
- 每个回复携带原 `operationId` 和当前 `saveScope`。
- 文件操作开始前和完成前都核对当前聊天 `saveScope`。

### `index.html` 与 `style.css`

- 制作人公寓增加衣柜入口按钮。
- 新增衣柜 overlay，采用已确认的试衣间背景、LOOK/FITTING 编号和双栏布局。
- 移动端改为预览区与控制区纵向排列。
- 不在现有卡片内再嵌套卡片。

### 测试

- 新增 `tests/portrait-wardrobe.test.mjs`。
- 必要时在现有宿主桥测试中增加独立衣柜消息协议用例，但不修改主模型测试语义。

## 5. 数据结构

### 5.1 当前聊天存档

```ts
interface PortraitTransform {
  scale: number;   // 0.5 - 2.0
  offsetX: number; // -100 - 100，预览坐标百分比语义
  offsetY: number; // -100 - 100，预览坐标百分比语义
}

interface EquippedPortraitRef {
  assetId: string;
  characterKey: string;
  url: string;
  name: string;
  transform: PortraitTransform;
  source: "builtin" | "user";
  archived?: boolean;
}

interface AppearanceState {
  schemaVersion: 1;
  equipped: Record<string, EquippedPortraitRef>;
}
```

`characterKey` 使用稳定键：

- 制作人：`producer`
- 偶像：`idol:<canonicalIdolName>`

内置默认素材使用虚拟 ID，例如 `builtin:producer` 和 `builtin:idol:藤田琴音`。存档中的 `url`、`name` 和 `transform` 是轻量恢复副本，不复制素材库或图片内容。

### 5.2 全局素材库

保存位置：`/user/files/hatsu-produce-portrait-library.json`

```ts
interface PortraitAsset {
  assetId: string;
  operationId: string;
  characterKey: string;
  name: string;
  url: string;
  mimeType: "image/png" | "image/webp" | "image/jpeg";
  width: number;
  height: number;
  size: number;
  transform: PortraitTransform;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
}

interface PortraitLibrary {
  schemaVersion: 1;
  libraryRevision: number;
  updatedAt: number;
  assets: Record<string, PortraitAsset>;
}
```

`libraryRevision` 只用于检测和诊断全局索引覆盖，不复用 `persistenceRevision` 或 `hostSaveSequence`。

素材库中的 `transform` 是素材首次上传时的默认值。选择已有素材时以它初始化控件；用户再次调整并装备时，只修改当前聊天 `EquippedPortraitRef.transform`，不隐式改写其他聊天使用的全局默认值。

### 5.3 在途操作

在途上传只保存在页面内存，不进入聊天存档：

```ts
interface PendingPortraitOperation {
  operationId: string;
  saveScope: string;
  characterKey: string;
  assetId: string;
  fileName: string;
  localPreviewUrl: string;
  file: File;
  metadata: Omit<PortraitAsset, "url" | "createdAt" | "updatedAt">;
  phase: "preview" | "verifying" | "uploading" | "indexing" | "equipping";
}
```

刷新后不恢复 `File`、Object URL 或网络请求，也不自动续传。

## 6. 统一立绘解析

新增一个纯读取入口：

```ts
interface ResolvedPortrait {
  assetId: string;
  url: string;
  transform: PortraitTransform;
  source: "builtin" | "user";
}

function resolvePortraitForSpeaker(speaker: string): ResolvedPortrait;
```

解析顺序：

1. 判断 speaker 是否为制作人或可识别偶像。
2. 从 `state.appearance.equipped[characterKey]` 读取当前聊天装备。
3. 用户素材引用完整且未被当前状态标记失效时返回用户素材。
4. 否则回退现有制作人或偶像内置立绘。

图片元素发生 `error` 时，只对当前渲染会话标记 URL 不可用，并立即切回内置立绘；不在图片错误事件中自动修改存档或全局索引。

第一版调用范围只有：

- `renderProducerApartmentStage()` 的同行偶像大立绘。
- VN overlay 的制作人与偶像大立绘。

## 7. 宿主消息协议

应用到宿主：

```ts
interface PortraitHostRequest {
  source: "hatsuboshi-produce";
  type: "portraitFileOperation";
  operationId: string;
  saveScope: string;
  action: "verify" | "upload" | "readLibrary" | "writeLibrary";
  payload: unknown;
}
```

宿主到应用：

```ts
interface PortraitHostReply {
  source: "hatsuboshi-produce-host";
  type: "portraitFileOperationResult";
  operationId: string;
  saveScope: string;
  action: PortraitHostRequest["action"];
  ok: boolean;
  result?: unknown;
  error?: string;
}
```

门禁规则：

- 只有 `operationId === pendingPortraitOperation.operationId` 的回复可推进操作。
- 回复 `saveScope` 必须同时匹配操作创建时的 scope 和当前 `activeHostSaveScope`。
- 旧回复、切聊天后的回复和重复完成回复只记录 debug，不改 UI、素材库或存档。
- 本地非宿主模式只允许本地预览；“设为当前”显示需要在 SillyTavern 中使用，不创建伪素材 URL。
- 衣柜文件操作不创建主模型 owner，不使用 requestId/channelLeaseId，也不写 Harness trace。

## 8. 上传与提交顺序

1. 用户选择文件。
2. 应用校验 MIME、大小、解码尺寸，并创建 Object URL。
3. 用户调整名称和 transform。
4. 点击“设为当前”后冻结本次 operation 的输入。
5. 生成 `operationId`、`assetId` 和确定性文件名 `hatsu-portrait-<operationId>.<ext>`。
6. 宿主先调用 `/api/files/verify` 检查目标 URL。
7. 文件不存在时调用 `/api/files/upload`；存在时直接复用。
8. 重新读取全局素材库，合并本次 asset，令 `libraryRevision = latest + 1`。
9. 通过 `/api/files/upload` 原子覆盖索引 JSON。
10. 重新读取索引并确认本次 `assetId` 存在。
11. 应用更新 `state.appearance.equipped[characterKey]`，调用现有 `saveState("appearance.equipped")`。
12. 释放 Object URL，刷新公寓和 VN 立绘。

步骤 10 完成前不得装备。装备保存沿用现有同 `saveScope` 的 `hostSaveSequence` 门禁。

读取素材库时必须禁用缓存或附加 cache-busting 参数，避免用旧索引执行合并和写后校验。

## 9. 失败和重试

- 校验失败：停留在衣柜，不发送宿主请求。
- 上传失败：不写索引、不改装备；保留本地预览。
- 上传超时：重试时先 verify；文件存在则不重复上传。
- 索引写入失败：文件可以保留，但不装备；同一页面重试复用 operationId。
- 索引写后校验失败：提示全局索引发生竞争，不装备，允许重新合并。
- 装备保存：沿用现有 `saveState()` 行为，本地存储写入后立即更新界面，并异步请求宿主 metadata 保存。当前协议没有 host ACK，因此衣柜不声称能够识别宿主落盘失败。
- 页面刷新：不自动续传、不自动装备。
- 普通关闭：取消内存操作并释放 Object URL，不执行远端删除。

## 10. 全局索引并发边界

ST 文件上传接口支持原子覆盖单个文件，但没有 compare-and-swap，因此第一版明确采用单编辑器原则：同一时间只保证一个衣柜页面可靠写入全局索引。

缓解措施：

- 写入前重新读取并合并最新索引。
- revision 递增并执行写后校验。
- 当前聊天保存素材 URL 和轻量元数据，索引覆盖不会使已装备立绘失效。
- 打开衣柜时，如果当前装备的用户素材不在索引中，允许用存档轻量副本修复索引。

不为此增加后端锁、数据库或文件枚举接口。

现有宿主 metadata 保存没有 ACK。用户在本地写入后立刻关闭页面时，仍存在宿主防抖保存尚未落盘的既有窗口；第一版不为衣柜单独修改整条存档确认协议。

## 11. UI 设计

- 使用用户提供的试衣间背景作为预览舞台。
- 桌面：左侧大预览，右侧角色、套装与 transform 控制。
- 移动端：角色切换、预览、套装和控制依次纵向排列，无横向滚动。
- LOOK/FITTING 编号、三色色条和紧凑控制区形成偶像企划造型编辑台风格。
- 主操作只有“设为当前”；“恢复默认”和“重置位置”为次级操作。
- 上传中冻结会改变操作输入的控件，关闭按钮仍可用，但关闭需要提示正在进行的操作不会自动恢复。
- 不使用说明性大段文字，错误与完成状态通过短状态行和 toast 表达。

背景素材作为项目静态资源保存，运行时不引用 Codex 临时路径。

## 12. 测试与验收

### 自动化测试

- 旧存档补齐 `appearance`，不改变其他字段。
- 制作人和 canonical idol key 解析。
- 用户素材覆盖与内置回退。
- 图片 error 回退不写存档。
- 文件类型、20 MB、40 MP、8192 px 和损坏文件校验。
- 选择文件只创建预览，不发送上传消息。
- 关闭未确认预览不上传、不保存。
- operationId 与 saveScope 精确门禁。
- 超时重试先 verify，存在时不重复 upload。
- 索引合并、revision 递增、写后校验失败。
- 当前装备缺失于索引时的修复。
- 不同 saveScope 装备隔离。
- 装备使用现有 `saveState()` 和 `hostSaveSequence`，不伪造 host ACK。
- 制作人始终显示、偶像仅显示已担当角色。
- VN 与公寓使用统一解析器；SNS、手机和地图仍使用原头像路径。
- 衣柜操作不触发 primary model ownership 或 Prompt 发送。

### 真实 SillyTavern 验收

1. 电脑端上传透明 PNG，调整位置并装备。
2. 刷新页面，VN 和公寓仍显示装备立绘。
3. 手机访问同一 ST 用户和聊天，能读取相同图片。
4. 切换聊天，为同一角色装备另一素材，两个聊天互不覆盖。
5. 模拟文件缺失，界面回退内置立绘且不阻塞使用。
6. 模拟上传超时后重试，确认没有生成重复图片文件。
7. 上传过程中切换聊天，旧回复不得写入新聊天。
8. 归档当前被其他聊天引用的素材，其他聊天仍能显示。

## 13. 回滚

- 删除衣柜 UI、宿主文件消息处理和统一解析调用。
- 保留 `state.appearance` 未使用字段不会影响旧代码；也可在规范化时忽略。
- 已上传图片和索引文件留在用户目录，不影响 ST 或旧前端。
- 内置立绘路径和现有 `resolveIdolStandeeSrc()` 保持可直接恢复。

## 14. 实施边界

实施应拆为小任务并逐项测试：

1. 数据结构、规范化和纯解析器。
2. 宿主文件协议与执行级测试。
3. 上传状态机、校验与索引提交。
4. 公寓衣柜 UI 与背景素材。
5. VN/公寓接入、回退和完整验收。

每个任务先写 RED 测试，再做最小实现。不得顺手迁移其他头像或重构现有 Prompt/Harness 流程。
