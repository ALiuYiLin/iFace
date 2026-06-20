# iFace 数据库设计

> **说明**: 原设计仅有 `questions` + `tags` 两张表，仅服务于内置题库 JSON → SQLite 的转换。前后端分离架构需要覆盖全部业务数据，以下为完整设计。

---

## 设计原则

- **主键**: UUID v4（`mock_interviews`, `jd_match_reports`, `answer_annotations`, `note_images`）
  / 业务主键（`questions.id`, `study_records.questionId`, `question_notes.questionId`）
- **时间戳**: 所有表统一 `created_at` / `updated_at`，Unix 毫秒（`BIGINT`），与前端现有代码兼容
- **软删除**: 不实现软删除，物理删除即可（数据量小）
- **JSON 列**: 对"始终整体读写、不单独查询子字段"的嵌套数据使用 JSONB
  - `mock_interviews` 的 `turns` 和 `report`
  - `questions` 的 `tags`
- **图片存储**: 文件系统存图片文件，表中存相对路径（`VARCHAR`），替代当前的 base64 `dataUrl`

---

## 表总览

| # | 表名 | 来源 | 说明 |
|---|------|------|------|
| 1 | `questions` | IndexedDB `questions` 存储 | 题目主表 |
| 2 | `study_records` | IndexedDB `study_records` 存储 | 学习记录 |
| 3 | `question_notes` | IndexedDB `question_notes` 存储 | 题目笔记 |
| 4 | `question_note_images` | IndexedDB `question_note_images` 存储 | 笔记图片 |
| 5 | `question_answer_annotations` | IndexedDB `question_answer_annotations` 存储 | 答案标注 |
| 6 | `question_answer_overrides` | IndexedDB `question_answer_overrides` 存储 | 自定义参考答案 |
| 7 | `question_flags` | IndexedDB `question_flags` 存储 | 题目标记 |
| 8 | `mock_interviews` | IndexedDB `mock_interviews` 存储 | 模拟面试会话 |
| 9 | `jd_match_reports` | IndexedDB `jd_match_reports` 存储 | JD 匹配报告 |
| 10 | `categories` | **新表** — 替代 meta → `category_map` | 分类定义 |
| 11 | `category_modules` | **新表** — 从 categories JSON 中拆分 | 分类-模块映射 |
| 12 | `custom_sources` | **新表** — 替代 meta → `custom_sources` | 用户导入来源 |
| 13 | `loaded_modules` | **新表** — 替代 meta → `loaded_modules` | 已加载的内置模块文件 |
| 14 | `ai_sessions` | **新表** — 替代 localStorage `iface_ai_sessions` | AI 对话会话 |
| 15 | `ai_messages` | **新表** — 从 ai_sessions JSON 中拆分 | AI 对话消息 |
| 16 | `user_streaks` | **新表** — 替代 localStorage `iface_streak` | 每日打卡数据 |
| 17 | `user_settings` | **新表** — 替代 localStorage 多项偏好 | 用户偏好设置 |
| 18 | `meta` | IndexedDB `meta` 存储（简化） | 通用 K-V，仅存少量配置 |

---

## 详细表结构

### 1. `questions` — 题目

```sql
CREATE TABLE questions (
  id          VARCHAR(64)  PRIMARY KEY,         -- "js-001" / "custom_mysource_001"
  module      VARCHAR(64)  NOT NULL,             -- "JS基础", "React"...
  difficulty  SMALLINT     NOT NULL CHECK (difficulty IN (1, 2, 3)),
  question    TEXT         NOT NULL,
  answer      TEXT         NOT NULL,             -- Markdown
  tags        JSONB        NOT NULL DEFAULT '[]', -- string[]
  source      VARCHAR(128),                       -- NULL=内置题，有值=用户导入
  created_at  BIGINT       NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000),
  updated_at  BIGINT       NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
);

CREATE INDEX idx_questions_module     ON questions (module);
CREATE INDEX idx_questions_difficulty ON questions (difficulty);
CREATE INDEX idx_questions_source     ON questions (source);
```

> **对比旧设计**: 原表有 `direction` 列（`frontend`/`java`/`golang`/`ai-agent`），新设计去掉 `direction`，因为前端实际按 `module` 字段查询和分类，`direction` 可以通过 `categories` + `category_modules` 表推导。

### 2. `study_records` — 学习记录

```sql
CREATE TABLE study_records (
  question_id   VARCHAR(64)  PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
  status        VARCHAR(16)  NOT NULL CHECK (status IN ('unlearned', 'review', 'mastered')),
  last_updated  BIGINT       NOT NULL,
  review_count  INTEGER      NOT NULL DEFAULT 0,
  created_at    BIGINT       NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
);

CREATE INDEX idx_study_records_status       ON study_records (status);
CREATE INDEX idx_study_records_last_updated ON study_records (last_updated);
```

