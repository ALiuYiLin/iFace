-- ==========================================================
-- iFace 数据库迁移脚本
-- 从旧设计 (questions + tags) → 完整 18 表设计
-- ==========================================================

BEGIN TRANSACTION;

-- ==========================================================
-- 1. 重构 questions 表
--    - 删除 direction 列
--    - source 改为可空（空串转为 NULL）
--    - 添加 created_at / updated_at
--    - tags 保持 TEXT（SQLite 用 TEXT 存 JSON 即可）
-- ==========================================================

CREATE TABLE questions_new (
  id          VARCHAR(64)  PRIMARY KEY,
  module      VARCHAR(64)  NOT NULL,
  difficulty  SMALLINT     NOT NULL CHECK (difficulty IN (1, 2, 3)),
  question    TEXT         NOT NULL,
  answer      TEXT         NOT NULL,
  tags        TEXT         NOT NULL DEFAULT '[]',
  source      VARCHAR(128),
  created_at  BIGINT       NOT NULL,
  updated_at  BIGINT       NOT NULL
);

INSERT INTO questions_new (id, module, difficulty, question, answer, tags, source, created_at, updated_at)
SELECT
  id,
  module,
  difficulty,
  question,
  answer,
  tags,
  NULLIF(source, '') AS source,
  CAST(strftime('%s', 'now') * 1000 AS INTEGER) AS created_at,
  CAST(strftime('%s', 'now') * 1000 AS INTEGER) AS updated_at
FROM questions;

DROP TABLE questions;
ALTER TABLE questions_new RENAME TO questions;

CREATE INDEX idx_questions_module     ON questions (module);
CREATE INDEX idx_questions_difficulty ON questions (difficulty);
CREATE INDEX idx_questions_source     ON questions (source);

-- ==========================================================
-- 2. 删除旧的 tags 关联表（改用 questions.tags JSON 列）
-- ==========================================================

DROP TABLE IF EXISTS tags;

-- ==========================================================
-- 3. 创建 study_records 表
-- ==========================================================

CREATE TABLE study_records (
  question_id   VARCHAR(64) PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
  status        VARCHAR(16) NOT NULL CHECK (status IN ('unlearned', 'review', 'mastered')),
  last_updated  BIGINT      NOT NULL,
  review_count  INTEGER     NOT NULL DEFAULT 0,
  created_at    BIGINT      NOT NULL
);

CREATE INDEX idx_study_records_status       ON study_records (status);
CREATE INDEX idx_study_records_last_updated ON study_records (last_updated);

-- ==========================================================
-- 4. 创建 question_notes 表
-- ==========================================================

CREATE TABLE question_notes (
  question_id VARCHAR(64) PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
  content     TEXT        NOT NULL DEFAULT '',
  created_at  BIGINT      NOT NULL,
  updated_at  BIGINT      NOT NULL
);

CREATE INDEX idx_question_notes_updated_at ON question_notes (updated_at);

-- ==========================================================
-- 5. 创建 question_note_images 表
-- ==========================================================

CREATE TABLE question_note_images (
  id          VARCHAR(36)  PRIMARY KEY,
  question_id VARCHAR(64)  NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  name        VARCHAR(256) NOT NULL,
  mime_type   VARCHAR(64)  NOT NULL,
  size        INTEGER      NOT NULL,
  file_path   VARCHAR(512) NOT NULL,
  created_at  BIGINT       NOT NULL,
  updated_at  BIGINT       NOT NULL
);

CREATE INDEX idx_note_images_question_id ON question_note_images (question_id);

-- ==========================================================
-- 6. 创建 question_answer_annotations 表
-- ==========================================================

