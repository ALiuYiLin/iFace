// ─── File type helpers ──────────────────────────────

export function isJSONFile(file: File): boolean {
  return file.type === 'application/json' || file.name.toLowerCase().endsWith('.json')
}

export function isMDFile(file: File): boolean {
  return (
    file.type === 'text/markdown' ||
    file.name.toLowerCase().endsWith('.md') ||
    file.name.toLowerCase().endsWith('.markdown')
  )
}

export function parseJSONSafe(
  raw: string,
): { ok: true; data: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, data: JSON.parse(raw) }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

// ─── Built-in question registry ────────────────────

export interface BuiltinCategoryDef {
  category: string
  files: readonly string[]
}

export const BUILTIN_QUESTIONS_VERSION = '0.18.0'

export const BUILTIN_CATEGORIES: readonly BuiltinCategoryDef[] = [
  { category: '前端', files: [
    'frontend/js.json', 'frontend/react.json', 'frontend/vue.json', 'frontend/css.json',
    'frontend/typescript.json', 'frontend/network.json', 'frontend/performance.json',
    'frontend/algorithm.json', 'frontend/project.json',
  ] },
  { category: 'Golang', files: [
    'golang/basics.json', 'golang/concurrency.json', 'golang/memory.json',
    'golang/engineering.json', 'golang/web.json',
  ] },
  { category: 'AI Agent', files: [
    'ai-agent/llm.json', 'ai-agent/prompt.json', 'ai-agent/agent.json', 'ai-agent/rag.json',
    'ai-agent/tools.json', 'ai-agent/evaluation.json', 'ai-agent/engineering.json',
    'ai-agent/application.json',
  ] },
  { category: 'Java', files: [
    'java/basics.json', 'java/concurrency.json', 'java/jvm.json', 'java/spring.json',
    'java/network.json', 'java/mysql.json', 'java/redis.json',
  ] },
]

export const BUILTIN_MODULE_FILES: readonly string[] = BUILTIN_CATEGORIES.flatMap((c) => c.files)