### 3. `question_notes` — 题目笔记

```sql
CREATE TABLE question_notes (
  question_id VARCHAR(64) PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
  content     TEXT        NOT NULL DEFAULT '',
  created_at  BIGINT      NOT NULL,
  updated_at  BIGINT      NOT NULL
);

CREATE INDEX idx_question_notes_updated_at ON question_notes (updated_at);
```

### 4. `question_note_images` — 笔记图片

```sql
CREATE TABLE question_note_images (
  id          VARCHAR(36)  PRIMARY KEY,           -- UUID
  question_id VARCHAR(64)  NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  name        VARCHAR(256) NOT NULL,
  mime_type   VARCHAR(64)  NOT NULL,
  size        INTEGER      NOT NULL,
  file_path   VARCHAR(512) NOT NULL,              -- 文件路径，替代原 base64 dataUrl
  created_at  BIGINT       NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000),
  updated_at  BIGINT       NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
);

CREATE INDEX idx_note_images_question_id ON question_note_images (question_id);
```

> **变更说明**: 原 IndexedDB 存 base64 `dataUrl`，后端改用文件系统存储 + 路径引用。

### 5. `question_answer_annotations` — 答案标注

```sql
CREATE TABLE question_answer_annotations (
  id              VARCHAR(36)  PRIMARY KEY,       -- UUID
  question_id     VARCHAR(64)  NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer_hash     VARCHAR(64)  NOT NULL,
  kind            VARCHAR(16)  NOT NULL CHECK (kind IN ('highlight', 'comment')),
  color           VARCHAR(8)   NOT NULL CHECK (color IN ('yellow', 'green', 'blue', 'pink')),
  highlight_color VARCHAR(8)   CHECK (highlight_color IN ('yellow', 'green', 'blue', 'pink')),
  start_pos       INTEGER      NOT NULL,
  end_pos         INTEGER      NOT NULL,
  selected_text   TEXT         NOT NULL,
  note            TEXT         NOT NULL DEFAULT '',
  created_at      BIGINT       NOT NULL,
  updated_at      BIGINT       NOT NULL
);

CREATE INDEX idx_annotations_question_id ON question_answer_annotations (question_id);
CREATE INDEX idx_annotations_answer_hash ON question_answer_annotations (answer_hash);
```

### 6. `question_answer_overrides` — 自定义参考答案

```sql
CREATE TABLE question_answer_overrides (
  question_id VARCHAR(64) PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
  content     TEXT        NOT NULL,
  created_at  BIGINT      NOT NULL,
  updated_at  BIGINT      NOT NULL
);
```

### 7. `question_flags` — 题目标记

```sql
CREATE TABLE question_flags (
  question_id VARCHAR(64) PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
  starred     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  BIGINT      NOT NULL,
  updated_at  BIGINT      NOT NULL
);

CREATE INDEX idx_question_flags_starred ON question_flags (starred);
```

### 8. `mock_interviews` — 模拟面试会话

```sql
CREATE TABLE mock_interviews (
  id                    VARCHAR(36)  PRIMARY KEY,    -- UUID
  title                 VARCHAR(256) NOT NULL,
  role_title            VARCHAR(128) NOT NULL,
  level                 VARCHAR(16)  NOT NULL CHECK (level IN ('junior', 'mid', 'senior')),
  interview_type        VARCHAR(16)  NOT NULL CHECK (interview_type IN ('technical', 'project', 'comprehensive')),
  duration_minutes      INTEGER      NOT NULL DEFAULT 30,
  target_question_count INTEGER      NOT NULL DEFAULT 10,
  jd_text               TEXT         NOT NULL DEFAULT '',
  resume_text           TEXT         NOT NULL DEFAULT '',
  resume_file_name      VARCHAR(256),
  plan                  JSONB,                        -- MockInterviewPlan
  turns                 JSONB        NOT NULL DEFAULT '[]',  -- MockInterviewTurn[]
  status                VARCHAR(16)  NOT NULL DEFAULT 'planning'
                                      CHECK (status IN ('planning', 'interviewing', 'completed')),
  question_index        INTEGER      NOT NULL DEFAULT 0,
  follow_up_depth       INTEGER      NOT NULL DEFAULT 0,
  model                 VARCHAR(64),
  report                JSONB,                        -- MockInterviewReport
  started_at            BIGINT,
  completed_at          BIGINT,
  created_at            BIGINT       NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000),
  updated_at            BIGINT       NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
);

CREATE INDEX idx_mock_interviews_created_at ON mock_interviews (created_at DESC);
CREATE INDEX idx_mock_interviews_updated_at ON mock_interviews (updated_at DESC);
```

