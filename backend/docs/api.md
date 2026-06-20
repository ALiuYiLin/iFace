# iFace 后端 API 设计

从 `src/lib/db.ts` 分析出的完整 API 清单。目标：从浏览器 IndexedDB 迁移到后端服务器（Node.js + 数据库），前端通过 HTTP 调用。

---

## 通用约定

- **基准路径**: `/api`
- **请求体**: `application/json`
- **响应格式**:

```typescript
// 成功
{ "data": T }

// 列表（带分页）
{ "data": T[], "total": number, "page": number, "pageSize": number }

// 错误
{ "error": { "code": string, "message": string } }
```

- **时间戳**: 所有时间字段均为 Unix 毫秒时间戳（与现有前端一致）
- **分页**: 默认 `page=1, pageSize=100`，最大 `pageSize=1000`

---

## 数据模型

```typescript
// ===== 题目 =====
interface Question {
  id: string           // 主键，如 "js-001" / "custom_mysource_001"
  module: string       // 模块名，如 "JS基础", "React"
  difficulty: 1 | 2 | 3
  question: string     // 题干
  answer: string       // 参考答案（Markdown）
  tags: string[]       // 标签
  source?: string      // 来源（仅自定义题目有）
}

// ===== 学习记录 =====
interface StudyRecord {
  questionId: string   // FK → Question.id
  status: 'unlearned' | 'review' | 'mastered'
  lastUpdated: number  // 时间戳
  reviewCount: number
}

// ===== 题目笔记 =====
interface QuestionNote {
  questionId: string   // PK
  content: string      // Markdown 内容
  createdAt: number
  updatedAt: number
}

// ===== 笔记图片 =====
interface QuestionNoteImage {
  id: string           // UUID
  questionId: string   // FK
  name: string
  mimeType: string
  size: number
  dataUrl: string      // Base64 图片数据
  createdAt: number
  updatedAt: number
}

// ===== 答案标注（高亮/评论） =====
type AnswerAnnotationKind = 'highlight' | 'comment'
type AnswerAnnotationColor = 'yellow' | 'green' | 'blue' | 'pink'

interface QuestionAnswerAnnotation {
  id: string            // UUID
  questionId: string
  answerHash: string
  kind: AnswerAnnotationKind
  color: AnswerAnnotationColor
  highlightColor?: AnswerAnnotationColor | null
  start: number
  end: number
  selectedText: string
  note: string
  createdAt: number
  updatedAt: number
}

// ===== 自定义参考答案 =====
interface QuestionAnswerOverride {
  questionId: string   // PK
  content: string
  createdAt: number
  updatedAt: number
}

// ===== 题目标记 =====
interface QuestionFlag {
  questionId: string   // PK
  starred: boolean
  createdAt: number
  updatedAt: number
}

// ===== 模拟面试会话 =====
interface MockInterviewSession {
  id: string
  title: string
  roleTitle: string
  level: 'junior' | 'mid' | 'senior'
  interviewType: 'technical' | 'project' | 'comprehensive'
  durationMinutes: number
  targetQuestionCount: number
  jdText: string
  resumeText: string
  resumeFileName?: string
  plan?: MockInterviewPlan
  turns: MockInterviewTurn[]
  status: 'planning' | 'interviewing' | 'completed'
  questionIndex: number
  followUpDepth: number
  model?: string
  report?: MockInterviewReport
  startedAt?: number
  completedAt?: number
  createdAt: number
  updatedAt: number
}

interface MockInterviewPlan {
  summary: string
  focusAreas: string[]
  sections: MockInterviewPlanSection[]
  openingQuestion: string
}

interface MockInterviewPlanSection {
  title: string
  weight: number
  intent: string
}

interface MockInterviewTurn {
  id: string
  role: 'interviewer' | 'candidate'
  kind: 'question' | 'follow_up' | 'clarification' | 'answer' | 'closing'
  content: string
  createdAt: number
}

interface MockInterviewDimensionScore {
  label: string
  score: number
  comment: string
}

interface MockInterviewReport {
  markdown: string
  overallScore: number | null
  dimensions: MockInterviewDimensionScore[]
  recommendedQuestionIds: string[]
  createdAt: number
}

// ===== JD 匹配报告 =====
interface JdMatchReport {
  id: string
  title: string
  roleTitle: string
  jdText: string
  resumeText: string
  resumeFileName?: string
  markdown: string
  model?: string
  createdAt: number
  updatedAt: number
}

// ===== 分类映射（Category Map） =====
interface CategoryEntry {
  name: string         // 显示名，如 "前端", "Go"
  modules: string[]    // 模块列表
  builtin: boolean     // 内置还是用户自定义
  order: number        // 排序权重
}
type CategoryMap = Record<string, CategoryEntry>

// ===== 元数据（Key-Value） =====
interface MetaEntry {
  key: string
  value: unknown
}

// 预定义 Meta Key 常量
const META_KEYS = {
  LOADED_MODULES: 'loaded_modules',           // string[] — 已加载的内置模块
  CUSTOM_SOURCES: 'custom_sources',           // string[] — 用户导入的来源名
  DAILY_RECS: 'daily_recommendations',        // { date: string, ids: string[] }
  SCHEMA_VERSION: 'schema_version',
  BUILTIN_QUESTIONS_VERSION: 'builtin_questions_version',
  BUILTIN_REPLACEMENT_MIGRATION: 'builtin_replacement_migration',
  CATEGORY_MAP: 'category_map',               // CategoryMap
} as const
```

