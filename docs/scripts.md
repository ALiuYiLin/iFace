# 脚本说明

## 开发服务

| 命令 | 说明 |
|---|---|
| `dev` | 启动 Vite 开发服务器，支持 HMR 热更新 |
| `build` | 先执行 `tsc -b`（TypeScript 构建），再执行 `vite build`（生产打包） |
| `preview` | 预览 Vite 构建产物 |

## 代码质量

| 命令 | 说明 |
|---|---|
| `lint` | 使用 Biome 检查并自动修复代码 |
| `format` | 使用 Biome 格式化代码 |
| `check` | 使用 Biome 检查代码（仅报告，不修改） |

## 构建辅助

| 命令 | 说明 |
|---|---|
| `build:learning-checks` | 将 `content/learning-checks/` 中的源学习检查题目编译为 `public/learning-checks/` 下的 JSON 包，供前端使用 |

## 单项检查

每个 `check:*` 脚本执行一个具体的质量验证，通过 `bun scripts/<name>.ts` 运行：

| 命令 | 检查项 | 说明 |
|---|---|---|
| `check:version` | 版本一致性 | `package.json` 版本 vs `README.md` 徽章、`docs/ROADMAP.md`、smoke 结果、`vite.config.ts` |
| `check:release` | 发布就绪 | 1.0 审计完成、smoke 记录、外部服务证据、发布说明最终状态 |
| `check:quality-gate` | 质量门禁 | `package.json` 是否包含所有必需的 npm 脚本 |
| `check:docs` | 文档资产 | README/docs 本地链接、`.env.example`、LICENSE、截图资源 |
| `check:external-records` | 外部 Smoke 记录 | 外部冒烟测试 JSON 结果是否过期（7天）、含密钥、结构正确 |
| `check:backup` | 本地备份导入 | v3 格式 fixture 加载、旧版备份推断、分类合并、错误输入拒绝 |
| `check:questions` | 题库质量 | JSON 模式、最小答案长度（180字符）、最少标签（2个）、ID 唯一性 |
| `check:sync` | Gist 同步兼容 | Gist 备份功能的 CRUD、合并、错误处理、负载解析完整单元测试 |
| `check:ai` | AI 配置与 Prompt | 模型预设、系统提示、反馈上下文构建、复盘笔记 Markdown、SSE 流解析 |
| `check:pwa` | PWA 构建产物 | `index.html`、`manifest.webmanifest`、`sw.js`、Workbox、图标、题库 JSON 预缓存 |
| `check:external` | 外部服务 Smoke | AI API（聊天、反馈）和 Gist API（读取、更新、清理）实时测试 |

## 聚合检查

| 命令 | 等价于 |
|---|---|
| `check:all` | `check` + `check:version` + `check:release` + `check:quality-gate` + `check:docs` + `check:external-records` + `check:backup` + `check:questions` + `check:sync` + `check:ai` + `build` + `check:pwa` |

聚合检查在 CI 或发布前使用，按顺序执行全部单项检查 + 构建 + PWA 验证。

## Smoke 测试

smoke 脚本是对 `check:external` 的包装，指定测试范围并记录结果：

| 命令 | 说明 |
|---|---|
| `smoke:external:ai` | 仅测试 AI API，结果写入 `docs/external-ai-smoke-result.json` |
| `smoke:external:gist` | 仅测试 Gist API，结果写入 `docs/external-gist-smoke-result.json` |

## 发布

| 脚本 | 说明 |
|---|---|
| `scripts/release.sh` | 基于 `package.json` 版本创建 GitHub Release，支持 `--dry-run` 预览 |
| `scripts/md_to_json.py` | Python 脚本，将 Markdown 格式的题库转为 JSON（YAML frontmatter 格式） |
