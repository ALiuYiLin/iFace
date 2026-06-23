# iFace 组件标准化结构

## 目录结构

```
src/components/layout/SomeComponent/
├── SomeComponent.tsx           # 主组件，零内联样式
├── SomeComponent.module.css    # CSS Module，全部样式
├── index.ts                    # 导出入口
├── SomeSubComponent.tsx        # (可选)子组件，与主组件同层
├── AnotherSub.tsx              # (可选)独立文件，不嵌套
└── hooks/                      # (可选)复杂逻辑拆分为 hooks
    ├── index.ts                # hooks 统一导出
    ├── useSomeComponentBase.ts     # 状态 / 副作用 / 回调
    ├── useSomeComponentDerived.ts  # 派生计算（从 base 的数据推导）
    └── useSomeComponentUI.ts       # UI 状态（弹窗、草稿、独立于 base 的状态）
```

> 组件目录名使用 **PascalCase**，与组件名一致。

---

## 核心规则

### 1. 零内联样式

禁止使用 `style={{ }}`。所有样式写在 `.module.css` 文件中。

```tsx
// ❌ 禁止
<div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderRadius: 10 }}>
  ...
</div>

// ✅ 正确
<div className={ns('card')}>...</div>
```

**例外** — 仅当样式值完全来自 JS 动态数据且无法用 data-* 属性表达时，才允许极简内联：

```tsx
// 仅在数据驱动颜色的场景下可接受
<p className={ns('statValue')} style={{ color: stat.color }}>
  {stat.value}
</p>
```

### 2. 使用 `ns()` 管理类名

所有组件通过 CSS Module + `useNameSpace` 生成作用域类名：

```tsx
import { useNameSpace } from '@/utils'
import styles from './SomeComponent.module.css'

const ns = useNameSpace(styles)

// 单个类
<div className={ns('card')} />

// 多个类 — ns 接收多参数，内部使用 clsx 组合
<div className={ns('card', 'active')} />

// 条件类 — 通过 data-* 属性而非条件 className
<button data-active={isActive} className={ns('btn')} />
```

> `ns('a', 'b')` 等价于 `${styles['a']} ${styles['b']}`，但自动处理未定义的 key 回退。

### 3. 状态驱动样式 → data-* 属性

用 `data-*` 属性替代条件 className 或内联样式：

```tsx
// ❌ 不推荐 — 字符串拼接类名
<button className={`btn ${active ? 'btn-active' : ''}`} />

// ✅ 推荐 — data 属性 + CSS
<button data-active={active} className={ns('btn')} />
```

```css
/* .module.css */
.btn { ... }
.btn[data-active="true"] { color: var(--primary); background: var(--primary-light); }
.btn:hover { background: var(--surface-2); }
```

常用 data-* 约定：

| 属性 | 适用场景 |
|------|----------|
| `data-active` | Tab、选中态、当前项 |
| `data-checked` | Toggle 开关 |
| `data-hidden` | 可见性切换 |
| `data-enabled` | 启用/禁用 |
| `data-done` | 步骤已完成 |
| `data-scrolled` | 页面滚动状态 |
| `data-open` | 展开/折叠、菜单打开 |
| `data-loading` | 加载中 |
| `data-disabled` | 禁用态 |
| `data-ok` | 成功/失败结果 |
| `data-dirty` | 表单未保存 |

### 4. 交互样式 → CSS `:hover` / `:focus`

禁止 `onMouseEnter`/`onMouseLeave` 手动改样式。所有交互态写在 CSS 中：

```css
/* ✅ 推荐 */
.closeBtn { background: transparent; color: var(--text-3); }
.closeBtn:hover { background: var(--surface-2); color: var(--text); }

/* ❌ 禁止 — 在 JSX 中 */
onMouseEnter={(e) => { e.currentTarget.style.background = '...' }}
```

### 5. SVG 图标 → `src/components/icon/`

- 每个图标一个独立文件，PascalCase 命名：`AI.tsx`、`Check.tsx`
- 统一通过 `src/components/icon/index.ts` 导出
- 图标组件不接收 props（固定尺寸/颜色继承 currentColor）

