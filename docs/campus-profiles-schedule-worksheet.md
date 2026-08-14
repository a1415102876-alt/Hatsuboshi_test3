# CAMPUS_PROFILES 填写表（Live 后 · 加权 presence）

> 用途：阶段 C 接入 `world/campus-behavior.js` 的 **`CAMPUS_PROFILES`**。  
> 不覆盖沙盒物色期固定表 **`SCOUT_OPENING_PRESENCE`**（物色期另表，已写死在代码里）。

> **状态（2026-06-29）**：以下 13 人四时段表已依据 GKMS 平行轨、角色 skill、好感剧情与活动剧情**推断填写**，并已写入 `world/campus-behavior.js` · `CAMPUS_PROFILES`。如需微调某人的 canon 习惯，直接改表后告诉我同步代码即可。

## 填写说明

### 「倾向」是什么意思

- **不是**「这个时段只会出现在这里」。
- **是**两层概率：
  1. **地图出现倾向**（本表「出现倾向」列）：这一时段 roll 后，**有多大概率出现在大地图 presence 里**（高 / 中 / 低 / 很少）。
  2. **地点权重**（主地点 + 偶尔地点）：**一旦出现**，更常去主地点；偶尔地点是次要权重，不是 0 也可以去别处（代码里用权重，不用写死）。

### 怎么填

| 列 | 填什么 |
|----|--------|
| **主地点** | 下表「地点 ID」之一 |
| **在做什么** | 给玩家 / AI 看的公开活动（一句话） |
| **出现倾向** | 高 / 中 / 低 / 很少 |
| **偶尔地点** | 可选；次要地点 ID，可留空 |
| **备注** | canon、班级、不和谁撞车、排除地点等 |

### 地点 ID（复制用）

| ID | 中文 |
|----|------|
| `school_entrance` | 学园正门 |
| `student_store` | 小卖部 |
| `dining_hall` | 食堂 |
| `playground` | 运动场 |
| `gymnasium` | 体育馆 |
| `club_room` | 部室栋（含学生会办公室） |
| `idol_classroom` | 偶像科教室 |
| `producer_classroom` | 制作人科教室 |
| `special_education` | 特教栋（专用训练） |
| `auditorium` | 讲堂 |
| `outstage` | 野外舞台 |
| `swimming_pool` | 泳池 |

### 活动 ID（可选，给程序用；不填则按「在做什么」文案）

`solo_training` · `group_lesson` · `student_council` · `part_time` · `rest_tea` · `rehearsal` · `wandering` · `sns_break`

### 全局出现率（可选，整人默认）

若某偶像整体很少被大地图刷到，可在备注写 **「整人 presence：低」**。

---

## 一年级 · 1 班

### 藤田琴音

| 时段 | 主地点 | 在做什么 | 出现倾向 | 偶尔地点 | 备注 |
|------|--------|----------|----------|----------|------|
| 上午 | `idol_classroom` | 赶着上课，心思还在打工和偶像上 | 低 | `student_store` | 成绩差；星南招揽中但保持距离 |
| 中午 | `student_store` | 小卖部打工或刚换班 | 高 | `dining_hall` | 平行轨：打工 + 自学 |
| 下午 | `student_store` | 打工兼自学偶像技巧 | 高 | `school_entrance` | First Live 视是否接受星南代理 |
| 傍晚 | `school_entrance` | 下班回宿舍路上 | 中 | `student_store` | |

### 月村手毬

| 时段 | 主地点 | 在做什么 | 出现倾向 | 偶尔地点 | 备注 |
|------|--------|----------|----------|----------|------|
| 上午 | `special_education` | 特教栋早训 | 高 | `gymnasium` | 无制作人；高强度自练 |
| 中午 | `dining_hall` | 勉强吃饭，常被催着休息 | 中 | `special_education` | 美铃会照顾饮食 |
| 下午 | `special_education` | 高强度加练，不希望被打扰 | 高 | `gymnasium` | 不爱上广播 |
| 傍晚 | `special_education` | 加练到闭馆 | 高 | `gymnasium` | 自毁风险型练习狂 |

### 花海咲季

| 时段 | 主地点 | 在做什么 | 出现倾向 | 偶尔地点 | 备注 |
|------|--------|----------|----------|----------|------|
| 上午 | `playground` | 晨跑与体能训练 | 高 | `gymnasium` | 入学第一；自驱训练 |
| 中午 | `dining_hall` | 快速用餐后看训练计划 | 中 | `playground` | 与佑芽 rivalry |
| 下午 | `playground` | 自主训练，信号灯全开 | 高 | `gymnasium` | 尚无公开 First Live |
| 傍晚 | `gymnasium` | 傍晚加练 | 高 | `playground` | |

