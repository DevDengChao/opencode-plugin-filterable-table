# OpenCode Filterable Table

为 OpenCode Desktop 会话中的 Markdown 表格增加按列筛选能力。

插件会在每个表头右侧加一个漏斗按钮。点击后可以：

- 勾选该列要显示的值，支持多选
- 值较多时搜索过滤
- 全选、全不选、重置当前列
- 多列条件同时生效（列与列之间是 AND，同列多值是 OR）
- 在表格下方看到「显示 X / Y 行」，并可一键清除当前表格的全部筛选

筛选只影响当前会话中的显示，不会修改原始 Markdown 或数据库内容。

## 环境要求

- OpenCode Desktop **2.2.x**（本项目按 2.2.1 开发和验证）
- 表格位于会话时间线中，并且由 OpenCode 的 Markdown 渲染器生成
- GUI 插件目前是 experimental API，OpenCode 升级后可能需要适配

> TUI 不支持表头内嵌下拉。TUI 插件只能按代码块语言注册自定义渲染器，无法自动增强普通 Markdown 表格。

## 安装

1. 安装依赖并构建：

```bash
npm install
npm run build
```

产物为 `dist/gui.cjs`。

2. 在全局配置文件 `~/.config/opencode/opencode.jsonc` 中加入插件。Windows 上通常是
   `C:\Users\<用户名>\.config\opencode\opencode.jsonc`：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "file:///E:/path/to/opencode-plugin-filterable-table"
  ]
}
```

也可以使用对象形式传入调试选项：

```jsonc
{
  "plugins": [
    {
      "package": "file:///E:/path/to/opencode-plugin-filterable-table",
      "options": {
        "debug": true
      }
    }
  ]
}
```

`debug: true` 会把扫描到的表格数量输出到 Desktop 的 renderer 日志，排查问题时使用；平时可以省略。

3. 保存配置。OpenCode 会热重载插件；如果 GUI 没有重新加载，可以重启 Desktop，或在
   **Settings > Extensions > Plugins** 中检查 `opencode-plugin-filterable-table` 是否处于启用状态。

## 使用

1. 打开一个包含 Markdown 表格的会话。
2. 把鼠标移到表头。表头右侧会出现漏斗图标。
3. 点击漏斗，勾选要保留的值。表格会立即只显示符合条件的行。
4. 多个列可以叠加筛选。再次打开下拉可以搜索、全选、全不选或重置该列。
5. 表格下方出现「显示 X / Y 行」时，点击「清除全部筛选」可以恢复整张表。
6. 命令面板中也可以运行「清除所有表格筛选」。

空值会显示为「（空）」，可以像普通值一样勾选或排除。长文本会在下拉中截断显示，完整值放在悬停提示里。

## 状态保留

筛选状态按会话消息 part 保存：

- 消息重新渲染后，筛选条件会尽量恢复
- 时间线虚拟滚动导致消息卸载再挂载时，筛选条件也会尽量恢复
- 同一会话中的多张表格互相独立
- 插件重载或 Desktop 重启后状态清空

## 开发

```bash
npm run demo       # 浏览器独立演示页，默认 http://localhost:5173
npm run typecheck
npm run test       # 运行 jsdom 单元测试
npm run build
npm run dev        # 监听构建 dist/gui.cjs
```

本地调试时把 `plugins` 指向本项目目录，修改代码后运行 `npm run dev` 或 `npm run build`，
Desktop 会监听 `dist/gui.cjs` 并重新加载 GUI 部分。

### 文件结构

```text
src/
├─ index.ts          # server 入口：提供插件 id，输出加载日志
├─ gui.ts            # GUI 入口：注入样式、注册命令、安装表格增强
├─ table-filter.ts   # 表格扫描、状态、筛选和 MutationObserver
├─ popover.ts        # 表头下拉的 DOM 与交互
├─ labels.ts         # 中文/英文文案
└─ styles.css        # 使用 OpenCode 主题变量的样式
demo/                # 浏览器演示页
```

## 实现说明

OpenCode Desktop 的 Markdown 表格会渲染成：

```html
<div data-component="markdown-table">
  <table>...</table>
</div>
```

插件监听会话时间线容器 `[data-slot="session-timeline-scroll"]`，用 `MutationObserver` 发现表格，
在 `<th>` 中注入筛选按钮，并通过 `document.body` 上的 `position: fixed` 浮层显示下拉，
避免被表格外层的 `overflow-x: auto` 裁剪。

这套实现依赖 OpenCode 当前的 DOM 结构，不是公开的表格渲染器 API。如果 OpenCode 修改了表格的
`data-component` 或时间线容器属性，需要同步调整 `src/table-filter.ts` 中的选择器。

## 已知限制

- 只增强会话时间线中的表格，不增强设置页、侧边栏等位置的普通表格。
- 筛选是显示层效果；被隐藏的行不会出现在选区复制结果中。
- 单元格按可见文本匹配。一个单元格包含多个值时，会作为整体值处理。
- 不支持 TUI。
