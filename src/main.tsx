
import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import App from './App'
import Auth from './Auth'
import './index.css'

function Root() {
  const [session, setSession] = useState<Session | null>(null)
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

  if (accountPage || !session) {
    return <Auth />
  }

  return (
    <App
      key={session.user.id}
      userId={session.user.id}
      userEmail={session.user.email ?? ''}
      onSignOut={async () => {
        const { error } = await supabase.auth.signOut()
        if (error) {
          window.alert(error.message)
        }
      }}
    />
  )
}

ReactDOM.createRoot(
  document.getElementById('root')!
).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