### 紫云清夏

| 时段 | 主地点 | 在做什么 | 出现倾向 | 偶尔地点 | 备注 |
|------|--------|----------|----------|----------|------|
| 上午 | `idol_classroom` | 翘课但偶尔露脸 | 很少 | `playground` | **整人 presence：低** |
| 中午 | `dining_hall` | 和莉莉娅固定午餐 | 中 | `student_store` | 室友线 |
| 下午 | `club_room` | 旁观莉莉娅练习、顺便摸鱼 | 低 | `playground` | 没干劲表象 |
| 傍晚 | `outstage` | 陪莉莉娅练台步 | 低 | `dining_hall` | 芭蕾底子仍在 |

### 葛城莉莉娅

| 时段 | 主地点 | 在做什么 | 出现倾向 | 偶尔地点 | 备注 |
|------|--------|----------|----------|----------|------|
| 上午 | `club_room` | 部室偷偷练声乐 | 中 | `idol_classroom` | 怕生；与清夏约定同台 |
| 中午 | `dining_hall` | 和清夏一起吃午饭 | 中 | `student_store` | |
| 下午 | `club_room` | 基础练习，怕被人听见 | 高 | `idol_classroom` | 练习室偶被听到 |
| 傍晚 | `club_room` | 继续练到闭馆 | 中 | `outstage` | |

---

## 一年级 · 2 班

### 筱泽广

| 时段 | 主地点 | 在做什么 | 出现倾向 | 偶尔地点 | 备注 |
|------|--------|----------|----------|----------|------|
| 上午 | `idol_classroom` | 理论课前排秒懂 | 中 | `producer_classroom` | 体弱；无默认制作人 |
| 中午 | `dining_hall` | 休息、SSD 或发呆 | 中 | `idol_classroom` | 补习组（佑芽/千奈） |
| 下午 | `idol_classroom` | 补习组或后排观察 | 高 | `producer_classroom` | |
| 傍晚 | `producer_classroom` | 给佑芽千奈补习 | 中 | `dining_hall` | |

### 花海佑芽

| 时段 | 主地点 | 在做什么 | 出现倾向 | 偶尔地点 | 备注 |
|------|--------|----------|----------|----------|------|
| 上午 | `playground` | 星南带晨跑 | 高 | `gymnasium` | 星南代理组 |
| 中午 | `dining_hall` | 大吃一顿补体力 | 中 | `playground` | |
| 下午 | `gymnasium` | 追姐姐的自主训练 | 高 | `playground` | 非 user 担当时 First Live 已完成 |
| 傍晚 | `outstage` | 傍晚加练 | 高 | `gymnasium` | |

### 秦谷美铃

| 时段 | 主地点 | 在做什么 | 出现倾向 | 偶尔地点 | 备注 |
|------|--------|----------|----------|----------|------|
| 上午 | `dining_hall` | 喝茶摸鱼，上课常迟到 | 高 | `club_room` | 星南代理组；睡神天才 |
| 中午 | `dining_hall` | 午睡续摊 | 高 | `student_store` | |
| 下午 | `special_education` | 顺路看手毬或浅练一下 | 中 | `club_room` | 手毬妈线 |
| 傍晚 | `dining_hall` | 茶点与闲聊 | 中 | `club_room` | |

### 仓本千奈

| 时段 | 主地点 | 在做什么 | 出现倾向 | 偶尔地点 | 备注 |
|------|--------|----------|----------|----------|------|
| 上午 | `idol_classroom` | 星南基础课，硬跟进度 | 高 | `producer_classroom` | 星南代理组 |
| 中午 | `dining_hall` | 和广、佑芽一起吃 | 中 | `student_store` | |
| 下午 | `gymnasium` | 基础体力课，练到想哭再继续 | 高 | `idol_classroom` | 末位逆袭叙事 |
| 傍晚 | `outstage` | 傍晚加练 | 中 | `gymnasium` | |

---

## 三年级

### 十王星南

| 时段 | 主地点 | 在做什么 | 出现倾向 | 偶尔地点 | 备注 |
|------|--------|----------|----------|----------|------|
| 上午 | `club_room` | 学生会晨间公务 | 高 | `playground` | 会长 + 代理制作人 |
| 中午 | `club_room` | 公务与后辈约谈 | 高 | `dining_hall` | 招揽琴音 |
| 下午 | `club_room` | 代理培育会议 | 高 | `gymnasium` | 示范课偶发 |
| 傍晚 | `club_room` | 广播筹备或文件整理 | 中 | `auditorium` | |