---

## API 清单

### 1. 题目（Questions）

| 方法 | 路径 | 说明 | 对应 db.ts |
|------|------|------|-----------|
| `GET` | `/api/questions` | 获取全部题目 | `getAllQuestions()` |
| `GET` | `/api/questions/:id` | 获取单题 | `getQuestionById(id)` |
| `GET` | `/api/questions/module/:module` | 按模块获取 | `getQuestionsByModule(module)` |
| `GET` | `/api/questions/count` | 题目总数 | `getQuestionCount()` |
| `POST` | `/api/questions/bulk` | 批量写入/覆盖 | `bulkPutQuestions(questions)` |
| `DELETE` | `/api/questions/:id` | 删除题目及关联数据 | `deleteQuestionById(id)` |
| `DELETE` | `/api/questions/source/:source` | 删除某来源的全部题目 | `deleteQuestionsBySource(source)` |

**GET /api/questions**

```typescript
// Query
query?: {
  module?: string        // 按模块筛选
  difficulty?: 1 | 2 | 3
  source?: string
  search?: string        // 搜索题干/标签/模块
  page?: number
  pageSize?: number
}

// Response 200
{
  data: Question[]
  total: number
  page: number
  pageSize: number
}
```

**GET /api/questions/:id**

```typescript
// Response 200
{ data: Question }

// Response 404
{ error: { code: "NOT_FOUND", message: "题目不存在" } }
```

**POST /api/questions/bulk**

```typescript
// Request
{ questions: Question[] }

// Response 200
{ data: { count: number } }
```

**DELETE /api/questions/:id**

级联删除关联的：study_record、question_note、question_note_images、answer_annotations、answer_override、question_flag

```typescript
// Response 200
{ data: { deletedId: string } }
```

**DELETE /api/questions/source/:source**

级联删除该来源所有题目及其关联数据。删除完成后清理 `custom_sources`。

```typescript
// Response 200
{ data: { deletedCount: number, removedSource: string } }
```

---

### 2. 学习记录（Study Records）

| 方法 | 路径 | 说明 | 对应 db.ts |
|------|------|------|-----------|
| `GET` | `/api/study-records` | 全部学习记录 | `getAllStudyRecords()` |
| `GET` | `/api/study-records/:questionId` | 单题记录 | `getStudyRecord(questionId)` |
| `PUT` | `/api/study-records/:questionId` | 写入记录 | `putStudyRecord(record)` |
| `POST` | `/api/study-records/bulk` | 批量写入 | `bulkPutStudyRecords(records)` |
| `DELETE` | `/api/study-records/:questionId` | 删除单条 | `deleteStudyRecord(questionId)` |
| `DELETE` | `/api/study-records` | 清空全部 | `clearAllStudyRecords()` |

**PUT /api/study-records/:questionId**

