import { useEffect, useState } from 'react'

type TimerState = { endAt: number | null, remaining: number, duration: number }
const defaultTimer: TimerState = { endAt: null, remaining: 90, duration: 90 }
const timerKey = (identity: string | null) => 'tanora-rest-timer-v1-' + (identity ?? 'guest')
const automaticKey = 'tanora-rest-timer-auto-start'

function readTimer(identity: string | null): TimerState {
  try {
    const saved = window.localStorage.getItem(timerKey(identity))
    const parsed: unknown = saved ? JSON.parse(saved) : null
    if (!parsed || typeof parsed !== 'object') return defaultTimer
    const item = parsed as Partial<TimerState>
    if (typeof item.remaining !== 'number' || !Number.isFinite(item.remaining) ||
      item.remaining < 0 || item.remaining > 3600 ||
      typeof item.duration !== 'number' || item.duration < 1 || item.duration > 3600 ||
      (item.endAt !== null && (typeof item.endAt !== 'number' || !Number.isFinite(item.endAt)))) return defaultTimer
    return item as TimerState
  } catch { return defaultTimer }
}

export function useRestTimer(identity: string | null) {
  const [timer, setTimer] = useState<TimerState>(() => readTimer(identity))
  const [now, setNow] = useState(Date.now)
  const [autoStart, setAutoStart] = useState(() => {
    try { return window.localStorage.getItem(automaticKey) === 'true' } catch { return false }
  })
  const remaining = timer.endAt === null ? timer.remaining : Math.max(0, Math.ceil((timer.endAt - now) / 1000))
  const running = timer.endAt !== null && remaining > 0

  useEffect(() => {
    const tick = () => setNow(Date.now())
    const interval = window.setInterval(tick, 500)
    document.addEventListener('visibilitychange', tick)
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', tick) }
  }, [])
  useEffect(() => {
    try { window.localStorage.setItem(timerKey(identity), JSON.stringify(timer)) }
    catch { /* timer remains available for this open page */ }
  }, [timer, identity])

  const start = (seconds: number = timer.duration) => {
    if (!Number.isFinite(seconds) || seconds < 1 || seconds > 3600) return
    const duration = Math.floor(seconds)
    setNow(Date.now())
    setTimer({ duration, remaining: duration, endAt: Date.now() + duration * 1000 })
  }
  const pause = () => {
    const value = timer.endAt === null ? timer.remaining : Math.max(0, Math.ceil((timer.endAt - Date.now()) / 1000))
    setTimer(previous => ({ ...previous, remaining:value, endAt:null }))
  }
  const resume = () => {
    if (remaining <= 0) return
    setNow(Date.now())
    setTimer(previous => ({ ...previous, endAt: Date.now() + remaining * 1000 }))
  }
  const reset = () => setTimer(previous => ({ ...previous, endAt:null, remaining:previous.duration }))
  const changeDuration = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 1 || seconds > 3600) return
    setTimer({ endAt:null, duration:Math.floor(seconds), remaining:Math.floor(seconds) })
  }
  const setAuto = (enabled: boolean) => {
    setAutoStart(enabled)
    try { window.localStorage.setItem(automaticKey, String(enabled)) } catch { /* optional */ }
  }
  return { remaining, running, endAt:timer.endAt, duration:timer.duration, autoStart, start, pause, resume, reset, changeDuration, setAuto }
}