```tsx
// src/components/icon/SomeIcon.tsx
export function SomeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="..." />
    </svg>
  )
}
```

```tsx
// 使用
import { IconAI, IconCheck } from '@/components/icon'
```

---

## hooks 拆分模式

适用于逻辑复杂的组件（如 `SettingDrawer`，3589 行 → 拆分）。按职责分为三层：

### `useSomeComponentBase.ts`

职责：状态管理、副作用、回调函数

```tsx
export interface BaseData {
  // 所有状态字段
  tab: string
  isDirty: boolean
  // ... 其他状态
  // 所有回调和 setter
  setTab: (t: string) => void
  handleSave: () => void
  showToast: (msg: string, type?: 'success' | 'error') => void
  // ...
}

export function useSomeComponentBase(open: boolean, onClose: () => void): BaseData {
  const [tab, setTab] = useState('ai')
  // ... 所有 useState、useEffect、useCallback
  return { tab, setTab, ... }
}
```

### `useSomeComponentDerived.ts`

职责：从 base 数据派生纯计算，不管理状态

```tsx
export interface DerivedData {
  selectedProvider: AIProviderId
  isCustomProvider: boolean
  // ...
}

export function useSomeComponentDerived(
  localConfig: AIConfig,
  customModel: string,
  // ... 从 base 传入的数据
): DerivedData {
  const selectedProvider = /* 纯推导逻辑，无 useState */
  return { selectedProvider, ... }
}
```

### `useSomeComponentUI.ts`

职责：UI 层状态，**控制视图行为**，存储与业务逻辑无关的 UI 状态。

与 Base/Derived 的区别：

| 特征 | Base | Derived | UI |
|------|------|---------|-----|
| 数据来源 | store / 外部 props | base 数据的推导 | 自身 useState |
| 是否独立 | 依赖外部 | 完全依赖 base | 独立于 base |
| 典型场景 | 副作用、回调、store | visibleQuestions、counts | 弹窗开关、编辑中表单、输入值 |

常见的 UI 状态类型：

**① 表单的「草稿」状态** — 初始化时从 base 获取原始数据，但后续用户 edits 独立于原始数据：

```tsx
export function useSettingDrawerUI(originalConfig: AIConfig) {
  const [draft, setDraft] = useState<AIConfig>({ ...originalConfig })
  const [isDirty, setIsDirty] = useState(false)

  const patch = useCallback((partial: Partial<AIConfig>) => {
    setDraft((prev) => ({ ...prev, ...partial }))
    setIsDirty(true)
  }, [])

  // 外部原始数据变化时重置草稿（非推导，是条件同步）
  useEffect(() => {
    setDraft({ ...originalConfig })
    setIsDirty(false)
  }, [originalConfig])

  return { draft, isDirty, patch, setIsDirty }
}
```

**② 纯 UI 开关** — 不依赖任何业务数据：

```tsx
export function useSomeComponentUI() {
  const [isDialogOpen, setDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('default')
  const [searchInput, setSearchInput] = useState('')

  return { isDialogOpen, setDialogOpen, activeTab, setActiveTab, searchInput, setSearchInput }
}
```

**③ 工具函数** — 将复杂的 UI 拼接逻辑封装在 hook 中：

```tsx
export function useDialogUI() {
  const [isOpen, setOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)

  const confirm = useCallback((action: () => void) => {
    setPendingAction(() => action)
    setOpen(true)
  }, [])

  const handleConfirm = useCallback(() => {
    pendingAction?.()
    setOpen(false)
    setPendingAction(null)
  }, [pendingAction])

  const handleCancel = useCallback(() => {
    setOpen(false)
    setPendingAction(null)
  }, [])

  return { isOpen, confirm, handleConfirm, handleCancel }
}
```

**④ 视图事件处理** — 所有由用户交互触发的视图事件（点击展开、输入文字、计数增减等）都在 UI 层实现：

```tsx
export function useCounterUI() {
  const [count, setCount] = useState(0)

  const add = useCallback(() => setCount((c) => c + 1), [])
  const subtract = useCallback(() => setCount((c) => Math.max(0, c - 1)), [])
  const isPositive = count > 0

  return { count, add, subtract, isPositive }
}
```