```typescript
// Request
{
  status: 'unlearned' | 'review' | 'mastered'
  lastUpdated?: number   // 缺省使用服务器时间
  reviewCount: number
}

// Response 200
{ data: StudyRecord }
```

---

### 3. 题目笔记（Question Notes）

| 方法 | 路径 | 说明 | 对应 db.ts |
|------|------|------|-----------|
| `GET` | `/api/question-notes` | 全部笔记 | `getAllQuestionNotes()` |
| `GET` | `/api/question-notes/:questionId` | 单题笔记 | `getQuestionNote(questionId)` |
| `PUT` | `/api/question-notes/:questionId` | 写入笔记 | `putQuestionNote(note)` |
| `POST` | `/api/question-notes/bulk` | 批量写入 | `bulkPutQuestionNotes(notes)` |
| `DELETE` | `/api/question-notes/:questionId` | 删除笔记 | `deleteQuestionNote(questionId)` |
| `GET` | `/api/question-notes/ids-with-content` | 有笔记的题目 ID | `getQuestionNoteIds()` |
| `POST` | `/api/question-notes/:questionId/append` | 追加笔记内容 | `appendQuestionNoteContent()` |

**PUT /api/question-notes/:questionId**

> 当 `content` 为空字符串或纯空白时，自动删除该笔记记录。

```typescript
// Request
{
  content: string
  createdAt?: number
}

// Response 200
{
  data: QuestionNote  // 有内容时
  // 或
  data: null           // 内容为空已删除
}
```

**POST /api/question-notes/:questionId/append**

```typescript
// Request
{ content: string }

// Response 200
{ data: QuestionNote }  // 返回合并后的完整笔记
```

---

### 4. 笔记图片（Question Note Images）

| 方法 | 路径 | 说明 | 对应 db.ts |
|------|------|------|-----------|
| `GET` | `/api/question-note-images/:questionId` | 获取笔记图片 | `getQuestionNoteImages(questionId)` |
| `POST` | `/api/question-note-images` | 上传图片 | `putQuestionNoteImage(image)` |
| `DELETE` | `/api/question-note-images/question/:questionId` | 删除全部 | `deleteQuestionNoteImagesByQuestionId()` |
| `POST` | `/api/question-note-images/question/:questionId/cleanup` | 清理未引用图片 | `deleteUnusedQuestionNoteImages()` |

> **建议**: 图片存储可选方案
> 1. Base64 存数据库（当前方案，简单但浪费空间）
> 2. 文件系统/对象存储（推荐），`dataUrl` 字段改为 URL

**POST /api/question-note-images**

```typescript
// Request (multipart/form-data 或 application/json)
{
  id: string
  questionId: string
  name: string
  mimeType: string
  size: number
  dataUrl: string    // Base64 或图片 URL
}

// Response 201
{ data: QuestionNoteImage }
```

**POST /api/question-note-images/question/:questionId/cleanup**

```typescript
// Request
{ keepIds: string[] }   // 正被笔记引用的图片 ID

// Response 200
{ data: { deletedCount: number } }
```

---

### 5. 答案标注（Answer Annotations）

| 方法 | 路径 | 说明 | 对应 db.ts |
|------|------|------|-----------|
| `GET` | `/api/answer-annotations` | 全部标注 | `getAllQuestionAnswerAnnotations()` |
| `GET` | `/api/answer-annotations/question/:questionId` | 单题标注 | `getQuestionAnswerAnnotations(questionId)` |
| `PUT` | `/api/answer-annotations/:id` | 写入标注 | `putQuestionAnswerAnnotation(annotation)` |
| `POST` | `/api/answer-annotations/bulk` | 批量写入 | `bulkPutQuestionAnswerAnnotations(annotations)` |
| `DELETE` | `/api/answer-annotations/:id` | 删除单条 | `deleteQuestionAnswerAnnotation(id)` |
| `DELETE` | `/api/answer-annotations/question/:questionId` | 删除单题全部 | `deleteQuestionAnswerAnnotationsByQuestionId()` |

**PUT /api/answer-annotations/:id**

