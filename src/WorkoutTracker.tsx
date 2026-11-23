import { useEffect, useMemo, useState } from 'react'
import { bestWeight, completedSets, exerciseLibrary, totalVolume } from './lib/workoutTypes'
import type { Exercise, WorkoutData, WorkoutExercise, WorkoutSession } from './lib/workoutTypes'
import { loadWorkoutData, saveWorkoutData } from './lib/workoutStorage'
import './WorkoutTracker.css'

type View = 'log' | 'routines' | 'history' | 'progress'
const dateToday = () => {
  const d = new Date()
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
}
const newSet = () => ({ id: crypto.randomUUID(), reps: 8, weight: 0, completed: false })
const makeExercise = (exercise: Exercise): WorkoutExercise => ({ exercise, sets: [newSet(), newSet(), newSet()] })
const newSession = (): WorkoutSession => ({
  id: crypto.randomUUID(), name: 'Workout', date: dateToday(), exercises: [], notes: '',
})
const number = (value: number) => Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : '0'

export default function WorkoutTracker({ userId, onNutrition }: { userId: string | null, onNutrition: () => void }) {
  const [data, setData] = useState<WorkoutData>({ history: [], routines: [] })
  const [active, setActive] = useState<WorkoutSession | null>(null)
  const [view, setView] = useState<View>('log')
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [muscle, setMuscle] = useState('All')
  const [equipment, setEquipment] = useState('All')
  const [showLibrary, setShowLibrary] = useState(false)
  const [selectedProgressId, setSelectedProgressId] = useState('')

  useEffect(() => {
    let current = true
    void loadWorkoutData(userId).then(value => {
      if (!current) return
      setData(value)
      setReady(true)
    }).catch(caught => {
      if (current) setError(caught instanceof Error ? caught.message : 'Could not load workouts.')
    })
    return () => { current = false }
  }, [userId])

  const catalog = useMemo(() => exerciseLibrary.filter(e => (
    (muscle === 'All' || e.muscle === muscle) &&
    (equipment === 'All' || e.equipment === equipment) &&
    e.name.toLowerCase().includes(search.trim().toLowerCase())
  )), [muscle, equipment, search])

  const allExercises = useMemo(() => {
    const values = [...exerciseLibrary]
    for (const session of data.history) for (const item of session.exercises)
      if (!values.some(e => e.id === item.exercise.id)) values.push(item.exercise)
    return values
  }, [data.history])

  const selectedProgress = selectedProgressId || allExercises[0]?.id || ''
  const progress = useMemo(() => data.history
    .filter(s => s.exercises.some(e => e.exercise.id === selectedProgress))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(s => ({
      date: s.date,
      weight: Math.max(0, ...s.exercises.filter(e => e.exercise.id === selectedProgress)
        .flatMap(e => e.sets.filter(t => t.completed).map(t => t.weight))),
    })), [data.history, selectedProgress])

  async function persist(next: WorkoutData, success: string) {
    if (busy) return false
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await saveWorkoutData(userId, next)
      setData(next)
      setMessage(success)
      return true
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save workout data.')
      return false
    } finally {
      setBusy(false)
    }
  }

  function updateExercise(exerciseIndex: number, edit: (e: WorkoutExercise) => WorkoutExercise) {
    setActive(previous => previous && ({
      ...previous,
      exercises: previous.exercises.map((e, i) => i === exerciseIndex ? edit(e) : e),
    }))
  }

  function updateSet(exerciseIndex: number, setId: string, key: 'weight' | 'reps' | 'completed', value: number | boolean) {
    updateExercise(exerciseIndex, e => ({
      ...e, sets: e.sets.map(set => set.id === setId ? { ...set, [key]: value } : set),
    }))
  }

  function startFromRoutine(id: string) {
    const routine = data.routines.find(r => r.id === id)
    if (!routine) return
    setActive({ ...newSession(), name: routine.name, exercises: routine.exercises.map(makeExercise) })
    setView('log')
  }

  async function finishWorkout() {
    if (!active || active.exercises.length === 0) return
    if (!active.exercises.some(e => e.sets.some(s => s.completed))) {
      setError('Complete at least one set before saving.')
      return
    }
    if (!active.name.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(active.date)) {
      setError('Enter a workout name and valid date.')
      return
    }
    const hasInvalid = active.exercises.some(e => e.sets.some(s =>
      !Number.isFinite(s.weight) || !Number.isFinite(s.reps) ||
      s.weight < 0 || s.reps < 0 || !Number.isInteger(s.reps)))
    if (hasInvalid) { setError('Weights must be nonnegative and repetitions must be whole numbers.'); return }
    const saved = await persist({ ...data, history: [active, ...data.history] }, 'Workout saved to your history.')
    if (saved) setActive(null)
  }

  async function saveRoutine() {
    if (!active?.exercises.length) return
    const name = active.name.trim()
    if (!name) { setError('Give the routine a name.'); return }
    await persist({
      ...data,
      routines: [...data.routines, {
        id: crypto.randomUUID(), name, exercises: active.exercises.map(e => e.exercise),
      }],
    }, 'Routine saved. You can reuse it anytime.')
  }

  const history = [...data.history].sort((a, b) => b.date.localeCompare(a.date))
  const totalSets = history.reduce((sum, s) => sum + completedSets(s), 0)
  const volume = history.reduce((sum, s) => sum + totalVolume(s), 0)
  const chartMax = Math.max(1, ...progress.map(p => p.weight))

  if (!ready) return <section className="workout-panel card"><h2>Workout tracker</h2><p>{error || 'Loading your workouts...'}</p></section>

  return (
    <div className="workout-app">
      <header className="workout-heading">
        <div><p className="eyebrow">TANORA 2.0</p><h1>Workout Tracker</h1><p className="subtitle">Train, log, and grow stronger.</p></div>
        <button className="settings-button" type="button" onClick={onNutrition}>Nutrition ↗</button>
      </header>
      <nav className="workout-nav" aria-label="Workout sections">
        {(['log', 'routines', 'history', 'progress'] as View[]).map(tab =>
          <button key={tab} className={view === tab ? 'active' : ''} type="button" onClick={() => setView(tab)}>{tab === 'log' ? 'Log' : tab === 'routines' ? 'Routines' : tab === 'history' ? 'History' : 'Progress'}</button>)}
      </nav>
      {error && <p className="workout-error" role="alert">{error} <button type="button" onClick={() => setError('')}>Dismiss</button></p>}
      {message && <p className="workout-success" role="status">{message}</p>}
      {view === 'log' && <section className="card workout-panel">
        {!active ? <>
          <h2>Start a workout</h2><p className="subtitle">Log your sets and see how they compare with previous sessions.</p>
          <button className="workout-primary" type="button" onClick={() => setActive(newSession())}>+ Start empty workout</button>
          {data.routines.length > 0 && <div className="workout-list"><h3>Start from a routine</h3>{data.routines.map(r =>
            <button className="workout-item-button" key={r.id} type="button" onClick={() => startFromRoutine(r.id)}>{r.name} <small>{r.exercises.length} exercises</small></button>)}</div>}
        </> : <>
          <div className="workout-fields">
            <label>Workout name<input value={active.name} maxLength={80} onChange={e => setActive({ ...active, name: e.target.value })}/></label>
            <label>Date<input type="date" value={active.date} onChange={e => setActive({ ...active, date: e.target.value })}/></label>
          </div>
          {active.exercises.map((item, i) => <article className="workout-exercise" key={item.exercise.id + i}>
            <div className="workout-exercise-top"><div><h3>{item.exercise.name}</h3><small>{item.exercise.muscle} · {item.exercise.equipment} · Previous best: {number(bestWeight(history, item.exercise.id))} lb</small></div>
              <button type="button" className="workout-danger-text" onClick={() => setActive({ ...active, exercises: active.exercises.filter((_, index) => index !== i) })}>Remove</button></div>
            <div className="workout-set-header"><span>Set</span><span>lb</span><span>Reps</span><span>Done</span><span></span></div>
            {item.sets.map((set, j) => <div className="workout-set" key={set.id}>
              <span>{j + 1}</span>
              <input aria-label={item.exercise.name + ' weight set ' + (j + 1)} type="number" inputMode="decimal" min="0" step="0.5" value={set.weight} onChange={e => updateSet(i, set.id, 'weight', Number(e.target.value))}/>
              <input aria-label={item.exercise.name + ' reps set ' + (j + 1)} type="number" inputMode="numeric" min="0" step="1" value={set.reps} onChange={e => updateSet(i, set.id, 'reps', Number(e.target.value))}/>
              <input aria-label={item.exercise.name + ' completed set ' + (j + 1)} type="checkbox" checked={set.completed} onChange={e => updateSet(i, set.id, 'completed', e.target.checked)}/>
              <button aria-label={'Remove set ' + (j + 1)} type="button" onClick={() => updateExercise(i, exercise => ({ ...exercise, sets: exercise.sets.filter(s => s.id !== set.id) }))}>×</button>
            </div>)}
            <button className="workout-secondary" type="button" onClick={() => updateExercise(i, e => ({ ...e, sets: [...e.sets, newSet()] }))}>+ Add set</button>
          </article>)}
          <button className="workout-secondary" type="button" onClick={() => setShowLibrary(v => !v)}>{showLibrary ? 'Hide exercise library' : '+ Add exercise'}</button>
          {showLibrary && <div className="workout-library">
            <div className="workout-filters"><input aria-label="Search exercises" placeholder="Search exercises..." value={search} onChange={e => setSearch(e.target.value)}/>
              <select aria-label="Muscle group" value={muscle} onChange={e => setMuscle(e.target.value)}>{['All', 'Chest', 'Back', 'Shoulders', 'Legs', 'Arms', 'Core'].map(v => <option key={v}>{v}</option>)}</select>
              <select aria-label="Equipment" value={equipment} onChange={e => setEquipment(e.target.value)}>{['All', 'Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight'].map(v => <option key={v}>{v}</option>)}</select></div>
            <div className="workout-library-items">{catalog.map(e => <button type="button" key={e.id} onClick={() => {
              setActive(previous => previous && ({ ...previous, exercises: [...previous.exercises, makeExercise(e)] }))
              setShowLibrary(false)
            }}>{e.name}<small>{e.muscle} · {e.equipment}</small></button>)}</div>
          </div>}
          <label className="workout-notes">Notes<textarea maxLength={1000} rows={2} value={active.notes} onChange={e => setActive({ ...active, notes: e.target.value })} placeholder="How did it feel?"/></label>
          <div className="workout-actions"><button className="workout-primary" disabled={busy || active.exercises.length === 0} type="button" onClick={() => void finishWorkout()}>Finish & save workout</button>
            <button className="workout-secondary" disabled={busy || active.exercises.length === 0} type="button" onClick={() => void saveRoutine()}>Save as routine</button>
            <button className="workout-danger-text" type="button" onClick={() => { if (window.confirm('Discard this unsaved workout?')) setActive(null) }}>Discard</button></div>
        </>}
      </section>}
      {view === 'routines' && <section className="card workout-panel"><h2>Your routines</h2><p className="subtitle">Create a routine by adding exercises to a workout, then choose “Save as routine.”</p>
        {data.routines.length === 0 ? <p>No saved routines yet.</p> : data.routines.map(r => <div className="workout-history-row" key={r.id}><div><strong>{r.name}</strong><p>{r.exercises.map(e => e.name).join(' · ')}</p></div><div className="workout-inline-actions">
          <button className="workout-secondary" type="button" onClick={() => startFromRoutine(r.id)}>Start</button>
          <button className="workout-danger-text" disabled={busy} type="button" onClick={() => { if (window.confirm('Delete this routine?')) void persist({ ...data, routines: data.routines.filter(x => x.id !== r.id) }, 'Routine deleted.') }}>Delete</button></div></div>)}
      </section>}
      {view === 'history' && <section className="card workout-panel"><h2>Workout history</h2>
        {history.length === 0 ? <p>No completed workouts yet.</p> : history.map(s => <details className="workout-history-row" key={s.id}><summary><strong>{s.name}</strong> <small>{s.date} · {completedSets(s)} sets · {number(totalVolume(s))} lb volume</small></summary>
          {s.exercises.map((e, i) => <p key={i}><strong>{e.exercise.name}:</strong> {e.sets.filter(t => t.completed).map(t => t.weight + ' lb × ' + t.reps).join(', ') || 'No completed sets'}</p>)}
          {s.notes && <p><em>{s.notes}</em></p>}
          <button className="workout-danger-text" disabled={busy} type="button" onClick={() => { if (window.confirm('Delete this saved workout?')) void persist({ ...data, history: data.history.filter(x => x.id !== s.id) }, 'Workout deleted.') }}>Delete workout</button>
        </details>)}
      </section>}
      {view === 'progress' && <section className="card workout-panel"><h2>Strength & training insights</h2>
        <div className="workout-metrics"><div><small>Workouts</small><strong>{history.length}</strong></div><div><small>Completed sets</small><strong>{number(totalSets)}</strong></div><div><small>Total volume (lb)</small><strong>{number(volume)}</strong></div></div>
        <label className="workout-progress-picker">Exercise<select value={selectedProgress} onChange={e => setSelectedProgressId(e.target.value)}>{allExercises.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
        <p>Personal best: <strong>{number(bestWeight(history, selectedProgress))} lb</strong></p>
        <div className="workout-chart" role="img" aria-label="Best completed set weight per workout, oldest to newest">
          {progress.length ? progress.map((p, i) => <div className="workout-chart-column" key={p.date + i} title={p.date + ': ' + p.weight + ' lb'}><span>{number(p.weight)}</span><div style={{ height: Math.max(3, p.weight / chartMax * 130) + 'px' }}/><small>{p.date.slice(5)}</small></div>) : <p>Complete a workout with this exercise to see a strength chart.</p>}
        </div><p className="subtitle">Chart shows the heaviest completed set for this exercise in each workout. Compare like-for-like reps for meaningful progress.</p>
        <div className="workout-nutrition-link"><strong>Nutrition + training</strong><p>Your nutrition diary and workout history live together in Tanora. Use your nutrition dashboard to review intake on training days.</p><button className="workout-secondary" type="button" onClick={onNutrition}>Open nutrition dashboard</button></div>
      </section>}
      <p className="footer-note">{userId ? 'Workouts sync to your Tanora account.' : 'Guest workouts are saved only in this browser.'} Weights are recorded in pounds.</p>
    </div>
  )
}
