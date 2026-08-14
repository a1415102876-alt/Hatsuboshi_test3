# 仓本家场景背景接入设计

## 目标

为仓本家的三个现有设施接入对应背景图，进入设施和生成场景时沿用现有 `facility.image` 数据流显示正确图片。

## 资源映射

- `gate`（仓本家大门）：`./assets/scenes/kuramoto_house.png`
- `front_hall`（仓本家前厅）：`./assets/scenes/kuramoto_front.png`
- `bedroom`（千奈卧室）：`./assets/scenes/Kuramoto_Bedroom.png`

路径使用磁盘上的实际文件名大小写，保证在区分大小写的静态服务器上也能加载。

## 实现范围

只修改 `FREE_MODE_OUTING_VENUES.china_home` 中三个设施的 `image` 字段。现有设施导航、千奈物色流程、香名江常驻逻辑和默认背景回退均保持不变。

## 验证

在仓本家外出场景测试中断言三个设施分别引用指定图片，并检查资源文件实际存在。随后运行相关外出场景测试、JavaScript 语法检查和 `git diff --check`。
