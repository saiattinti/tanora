import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import App from './App'
import Auth from './Auth'

export default function Root() {
  const [session, setSession] = useState<Session | null>(null)
  const [guestMode, setGuestMode] = useState(() => window.sessionStorage.getItem('tanora-guest-session') === 'true')
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
        if (error) {
          window.alert(error.message)
        } else {
          window.sessionStorage.removeItem('nutrition-guest-session')
          setGuestMode(false)
        }
      }}
    />
  )
}