> **设计决策**: `turns` 和 `report` 使用 JSONB 列。理由：始终整批读写，从不单独查询某条 turn。

### 9. `jd_match_reports` — JD 匹配报告

```sql
CREATE TABLE jd_match_reports (
  id               VARCHAR(36)  PRIMARY KEY,    -- UUID
  title            VARCHAR(256) NOT NULL,
  role_title       VARCHAR(128) NOT NULL,
  jd_text          TEXT         NOT NULL DEFAULT '',
  resume_text      TEXT         NOT NULL DEFAULT '',
  resume_file_name VARCHAR(256),
  markdown         TEXT         NOT NULL,
  model            VARCHAR(64),
  created_at       BIGINT       NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000),
  updated_at       BIGINT       NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
);

CREATE INDEX idx_jd_match_reports_created_at ON jd_match_reports (created_at DESC);
CREATE INDEX idx_jd_match_reports_updated_at ON jd_match_reports (updated_at DESC);
```

### 10. `categories` — 分类定义（新表）

```sql
CREATE TABLE categories (
  name    VARCHAR(64) PRIMARY KEY,      -- "前端", "Go", "我的自定义分类"
  builtin BOOLEAN     NOT NULL DEFAULT FALSE,
  ord     INTEGER     NOT NULL DEFAULT 0,   -- 排序权重
  created_at BIGINT  NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000),
  updated_at BIGINT  NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
);
```

> 替代原 `meta` → `category_map` JSON 存储。

### 11. `category_modules` — 分类-模块映射（新表）

```sql
CREATE TABLE category_modules (
  category_name VARCHAR(64) NOT NULL REFERENCES categories(name) ON DELETE CASCADE,
  module_name   VARCHAR(64) NOT NULL,
  PRIMARY KEY (category_name, module_name)
);

CREATE INDEX idx_category_modules_module ON category_modules (module_name);
```

> 替代 `CategoryEntry.modules` JSON 数组。

### 12. `custom_sources` — 用户导入来源（新表）

```sql
CREATE TABLE custom_sources (
  name       VARCHAR(128) PRIMARY KEY,     -- 如 "我的题库"
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
);
```

### 13. `loaded_modules` — 已加载的内置模块（新表）

```sql
CREATE TABLE loaded_modules (
  file_path  VARCHAR(256) PRIMARY KEY,     -- 如 "frontend/js.json"
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
);
```

### 14. `ai_sessions` — AI 对话会话（新表）

```sql
CREATE TABLE ai_sessions (
  question_id VARCHAR(64) NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  created_at  BIGINT      NOT NULL,
  updated_at  BIGINT      NOT NULL,
  PRIMARY KEY (question_id)
);
```

### 15. `ai_messages` — AI 对话消息（新表）

```sql
CREATE TABLE ai_messages (
  id          VARCHAR(36)  PRIMARY KEY,     -- UUID
  question_id VARCHAR(64)  NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  role        VARCHAR(16)  NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content     TEXT         NOT NULL,
  created_at  BIGINT       NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
);

CREATE INDEX idx_ai_messages_question_id ON ai_messages (question_id, created_at);
```

> AI 对话当前存 localStorage，但 Gist 备份已将其作为一等数据（`AISession` 类型），导出 API 也包含 aiSessions。应迁移到服务端。

### 16. `user_streaks` — 每日打卡数据（新表）

```sql
CREATE TABLE user_streaks (
  id               VARCHAR(36) PRIMARY KEY,     -- UUID
  date             DATE        NOT NULL UNIQUE,  -- "YYYY-MM-DD"
  questions_done   INTEGER     NOT NULL DEFAULT 0,
  current_streak   INTEGER     NOT NULL DEFAULT 0,
  best_streak      INTEGER     NOT NULL DEFAULT 0,
  created_at       BIGINT      NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000),
  updated_at       BIGINT      NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
);
```

### 17. `user_settings` — 用户偏好设置（新表）

```sql
CREATE TABLE user_settings (
  key   VARCHAR(64) PRIMARY KEY,
  value JSONB       NOT NULL
);
```

| key | value 示例 |
|-----|-----------|
| `theme` | `"dark"` |
| `study_mode` | `"answer-first"` |
| `answer_navigation_mode` | `"answer"` |
| `mobile_question_nav_enabled` | `true` |
| `ai_fab_visible` | `true` |
| `daily_goal` | `10` |
| `hidden_categories` | `["Java", "Golang"]` |

### 18. `meta` — 通用元数据 KV 存储（精简）

```sql
CREATE TABLE meta (
  key        VARCHAR(128) PRIMARY KEY,
  value      JSONB        NOT NULL,
  updated_at BIGINT       NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
);
```

