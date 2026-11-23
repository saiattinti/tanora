
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import './Auth.css'

type Screen = 'login' | 'signup' | 'forgot' | 'update'

const APP_URL =
  'https://personal-nutrition-tracker-5a0.pages.dev'

export default function Auth({ onTryGuest }: { onTryGuest: () => void }) {
  const [screen, setScreen] = useState<Screen>('login')
  const [session, setSession] = useState<Session | null>(null)
  const [checking, setChecking] = useState(true)
  const [busy, setBusy] = useState(false)

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((event, currentSession) => {
        if (!active) return

        setSession(currentSession)
        setChecking(false)

        if (event === 'PASSWORD_RECOVERY') {
          setScreen('update')
          setError('')
          setMessage('Choose a new password for your account.')
        }
      })

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (!error) setSession(data.session)
      setChecking(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  function navigate(next: Screen) {
    setScreen(next)
    setError('')
    setMessage('')
    setPassword('')
    setConfirmPassword('')
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return

    setBusy(true)
    setError('')
    setMessage('')

    try {
      if (screen === 'signup') {
        const cleanUsername = username.trim()
        const cleanEmail = email.trim().toLowerCase()

        if (!/^[a-zA-Z0-9_]{3,24}$/.test(cleanUsername)) {
          throw new Error(
            'Username must be 3–24 characters using letters, numbers, or underscores.'
          )
        }

        if (password.length < 8) {
          throw new Error(
            'Please use a password with at least 8 characters.'
          )
        }

        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.')
        }

        const { data, error: signUpError } =
          await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: {
              data: { username: cleanUsername },
              emailRedirectTo: `${APP_URL}/?account=1`,
            },
          })

        if (signUpError) throw signUpError

        if (data.session) {
          setSession(data.session)
          setMessage('Account created and signed in.')
        } else {
          setScreen('login')
          setMessage(
            'Check your email for a confirmation link. After confirming, return here and sign in.'
          )
        }

        setPassword('')
        setConfirmPassword('')
      }

      if (screen === 'login') {
        const { error: loginError } =
          await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password,
          })

        if (loginError) throw loginError
        setPassword('')
      }

      if (screen === 'forgot') {
        const { error: resetError } =
          await supabase.auth.resetPasswordForEmail(
            email.trim().toLowerCase(),
            {
              redirectTo: `${APP_URL}/?account=1`,
            }
          )

        if (resetError) throw resetError

        setMessage(
          'If an account exists for this email, a password-reset link will be sent.'
        )
      }

      if (screen === 'update') {
        if (password.length < 8) {
          throw new Error(
            'Your new password must contain at least 8 characters.'
          )
        }

        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.')
        }

        const { error: updateError } =
          await supabase.auth.updateUser({ password })

        if (updateError) throw updateError

        setPassword('')
        setConfirmPassword('')
        setScreen('login')
        setMessage('Password updated successfully.')
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Something went wrong. Please try again.'
      )
    } finally {
      setBusy(false)
    }
  }

  async function loginWithGoogle() {
    if (busy) return
    setBusy(true)
    setError('')
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/' },
    })
    if (oauthError) {
      setError(oauthError.message)
      setBusy(false)
    }
  }

  async function logout() {
    if (busy) return

    setBusy(true)
    setError('')

    const { error: logoutError } =
      await supabase.auth.signOut()

    if (logoutError) {
      setError(logoutError.message)
    } else {
      setSession(null)
      setMessage('')
      setScreen('login')
    }

    setBusy(false)
  }

  if (checking) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <p className="auth-loading">Checking your session...</p>
        </div>
      </main>
    )
  }

  if (session && screen !== 'update') {
    const savedUsername =
      session.user.user_metadata?.username

    const displayName =
      typeof savedUsername === 'string' &&
      savedUsername.trim()
        ? savedUsername
        : session.user.email || 'Your account'

    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="auth-brand">
            <div className="auth-symbol">N</div>
            <h1>Nutrition Tracker</h1>
            <p>Your personal nutrition account</p>
          </div>

          <div className="auth-signed-in">
            <span className="auth-check">✓</span>
            <h2>You're signed in!</h2>
            <p className="auth-username">{displayName}</p>
            <p>{session.user.email}</p>
          </div>

          <div className="auth-notice">
            <strong>Your nutrition data syncs to your account.</strong>
            <p>
              Open your dashboard to track food, set macro goals,
              and save your nutrition history.
            </p>
          </div>

          {error && (
            <p className="auth-error" role="alert">{error}</p>
          )}

          <button
            className="auth-primary"
            type="button"
            onClick={() => window.location.assign('/')}
          >
            Open Existing Nutrition Tracker
          </button>

          <button
            className="auth-secondary"
            type="button"
            disabled={busy}
            onClick={() => void logout()}
          >
            {busy ? 'Signing out...' : 'Sign Out'}
          </button>
        </section>
      </main>
    )
  }

  const heading =
    screen === 'signup'
      ? 'Create your account'
      : screen === 'forgot'
        ? 'Reset your password'
        : screen === 'update'
          ? 'Choose a new password'
          : 'Welcome back'

  const description =
    screen === 'signup'
      ? 'Create an account to save and sync your food diary.'
      : screen === 'forgot'
        ? 'Enter your email to request a reset link.'
        : screen === 'update'
          ? 'Enter your new account password.'
          : 'Sign in to your Nutrition Tracker account.'

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <div className="auth-symbol">N</div>
          <h1>Nutrition Tracker</h1>
          <p>Smart nutrition, simplified.</p>
        </div>

        <div className="auth-heading">
          <h2>{heading}</h2>
          <p>{description}</p>
        </div>

        <form onSubmit={event => void submit(event)}>
          {screen === 'signup' && (
            <label className="auth-field">
              Username
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={event =>
                  setUsername(event.target.value)
                }
                placeholder="Choose a username"
                maxLength={24}
                required
              />
            </label>
          )}

          {screen !== 'update' && (
            <label className="auth-field">
              Email address
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={event =>
                  setEmail(event.target.value)
                }
                placeholder="you@example.com"
                required
              />
            </label>
          )}

          {screen !== 'forgot' && (
            <label className="auth-field">
              {screen === 'update'
                ? 'New password'
                : 'Password'}
              <input
                type="password"
                autoComplete={
                  screen === 'login'
                    ? 'current-password'
                    : 'new-password'
                }
                value={password}
                onChange={event =>
                  setPassword(event.target.value)
                }
                placeholder="At least 8 characters"
                minLength={screen === 'login' ? undefined : 8}
                required
              />
            </label>
          )}

          {(screen === 'signup' || screen === 'update') && (
            <label className="auth-field">
              Confirm password
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={event =>
                  setConfirmPassword(event.target.value)
                }
                placeholder="Enter password again"
                required
              />
            </label>
          )}

          {screen === 'login' && (
            <button
              className="auth-text-button auth-forgot"
              type="button"
              onClick={() => navigate('forgot')}
            >
              Forgot password?
            </button>
          )}

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          {message && (
            <p className="auth-message" role="status">
              {message}
            </p>
          )}

          <button
            className="auth-primary"
            type="submit"
            disabled={busy}
          >
            {busy
              ? 'Please wait...'
              : screen === 'signup'
                ? 'Create Account'
                : screen === 'forgot'
                  ? 'Send Reset Link'
                  : screen === 'update'
                    ? 'Save New Password'
                    : 'Sign In'}
          </button>
        </form>

        {(screen === 'login' || screen === 'signup') && (
          <>
            <div className="auth-divider"><span>or</span></div>
            <button
              type="button"
              className="auth-google"
              disabled={busy}
              onClick={() => void loginWithGoogle()}
            >
              <span aria-hidden="true">G</span> Continue with Google
            </button>
            <button
              type="button"
              className="auth-guest"
              disabled={busy}
              onClick={onTryGuest}
            >
              Continue as Guest
            </button>
            <p className="auth-guest-note">
              Guest meals and macro goals stay in this browser only.
              They are not synced to your account.
            </p>
          </>
        )}

        {screen === 'login' ? (
          <p className="auth-switch">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('signup')}
            >
              Create one
            </button>
          </p>
        ) : (
          <p className="auth-switch">
            <button
              type="button"
              onClick={() => navigate('login')}
            >
              Back to Sign In
            </button>
          </p>
        )}

        <a className="auth-back" href="/">
          Nutrition Tracker home
        </a>
      </section>
    </main>
  )
}
