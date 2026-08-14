# 亚纱里老师 VN 立绘回归修复设计

## 问题

提交 `943c2b0` 将 VN 立绘统一接入立绘衣柜解析器后，`renderVnSlide()` 不再直接读取 `vnStandees`。统一解析器只识别制作人和 `idols` 中的偶像，因此 `亚纱里老师` 无法取得 `characterKey`，最终返回空 URL 并隐藏 `#vnStandee`。

资源文件 `assets/novel-standees/asari-sensei.png` 和 `vnStandees["亚纱里老师"]` 均仍存在，问题属于 NPC 解析遗漏，不是资源缺失。

## 修复

统一立绘解析继续作为唯一入口。在 `resolvePortraitForSpeaker()` 中按以下顺序解析：

1. 使用现有 `characterKeyForSpeaker()` 识别制作人和偶像。
2. 若未识别，则规范化发言者名称并检查 `vnStandees`。
3. 命中内建 NPC 时使用 `npc:<规范名称>` 作为仅供解析使用的角色键。
4. `getBuiltinPortraitMap()` 同时登记对应的 `npc:<名称>` 到内建立绘 URL。
5. 继续通过现有 `resolvePortrait()` 与 `applyResolvedPortraitToImage()` 返回和应用统一结果。

亚纱里的预期结果为：

```text
speaker: 亚纱里老师
characterKey: npc:亚纱里老师
url: ./assets/novel-standees/asari-sensei.png
source: builtin
```

## 边界

- 不把亚纱里老师加入 `idols`。
- 不改变偶像别名、好感度、地图 NPC 或任务逻辑。
- 不把 NPC 加入立绘衣柜角色列表，也不新增 NPC 自定义上传功能。
- 不在 `renderVnSlide()` 中增加亚纱里专用分支。
- 未登记在 `vnStandees` 的未知发言者仍返回空立绘。

## 测试

在 `tests/portrait-integration.test.mjs` 增加回归测试：

1. 测试沙盒包含 `vnStandees["亚纱里老师"]`，但 `idols` 不包含该名称。
2. 修复前 `resolvePortraitForSpeaker("亚纱里老师")` 返回空 URL，以此确认回归测试有效。
3. 修复后返回 `npc:亚纱里老师` 和内建 PNG URL。
4. 未知 NPC 仍返回空 URL。
5. 现有制作人别名、偶像别名、用户立绘降级和 VN 渲染测试继续通过。
