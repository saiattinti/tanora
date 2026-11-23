import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = window.localStorage.getItem('nutrition-theme')
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    window.localStorage.setItem('nutrition-theme', theme)
  }, [theme])

  return (
    <button
      className="theme-toggle"
      type="button"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setTheme(previous => previous === 'dark' ? 'light' : 'dark')}
    >
      {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
    </button>
  )
}

