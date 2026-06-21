文件: appRecovery.ts
作用: 应用崩溃恢复/状态持久化
被依赖（文件数）: 2
依赖方: App.tsx, AppErrorBoundary
────────────────────────────────────────
文件: feedbackNote.ts
作用: 复习笔记 Markdown 格式化和评分提取
被依赖（文件数）: 3
依赖方: AnswerOverrideHeaderMeta, MyAnswerInput, QuestionNotes
────────────────────────────────────────
文件: fileUtils.ts
作用: 文件类型判断(isJSONFile/isMDFile)、JSON 安全解析、内置题库常量(BUILTIN_CATEGORIES/BUILTIN_MODULE_FILES/BUILTIN_QUESTIONS_VERSION)
被依赖（文件数）: 6
依赖方: SettingsDrawer, OnboardingGuide, BuiltinLibraryCard, DropZone, PastePanel, useImportUI
────────────────────────────────────────
文件: learningCheck.ts
作用: 学习检测题（"学一学"功能）加载
被依赖（文件数）: 2
依赖方: LearningCheckPanel, useQuestionDetailUI
────────────────────────────────────────
文件: localBackup.ts
作用: 本地备份导入/解析/预览（旧 exportAllData 格式）
被依赖（文件数）: 1
依赖方: SettingsDrawer
────────────────────────────────────────
文件: mdToQuestions.ts
作用: Markdown → 题目 JSON 数组解析（AI 生成格式解析）
被依赖（文件数）: 2
依赖方: useImportUI, MdConverterPanel
────────────────────────────────────────
文件: mockInterview.ts
作用: 模拟面试 Prompt 构建（System Prompt、面试计划 Prompt）
被依赖（文件数）: 2
依赖方: useMockUI, MockInterview 页面
────────────────────────────────────────
文件: practiceSession.ts
作用: 刷题会话管理（URL 参数序列化、sessionStorage 存储/读取）
被依赖（文件数）: 7
依赖方: MockInterview, WeakPoints, useQuestionListUI, Practice, WeakQuestionRow, useQuestionDetailUI, useQuestionDetailBase
────────────────────────────────────────
文件: questionVisibility.ts
作用: 分类隐藏计算（getHiddenModules、filterVisibleQuestions）
被依赖（文件数）: 3
依赖方: useQuestionListDerived, useDashBoardDerived, usePracticeDerived
────────────────────────────────────────
文件: resumeParser.ts
作用: 简历文件解析（PDF/docx → text）
被依赖（文件数）: 2
依赖方: useMockUI, useJdMatchUI
────────────────────────────────────────
文件: routePreload.ts
作用: 路由预加载（React Router lazy loading 预拉）
被依赖（文件数）: 4
依赖方: App.tsx, Navbar, Tools 页面, QuestionCard

说明： aiStream.ts 和 aiClient.ts 虽然在同一层，但 aiStreat.ts 内部使用。localBackup.ts 仅被 SettingsDrawer使用（备份导入功能）。