import { useNameSpace } from '@/utils'
import {
  BUILTIN_MODULE_CATEGORY,
  BUILTIN_MODULES,
  DIFFICULTY_LABELS,
  DIFFICULTY_STYLES,
  STATUS_LABELS,
  STATUS_STYLES,
  type Difficulty,
  type Module,
  type StudyStatus,
} from '@/types'
import styles from './FilterPanel.module.css'

const ns = useNameSpace(styles)

interface FilterPanelProps {
  selectedModules: Module[]
  selectedDifficulties: Difficulty[]
  selectedStatuses: StudyStatus[]
  starredOnly: boolean
  notesOnly: boolean
  starredCount: number
  noteCount: number
  onModuleToggle: (m: Module) => void
  onDifficultyToggle: (d: Difficulty) => void
  onStatusToggle: (s: StudyStatus) => void
  onStarredOnlyToggle: () => void
  onNotesOnlyToggle: () => void
  onClear: () => void
  totalFiltered: number
  totalAll: number
  /** All module names present in current DB (built-in + custom) */
  availableModules: Module[]
}

export function FilterPanel({
  selectedModules,
  selectedDifficulties,
  selectedStatuses,
  starredOnly,
  notesOnly,
  starredCount,
  noteCount,
  onModuleToggle,
  onDifficultyToggle,
  onStatusToggle,
  onStarredOnlyToggle,
  onNotesOnlyToggle,
  onClear,
  totalFiltered,
  totalAll,
  availableModules,
}: FilterPanelProps) {
  const hasFilters =
    selectedModules.length > 0 ||
    selectedDifficulties.length > 0 ||
    selectedStatuses.length > 0 ||
    starredOnly ||
    notesOnly

  const renderCheckIcon = () => (
    <svg className={ns('checkIcon')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )

  const renderStarIcon = (filled: boolean) => (
    <svg className={ns('reviewIcon')} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )

  const renderNoteIcon = () => (
    <svg className={ns('reviewIcon')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5V5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-1.5z" />
      <path d="M8 7h6" />
      <path d="M8 11h8" />
    </svg>
  )

  return (
    <aside className={ns('panel')}>
      {/* Header */}
      <div className={ns('header')}>
        <span className={ns('title')}>筛选</span>
        {hasFilters && (
          <button type="button" onClick={onClear} className={ns('clearBtn')}>
            清除全部
          </button>
        )}
      </div>

      {/* Results count */}
      <div className={ns('resultCount')}>
        显示 <span className={ns('countNumber')}>{totalFiltered}</span> / {totalAll} 题
      </div>

      {/* Difficulty */}
      <div>
        <p className={ns('sectionLabel')}>难度</p>
        <div className={ns('section')}>
          {([1, 2, 3] as Difficulty[]).map((d) => {
            const active = selectedDifficulties.includes(d)
            return (
              <button
                type="button"
                key={d}
                onClick={() => onDifficultyToggle(d)}
                className={ns('toggleBtn', { toggleBtnActive: active })}
              >
                <span
                  className={ns('badge')}
                  style={{
                    color: DIFFICULTY_STYLES[d].color,
                    background: DIFFICULTY_STYLES[d].background,
                    borderColor: DIFFICULTY_STYLES[d].borderColor,
                  }}
                >
                  {DIFFICULTY_LABELS[d]}
                </span>
                {active && renderCheckIcon()}
              </button>
            )
          })}
        </div>
      </div>

      {/* Status */}
      <div>
        <p className={ns('sectionLabel')}>学习状态</p>
        <div className={ns('section')}>
          {(['unlearned', 'review', 'mastered'] as StudyStatus[]).map((s) => {
            const active = selectedStatuses.includes(s)
            return (
              <button
                type="button"
                key={s}
                onClick={() => onStatusToggle(s)}
                className={ns('toggleBtn', { toggleBtnActive: active })}
              >
                <span
                  className={ns('badge')}
                  style={{
                    color: STATUS_STYLES[s].color,
                    background: STATUS_STYLES[s].background,
                    borderColor: STATUS_STYLES[s].borderColor,
                  }}
                >
                  {STATUS_LABELS[s]}
                </span>
                {active && renderCheckIcon()}
              </button>
            )
          })}
        </div>
      </div>

      {/* Module */}
      <div>
        <div className={ns('sectionHeader')}>
          <p className={ns('sectionLabel')}>模块</p>
          {availableModules.some((m) => !(BUILTIN_MODULES as readonly string[]).includes(m)) && (
            <span className={ns('customDot')}>含自定义</span>
          )}
        </div>
        <div className={ns('section')}>
          {availableModules.map((mod) => {
            const active = selectedModules.includes(mod)
            const categoryLabel = BUILTIN_MODULE_CATEGORY[mod] ?? null
            const isCustom = !(BUILTIN_MODULES as readonly string[]).includes(mod)
            return (
              <button
                type="button"
                key={mod}
                onClick={() => onModuleToggle(mod)}
                className={ns('moduleBtn', { moduleBtnActive: active })}
              >
                <span className={ns('moduleName')}>{mod}</span>
                {categoryLabel && (
                  <span className={ns('moduleBadge', active ? 'moduleBadgeActive' : 'moduleBadgeDefault')}>
                    {categoryLabel}
                  </span>
                )}
                {isCustom && (
                  <span className={ns('moduleBadge', active ? 'moduleBadgeActive' : 'moduleBadgeDefault')}>
                    自定义
                  </span>
                )}
                {active && renderCheckIcon()}
              </button>
            )
          })}
        </div>
      </div>

      {/* Review */}
      <div>
        <p className={ns('sectionLabel')}>复盘</p>
        <button
          type="button"
          aria-pressed={starredOnly}
          title={starredOnly ? '关闭只看重点题' : '只看重点题'}
          onClick={onStarredOnlyToggle}
          className={ns('reviewBtn', { reviewBtnStarredActive: starredOnly })}
        >
          <span className={ns('reviewContent')}>
            {renderStarIcon(starredOnly)}
            <span className={ns('reviewLabel', starredOnly ? 'reviewLabelActive' : 'reviewLabelInactive')}>
              只看重点题
            </span>
          </span>
          <span className={ns('reviewCountWrap')}>
            <span className={ns('reviewCount', starredOnly ? 'reviewCountStarredActive' : 'reviewCountDefault')}>
              {starredCount}
            </span>
            {starredOnly && renderCheckIcon()}
          </span>
        </button>
        <button
          type="button"
          aria-pressed={notesOnly}
          title={notesOnly ? '关闭只看有笔记 (N)' : '只看有笔记 (N)'}
          onClick={onNotesOnlyToggle}
          className={ns('reviewBtn', { reviewBtnNotesActive: notesOnly })}
        >
          <span className={ns('reviewContent')}>
            {renderNoteIcon()}
            <span className={ns('reviewLabel', notesOnly ? 'reviewLabelActive' : 'reviewLabelInactive')}>
              只看有笔记
            </span>
          </span>
          <span className={ns('reviewCountWrap')}>
            <span className={ns('reviewCount', notesOnly ? 'reviewCountNotesActive' : 'reviewCountDefault')}>
              {noteCount}
            </span>
            {notesOnly && renderCheckIcon()}
          </span>
        </button>
      </div>
    </aside>
  )
}