CREATE TABLE question_answer_annotations (
  id              VARCHAR(36)  PRIMARY KEY,
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

-- ==========================================================
-- 7. 创建 question_answer_overrides 表
-- ==========================================================

CREATE TABLE question_answer_overrides (
  question_id VARCHAR(64) PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
  content     TEXT        NOT NULL,
  created_at  BIGINT      NOT NULL,
  updated_at  BIGINT      NOT NULL
);

-- ==========================================================
-- 8. 创建 question_flags 表
-- ==========================================================

CREATE TABLE question_flags (
  question_id VARCHAR(64) PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
  starred     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  BIGINT      NOT NULL,
  updated_at  BIGINT      NOT NULL
);

CREATE INDEX idx_question_flags_starred ON question_flags (starred);

-- ==========================================================
-- 9. 创建 mock_interviews 表
-- ==========================================================

CREATE TABLE mock_interviews (
  id                    VARCHAR(36)  PRIMARY KEY,
  title                 VARCHAR(256) NOT NULL,
  role_title            VARCHAR(128) NOT NULL,
  level                 VARCHAR(16)  NOT NULL CHECK (level IN ('junior', 'mid', 'senior')),
  interview_type        VARCHAR(16)  NOT NULL CHECK (interview_type IN ('technical', 'project', 'comprehensive')),
  duration_minutes      INTEGER      NOT NULL DEFAULT 30,
  target_question_count INTEGER      NOT NULL DEFAULT 10,
  jd_text               TEXT         NOT NULL DEFAULT '',
  resume_text           TEXT         NOT NULL DEFAULT '',
  resume_file_name      VARCHAR(256),
  plan                  TEXT,                         -- JSON
  turns                 TEXT         NOT NULL DEFAULT '[]',  -- JSON
  status                VARCHAR(16)  NOT NULL DEFAULT 'planning'
                                      CHECK (status IN ('planning', 'interviewing', 'completed')),
  question_index        INTEGER      NOT NULL DEFAULT 0,
  follow_up_depth       INTEGER      NOT NULL DEFAULT 0,
  model                 VARCHAR(64),
  report                TEXT,                         -- JSON
  started_at            BIGINT,
  completed_at          BIGINT,
  created_at            BIGINT       NOT NULL,
  updated_at            BIGINT       NOT NULL
);

CREATE INDEX idx_mock_interviews_created_at ON mock_interviews (created_at DESC);
CREATE INDEX idx_mock_interviews_updated_at ON mock_interviews (updated_at DESC);

-- ==========================================================
-- 10. 创建 jd_match_reports 表
-- ==========================================================

CREATE TABLE jd_match_reports (
  id               VARCHAR(36)  PRIMARY KEY,
  title            VARCHAR(256) NOT NULL,
  role_title       VARCHAR(128) NOT NULL,
  jd_text          TEXT         NOT NULL DEFAULT '',
  resume_text      TEXT         NOT NULL DEFAULT '',
  resume_file_name VARCHAR(256),
  markdown         TEXT         NOT NULL,
  model            VARCHAR(64),
  created_at       BIGINT       NOT NULL,
  updated_at       BIGINT       NOT NULL
);

CREATE INDEX idx_jd_match_reports_created_at ON jd_match_reports (created_at DESC);
CREATE INDEX idx_jd_match_reports_updated_at ON jd_match_reports (updated_at DESC);

-- ==========================================================
-- 11. 创建 categories 表
-- ==========================================================

CREATE TABLE categories (
  name    VARCHAR(64) PRIMARY KEY,
  builtin BOOLEAN     NOT NULL DEFAULT FALSE,
  ord     INTEGER     NOT NULL DEFAULT 0,
  created_at BIGINT   NOT NULL,
  updated_at BIGINT   NOT NULL
);

-- ==========================================================
-- 12. 创建 category_modules 表
-- ==========================================================

CREATE TABLE category_modules (
  category_name VARCHAR(64) NOT NULL REFERENCES categories(name) ON DELETE CASCADE,
  module_name   VARCHAR(64) NOT NULL,
  PRIMARY KEY (category_name, module_name)
);

CREATE INDEX idx_category_modules_module ON category_modules (module_name);

-- ==========================================================
-- 13. 创建 custom_sources 表
-- ==========================================================

CREATE TABLE custom_sources (
  name       VARCHAR(128) PRIMARY KEY,
  created_at BIGINT NOT NULL
);

-- ==========================================================
-- 14. 创建 loaded_modules 表
-- ==========================================================

CREATE TABLE loaded_modules (
  file_path  VARCHAR(256) PRIMARY KEY,
  created_at BIGINT NOT NULL
);

-- ==========================================================
-- 15. 创建 ai_sessions 表
-- ==========================================================

CREATE TABLE ai_sessions (
  question_id VARCHAR(64) NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  created_at  BIGINT      NOT NULL,
  updated_at  BIGINT      NOT NULL,
  PRIMARY KEY (question_id)
);

-- ==========================================================
-- 16. 创建 ai_messages 表
-- ==========================================================

CREATE TABLE ai_messages (
  id          VARCHAR(36)  PRIMARY KEY,
  question_id VARCHAR(64)  NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  role        VARCHAR(16)  NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content     TEXT         NOT NULL,
  created_at  BIGINT       NOT NULL
);

CREATE INDEX idx_ai_messages_question_id ON ai_messages (question_id, created_at);

-- ==========================================================
-- 17. 创建 user_streaks 表
-- ==========================================================

CREATE TABLE user_streaks (
  id               VARCHAR(36) PRIMARY KEY,
  date             DATE        NOT NULL,
  questions_done   INTEGER     NOT NULL DEFAULT 0,
  current_streak   INTEGER     NOT NULL DEFAULT 0,
  best_streak      INTEGER     NOT NULL DEFAULT 0,
  created_at       BIGINT      NOT NULL,
  updated_at       BIGINT      NOT NULL
);

CREATE UNIQUE INDEX idx_user_streaks_date ON user_streaks (date);

-- ==========================================================
-- 18. 创建 user_settings 表
-- ==========================================================

CREATE TABLE user_settings (
  key   VARCHAR(64) PRIMARY KEY,
  value TEXT NOT NULL   -- JSON
);

-- ==========================================================
-- 19. 创建 meta 表
-- ==========================================================

CREATE TABLE meta (
  key        VARCHAR(128) PRIMARY KEY,
  value      TEXT    NOT NULL,  -- JSON
  updated_at BIGINT  NOT NULL
);

-- ==========================================================
-- 20. 初始化默认分类数据
-- ==========================================================

INSERT INTO categories (name, builtin, ord, created_at, updated_at) VALUES
  ('前端',    1, 0, 1710000000000, 1710000000000),
  ('Golang',  1, 1, 1710000000000, 1710000000000),
  ('AI Agent',1, 2, 1710000000000, 1710000000000),
  ('Java',    1, 3, 1710000000000, 1710000000000);

INSERT INTO category_modules (category_name, module_name) VALUES
  ('前端',    'JS基础'),
  ('前端',    'React'),
  ('前端',    'Vue'),
  ('前端',    'CSS'),
  ('前端',    'TypeScript'),
  ('前端',    '性能优化'),
  ('前端',    '网络'),
  ('前端',    '手写题'),
  ('前端',    '项目深挖'),
  ('Golang',  'Go基础'),
  ('Golang',  '并发编程'),
  ('Golang',  '内存与GC'),
  ('Golang',  '工程化'),
  ('Golang',  'Web开发'),
  ('AI Agent','LLM基础'),
  ('AI Agent','Prompt工程'),
  ('AI Agent','Agent架构'),
  ('AI Agent','RAG与知识库'),
  ('AI Agent','工具调用与工作流'),
  ('AI Agent','评测与线上优化'),
  ('AI Agent','AI工程化'),
  ('AI Agent','AI应用实践'),
  ('Java',    'Java基础'),
  ('Java',    'Java并发'),
  ('Java',    'JVM'),
  ('Java',    'Spring框架'),
  ('Java',    '计算机网络'),
  ('Java',    'MySQL'),
  ('Java',    'Redis');

-- ==========================================================
-- 21. 初始化 schema_version
-- ==========================================================

INSERT INTO meta (key, value, updated_at) VALUES
  ('schema_version', '1', 1710000000000);

COMMIT;

-- ==========================================================
-- 完成。验证：
--   .tables        → 应显示 18 张表
--   SELECT COUNT(*) FROM questions;  → 1222 条
--   SELECT COUNT(*) FROM categories; → 4 条
-- ==========================================================