### 雨夜燕

| 时段 | 主地点 | 在做什么 | 出现倾向 | 偶尔地点 | 备注 |
|------|--------|----------|----------|----------|------|
| 上午 | `club_room` | 副会长备稿、训话前准备 | 高 | `gymnasium` | 不作代理制作人 |
| 中午 | `club_room` | 学生会行政 | 高 | `dining_hall` | 与星南同班 rivalry |
| 下午 | `gymnasium` | 独自加码练，追赶星南 | 高 | `club_room` | 下午训练比重高 |
| 傍晚 | `club_room` | 补行政或复盘 | 中 | `student_store` | 偶买周边（不直说） |

### 有村麻央

| 时段 | 主地点 | 在做什么 | 出现倾向 | 偶尔地点 | 备注 |
|------|--------|----------|----------|----------|------|
| 上午 | `gymnasium` | 宿舍长带后辈热身 | 中 | `playground` | 宿舍长 / 小王子 |
| 中午 | `dining_hall` | 确认后辈都好好吃饭 | 中 | `club_room` | |
| 下午 | `gymnasium` | 武术形体练习 | 高 | `idol_classroom` | |
| 傍晚 | `dining_hall` | 宿舍事务与照看 | 中 | `club_room` | |

### 姬崎莉波

| 时段 | 主地点 | 在做什么 | 出现倾向 | 偶尔地点 | 备注 |
|------|--------|----------|----------|----------|------|
| 上午 | `club_room` | 学生会书记整理资料 | 高 | `dining_hall` | 书记 + 宿舍大姐姐 |
| 中午 | `dining_hall` | 甜食招待、照顾后辈 | 高 | `club_room` | |
| 下午 | `club_room` | 资料会议与文书 | 高 | `idol_classroom` | |
| 傍晚 | `dining_hall` | 最后再确认大家用餐 | 中 | `club_room` | |

---

## 推断依据摘要

| 偶像 | 主要依据 |
|------|----------|
| 藤田琴音 | 打工生计、星南边缘招揽、成绩差常缺课 |
| 月村手毬 | 无制作人自练、特教栋/加练、美铃投喂 |
| 花海咲季 | 运动员自驱、信号灯、与佑芽 rivalry |
| 紫云清夏 | 翘课辣妹、莉莉娅室友、创伤后少公开露面 |
| 葛城莉莉娅 | 怕生部室练、清夏约定、零基础努力 |
| 筱泽广 | 理论强体弱、补习组、后排发呆 |
| 花海佑芽 | 星南晨跑代理线、体力怪物、追姐姐 |
| 秦谷美铃 | 食堂午睡、看手毬、星南头疼的小坏蛋 |
| 仓本千奈 | 星南基础课、末位逆袭、广佑芽社交圈 |
| 十王星南 | 部室栋学生会、代理培育、招揽琴音 |
| 雨夜燕 | 部室行政 + 下午加码练、追星南 |
| 有村麻央 | 宿舍长、体育馆武术形体 |
| 姬崎莉波 | 学生会书记、食堂甜食照顾 |

素材：`e:\GKMS.SKILL\初星学园_非担当平行轨_FirstLive.md`、各角色 SKILL / 好感剧情、物色期 `SCOUT_*` 表。

---

## 阶段 D（已实现）：校园快照 → SNS / 广播加权

| 模块 | 行为 |
|------|------|
| `daily-tick.js` | 每日 tick **先** `refreshWorldPresence`，再 roll 广播与 SNS |
| `campus-behavior.js` | `getCampusPresenceWeightMultiplier` / `getCampusAngleWeightMultiplier` / `getCampusBuzzCategoryWeightMultiplier` / `buildCampusInjectionBlock` |
| `buzz-pool.js` | 发帖作者、分类按 campus 加权；约 42% 概率在正文前注入 `publicLabel` 地点提示 |
| `events-pool.js` | 广播嘉宾、学园日常/First Live 角度按 campus 加权；提纲写入「今日校园动向」 |
| `injection.js` | 世界摘要（sns / broadcast / map / produce）附带 campus  digest |

---

## 参考：物色期固定表（勿与本表混填）

已在 `world/campus-behavior.js` · `SCOUT_OPENING_PRESENCE`：

| 偶像 | 地点 | 公开活动 |
|------|------|----------|
| 月村手毬 | 特教栋 | 特教栋训练室加练 |
| 藤田琴音 | 小卖部 | 像刚下班路过 |
| 十王星南 / 雨夜燕 | 部室栋 | 学生会公务 |
| 花海咲季 / 秦谷美铃 / 筱泽广 | 背景可见 | 见代码 |
