import { useEffect, useState } from 'react'
import { calculatePlates, plateSizes } from './lib/workoutUnits'
import type { Plate, WeightUnit } from './lib/workoutUnits'

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

type RestTimer = ReturnType<typeof useRestTimer>
const timerDisplay = (total: number) =>
  String(Math.floor(total/60)).padStart(2,'0') + ':' + String(total%60).padStart(2,'0')

export function RestTimerPanel({ timer }: { timer: RestTimer }) {
  const [custom, setCustom] = useState(String(timer.duration))
  return <section className="workout-utility">
    <div className="workout-utility-heading"><h3>Rest timer</h3><strong aria-live="off" className="workout-timer-clock">{timerDisplay(timer.remaining)}</strong></div>
    {timer.remaining === 0 && <p className="workout-timer-done" role="status">Rest complete! Ready for your next set.</p>}
    <div className="workout-timer-presets">
      {[60,90,120,180].map(value=><button type="button" key={value} onClick={()=>timer.start(value)}>{value}s</button>)}
    </div>
    <div className="workout-actions">
      {timer.running
        ? <button className="workout-secondary" type="button" onClick={timer.pause}>Pause</button>
        : <button className="workout-secondary" type="button" onClick={timer.resume} disabled={timer.endAt !== null || timer.remaining===0}>Resume</button>}
      <button className="workout-secondary" type="button" onClick={timer.reset}>Reset</button>
      <label className="workout-timer-custom">Seconds <input type="number" min="1" max="3600" step="1" inputMode="numeric" value={custom} onChange={e=>setCustom(e.target.value)}/></label>
      <button className="workout-secondary" type="button" onClick={()=>{ const seconds=Number(custom); if (Number.isInteger(seconds)) timer.start(seconds) }}>Start custom</button>
    </div>
    <label className="workout-utility-check"><input type="checkbox" checked={timer.autoStart} onChange={e=>timer.setAuto(e.target.checked)}/> Automatically restart after completing a working set</label>
    <p className="workout-utility-hint">Countdown stays accurate after switching apps. iPhone browser background alerts are not guaranteed.</p>
  </section>
}

export function PlateCalculator({ unit }: { unit: WeightUnit }) {
  const sizes = plateSizes[unit]
  // The parent remounts this calculator on a unit change, providing
  // sensible unit-specific bar/target defaults without touching workout logs.
  const [target, setTarget] = useState(unit === 'lb' ? '135' : '60')
  const [bar, setBar] = useState(unit === 'lb' ? '45' : '20')
  const [inventory, setInventory] = useState<Record<WeightUnit, number[]>>({lb:[4,2,4,4,4,4,4],kg:[4,4,4,4,4,4,4]})
  const plates: Plate[] = sizes.map((weight,i)=>({weight,countPerSide:inventory[unit][i] ?? 0}))
  const total=Number(target), barWeight=Number(bar)
  const plan=Number.isFinite(total)&&Number.isFinite(barWeight)&&target.trim()!==''&&bar.trim()!==''
    ? calculatePlates(total,barWeight,plates,unit) : null
  const valid=Number.isFinite(total)&&Number.isFinite(barWeight)&&total>=barWeight&&barWeight>=0&&total<=2000
  return <section className="workout-utility">
    <h3>Barbell plate calculator</h3>
    <p className="workout-utility-hint">Enter your total target, including the bar. Results show plates for <strong>each side</strong>.</p>
    <div className="workout-plate-inputs">
      <label>Target ({unit})<input type="number" min="0" max="2000" inputMode="decimal" value={target} onChange={e=>setTarget(e.target.value)}/></label>
      <label>Bar ({unit})<input type="number" min="0" inputMode="decimal" value={bar} onChange={e=>setBar(e.target.value)}/></label>
    </div>
    <h4>Available plates per side</h4>
    <div className="workout-plate-list">{plates.map((plate,i)=><label key={plate.weight}>{plate.weight} {unit}
      <input aria-label={plate.weight+' '+unit+' plates per side'} type="number" min="0" max="20" step="1" inputMode="numeric" value={plate.countPerSide} onChange={e=>{
        const value=Math.max(0,Math.min(20,Math.floor(Number(e.target.value)||0)))
        setInventory(old=>({...old,[unit]:old[unit].map((qty,j)=>i===j?value:qty)}))
      }}/></label>)}</div>
    {!valid ? <p className="workout-error">Enter a valid target at least as heavy as the bar (maximum 2000 {unit}).</p>
      : plan ? <div className="workout-plate-result"><strong>Load each side:</strong>
        {plan.perSide.length
          ? <p>{plan.perSide.map(item=>item.count+' × '+item.weight+' '+unit).join(' + ')}</p>
          : <p>No plates needed. Just the bar.</p>}
        <small>Always confirm the bar weight and physical plates before lifting.</small>
      </div>
      : <p className="workout-utility-hint">No exact symmetric plate combination with this bar and inventory. Adjust the target or available plates.</p>}
  </section>
}
