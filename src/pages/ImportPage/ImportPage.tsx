import { Button } from '@/components/ui'
import { useNameSpace } from '@/utils'
import { useImportBase, useImportUI } from '@/business/hooks/import-page'
import {
  BuiltinLibraryCard,
  CategoriesDisplay,
  DropZone,
  PastePanel,
  ResultToast,
  SchemaGuide,
  SourcesManager,
} from '@/business/components/import-page'

import styles from './ImportPage.module.css'

const ns = useNameSpace(styles)

export default function ImportPage() {
  const { navigate } = useImportBase()
  const {
    tab,
    setTab,
    loading,
    results,
    setResults,
    customSources,
    fileCategory,
    setFileCategory,
    handleFiles,
    handlePaste,
    handleRemoveSource,
  } = useImportUI()

  return (
    <div className={`page-container ${ns('pageContainer')}`}>
      {/* ── Header ── */}
      <div className="animate-fade-in">
        <h1 className={ns('heading')}>导入题目</h1>
        <p className={ns('subtitle')}>
          支持拖拽 JSON 文件或粘贴 JSON 内容，让 AI 按格式生成后直接导入
        </p>
      </div>

      <BuiltinLibraryCard />

      {/* ── Import Card ── */}
      <div className={`card animate-fade-in stagger-1 ${ns('importCard')}`}>
        {/* Tab switcher */}
        <div className={ns('tabBar')}>
          {(
            [
              { key: 'file', label: '文件导入' },
              { key: 'paste', label: '粘贴 JSON' },
            ] as const
          ).map(({ key, label }) => (
            <button
              type="button"
              key={key}
              onClick={() => setTab(key)}
              className={ns('tabBtn')}
              data-active={tab === key}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'file' ? (
          <DropZone
            onFiles={handleFiles}
            loading={loading}
            category={fileCategory}
            onCategoryChange={setFileCategory}
          />
        ) : (
          <PastePanel onImport={handlePaste} loading={loading} />
        )}
      </div>

      {/* ── Results ── */}
      {results.length > 0 && (
        <div className={`animate-fade-in ${ns('resultsSection')}`}>
          <div className={ns('resultsHeader')}>
            <p className={ns('resultsTitle')}>导入结果</p>
            <button
              type="button"
              onClick={() => setResults([])}
              className={ns('clearBtn')}
            >
              清除
            </button>
          </div>
          {results.map((r, i) => (
            <ResultToast
              key={`${r.source}-${r.loaded}-${r.errors.length}-${r.warnings.length}`}
              result={r}
              onDismiss={() => setResults((prev) => prev.filter((_, j) => j !== i))}
            />
          ))}
          {results.some((r) => r.loaded > 0) && (
            <div className={ns('resultsActions')}>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/questions')}
                icon={
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                }
              >
                查看题库
              </Button>
              <Button variant="secondary" size="sm" onClick={() => navigate('/practice')}>
                开始练习
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Schema Guide ── */}
      <div className="animate-fade-in stagger-2">
        <SchemaGuide />
      </div>

      {/* ── Category Overview ── */}
      <div className={`animate-fade-in stagger-3 ${ns('resultsSection')}`}>
        <p className={ns('sectionTitle')}>分类总览</p>
        <CategoriesDisplay />
      </div>

      {/* ── Custom Sources Manager ── */}
      <div className={`animate-fade-in stagger-3 ${ns('resultsSection')}`}>
        <div className={ns('resultsHeader')}>
          <p className={ns('sectionTitle')}>已导入的自定义来源</p>
          {customSources.length > 0 && (
            <span className={ns('sectionCount')}>{customSources.length} 个来源</span>
          )}
        </div>
        <SourcesManager sources={customSources} onRemove={handleRemoveSource} />
      </div>

      {/* ── Tip card ── */}
      <style>{`
        @media (max-width: 600px) {
          .paste-fields-grid {
            grid-template-columns: 1fr !important;
          }
          .builtin-library-card {
            flex-direction: column !important;
            align-items: stretch !important;
          }
        }
      `}</style>
      <div className="animate-fade-in stagger-4">
        <div className={`card ${ns('tipCard')}`}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={ns('tipIcon')}
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="8" y1="12" x2="16" y2="12" />
            <line x1="8" y1="8" x2="16" y2="8" />
            <line x1="8" y1="16" x2="12" y2="16" />
          </svg>
          <div className={ns('tipBody')}>
            <p className={ns('tipTitle')}>用 AI 生成题目</p>
            <p className={ns('tipText')}>
              复制本页的 JSON 格式说明，配合项目提示词让 AI 生成题目。 生成完成后粘贴到「粘贴
              JSON」区域即可一键导入，ID 重复时会自动加前缀避免冲突。
            </p>
            <button
              type="button"
              onClick={() => navigate('/prompt')}
              className={ns('tipLink')}
            >
              查看 AI 出题 Prompt
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
