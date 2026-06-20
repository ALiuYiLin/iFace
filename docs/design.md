# 设计约定

## 三层 Hook 模式

业务模块的 Hook 按职责分三层，每层一个文件：

```
src/business/hooks/<module-name>/
  use<ModuleName>Base.ts      ← 原始数据层
  use<ModuleName>Derived.ts   ← 派生数据层
  use<ModuleName>UI.ts        ← UI 控制层（可选）
  index.ts                    ← barrel 导出
```

### 分层规则

| 层 | 职责 | 特征 |
|---|---|---|
| **Base** | 获取原始数据 | 来自外部 Hook、异步加载、固定常量。始终不变或完全由外部驱动变化。 |
| **Derived** | 计算派生状态 | 入参为 Base 数据，内部用 `useMemo`/`useEffect` 产出计算结果。完全依赖输入变化而重算。 |
| **UI** | 手动控制的状态 | 初始值可能受 Base/Derived 影响，但后续可独立操作。如 `isDialogOpen`、`refresh()`、`add()`。不存在时删除文件。 |

### 数据流

```
[外部数据源] → use<Module>Base() → use<Module>Derived(base) → 页面组件
                                       ↓
                                 use<Module>UI() ← 用户交互
```

### 文件命名

- 文件名 = 导出函数名（PascalCase + `.ts`）
- 函数名 = `use` + 模块名（PascalCase）+ 层名（PascalCase）
  - `useDashBoardBase`
  - `useDashBoardDerived`
  - `useDashBoardUI`
- barrel `index.ts` 同时 export type 和 export function

### 使用示例

```tsx
// 页面组件中
const base = useDashBoardBase()
const derived = useDashBoardDerived(base)
const ui = useDashBoardUI()  // 可选

// 只用 base.xxx / derived.xxx / ui.xxx，不再写 useState/useEffect/useMemo
```

## 目录结构约定

```
src/
  components/             ← 公共 UI 组件（可跨页面复用）
    StatCard.tsx
    ui/
      Button.tsx
      ...
  business/
    hooks/<module>/       ← 业务 Hook 三层
    components/<module>/  ← 业务组件（仅该模块使用）
  pages/
    <Page>/               ← 页面模块
      index.ts            ← barrel 导出
      <Page>.tsx
      <Page>.module.css
```
