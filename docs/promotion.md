# 宣发素材

这个文件用于后续发布、写社交媒体文案和维护 GitHub 仓库信息，不属于运行时文档。

## 仓库信息

### 名称

`opencode-plugin-filterable-table`

### GitHub About

中文：

> 为 OpenCode Desktop 会话中的 Markdown 表格增加按列筛选，支持多选、搜索和多列组合。

English：

> Filter Markdown tables in OpenCode Desktop sessions by column values. Multi-select, search and combined filters.

### Topics

```text
opencode
opencode-plugin
opencode-desktop
markdown
table
filter
typescript
gui-plugin
```

### 社交预览图

当前使用 `docs/preview.jpg`。GitHub 的社交预览推荐尺寸是 `1280 × 640`；如果后续需要更正式的
分享卡片，可以基于同一张截图重新排版，保留标题和筛选下拉。

## 一句话介绍

中文：

> 在 OpenCode 会话里像表格软件一样筛选 Markdown 表格，按列勾选、即时过滤、支持多列组合。

English：

> Filter Markdown tables in OpenCode sessions like a spreadsheet: pick column values, combine filters, and hide rows instantly.

## 中文短文案

适合微博、X、朋友圈或即时通信群：

> 给 OpenCode Desktop 写了一个表格筛选插件。
>
> 会话里的 Markdown 表格，表头会多出漏斗按钮。点开后勾选要保留的值，表格只显示匹配的行。支持多选、搜索、多列组合，还能一键清除筛选。
>
> MIT 开源，欢迎试用：
> https://github.com/DevDengChao/opencode-plugin-filterable-table

## 中文长文案

适合 V2EX、掘金、公众号或项目介绍页：

> **在 OpenCode 会话里筛选表格**
>
> OpenCode 的会话里经常出现 Markdown 表格，比如任务清单、配置对照、测试结果。表格一长，想只看其中几行就很麻烦。
>
> 我写了一个 OpenCode Desktop 插件 `opencode-plugin-filterable-table`：
>
> - 表头右侧增加漏斗按钮，点击即可按列筛选
> - 同一列支持多选、搜索、全选、全不选和重置
> - 多列条件可以叠加，列之间是 AND，同列多值是 OR
> - 表格下方显示「显示 X / Y 行」，可一键清除全部筛选
> - 跟随亮色/暗色主题和中英文界面
> - 消息重新渲染后尽量保留筛选状态
>
> 它只改变当前会话的显示，不修改 Markdown，也不改动会话数据。
>
> 目前验证版本是 OpenCode Desktop 2.2.1。GUI 插件 API 还是 experimental，所以后续 OpenCode 升级可能需要适配。
>
> 项目地址：
> https://github.com/DevDengChao/opencode-plugin-filterable-table

## English short copy

For X, Reddit, Discord, or a short update:

> Built a small OpenCode Desktop plugin for filtering Markdown tables inside sessions.
>
> Every table header gets a funnel button. Pick the values you want to keep and the table updates instantly. Multi-select, search, combined column filters, and one-click reset.
>
> MIT licensed:
> https://github.com/DevDengChao/opencode-plugin-filterable-table

## English long copy

For a blog post, release announcement, or longer post:

> **Filter Markdown tables inside OpenCode sessions**
>
> OpenCode sessions often contain Markdown tables: task lists, configuration comparisons, test results. Once a table gets long, finding the rows you care about becomes awkward.
>
> `opencode-plugin-filterable-table` adds a funnel button to each table header in OpenCode Desktop:
>
> - Multi-select values from a column
> - Search long value lists
> - Select all, select none, or reset a column
> - Combine filters across columns (AND across columns, OR within one column)
> - See `Showing X of Y rows` and clear all filters in one click
> - Follow the light/dark theme and Chinese/English UI
> - Restore filters when a table re-renders where possible
>
> Filtering is display-only. The plugin does not modify Markdown or stored session data.
>
> Tested with OpenCode Desktop 2.2.1. The Desktop GUI plugin API is still experimental, so future OpenCode releases may require adjustments.
>
> Repository:
> https://github.com/DevDengChao/opencode-plugin-filterable-table

## Release Notes

### v0.1.0

```markdown
# v0.1.0

First public release of OpenCode Filterable Table.

## Added

- Per-column filter buttons in Markdown tables inside OpenCode Desktop sessions
- Multi-select values with per-value row counts
- Search for long value lists
- Select all, select none, and reset per column
- Combined filters across columns
- Visible/total row footer with one-click clear
- Command palette action to clear all table filters
- Filter state retention across table re-renders
- Chinese and English UI copy
- Light and dark theme support
- Standalone demo and jsdom tests

## Notes

- Tested with OpenCode Desktop 2.2.1.
- The Desktop GUI plugin API is experimental.
- TUI is not supported.
```

## 发布前检查清单

- [ ] `npm run typecheck` 通过
- [ ] `npm run test` 通过
- [ ] `npm run build` 通过
- [ ] GitHub Actions CI 在 Ubuntu 和 Windows 上通过
- [ ] README 中的 `docs/preview.jpg` 能正常显示
- [ ] 仓库 About、Topics、社交预览图已设置
- [ ] Issue 模板可以正常选择
- [ ] 版本号和 `CHANGELOG.md` 一致
- [ ] 在 OpenCode Desktop 2.2.1 的真实会话中再次验证表头筛选
- [ ] 如果发布 Release，附上截图和安装说明