```typescript
// Request
{
  questionId: string
  answerHash: string
  kind: 'highlight' | 'comment'
  color: 'yellow' | 'green' | 'blue' | 'pink'
  highlightColor?: 'yellow' | 'green' | 'blue' | 'pink' | null
  start: number
  end: number
  selectedText: string
  note: string
  createdAt?: number
}

// Response 200
{ data: QuestionAnswerAnnotation }
```

---

### 6. 自定义答案（Answer Overrides）

| 方法 | 路径 | 说明 | 对应 db.ts |
|------|------|------|-----------|
| `GET` | `/api/answer-overrides` | 全部自定义答案 | `getAllQuestionAnswerOverrides()` |
| `GET` | `/api/answer-overrides/:questionId` | 单题 | `getQuestionAnswerOverride(questionId)` |
| `PUT` | `/api/answer-overrides/:questionId` | 写入/删除 | `putQuestionAnswerOverride(override)` |
| `POST` | `/api/answer-overrides/bulk` | 批量写入 | `bulkPutQuestionAnswerOverrides(overrides)` |
| `DELETE` | `/api/answer-overrides/:questionId` | 删除 | `deleteQuestionAnswerOverride(questionId)` |

> `content` 为空时自动删除记录，返回 `null`。

**PUT /api/answer-overrides/:questionId**

```typescript
// Request
{
  content: string
  createdAt?: number
}

// Response 200
{ data: QuestionAnswerOverride | null }
```

---

### 7. 题目标记（Question Flags）

| 方法 | 路径 | 说明 | 对应 db.ts |
|------|------|------|-----------|
| `GET` | `/api/question-flags` | 全部标记 | `getAllQuestionFlags()` |
| `GET` | `/api/question-flags/:questionId` | 单题标记 | `getQuestionFlag(questionId)` |
| `PUT` | `/api/question-flags/:questionId/star` | 设置星标 | `setQuestionStarred(questionId, starred)` |
| `POST` | `/api/question-flags/bulk` | 批量写入 | `bulkPutQuestionFlags(flags)` |
| `GET` | `/api/question-flags/starred-ids` | 星标题目 ID | `getStarredQuestionIds()` |

**PUT /api/question-flags/:questionId/star**

```typescript
// Request
{ starred: boolean }

// Response 200
{ data: QuestionFlag }
```

---

### 8. 模拟面试（Mock Interviews）

| 方法 | 路径 | 说明 | 对应 db.ts |
|------|------|------|-----------|
| `GET` | `/api/mock-interviews` | 全部会话（按 updatedAt 降序） | `getAllMockInterviews()` |
| `GET` | `/api/mock-interviews/:id` | 单次会话 | `getMockInterviewById(id)` |
| `PUT` | `/api/mock-interviews/:id` | 保存会话 | `putMockInterview(session)` |
| `POST` | `/api/mock-interviews/bulk` | 批量写入 | `bulkPutMockInterviews(sessions)` |
| `DELETE` | `/api/mock-interviews/:id` | 删除 | `deleteMockInterview(id)` |
| `DELETE` | `/api/mock-interviews` | 清空全部 | `clearAllMockInterviews()` |

**PUT /api/mock-interviews/:id**

```typescript
// Request: MockInterviewSession（完整覆盖）
// updatedAt 由服务器自动设置

// Response 200
{ data: MockInterviewSession }
```

---

### 9. JD 匹配报告（JD Match Reports）

| 方法 | 路径 | 说明 | 对应 db.ts |
|------|------|------|-----------|
| `GET` | `/api/jd-match-reports` | 全部报告（按 updatedAt 降序） | `getAllJdMatchReports()` |
| `PUT` | `/api/jd-match-reports/:id` | 保存报告 | `putJdMatchReport(report)` |
| `POST` | `/api/jd-match-reports/bulk` | 批量写入 | `bulkPutJdMatchReports(reports)` |
| `DELETE` | `/api/jd-match-reports/:id` | 删除 | `deleteJdMatchReport(id)` |
| `DELETE` | `/api/jd-match-reports` | 清空全部 | `clearAllJdMatchReports()` |

---

### 10. 分类映射（Category Map）

