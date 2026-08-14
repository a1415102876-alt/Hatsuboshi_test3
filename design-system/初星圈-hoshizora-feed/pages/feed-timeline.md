# 初星圈 · 时间线页（feed-timeline）

> **覆盖 MASTER** 中与本页冲突的 Layout / Pattern / Component 规则。  
> **载体：** `hatsu-produce-local` 小手机 App `#phoneSnsApp`，与 LINE / 广播部并列。

---

## 1. 产品定位

| 项 | 定义 |
|----|------|
| 名称 | **初星圈**（内部 id: `sns`） |
| 性质 | 学园公开层舆论时间线（`world.buzz[]`），只读刷帖 |
| 不是 | 聊天、完整 Twitter、制作人私密线 |
| 数据 | `buzz-pool.js` 抽签 + `SNS_PROFILES` 决定 author / heat |

**Pattern 修正（相对 Pro Max Community Landing）：**  
不用 Hero / Join CTA，改为 **单列无限滚动 Feed + 顶栏筛选 + 底栏占位**（与 LINE 一致留 safe-area）。

---

## 2. 小手机约束

| Token | 值 | 说明 |
|-------|-----|------|
| 内容区宽 | ~100% of `.mini-phone-screen` | 约 360–390px 逻辑宽 |
| 顶栏高 | 48px | 含返回/标题/刷新 |
| Tab 高 | 40px | 「时间线」「热议」 |
| 帖卡片间距 | `--space-sm` (8px) | 密集刷感 |
| 卡片内边距 | 12px | 小于 MASTER 24px |
| 触控最小 | 44×44px | Pro Max UX 强制 |
| 滚动 | `overflow-y: auto` + `overscroll-behavior: contain` | 禁用 pull-to-refresh |

---

## 3. 初星本地化色板（覆盖 MASTER）

在 `.sns-app` 作用域内定义，**不与 LINE 绿 / 广播深色混用**：

```css
.sns-app {
  --sns-primary: #E11D48;        /* Pro Max 主色 · 互动强调 */
  --sns-primary-soft: #FB7185;
  --sns-star: #F9C584;            /* 初星学园金 · 顶栏/徽标 */
  --sns-cta: #2563EB;            /* 链接、@、话题 */
  --sns-bg: #FFF7F8;             /* 略暖于 MASTER #FFF1F2 */
  --sns-surface: #FFFFFF;        /* 卡片底 */
  --sns-text: #2A1520;           /* 正文（比 #881337 更易读） */
  --sns-muted: rgba(42, 21, 32, 0.55);
  --sns-border: rgba(225, 29, 72, 0.08);
  --sns-heat-low: rgba(42, 21, 32, 0.35);
  --sns-heat-high: #DC2626;      /* 炎上/热议数字 */
  --sns-heat-warn: #F59E0B;
  --sns-official: #6366F1;       /* 学生会/食堂/广播部官号 */
  --sns-deleted: rgba(42, 21, 32, 0.4);
  --sns-radius: 14px;
  --sns-transition: 180ms ease;
}
```

**状态栏：** `.mini-phone-statusbar.is-sns` — 背景 `#FFF7F8`，时钟/图标 `#2A1520`（与 LINE 白底绿栏、广播深紫栏三分）。

---

## 4. 字体（覆盖 MASTER Fredoka）

小手机内日文为主，不引入 Fredoka 全页：

```css
.sns-app {
  font-family: "Hiragino Sans", "Noto Sans JP", "Segoe UI", system-ui, sans-serif;
}
```

- 标题/昵称：`font-weight: 700; font-size: 0.88rem`
- 正文：`font-size: 0.82rem; line-height: 1.55`
- 元信息（时间/互动数）：`font-size: 0.72rem; color: var(--sns-muted)`

---

## 5. 信息架构

```
┌─────────────────────────────┐
│ ← 初星圈          ↻        │  sns-topbar
├─────────────────────────────┤
│ [时间线] [热议]              │  sns-tabs
├─────────────────────────────┤
│ ┌─ 帖 ───────────────────┐  │
│ │ 头像 名  · 3分钟前      │  │
│ │ 正文……                  │  │
│ │ ♥ 24  💬 128  转 47     │  │  ← 假数字，前端生成
│ └─────────────────────────┘  │
│ ┌─ 帖（炎上）────────────┐  │
│ │ … heat: high 样式 …     │  │
│ └─────────────────────────┘  │
│ … scroll …                   │
├─────────────────────────────┤
│ （phone navbar 由壳层提供）   │
└─────────────────────────────┘
```

### Tab 逻辑

| Tab | 过滤 |
|-----|------|
| **时间线** | 当日 + 近 7 日全部 `buzz`，时间倒序 |
| **热议** | `heat === "high"` 或 `flags` 含 `misread_risk` |

### scope 徽标（可选一行 meta）