```tsx
export function useDialogUI() {
  const [isOpen, setOpen] = useState(false)

  const openDialog = useCallback(() => setOpen(true), [])
  const closeDialog = useCallback(() => setOpen(false), [])

  return { isOpen, openDialog, closeDialog }
}
```

> 原则：**UI 层 = 视图状态 + 视图事件处理**。组件 JSX 中不出现 `useState`、`onClick` 内联逻辑，均由 hook 提供。

### 三层协作示例

```tsx
function SettingsDrawer({ open, onClose }: Props) {
  const base = useSettingDrawerBase(open, onClose)           // store、副作用、回调
  const derived = useSettingDrawerDerived(base.localConfig)  // 纯计算
  const ui = useSettingDrawerUI(base.localConfig)            // 表单草稿、UI 开关

  return (
    <div className={ns('drawer')}>
      <select value={derived.selectedProvider}>...</select>
      <input value={ui.draft.apiKey} onChange={ui.patch({ apiKey: e.target.value })} />
      <button disabled={!ui.isDirty} onClick={base.handleSave}>保存</button>
    </div>
  )
}
```

### 使用

```tsx
function SomeComponent({ open, onClose }: Props) {
  const base = useSomeComponentBase(open, onClose)
  const derived = useSomeComponentDerived(base.localConfig, base.customModel)

  return <div className={ns('root')}>
    <span>{base.tab}</span>
    <span>{derived.selectedProvider}</span>
  </div>
}
```

---

## 组件的 `index.ts`

```tsx
export { ComponentName } from './ComponentName'
// 仅导出组件自身，不导出内部类型
```

---

## 示例：完整的最小组件

```tsx
// Counter/Counter.tsx
import { useState } from 'react'
import { useNameSpace } from '@/utils'
import styles from './Counter.module.css'

const ns = useNameSpace(styles)

export function Counter() {
  const [count, setCount] = useState(0)
  return (
    <div className={ns('card')}>
      <p className={ns('value')} data-positive={count > 0}>{count}</p>
      <button className={ns('btn')} onClick={() => setCount(c => c + 1)}>+</button>
    </div>
  )
}
```

```css
/* Counter/Counter.module.css */
.card { display: flex; align-items: center; gap: 8px; padding: 12px; }
.value { font-size: 24px; font-weight: 700; }
.value[data-positive="true"] { color: var(--success); }
.btn { padding: 4px 12px; border-radius: 6px; background: var(--primary); color: white; border: none; cursor: pointer; }
.btn:hover { opacity: 0.85; }
```

```tsx
// Counter/index.ts
export { Counter } from './Counter'
```

---

## 目录结构一览

```
src/
├── api/                    # API 请求层
├── components/
│   ├── icon/               # SVG 图标组件（每个图标独立文件）
│   │   ├── AI.tsx
│   │   ├── Check.tsx
│   │   └── index.ts
│   ├── layout/             # 布局级组件
│   │   ├── SettingDrawer/  # 标准模块化组件
│   │   │   ├── SettingDrawer.tsx
│   │   │   ├── SettingDrawer.module.css
│   │   │   ├── index.ts
│   │   │   ├── SectionHeader.tsx      # 子组件平级存放
│   │   │   ├── Toggle.tsx
│   │   │   ├── Field.tsx
│   │   │   ├── ApiKeyInput.tsx
│   │   │   ├── Toast.tsx
│   │   │   └── hooks/
│   │   │       ├── index.ts
│   │   │       ├── useSettingDrawerBase.ts
│   │   │       ├── useSettingDrawerDerived.ts
│   │   │       └── useSettingDrawerUI.ts
│   │   └── Navbar/
│   │       ├── Navbar.tsx
│   │       ├── Navbar.module.css
│   │       └── index.ts
│   └── ui/                 # 通用 UI 组件
├── hooks/                  # 全局 hooks
├── pages/                  # 页面组件
└── store/                  # 状态管理
```