| 方法 | 路径 | 说明 | 对应 db.ts |
|------|------|------|-----------|
| `GET` | `/api/categories` | 获取合并后的分类映射 | `getCategoryMap()` |
| `PUT` | `/api/categories` | 保存完整分类映射 | `saveCategoryMap(map)` |
| `POST` | `/api/categories/:name/modules` | 注册模块到分类 | `registerModuleInCategory(name, module)` |
| `POST` | `/api/categories/:name/modules/bulk` | 批量注册模块 | `registerModulesInCategory(name, modules)` |
| `DELETE` | `/api/categories/modules/:moduleName` | 从所有分类移除模块 | `unregisterModuleFromCategories(moduleName)` |
| `DELETE` | `/api/categories/:name` | 删除自定义分类 | `deleteCategory(name)` |
| `PUT` | `/api/categories/:name/rename` | 重命名自定义分类 | `renameCategory(oldName, newName)` |

**GET /api/categories**

```typescript
// 合并逻辑：内置分类 + 用户自定义分类。内置分类若被自定义扩展过，合并 modules。
// Response 200
{ data: CategoryMap }
```

**PUT /api/categories**

```typescript
// Request: CategoryMap

// Response 200
{ data: CategoryMap }
```

**PUT /api/categories/:name/rename**

```typescript
// Request
{ newName: string }

// Response 200
{ data: CategoryMap }
```

---

### 11. 元数据（Meta）

| 方法 | 路径 | 说明 | 对应 db.ts |
|------|------|------|-----------|
| `GET` | `/api/meta/:key` | 获取元数据值 | `getMeta<T>(key)` |
| `PUT` | `/api/meta/:key` | 设置元数据 | `setMeta(key, value)` |
| `DELETE` | `/api/meta/:key` | 删除元数据 | `deleteMeta(key)` |

```typescript
// GET /api/meta/:key
// Response 200
{ data: unknown }

// Response 404
{ error: { code: "NOT_FOUND", message: "key 不存在" } }

// PUT /api/meta/:key
// Request: 任意 JSON value
{ value: unknown }

// Response 200
{ data: { key: string, value: unknown } }
```

---

### 12. 模块 & 来源跟踪

| 方法 | 路径 | 说明 | 对应 db.ts |
|------|------|------|-----------|
| `GET` | `/api/modules/loaded` | 已加载的内置模块列表 | `getLoadedModules()` |
| `POST` | `/api/modules/loaded` | 标记模块已加载 | `markModuleLoaded(file)` |
| `GET` | `/api/modules/active` | 有题目的活跃模块列表 | `getActiveModules()` |
| `GET` | `/api/sources/custom` | 用户导入的来源列表 | `getCustomSources()` |
| `POST` | `/api/sources/custom` | 添加来源 | `addCustomSource(source)` |
| `DELETE` | `/api/sources/custom/:source` | 移除来源 | `removeCustomSource(source)` |

```typescript
// POST /api/modules/loaded
{ file: string }    // 如 "frontend/js.json"

// POST /api/sources/custom
{ source: string }  // 如 "我的题库"
```

---

### 13. 导入 & 导出（Import / Export）

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/export` | 导出全部数据（备份用） |
| `POST` | `/api/import/preview` | 预览导入（不写入，返回影响分析） |
| `POST` | `/api/import` | 执行导入（含合并逻辑） |
| `POST` | `/api/import/custom-questions` | 导入自定义题目（ImportPage 流程） |
| `GET` | `/api/questions/builtin-files` | 获取内置题库文件列表 |
| `POST` | `/api/questions/builtin/load` | 加载内置题库到数据库 |
| `POST` | `/api/questions/builtin/refresh` | 检查并刷新内置题库 |
| `POST` | `/api/questions/builtin/migrate` | 执行内置题目替换迁移 |
| `POST` | `/api/reset` | 重置整个数据库 |

**GET /api/export**

```typescript
// Response 200
{
  data: {
    formatVersion: 8
    exportedAt: string        // ISO 8601
    questions: Question[]
    studyRecords: StudyRecord[]
    questionNotes: QuestionNote[]
    questionAnswerAnnotations: QuestionAnswerAnnotation[]
    questionAnswerOverrides: QuestionAnswerOverride[]
    questionFlags: QuestionFlag[]
    mockInterviews: MockInterviewSession[]
    jdMatchReports: JdMatchReport[]
    customSources: string[]
    customCategories: CategoryMap          // 仅非 builtin 分类
  }
}
```

**POST /api/import/preview**

```typescript
// Request: 完整的备份 JSON（格式同 export 响应体）