| `scope` | 展示 |
|---------|------|
| `campus` | 无标或灰字「学园」 |
| `net` | 蓝字「全网」 |
| `fanclub` | 粉字「粉丝站」 |

---

## 6. 帖卡片组件

### 6.1 结构（BEM 建议）

```html
<article class="sns-post" data-heat="normal|high|low">
  <header class="sns-post-head">
    <img class="sns-post-avatar" alt="" />
    <div class="sns-post-meta">
      <span class="sns-post-author">紫云清夏</span>
      <span class="sns-post-time">3分钟前</span>
    </div>
    <span class="sns-post-badge" hidden>官号</span>
  </header>
  <p class="sns-post-body">今日 OOTD：练舞也能穿好看，信我。</p>
  <footer class="sns-post-foot">
    <span class="sns-post-stat">评论 128</span>
    <span class="sns-post-stat is-hot">转 47</span>
  </footer>
</article>
```

### 6.2 变体

| 变体 | 类 / 属性 | 视觉 |
|------|-----------|------|
| 普通 | `data-heat="normal"` | 白卡片 + 浅阴影 |
| 热议 | `data-heat="high"` | 左侧 3px `--sns-heat-high` 条；互动数字加粗 |
| 已删除 | `.sns-post.is-deleted` | 正文 `--sns-deleted` + 删除线；角标「已删除（缓存）」 |
| 官号 | `.sns-post.is-official` | 作者名 `--sns-official`；无头像或校徽占位 |
| 匿名 | `.sns-post.is-anonymous` | 作者「匿名同学」；默认头像 |

### 6.3 头像

- 有 `author`：复用 `assets/avatars/{idol}.png`（与 LINE 同路径规则）
- 官号：单色圆 + 首字（学 / 食 / 播）
- **不用 emoji 当图标**（Pro Max checklist）

---

## 7. 与 buzz 字段映射

| buzz 字段 | UI |
|-----------|-----|
| `author` | 显示名；空 → 匿名帖 |
| `text` | `.sns-post-body` |
| `heat` | `data-heat` + 假互动数倍率 |
| `flags` | `misread_risk` → 热议 Tab + 更高评论数 |
| `scope` | 可选 scope 标签 |
| `source` | `broadcast_reaction` → 卡片顶 faint「· 今日广播相关」 |
| `dayKey` | 分组日期头「Live 后第 N 天」 |

**互动数字：** 前端 seeded 假数，不实现真点赞。  
`high` → 评论 80–200；`normal` → 8–40；`low` → 0–8。

---

## 8. 三 App 视觉并列

| App | 背景 | 气质 |
|-----|------|------|
| LINE | 白 + 绿 | 私密聊天 |
| 广播部 | 深紫 `#1a1428` | 正式节目 |
| **初星圈** | 暖白 `#FFF7F8` + 玫瑰强调 | 年轻、刷帖、公开 |

主屏图标建议：圆角方块 **#FF6B8A → #F9C584** 渐变 + 星形/对话泡 SVG（不用 emoji）。

---

## 9. 动效（Micro-interactions）

- 卡片 `:active` → `scale(0.98)` 100ms（不用 hover 作为主反馈，触摸优先）
- Tab 切换 → 下划线 `--sns-primary` 180ms
- 刷新 → 顶栏 icon 旋转 360ms，`prefers-reduced-motion: reduce` 时禁用
- **禁止** 装饰性 infinite bounce

---

## 10. 无障碍

- 对比度：正文 `#2A1520` on `#FFFFFF` ≥ 4.5:1
- 可点击：`cursor: pointer` + `min-height: 44px`（Tab、返回）
- 焦点：`:focus-visible` outline `2px solid var(--sns-cta)`
- 屏幕阅读：`article` + `aria-label="{author} 的帖子"`

---

## 11. 空态 / 加载

| 状态 | 文案 |
|------|------|
| 空 | 「今天还没有新动态。学园也许正在酝酿八卦。」 |
| 加载 | 骨架屏 2–3 条灰条，不用 spinner 占满屏 |
| Free Mode 未解锁 | 「Live 结束后开放初星圈。」 |

---

## 12. 实现栈

- **Vanilla HTML + CSS**（`style.css` 追加 `.sns-app` 块，与 `.line-app` / `.broadcast-app` 同级）
- 不引入 Tailwind；上表 CSS 变量可直接粘贴
- JS：只读渲染 `state.freeMode.world.buzz`，不接 AI channel

---

## 13. 预交付检查（本页追加）

- [ ] 与 LINE/广播切换时 statusbar 类名切换 `is-sns`
- [ ] 手毬类 `heat: high` 帖在「热议」Tab 必出现
- [ ] 无制作人发帖入口（只读）
- [ ] 中文 UI，玩家面向无 emoji 图标
- [ ] `overscroll-behavior: contain` 已设
