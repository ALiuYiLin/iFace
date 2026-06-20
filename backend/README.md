# iFace Backend

面试题库应用的后端服务，提供 RESTful API 和数据持久化。

## 技术栈

- **运行时**: Node.js 22+
- **框架**: Express.js + TypeScript
- **数据库**: SQLite (via better-sqlite3)
- **开发工具**: tsx (watch/hot-reload)

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式（带热重载）
npm run dev

# 生产模式
npm start

# 构建
npm run build

# 类型检查
npm run typecheck
```

服务默认监听 `http://localhost:3001`。

## API 文档

所有 API 以 `/api` 为基准路径。

### 题目 (Questions)

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/questions` | 获取题目列表（支持 module/difficulty/source/search 筛选） |
| `GET` | `/api/questions/count` | 题目总数 |
| `GET` | `/api/questions/starred-ids` | 星标题目 ID 列表 |
| `GET` | `/api/questions/ids-with-content` | 有笔记的题目 ID 列表 |
| `GET` | `/api/questions/module/:module` | 按模块获取题目 |
| `GET` | `/api/questions/builtin-files` | 内置题库文件列表 |
| `GET` | `/api/questions/:id` | 获取单题 |
| `POST` | `/api/questions/bulk` | 批量写入题目 |
| `DELETE` | `/api/questions/:id` | 删除题目（级联删除关联数据） |
| `DELETE` | `/api/questions/source/:source` | 删除某来源全部题目 |

### 学习记录 (Study Records)

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/study-records` | 全部学习记录 |
| `GET` | `/api/study-records/:questionId` | 单题记录 |
| `PUT` | `/api/study-records/:questionId` | 写入记录 |
| `POST` | `/api/study-records/bulk` | 批量写入 |
| `DELETE` | `/api/study-records/:questionId` | 删除单条 |
| `DELETE` | `/api/study-records` | 清空全部 |

### 题目笔记 (Question Notes)

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/question-notes` | 全部笔记 |
| `GET` | `/api/question-notes/:questionId` | 单题笔记 |
| `PUT` | `/api/question-notes/:questionId` | 写入笔记（空内容自动删除） |
| `POST` | `/api/question-notes/bulk` | 批量写入 |
| `POST` | `/api/question-notes/:questionId/append` | 追加笔记内容 |
| `DELETE` | `/api/question-notes/:questionId` | 删除笔记 |

### 笔记图片 (Note Images)

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/question-note-images/:questionId` | 获取笔记图片 |
| `POST` | `/api/question-note-images` | 上传图片（multipart 或 base64） |
| `POST` | `/api/question-note-images/question/:questionId/cleanup` | 清理未引用图片 |
| `DELETE` | `/api/question-note-images/question/:questionId` | 删除全部图片 |

### 答案标注 (Answer Annotations)

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/answer-annotations` | 全部标注 |
| `GET` | `/api/answer-annotations/question/:questionId` | 单题标注 |
| `PUT` | `/api/answer-annotations/:id` | 写入标注 |
| `POST` | `/api/answer-annotations/bulk` | 批量写入 |
| `DELETE` | `/api/answer-annotations/:id` | 删除单条 |
| `DELETE` | `/api/answer-annotations/question/:questionId` | 删除单题全部标注 |

### 自定义答案 (Answer Overrides)

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/answer-overrides` | 全部自定义答案 |
| `GET` | `/api/answer-overrides/:questionId` | 单题自定义答案 |
| `PUT` | `/api/answer-overrides/:questionId` | 写入（空内容自动删除） |
| `POST` | `/api/answer-overrides/bulk` | 批量写入 |
| `DELETE` | `/api/answer-overrides/:questionId` | 删除 |

### 题目标记 (Question Flags)

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/question-flags` | 全部标记 |
| `GET` | `/api/question-flags/:questionId` | 单题标记 |
| `PUT` | `/api/question-flags/:questionId/star` | 设置星标 |
| `POST` | `/api/question-flags/bulk` | 批量写入 |

### 模拟面试 (Mock Interviews)

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/mock-interviews` | 全部会话 |
| `GET` | `/api/mock-interviews/:id` | 单次会话 |
| `PUT` | `/api/mock-interviews/:id` | 保存会话 |
| `POST` | `/api/mock-interviews/bulk` | 批量写入 |
| `DELETE` | `/api/mock-interviews/:id` | 删除 |
| `DELETE` | `/api/mock-interviews` | 清空全部 |