// Response 200
{
  data: {
    fileName: string
    questions: Question[]
    studyRecords: StudyRecord[]
    questionNotes: QuestionNote[]
    questionAnswerAnnotations: QuestionAnswerAnnotation[]
    questionAnswerOverrides: QuestionAnswerOverride[]
    questionFlags: QuestionFlag[]
    aiSessions: AISession[]
    mockInterviews: MockInterviewSession[]
    jdMatchReports: JdMatchReport[]
    customSources: string[]
    customCategories: CategoryMap
    impact: {
      questions: { created: number, overwritten: number }
      studyRecords: { created: number, overwritten: number }
      // ... 其他实体同上
    }
  }
}
```

**POST /api/import/custom-questions**

```typescript
// Request
{
  data: unknown          // 原始 JSON 数据
  sourceName: string     // 来源名称
  categoryName?: string  // 可选分类
}

// Response 200
{
  data: {
    source: string
    loaded: number
    errors: { index: number; message: string }[]
    warnings: string[]
  }
}

// 处理逻辑：
// 1. 验证 + 标准化（normalizeQuestionsForImport）
// 2. 每个题目 ID 加前缀 "custom_{sourceName}_"
// 3. ID 冲突时覆盖
// 4. 注册 modules 到 Categories
// 5. 添加 custom source
```

**POST /api/questions/builtin/load**

```typescript
// Request 可选
{
  force?: boolean       // 强制重新加载（忽略已加载标记）
}

// Response 200
{
  data: {
    file: string
    loaded: number
    skipped: number
    errors: { index: number; message: string }[]
  }[]
}
```

**POST /api/questions/builtin/refresh**

检查版本号 `builtin_questions_version`，若落后于 `BUILTIN_QUESTIONS_VERSION`（当前 `0.18.0`）则重新加载内置题目。

```typescript
// Response 200
{ data: { refreshed: boolean } }
```

**POST /api/questions/builtin/migrate**

将旧版 ID（`custom_xxx` 前缀）的题目迁移到新版内置题目标准 ID（`js-001` 等格式），合并学习记录、笔记、标记。

```typescript
// Response 200
{
  data: {
    migratedQuestions: number
    migratedRecords: number
    migratedNotes: number
    migratedAnswerOverrides: number
    migratedFlags: number
    removedSources: number
    removedCategories: number
  }
}
```

**POST /api/reset**

```typescript
// 清空所有数据表：
// questions, study_records, question_notes, question_note_images,
// question_answer_annotations, question_answer_overrides,
// question_flags, mock_interviews, jd_match_reports, meta

// Response 200
{ data: { ok: true } }
```

---

### 14. AI 对话（Proxy）

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/ai/chat/completions` | 代理到 OpenAI 兼容接口 |

前端目前直接调用外部 API（`aiClient.ts`）。后端可以：
- **方案 A**：前端直连外部 API（保持现状，无需后端代理）
- **方案 B**：后端代理（统一管理 API Key，CORS 简单）

```typescript
// POST /api/ai/chat/completions（方案 B）
// Request
{
  config: {
    apiKey: string
    baseUrl: string
    model: string
    temperature: number
    maxTokens: number
    provider?: string
  }
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[]
}

// Response: SSE Stream（与 OpenAI Chat Completions 一致）
```

---

## 前端保留的客户端状态（不迁移到后端）

以下数据仅存在于客户端 localStorage/sessionStorage，无需后端 API：