> **剩余用途（仅 3 项）**:
> - `schema_version` — 数据库 schema 版本号
> - `builtin_questions_version` — `"0.18.0"`
> - `builtin_replacement_migration` — 迁移追踪标记

> **不再存入 meta 的数据**（已拆独立表）:
> - ~~`loaded_modules`~~ → `loaded_modules` 表
> - ~~`custom_sources`~~ → `custom_sources` 表
> - ~~`category_map`~~ → `categories` + `category_modules` 表

---

## ER 关系

```
questions (1) ──< (1) study_records
questions (1) ──< (1) question_notes
questions (1) ──< (N) question_note_images
questions (1) ──< (N) question_answer_annotations
questions (1) ──< (1) question_answer_overrides
questions (1) ──< (1) question_flags
questions (1) ──< (N) ai_sessions
ai_sessions (1) ──< (N) ai_messages
categories (1) ──< (N) category_modules
```

`mock_interviews`、`jd_match_reports`、`custom_sources`、`loaded_modules`、`user_settings`、`user_streaks`、`meta` 均为独立表。

---

## 旧→新迁移对照

| 原存储位置 | 新表 |
|-----------|------|
| IndexedDB `STORES.QUESTIONS` | `questions` 表 |
| IndexedDB `STORES.STUDY_RECORDS` | `study_records` 表 |
| IndexedDB `STORES.QUESTION_NOTES` | `question_notes` 表 |
| IndexedDB `STORES.QUESTION_NOTE_IMAGES` | `question_note_images` 表（dataUrl → file_path） |
| IndexedDB `STORES.QUESTION_ANSWER_ANNOTATIONS` | `question_answer_annotations` 表 |
| IndexedDB `STORES.QUESTION_ANSWER_OVERRIDES` | `question_answer_overrides` 表 |
| IndexedDB `STORES.QUESTION_FLAGS` | `question_flags` 表 |
| IndexedDB `STORES.MOCK_INTERVIEWS` | `mock_interviews` 表 |
| IndexedDB `STORES.JD_MATCH_REPORTS` | `jd_match_reports` 表 |
| IndexedDB `STORES.META` → `category_map` | `categories` + `category_modules` 表 |
| IndexedDB `STORES.META` → `custom_sources` | `custom_sources` 表 |
| IndexedDB `STORES.META` → `loaded_modules` | `loaded_modules` 表 |
| IndexedDB `STORES.META` → 其他 | `meta` 表（精简） |
| localStorage `iface_ai_sessions` | `ai_sessions` + `ai_messages` 表 |
| localStorage `iface_streak` | `user_streaks` 表 |
| localStorage 多项偏好 | `user_settings` 表 |
| 原 `tags` 关联表 | 移除，使用 `questions.tags` JSONB 列 |

---

## 新增的 8 张表（原设计中不存在）

| 新表 | 原因 |
|------|------|
| `categories` | 原 `meta.category_map` 是 JSON blob，无法单独查询/修改某个分类 |
| `category_modules` | 原 `CategoryEntry.modules` 是嵌套数组，需单独增删模块 |
| `custom_sources` | 原 `meta.custom_sources` 是 JSON 数组，拆为独立表 |
| `loaded_modules` | 原 `meta.loaded_modules` 是 JSON 数组，拆为独立表 |
| `ai_sessions` | 原 localStorage，但备份/导出中包含，属于用户数据 |
| `ai_messages` | 原 `AISession.messages` JSON 数组，拆为独立表 |
| `user_streaks` | 原 localStorage，后端可提供跨设备打卡持久化 |
| `user_settings` | 原 localStorage 多项偏好，统一管理 |

---

## 索引清单

| 表 | 索引列 | 用途 |
|----|--------|------|
| `questions` | `module` | 按模块筛选 |
| `questions` | `difficulty` | 按难度筛选 |
| `questions` | `source` | 按来源筛选/删除 |
| `study_records` | `status` | 按学习状态筛选 |
| `study_records` | `last_updated` | 排序、复习推荐 |
| `question_notes` | `updated_at` | 最近笔记排序 |
| `question_note_images` | `question_id` | 按题目查图片 |
| `question_answer_annotations` | `question_id` | 按题目查标注 |
| `question_answer_annotations` | `answer_hash` | 按答案版本查 |
| `question_flags` | `starred` | 筛选星标 |
| `mock_interviews` | `created_at DESC` | 按创建时间排序 |
| `mock_interviews` | `updated_at DESC` | 按更新时间排序 |
| `jd_match_reports` | `created_at DESC` | 按创建时间排序 |
| `jd_match_reports` | `updated_at DESC` | 按更新时间排序 |
| `category_modules` | `module_name` | 反向查询模块所属分类 |
| `ai_messages` | `question_id, created_at` | 按题查对话消息 |
| `user_streaks` | `date` | 按日期查打卡数据 |

---


