# iFace 状态分层重构方案 — 基于 RTK

## 当前架构问题

当前状态分散在三层自定义 hook（Base/Derived/UI）中，通过 props 或 zustand store 传递，存在以下问题：

- **Base hook** 承担了全局 store 访问 + 页面级 API 请求 + 状态管理，职责过重
- 同类型数据（如 question 列表）在多个 hook 中重复请求
- 页面间共享状态（如 studyMode）只能通过全局 zustand store
- 状态变更追踪困难，无中间件支持

## 三层架构设计

```
Layer 1: Global Store (RTK)    — 跨页面/全局数据
Layer 2: Page Store (RTK)      — 单个页面的聚合数据
Layer 3: Component State        — 组件本地 UI 状态（不变，保留现有 useXxxUI）
```

---

## Layer 1: 全局 Store（RTK Slice）

涵盖需要跨页面共享的数据 + 需要持久化的用户配置。

| Slice | 数据 | 来源 |
|-------|------|------|
| `study` | records, streak, dailyGoal, studyMode, hiddenCategories, theme ... | `useStudyStore` |
| `ai` | config, sessions, providers ... | `useAIStore` |
| `auth` | token, user, login/logout ... | `useAuthStore` |

```ts
// store/studySlice.ts
const studySlice = createSlice({
  name: 'study',
  initialState: {
    records: {} as Record<string, StudyRecord>,
    theme: 'light',
    studyMode: 'answer-first' as StudyMode,
    streak: { currentStreak: 0, bestStreak: 0, todayCount: 0 },
    dailyGoal: 20,
    hiddenCategories: [] as string[],
    mobileQuestionNavEnabled: true,
    aiFabVisible: true,
    answerNavigationMode: 'answer' as AnswerNavigationMode,
  },
  reducers: {
    setStatus(state, action: PayloadAction<{id: string; status: StudyStatus}>) { ... },
    setTheme(state, action: PayloadAction<string>) { ... },
    setStudyMode(state, action: PayloadAction<StudyMode>) { ... },
    // ...
  },
})

// store/aiSlice.ts — config, sessions, API
// store/authSlice.ts — token, user, login/logout actions (thunks)
```

---

## Layer 2: 页面级 Store（RTK Slice）

每个页面一个 slice，管理该页面特有的 **聚合数据**。

当前页面 Base hook 的核心职责（API 请求 + 数据聚合）移至 Page Store，组件只需从 store 读取 + 调用 action。

| 页面 | Page Store | 原 Base Hook |
|------|-----------|-------------|
| QuestionDetail | `store/pages/questionDetailSlice.ts` | `useQuestionDetailBase` |
| Dashboard | `store/pages/dashboardSlice.ts` | `useDashBoardBase` |
| Practice | `store/pages/practiceSlice.ts` | `usePracticeBase` |
| QuestionList | `store/pages/questionListSlice.ts` | `useQuestionListBase` |
| WeakPoints | `store/pages/weakPointsSlice.ts` | `useWeakPointsBase` |
| Import | `store/pages/importSlice.ts` | `useImportBase` |
| MockInterview | `store/pages/mockInterviewSlice.ts` | `useMockBase` |
| JdMatch | `store/pages/jdMatchSlice.ts` | `useJdMatchBase` |
| AITool | `store/pages/aiToolSlice.ts` | `useAIBase` |

### 示例：QuestionDetail Page Store

```ts
// store/pages/questionDetailSlice.ts
const questionDetailSlice = createSlice({
  name: 'questionDetail',
  initialState: {
    question: null as Question | null,
    allQuestions: [] as Question[],
    records: {} as Record<string, StudyRecord>,
    loading: false,
    // ... Base hook 的返回数据
  },
  reducers: {
    setQuestion(state, action) { ... },
    setRecords(state, action) { ... },
  },
})

// 异步 thunk
export const fetchQuestion = createAsyncThunk(
  'questionDetail/fetch',
  async (id: string) => {
    const [question, records] = await Promise.all([
      getQuestion(id),
      getStudyRecords(),
    ])
    return { question, records }
  },
)
```

---

## Layer 3: 组件级状态（保留现有 useXxxUI）

不变。继续使用 `useState` + `useCallback`。

| Hook | 用途 |
|------|------|
| `useQuestionDetailUI` | 弹窗开关、表单草稿、选中态 |
| `useQuestionListUI` | 搜索输入、过滤面板开关 |
| `useImportUI` | tab 切换、文件选择 |
| `useMockUI` | 表单编辑态、步骤控制 |
| `useJdMatchUI` | 表单输入、结果展开 |
| `usePromptUI` | 提示词编辑、复制反馈 |
| `useSettingDrawerUI` | AI 配置表单草稿 |
| `useBufferedText` | 流式文本缓存 |

---

## 原有 Derived Hook 处理

Derived 数据继续保留为纯函数或 `useMemo`：

```ts
// 原 useDashBoardDerived → 保留为纯函数
function getDashboardDerived(base: DashboardData): DashboardDerived { ... }

// 使用
const derived = useMemo(() => getDashboardDerived(data), [data])
```

---

## 迁移步骤

1. 安装 RTK：`npm install @reduxjs/toolkit react-redux`
2. 创建全局 slices（study, ai, auth）— 替换现有 zustand stores
3. 创建页面 slices（逐个页面迁移）
4. 创建 `store/index.ts`（configureStore + Provider）
5. 逐个替换页面中的 Base hook 为 dispatch + selector
6. 删除原 zustand stores 和 Base hooks
7. 清理：Derived 转为纯函数，保留 UI hooks

---

## 目录结构

```
src/store/
├── index.ts                     # configureStore + 导出
├── hooks.ts                     # useAppSelector, useAppDispatch
├── slices/
│   ├── studySlice.ts            # Layer 1
│   ├── aiSlice.ts               # Layer 1
│   └── authSlice.ts             # Layer 1
└── pages/
    ├── questionDetailSlice.ts   # Layer 2
    ├── dashboardSlice.ts
    ├── practiceSlice.ts
    ├── questionListSlice.ts
    ├── weakPointsSlice.ts
    ├── importSlice.ts
    ├── mockInterviewSlice.ts
    ├── jdMatchSlice.ts
    └── aiToolSlice.ts
```
