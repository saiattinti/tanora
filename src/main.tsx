
import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import App from './App'
import Auth from './Auth'
import './index.css'

function Root() {
  const [session, setSession] = useState<Session | null>(null)
  const [guestMode, setGuestMode] = useState(() => window.sessionStorage.getItem('nutrition-guest-session') === 'true')
  const [checking, setChecking] = useState(true)

  const accountPage =
    new URLSearchParams(window.location.search)
      .get('account') === '1'

  useEffect(() => {
    let active = true

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        if (!active) return
        setSession(currentSession)
        setChecking(false)
      }
    )

    void supabase.auth.getSession().then(
      ({ data, error }) => {
        if (!active) return
        if (!error) {
          setSession(data.session)
        }
        setChecking(false)
      }
    )

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  if (checking) {
    return (
      <main style={{ padding: 32, textAlign: 'center' }}>
        Checking your account...
      </main>
    )
  }

  if (!session && !guestMode) {
    return <Auth onTryGuest={() => {
      window.sessionStorage.setItem('nutrition-guest-session', 'true')
      setGuestMode(true)
      window.history.replaceState(null, '', '/')
    }} />
  }

  if (accountPage && session) {
    return <Auth onTryGuest={() => {}} />
  }

  return (
    <App
      key={session?.user.id ?? 'guest'}
      userId={session?.user.id ?? null}
      userEmail={session?.user.email ?? ''}
      onSignOut={async () => {
        if (!session) {
          window.sessionStorage.removeItem('nutrition-guest-session')
          setGuestMode(false)
          return
        }
        const { error } = await supabase.auth.signOut()
        if (error) window.alert(error.message)
      }}
    />
  )
}

function ThemeToggle() {
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

ReactDOM.createRoot(
  document.getElementById('root')!
).render(
  <React.StrictMode>
    <Root />
    <ThemeToggle />
  </React.StrictMode>
)
