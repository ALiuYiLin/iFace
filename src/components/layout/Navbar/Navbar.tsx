import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { SettingsDrawer } from '@/components/layout/SettingDrawer'
import { preloadPath } from '@/lib/routePreload'
import { useStudyStore } from '@/store/useStudyStore'
import { IconCog, IconSun, IconMoon, IconClose, IconMenu } from '@/components/icon'
import { useNameSpace } from '@/utils'
import styles from './Navbar.module.css'

const ns = useNameSpace(styles)

const navItems = [
  { path: '/', label: '概览' },
  { path: '/questions', label: '题库' },
  { path: '/practice', label: '练习' },
  { path: '/weak', label: '薄弱点' },
  { path: '/import', label: '导入' },
  { path: '/tools', label: '工具', activePaths: ['/mock-interview', '/prompt'] },
]

export function Navbar() {
  const location = useLocation()
  const { theme, toggleTheme } = useStudyStore()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const scrolledRef = useRef(false)

  useEffect(() => {
    let frame = 0
    const updateScrolled = () => {
      frame = 0
      const next = window.scrollY > 4
      if (scrolledRef.current === next) return
      scrolledRef.current = next
      setScrolled(next)
    }
    const handler = () => {
      if (frame) return
      frame = window.requestAnimationFrame(updateScrolled)
    }
    updateScrolled()
    window.addEventListener('scroll', handler, { passive: true })
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', handler)
    }
  }, [])

  useEffect(() => {
    if (!mobileOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [mobileOpen])

  useEffect(() => {
    if (!mobileOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [mobileOpen])

  const isActive = (item: (typeof navItems)[number]) => {
    if (item.path === '/') return location.pathname === '/'
    return [item.path, ...(item.activePaths ?? [])].some((path) =>
      location.pathname.startsWith(path),
    )
  }

  return (
    <>
      <header data-scrolled={scrolled} className={ns('header')}>
        <div className={ns('inner')}>
          <Link to="/" onPointerEnter={() => preloadPath('/')} onFocus={() => preloadPath('/')} className={ns('logo')}>
            <span className={ns('logoText')}>iFace</span>
          </Link>

          <nav className={`${ns('nav')} hidden-mobile`}>
            {navItems.map((item) => {
              const active = isActive(item)
              return (
                <Link key={item.path} to={item.path}
                  onPointerEnter={() => preloadPath(item.path)} onFocus={() => preloadPath(item.path)}
                  data-active={active} className={ns('navLink')}>
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className={`${ns('filler')} show-mobile`} />

          <div className={ns('actions')}>
            <button type="button" onClick={() => setSettingsOpen(true)} aria-label="设置" className={ns('actionBtn')}>
              <IconCog />
            </button>
            <button type="button" onClick={toggleTheme}
              aria-label={theme === 'dark' ? '切换亮色' : '切换暗色'} className={ns('actionBtn')}>
              {theme === 'dark' ? <IconSun /> : <IconMoon />}
            </button>
            <button type="button" onClick={() => setMobileOpen((v) => !v)} aria-label="菜单"
              aria-expanded={mobileOpen} data-open={mobileOpen}
              className={`${ns('actionBtn')} show-mobile`}>
              {mobileOpen ? <IconClose /> : <IconMenu />}
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <button type="button" aria-label="关闭菜单" onClick={() => setMobileOpen(false)} className={ns('mobileOverlay')} />
      )}

      <div data-open={mobileOpen} className={ns('mobileMenu')}>
        {navItems.map((item) => {
          const active = isActive(item)
          return (
            <Link key={item.path} to={item.path}
              onPointerEnter={() => preloadPath(item.path)} onFocus={() => preloadPath(item.path)}
              onClick={() => setMobileOpen(false)} data-active={active} className={ns('mobileLink')}>
              {item.label}
              {active && <div className={ns('mobileActiveDot')} />}
            </Link>
          )
        })}
        <button type="button" onClick={() => { setMobileOpen(false); setSettingsOpen(true) }} className={ns('mobileSettingsBtn')}>
          <span className={ns('mobileSettingsIcon')}><IconCog /></span>
          设置
        </button>
      </div>

      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}
