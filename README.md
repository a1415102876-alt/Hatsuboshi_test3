# 初星育成

学园偶像大师同人育成前端原型。

## 运行方式

直接用浏览器打开 `index.html` 即可运行。

## 酒馆助手脚本入口

新增了可被 `import` 的悬浮球脚本入口：

- `dist/hatsu-launcher/index.js`
- `dist/hatsu-launcher/keep-latest-floor.js`（仅保留最新楼层）

示例（按你的仓库地址替换）：

```js
import 'https://testingcf.jsdelivr.net/gh/<your-user>/<your-repo>@<tag-or-branch>/dist/hatsu-launcher/index.js'
```

仅保留最新楼层（伪 0 层）示例：

```js
window.HatsuKeepLatestConfig = {
  hardRemove: false,
  debounceMs: 120,
  reloadOnChatChanged: true
};
import 'https://testingcf.jsdelivr.net/gh/<your-user>/<your-repo>@<tag-or-branch>/dist/hatsu-launcher/keep-latest-floor.js'
```

可选全局配置（在 `import` 前设置）：

```js
window.HatsuLauncherConfig = {
  frontendUrl: '/hatsu-produce-local/index.html',
  launcherText: '初',
  launcherSize: 44
};
```

## 当前功能

- 担当偶像选择
- 18 天 First Live 育成日程
- 每日 3 次普通行动与 1 次额外行动
- 上课、训练、休息、外出、交流
- SP 训练候选与随机互动事件
- 前端数值结算
- P 手账提示词、育成日志与结算明细
- 行动后全屏事件描述页
- 内部通知与模态框

## Persistent message-floor launcher

When a TavernHelper regex renders every AI reply as a frontend page, load the compact launcher instead of loading `st.html` directly:

```html
<body>
  <script>
    $('body').load('http://127.0.0.1:8000/hatsu-produce-local/launcher.html');
  </script>
</body>
```

The launcher card creates or reveals one game iframe attached directly to the SillyTavern host document. Every rendered message controls the same iframe.

The draggable host-level floating toggle is hide-only. It does not cancel an in-flight generation, release a Harness lease, or reload the game iframe. Tap it again to resume the same in-memory page state.

A shujuku floor refresh can rebuild chat messages without removing the host-level game iframe. A SillyTavern full refresh still reloads the runtime and may invoke normal Harness Recovery for an interrupted turn.

Manual checks:

1. Confirm each rendered AI floor shows only the compact launcher card.
2. Start the game and confirm the shell and floating toggle are direct children of the host document body.
3. Drag the floating toggle and confirm the game remains open.
4. Tap the floating toggle and confirm the shell is hidden while `#hatsu-persistent-game-frame` remains in the DOM with the same `src`.
5. Tap again and confirm the same game state resumes.
6. Trigger a shujuku table refresh and confirm the game does not reload solely because floors were rebuilt.
