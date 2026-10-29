# Contributing

感谢你愿意改进 OpenCode Filterable Table。提交代码前，请先阅读下面的开发与提交说明。

## 环境

- Node.js 20.19+
- npm
- OpenCode Desktop 2.2.x，用于手动验证 GUI 行为

## 本地开发

```bash
git clone git@github.com:DevDengChao/opencode-plugin-filterable-table.git
cd opencode-plugin-filterable-table
npm ci
npm run demo
```

`npm run demo` 会启动一个独立的浏览器演示页，默认地址为 `http://localhost:5173`。演示页不依赖
OpenCode Desktop，适合快速验证筛选、搜索、主题和键盘交互。

如果要在 Desktop 中调试真实会话：

1. 运行 `npm run dev`，或每次修改后运行 `npm run build`。
2. 在全局 `opencode.jsonc` 的 `plugins` 中指向本项目目录。
3. 打开一个包含 Markdown 表格的会话，确认表头出现漏斗按钮。
4. 如需查看扫描日志，把插件配置改为对象形式并设置 `"debug": true`。

## 检查

提交 Pull Request 前请运行：

```bash
npm run typecheck
npm run test
npm run build
```

涉及 UI 的改动，请同时在演示页和 OpenCode Desktop 中验证，并在 PR 描述中附上截图或录屏。

## 代码约定

- 使用 TypeScript，保持严格类型检查通过。
- 不引入不必要的运行时依赖。
- 用户可见的文本同时考虑中文和英文；新增文案放到 `src/labels.ts`。
- 颜色、边框和阴影优先使用 OpenCode 的 `--v2-*` 主题变量，保证亮色和暗色主题一致。
- 用户提供的值必须通过 `textContent` 写入，不要拼接进 `innerHTML`。
- OpenCode DOM 选择器集中在 `src/table-filter.ts`，便于版本升级后适配。
- 修改筛选行为时同步补充或更新 `tests/table-filter.test.ts`。

## 提交信息

使用 Conventional Commits 风格，例如：

```text
feat: add search to the column filter
fix: keep filters after the table re-renders
docs: add English README
test: cover empty cell values
chore: update dependencies
```

一个提交尽量只做一件事。不要把 `node_modules`、`dist` 或本地临时文件提交进仓库。

## 发布

npm 包名：

```text
@devdengchao/opencode-plugin-filterable-table
```

发布前先检查包内容：

```bash
npm pack --dry-run
```

发布流程使用 npm Trusted Publishing（OIDC）。但 npm 目前要求包已经存在，才能配置
Trusted Publisher，所以 **首次发布需要手动完成一次**：

```bash
npm login --registry=https://registry.npmjs.org
npm publish --access public --registry=https://registry.npmjs.org
```

发布成功后，在 npm 包设置中添加 Trusted Publisher：

```text
Organization or user: DevDengChao
Repository:           opencode-plugin-filterable-table
Workflow filename:    release.yml
Allowed actions:      勾选 npm publish
```

也可以使用 `npm trust`（需要 npm 11.15.0+）：

```bash
npm trust github @devdengchao/opencode-plugin-filterable-table \
  --repo DevDengChao/opencode-plugin-filterable-table \
  --file release.yml \
  --allow-publish \
  --registry=https://registry.npmjs.org
```

Trusted Publisher 配置后必须在 2 天内完成一次成功的 OIDC 发布，否则配置会过期。因此首次
手动发布后，建议立即提升一个补丁版本，让 `release.yml` 通过 OIDC 完成第一次自动发布：

```bash
npm version patch
git push --follow-tags
```

后续版本只需更新版本号并推送 `v*` tag。`release.yml` 会在版本尚未发布时执行
`npm publish`，已发布版本会自动跳过。

## Pull Request

PR 描述请包含：

- 改动目的和用户可见行为
- 验证步骤
- 是否影响 OpenCode 兼容性
- UI 改动截图
- 需要同步更新的 README / CHANGELOG

提交即表示你同意以本项目的 [MIT License](./LICENSE) 授权你的贡献。
