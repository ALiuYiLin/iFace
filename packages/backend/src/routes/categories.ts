import { Router, type Request, type Response } from 'express'
import db from '../db.js'
import type { CategoryRow, CategoryModuleRow } from '../types.js'

const router = Router()

interface CategoryEntry {
  name: string
  modules: string[]
  builtin: boolean
  order: number
}

type CategoryMap = Record<string, CategoryEntry>

function getAllCategories(): CategoryMap {
  const cats = db.prepare('SELECT * FROM categories ORDER BY ord, name').all() as CategoryRow[]
  const modules = db.prepare('SELECT * FROM category_modules ORDER BY category_name, module_name').all() as CategoryModuleRow[]

  const modMap: Record<string, string[]> = {}
  for (const m of modules) {
    if (!modMap[m.category_name]) modMap[m.category_name] = []
    modMap[m.category_name].push(m.module_name)
  }

  const map: CategoryMap = {}
  for (const c of cats) {
    map[c.name] = {
      name: c.name,
      modules: modMap[c.name] ?? [],
      builtin: !!c.builtin,
      order: c.ord,
    }
  }
  return map
}

function saveCategoryMap(map: CategoryMap): void {
  const now = Date.now()

  const txn = db.transaction(() => {
    db.prepare('DELETE FROM categories').run()
    db.prepare('DELETE FROM category_modules').run()
    const insCat = db.prepare('INSERT INTO categories (name, builtin, ord, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
    const insMod = db.prepare('INSERT INTO category_modules (category_name, module_name) VALUES (?, ?)')
    for (const [name, entry] of Object.entries(map)) {
      insCat.run(name, entry.builtin ? 1 : 0, entry.order ?? 0, now, now)
      for (const mod of entry.modules) {
        insMod.run(name, mod)
      }
    }
  })
  txn()
}

// GET /api/categories
router.get('/', (_req: Request, res: Response) => {
  res.json({ data: getAllCategories() })
})

// PUT /api/categories
router.put('/', (req: Request, res: Response) => {
  saveCategoryMap(req.body as CategoryMap)
  res.json({ data: getAllCategories() })
})

// POST /api/categories/:name/modules
router.post('/:name/modules', (req: Request, res: Response) => {
  const { name } = req.params
  const { module: moduleName } = req.body as { module: string }
  const now = Date.now()

  const cat = db.prepare('SELECT * FROM categories WHERE name = ?').get(name) as CategoryRow | undefined
  if (!cat) {
    db.prepare('INSERT INTO categories (name, builtin, ord, created_at, updated_at) VALUES (?, 0, ?, ?, ?)')
      .run(name, Object.keys(getAllCategories()).length, now, now)
  }

  const existing = db.prepare(
    'SELECT * FROM category_modules WHERE category_name = ? AND module_name = ?',
  ).get(name, moduleName) as CategoryModuleRow | undefined
  if (!existing) {
    db.prepare('INSERT INTO category_modules (category_name, module_name) VALUES (?, ?)').run(name, moduleName)
  }

  res.json({ data: getAllCategories() })
})

// POST /api/categories/:name/modules/bulk
router.post('/:name/modules/bulk', (req: Request, res: Response) => {
  const { name } = req.params
  const { modules } = req.body as { modules: string[] }
  const now = Date.now()

  const cat = db.prepare('SELECT * FROM categories WHERE name = ?').get(name) as CategoryRow | undefined
  if (!cat) {
    db.prepare('INSERT INTO categories (name, builtin, ord, created_at, updated_at) VALUES (?, 0, ?, ?, ?)')
      .run(name, Object.keys(getAllCategories()).length, now, now)
  }

  const insert = db.prepare('INSERT OR IGNORE INTO category_modules (category_name, module_name) VALUES (?, ?)')
  const txn = db.transaction(() => {
    for (const mod of modules) {
      insert.run(name, mod)
    }
  })
  txn()

  res.json({ data: getAllCategories() })
})

// DELETE /api/categories/modules/:moduleName
router.delete('/modules/:moduleName', (req: Request, res: Response) => {
  db.prepare('DELETE FROM category_modules WHERE module_name = ?').run(req.params.moduleName)
  res.json({ data: getAllCategories() })
})

// DELETE /api/categories/:name
router.delete('/:name', (req: Request, res: Response) => {
  const { name } = req.params
  const cat = db.prepare('SELECT * FROM categories WHERE name = ?').get(name) as CategoryRow | undefined
  if (cat?.builtin) {
    return res.status(400).json({ error: { code: 'FORBIDDEN', message: '内置分类不可删除' } })
  }
  db.prepare('DELETE FROM category_modules WHERE category_name = ?').run(name)
  db.prepare('DELETE FROM categories WHERE name = ?').run(name)
  res.json({ data: getAllCategories() })
})

// PUT /api/categories/:name/rename
router.put('/:name/rename', (req: Request, res: Response) => {
  const { name } = req.params
  const { newName } = req.body as { newName: string }

  const cat = db.prepare('SELECT * FROM categories WHERE name = ?').get(name) as CategoryRow | undefined
  if (!cat) return res.status(404).json({ error: { code: 'NOT_FOUND', message: '分类不存在' } })
  if (cat.builtin) return res.status(400).json({ error: { code: 'FORBIDDEN', message: '内置分类不可重命名' } })

  const now = Date.now()
  const txn = db.transaction(() => {
    db.prepare('UPDATE category_modules SET category_name = ? WHERE category_name = ?').run(newName, name)
    db.prepare('DELETE FROM categories WHERE name = ?').run(name)
    db.prepare('INSERT INTO categories (name, builtin, ord, created_at, updated_at) VALUES (?, 0, ?, ?, ?)')
      .run(newName, cat.ord, now, now)
  })
  txn()

  res.json({ data: getAllCategories() })
})

export default router