### JD 匹配报告

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/jd-match-reports` | 全部报告 |
| `PUT` | `/api/jd-match-reports/:id` | 保存报告 |
| `POST` | `/api/jd-match-reports/bulk` | 批量写入 |
| `DELETE` | `/api/jd-match-reports/:id` | 删除 |
| `DELETE` | `/api/jd-match-reports` | 清空全部 |

### 分类映射 (Categories)

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/categories` | 获取分类映射 |
| `PUT` | `/api/categories` | 保存完整分类映射 |
| `POST` | `/api/categories/:name/modules` | 注册模块到分类 |
| `POST` | `/api/categories/:name/modules/bulk` | 批量注册模块 |
| `DELETE` | `/api/categories/modules/:moduleName` | 从所有分类移除模块 |
| `DELETE` | `/api/categories/:name` | 删除自定义分类 |
| `PUT` | `/api/categories/:name/rename` | 重命名自定义分类 |

### 元数据 (Meta)

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/meta/:key` | 获取元数据 |
| `PUT` | `/api/meta/:key` | 设置元数据 |
| `DELETE` | `/api/meta/:key` | 删除元数据 |

### 模块 & 来源

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/modules/loaded` | 已加载的内置模块 |
| `POST` | `/api/modules/loaded` | 标记模块已加载 |
| `GET` | `/api/modules/active` | 活跃模块（有题目的模块） |
| `GET` | `/api/sources/custom` | 用户导入来源列表 |
| `POST` | `/api/sources/custom` | 添加来源 |
| `DELETE` | `/api/sources/custom/:source` | 移除来源 |

### 导入导出

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/export` | 全量导出 |
| `POST` | `/api/import/preview` | 预览导入 |
| `POST` | `/api/import` | 执行导入 |
| `POST` | `/api/import/custom-questions` | 导入自定义题目 |
| `POST` | `/api/questions/builtin/load` | 加载内置题库 |
| `POST` | `/api/questions/builtin/refresh` | 检查并刷新内置题库 |
| `POST` | `/api/questions/builtin/migrate` | 内置题目替换迁移 |
| `POST` | `/api/reset` | 重置全部数据 |

### AI 对话

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/ai/chat/completions` | OpenAI 兼容接口代理（SSE 流式） |

### 其他

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/settings/:key` | 获取偏好设置 |
| `PUT` | `/api/settings/:key` | 设置偏好 |
| `GET` | `/api/streaks` | 获取打卡数据 |
| `POST` | `/api/streaks` | 写入打卡数据 |
| `GET` | `/api/health` | 健康检查 |

## 项目结构

```
backend/
├── package.json               # 依赖和脚本
├── tsconfig.json              # TypeScript 配置
├── migration.sql              # 数据库迁移脚本
├── data/
│   └── iface.db               # SQLite 数据库
├── uploads/
│   └── note-images/           # 笔记图片存储
├── dist/                      # tsc 构建输出
└── src/
    ├── index.ts               # Express 入口
    ├── config.ts              # 配置（端口、路径）
    ├── db.ts                  # better-sqlite3 连接
    ├── types.ts               # 共享类型定义
    ├── middleware/
    │   └── errorHandler.ts    # 错误处理中间件
    └── routes/
        ├── index.ts           # 路由聚合
        ├── questions.ts       # 题目 CRUD
        ├── studyRecords.ts    # 学习记录
        ├── questionNotes.ts   # 笔记 + 追加
        ├── noteImages.ts      # 图片上传与管理
        ├── answerAnnotations.ts   # 答案标注
        ├── answerOverrides.ts     # 自定义答案
        ├── questionFlags.ts       # 题目标记
        ├── mockInterviews.ts      # 模拟面试
        ├── jdMatchReports.ts      # JD 匹配报告
        ├── categories.ts          # 分类映射
        ├── meta.ts                # 元数据 KV
        ├── modules.ts             # 模块 + 来源
        ├── settings.ts            # 偏好 + 打卡
        ├── importExport.ts        # 导入/导出/重置
        └── ai.ts                  # AI 代理
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3001` | 服务端口 |
| `DB_PATH` | `data/iface.db` | 数据库文件路径 |
| `UPLOAD_DIR` | `uploads/` | 上传文件存储目录 |
| `CORS_ORIGINS` | `*` | CORS 允许的源 |

## 数据库

SQLite 数据库位于 `data/iface.db`，共 18 张表。详见 [数据库设计文档](docs/database-design.md)。

## 内置题库

内置题库 JSON 文件位于项目根目录 `public/questions/`，按分类组织：
- `frontend/` — 前端方向
- `golang/` — Go 方向
- `ai-agent/` — AI Agent 方向
- `java/` — Java 方向

启动服务后用 `POST /api/questions/builtin/load` 加载到数据库。