| 存储键 | 说明 | 类型 |
|--------|------|------|
| `iface_streak` | 打卡连续天数、当日题数 | `StreakData` |
| `iface_daily_goal` | 每日目标题数 | `number` (5-50) |
| `iface_theme` | 亮/暗主题 | `'light' \| 'dark'` |
| `iface_study_mode` | 学习模式 | `'answer-first' \| 'answer-alongside' \| 'memory-only'` |
| `iface_answer_navigation_mode` | 答题导航模式 | `'answer' \| 'check'` |
| `iface_mobile_question_nav_enabled` | 移动端题号导航 | `boolean` |
| `iface_ai_fab_visible` | AI 浮动按钮可见性 | `boolean` |
| `iface_hidden_categories` | 隐藏的分类 | `string[]` |
| `iface_ai_config` | AI 配置（API Key 等） | `AIConfig` |
| `iface_ai_sessions` | AI 对话历史 | `Record<string, AISession>` |
| `iface_practice_session_*` | 刷题会话（sessionStorage） | `string[]` |

> 若需将这些也纳入后端同步，则需额外增加对应的 API。

---

## 内置题库资源

内置题库 JSON 文件存放于服务器 `public/questions/` 路径下，按分类组织：

```
public/questions/
├── frontend/
│   ├── js.json
│   ├── react.json
│   ├── vue.json
│   ├── css.json
│   ├── typescript.json
│   ├── network.json
│   ├── performance.json
│   ├── algorithm.json
│   └── project.json
├── golang/
│   ├── basics.json
│   ├── concurrency.json
│   ├── memory.json
│   ├── engineering.json
│   └── web.json
├── ai-agent/
│   ├── llm.json
│   ├── prompt.json
│   ├── agent.json
│   ├── rag.json
│   ├── tools.json
│   ├── evaluation.json
│   ├── engineering.json
│   └── application.json
└── java/
    ├── basics.json
    ├── concurrency.json
    ├── jvm.json
    ├── spring.json
    ├── network.json
    ├── mysql.json
    └── redis.json
```

内置分类与文件映射：

```typescript
const BUILTIN_CATEGORIES = [
  { category: '前端', files: ['frontend/js.json', 'frontend/react.json', ...] },
  { category: 'Golang', files: ['golang/basics.json', 'golang/concurrency.json', ...] },
  { category: 'AI Agent', files: ['ai-agent/llm.json', 'ai-agent/prompt.json', ...] },
  { category: 'Java', files: ['java/basics.json', 'java/concurrency.json', ...] },
]
```

内置题库版本常量：`BUILTIN_QUESTIONS_VERSION = '0.18.0'`

默认分类映射（`DEFAULT_CATEGORY_MAP`）：

```typescript
{
  '前端': { name: '前端', modules: ['JS基础', 'React', 'Vue', 'CSS', 'TypeScript', '性能优化', '网络', '手写题', '项目深挖'], builtin: true, order: 0 },
  'Golang': { name: 'Golang', modules: ['Go基础', '并发编程', '内存与GC', '工程化', 'Web开发'], builtin: true, order: 1 },
  'AI Agent': { name: 'AI Agent', modules: ['LLM基础', 'Prompt工程', 'Agent架构', 'RAG与知识库', '工具调用与工作流', '评测与线上优化', 'AI工程化', 'AI应用实践'], builtin: true, order: 2 },
  'Java': { name: 'Java', modules: ['Java基础', 'Java并发', 'JVM', 'Spring框架', '计算机网络', 'MySQL', 'Redis'], builtin: true, order: 3 },
}
```

---

## 数据库索引建议

| 表 | 索引 | 说明 |
|----|------|------|
| `questions` | `(module)` | 按模块查询 |
| `questions` | `(difficulty)` | 按难度查询 |
| `questions` | `(source)` | 按来源查询/删除 |
| `study_records` | `(status)` | 按学习状态筛选 |
| `study_records` | `(lastUpdated)` | 排序、复习推荐 |
| `question_notes` | `(updatedAt)` | 最近笔记排序 |
| `question_note_images` | `(questionId)` | 按题目查图片 |
| `answer_annotations` | `(questionId)` | 按题目查标注 |
| `answer_annotations` | `(answerHash)` | 按答案版本查 |
| `question_flags` | `(starred)` | 筛选星标 |
| `mock_interviews` | `(createdAt, updatedAt)` | 排序 |
| `jd_match_reports` | `(createdAt, updatedAt)` | 排序 |
