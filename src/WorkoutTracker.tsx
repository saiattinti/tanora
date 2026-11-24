import { useEffect, useMemo, useRef, useState } from 'react'
import { bestWeight, completedSets, exerciseLibrary, totalVolume, isWorkingSet, lastWorkingSets } from './lib/workoutTypes'
import type { Exercise, WorkoutData, WorkoutExercise, WorkoutSession } from './lib/workoutTypes'
import { loadWorkoutData, saveWorkoutData } from './lib/workoutStorage'
import { repdbImage } from './lib/repdbImages'
import { readWorkoutDraft, removeWorkoutDraft, storeWorkoutDraft } from './lib/workoutDraft'
import { readWeightUnit, saveWeightUnit, poundsToDisplay, displayToPounds, formatWeight } from './lib/workoutUnits'
import type { WeightUnit } from './lib/workoutUnits'
import { useRestTimer, RestTimerPanel, PlateCalculator } from './WorkoutUtilities'
import './WorkoutTracker.css'

type View = 'log' | 'routines' | 'history' | 'progress' | 'tools'
const dateToday = () => {
  const d = new Date()
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
}
// Keep the entered text while editing so users can clear zero and type decimals.
function SetNumberInput({ value, label, step, onValueChange }: {
  value: number
  label: string
  step: string
  onValueChange: (next: number) => void
}) {
  // Each set has its own stable React key, so edit text can stay local.
  // Keep the text during editing to allow blank input and decimal typing.
  const [text, setText] = useState(value === 0 ? '' : String(value))
  return <input
    aria-label={label}
    type="number"
    inputMode={step === '1' ? 'numeric' : 'decimal'}
    min="0"
    step={step}
    placeholder="0"
    value={text}
    onFocus={event => event.currentTarget.select()}
    onChange={event => {
      const next = event.target.value
      setText(next)
      const parsed = Number(next)
      if (next.trim() !== '' && Number.isFinite(parsed) && parsed >= 0 && (step !== '1' || Number.isInteger(parsed))) {
        onValueChange(parsed)
      }
    }}
    onBlur={() => {
      const parsed = Number(text)
      const valid = text.trim() !== '' && Number.isFinite(parsed) && parsed >= 0 && (step !== '1' || Number.isInteger(parsed))
      const next = valid ? parsed : 0
      onValueChange(next)
      setText(next === 0 ? '' : String(next))
    }}
  />
}

const newSet = () => ({ id: crypto.randomUUID(), reps: 8, weight: 0, completed: false, kind: 'working' as const })
const newExercise = (exercise: Exercise, history: WorkoutSession[]): WorkoutExercise => {
  const previous = lastWorkingSets(history, exercise.id)
  return {
    exercise,
    sets: previous.length
      ? previous.map(set => ({ ...newSet(), reps: set.reps, weight: set.weight }))
      : [newSet(), newSet(), newSet()],
  }
}
const newSession = (): WorkoutSession => ({
  id: crypto.randomUUID(), name: 'Workout', date: dateToday(), exercises: [], notes: '',
})
const number = (value: number) => Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : '0'

export default function WorkoutTracker({ userId, onNutrition }: { userId: string | null, onNutrition: () => void }) {
  const [data, setData] = useState<WorkoutData>({ history: [], routines: [] })
  const [active, setActive] = useState<WorkoutSession | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [recoverable, setRecoverable] = useState(() => readWorkoutDraft(userId))
  const ownDraftWrite = useRef(0)
  const draftConflictWarned = useRef(false)
  const [draftError, setDraftError] = useState('')
  const [view, setView] = useState<View>('log')
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [muscle, setMuscle] = useState('All')
  const [equipment, setEquipment] = useState('All')
  const [showLibrary, setShowLibrary] = useState(false)
  const [routineDraft, setRoutineDraft] = useState<{ name: string, exercises: Exercise[] } | null>(null)
  const [selectedProgressId, setSelectedProgressId] = useState('')
  const [unit, setUnit] = useState<WeightUnit>(readWeightUnit)
  const restTimer = useRestTimer(userId)

  function changeUnit(next: WeightUnit) {
    saveWeightUnit(next)
    setUnit(next)
  }

  // Keep unsaved edits locally. Drafts are never uploaded or counted as completed workouts.
  useEffect(() => {
    if (!active) return
    try {
      const existing = readWorkoutDraft(userId)
      if (existing && existing.savedAt > ownDraftWrite.current && ownDraftWrite.current !== 0) {
        if (!draftConflictWarned.current) {
          draftConflictWarned.current = true
          window.alert('This workout draft was changed in another tab. This tab will not overwrite it. Copy your unsaved changes and reload to recover the newer version.')
        }
        return
      }
      const savedAt = Date.now()
      storeWorkoutDraft(userId, { version: 1, session: active, editingId, savedAt })
      ownDraftWrite.current = savedAt
    } catch {
      console.warn('Tanora: workout draft could not be stored locally.')
    }
  }, [active, editingId, userId])

  function beginWorkout(session: WorkoutSession, originalId: string | null = null) {
    const existingDraft = readWorkoutDraft(userId)
    if (recoverable || existingDraft) {
      if (existingDraft) setRecoverable(existingDraft)
      setError('Resume or discard the recovered draft before starting another workout.')
      return
    }
    setError('')
    setMessage('')
    setEditingId(originalId)
    setActive(session)
    setView('log')
  }

  function discardCurrent() {
    if (!window.confirm('Discard this unsaved workout?')) return
    removeWorkoutDraft(userId)
    ownDraftWrite.current = 0
    draftConflictWarned.current = false
    setRecoverable(null)
    setEditingId(null)
    setActive(null)
    setDraftError('')
  }

  function resumeDraft() {
    if (!recoverable) return
    setEditingId(recoverable.editingId)
    setActive(recoverable.session)
    ownDraftWrite.current = recoverable.savedAt
    setRecoverable(null)
    setDraftError('')
    setView('log')
  }

  function discardRecoveredDraft() {
    if (!window.confirm('Discard the recovered workout draft?')) return
    removeWorkoutDraft(userId)
    setRecoverable(null)
    ownDraftWrite.current = 0
    setDraftError('')
  }

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
        .flatMap(e => e.sets.filter(t => t.completed && isWorkingSet(t)).map(t => t.weight))),
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

  function updateSet(exerciseIndex: number, setId: string, key: 'weight' | 'reps' | 'completed' | 'kind', value: number | boolean | 'warmup' | 'working') {
    if (key === 'completed' && value === true && active?.exercises[exerciseIndex]?.sets.find(set => set.id === setId)?.kind !== 'warmup' && restTimer.autoStart) {
      restTimer.start()
    }
    updateExercise(exerciseIndex, e => ({
      ...e, sets: e.sets.map(set => set.id === setId ? { ...set, [key]: value } : set),
    }))
  }

  function startFromRoutine(id: string) {
    const routine = data.routines.find(r => r.id === id)
    if (!routine) return
    beginWorkout({ ...newSession(), name: routine.name, exercises: routine.exercises.map(exercise => newExercise(exercise, data.history)) })
  }

  function startEditingWorkout(session: WorkoutSession) {
    beginWorkout({
      ...session,
      exercises: session.exercises.map(item => ({
        exercise: item.exercise,
        sets: item.sets.map(set => ({ ...set })),
      })),
    }, session.id)
  }

  function resetSuggestedSets(exerciseIndex: number) {
    updateExercise(exerciseIndex, item => ({
      ...item,
      sets: [newSet(), newSet(), newSet()],
    }))
  }

  async function finishWorkout() {
    if (!active || active.exercises.length === 0) return
    if (!active.exercises.some(e => e.sets.some(s => s.completed && isWorkingSet(s)))) {
      setError('Complete at least one working set before saving.')
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
    const nextHistory = editingId
      ? data.history.map(session => session.id === editingId ? { ...active, id: editingId } : session)
      : [active, ...data.history]
    if (editingId && !data.history.some(session => session.id === editingId)) {
      setError('The original workout could not be found. No changes were saved.')
      return
    }
    const saved = await persist({ ...data, history: nextHistory },
      editingId ? 'Workout changes saved.' : 'Workout saved to your history.')
    if (saved) {
      removeWorkoutDraft(userId)
      ownDraftWrite.current = 0
      draftConflictWarned.current = false
      setEditingId(null)
      setActive(null)
      setRecoverable(null)
    }
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

  async function saveNewRoutine() {
    if (!routineDraft) return
    const name = routineDraft.name.trim()
    if (!name) { setError('Enter a routine name.'); return }
    if (!routineDraft.exercises.length) { setError('Add at least one exercise to the routine.'); return }
    const saved = await persist({
      ...data,
      routines: [...data.routines, {
        id: crypto.randomUUID(), name, exercises: routineDraft.exercises,
      }],
    }, 'Routine created. Ready to use in your next workout.')
    if (saved) setRoutineDraft(null)
  }

  async function saveHistoryAsRoutine(session: WorkoutSession) {
    const chosen = window.prompt('Name for this routine:', session.name)
    if (chosen === null) return
    const name = chosen.trim()
    if (!name) { setError('Enter a routine name.'); return }
    const exercises = session.exercises.map(item => item.exercise)
    if (!exercises.length) { setError('That workout has no exercises.'); return }
    await persist({
      ...data,
      routines: [...data.routines, { id: crypto.randomUUID(), name, exercises }],
    }, 'Workout saved as a reusable routine.')
  }

  const history = [...data.history].sort((a, b) => b.date.localeCompare(a.date))
  const totalSets = history.reduce((sum, s) => sum + completedSets(s), 0)
  const volume = history.reduce((sum, s) => sum + totalVolume(s), 0)
  const chartMax = Math.max(1, ...progress.map(p => p.weight))

  if (!ready) return <section className="workout-panel card"><h2>Workout tracker</h2><p>{error || 'Loading your workouts...'}</p></section>

  return (
    <div className="workout-app">
      <header className="workout-heading">
        <div><p className="eyebrow">TANORA 2.1 DEVELOPMENT</p><h1>Workout Tracker</h1><p className="subtitle">Train, log, and grow stronger.</p></div>
        <div className="workout-header-actions"><label className="workout-unit-select">Weight unit <select aria-label="Workout weight unit" value={unit} onChange={e => changeUnit(e.target.value as WeightUnit)}><option value="lb">lb</option><option value="kg">kg</option></select></label><button className="settings-button" type="button" onClick={onNutrition}>Nutrition ↗</button></div>
      </header>
      <nav className="workout-nav" aria-label="Workout sections">
        {(['log', 'routines', 'history', 'progress', 'tools'] as View[]).map(tab =>
          <button key={tab} className={view === tab ? 'active' : ''} type="button" onClick={() => setView(tab)}>{tab === 'log' ? 'Log' : tab === 'routines' ? 'Routines' : tab === 'history' ? 'History' : tab === 'progress' ? 'Progress' : 'Tools'}</button>)}
      </nav>
      {error && <p className="workout-error" role="alert">{error} <button type="button" onClick={() => setError('')}>Dismiss</button></p>}
      {message && <p className="workout-success" role="status">{message}</p>}
      {draftError && <p className="workout-error" role="alert">{draftError}</p>}
      {recoverable && <section className="card workout-panel workout-draft-recovery">
        <h2>Unfinished workout found</h2>
        <p>Resume <strong>{recoverable.session.name}</strong>, or discard this browser's saved draft. Your finished workouts are untouched.</p>
        <div className="workout-actions">
          <button className="workout-primary" type="button" onClick={resumeDraft}>Resume draft</button>
          <button className="workout-secondary" type="button" onClick={discardRecoveredDraft}>Discard draft</button>
        </div>
      </section>}
      {view === 'log' && <section className="card workout-panel">
        <RestTimerPanel timer={restTimer}/>
        {!active ? <>
          <h2>Start a workout</h2><p className="subtitle">Log your sets and see how they compare with previous sessions.</p>
          <button className="workout-primary" type="button" onClick={() => beginWorkout(newSession())}>+ Start empty workout</button>
          {data.routines.length > 0 && <div className="workout-list"><h3>Start from a routine</h3>{data.routines.map(r =>
            <button className="workout-item-button" key={r.id} type="button" onClick={() => startFromRoutine(r.id)}>{r.name} <small>{r.exercises.length} exercises</small></button>)}</div>}
        </> : <>
          <div className="workout-fields">
            <label>{editingId ? 'Edit workout name' : 'Workout name'}<input value={active.name} maxLength={80} onChange={e => setActive({ ...active, name: e.target.value })}/></label>
            <label>Date<input type="date" value={active.date} onChange={e => setActive({ ...active, date: e.target.value })}/></label>
          </div>
          {active.exercises.map((item, i) => <article className="workout-exercise" key={item.exercise.id + i}>
            <div className="workout-exercise-top"><div><h3>{item.exercise.name}</h3><small>{item.exercise.muscle} · {item.exercise.equipment} · Previous working-set best: {formatWeight(bestWeight(history.filter(s => s.id !== editingId), item.exercise.id), unit)}</small>
              <div className="workout-prefill-note">New exercises use last completed working sets when available. <button type="button" onClick={() => resetSuggestedSets(i)}>Reset sets</button></div></div>
              <button type="button" className="workout-danger-text" onClick={() => setActive({ ...active, exercises: active.exercises.filter((_, index) => index !== i) })}>Remove</button></div>
            <div className="workout-set-header"><span>Set</span><span>{unit}</span><span>Reps</span><span>Done</span><span></span></div>
            {item.sets.map((set, j) => <div className="workout-set" key={set.id}>
              <span>{j + 1}</span>
              <SetNumberInput key={set.id + unit} label={item.exercise.name + ' weight set ' + (j + 1) + ' in ' + unit} value={poundsToDisplay(set.weight, unit)} step={unit === 'lb' ? '0.5' : '0.01'} onValueChange={value => updateSet(i, set.id, 'weight', displayToPounds(value, unit))}/>
              <SetNumberInput label={item.exercise.name + ' reps set ' + (j + 1)} value={set.reps} step="1" onValueChange={value => updateSet(i, set.id, 'reps', value)}/>
              <input aria-label={item.exercise.name + ' completed set ' + (j + 1)} type="checkbox" checked={set.completed} onChange={e => updateSet(i, set.id, 'completed', e.target.checked)}/>
              <button aria-label={'Remove set ' + (j + 1)} type="button" onClick={() => updateExercise(i, exercise => ({ ...exercise, sets: exercise.sets.filter(s => s.id !== set.id) }))}>×</button>
              <label className="workout-set-type">Set type
                <select aria-label={item.exercise.name + ' type set ' + (j + 1)} value={set.kind ?? 'working'} onChange={e => updateSet(i, set.id, 'kind', e.target.value as 'warmup' | 'working')}>
                  <option value="working">Working set</option><option value="warmup">Warm-up</option>
                </select>
              </label>
            </div>)}
            <button className="workout-secondary" type="button" onClick={() => updateExercise(i, e => ({ ...e, sets: [...e.sets, newSet()] }))}>+ Add set</button>
          </article>)}
          <button className="workout-secondary" type="button" onClick={() => setShowLibrary(v => !v)}>{showLibrary ? 'Hide exercise library' : '+ Add exercise'}</button>
          {showLibrary && <div className="workout-library">
            <div className="workout-filters"><input aria-label="Search exercises" placeholder="Search exercises..." value={search} onChange={e => setSearch(e.target.value)}/>
              <select aria-label="Muscle group" value={muscle} onChange={e => setMuscle(e.target.value)}>{['All', 'Chest', 'Back', 'Shoulders', 'Legs', 'Arms', 'Core', 'Cardio'].map(v => <option key={v}>{v}</option>)}</select>
              <select aria-label="Equipment" value={equipment} onChange={e => setEquipment(e.target.value)}>{['All', 'Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight'].map(v => <option key={v}>{v}</option>)}</select></div>
            <p className="workout-library-count">{catalog.length} exercises found · {exerciseLibrary.length} total</p>
            <div className="workout-library-items">{catalog.map(e => <button type="button" key={e.id} onClick={() => {
              setActive(previous => previous && ({ ...previous, exercises: [...previous.exercises, newExercise(e, history)] }))
              setShowLibrary(false)
            }}><span className="workout-exercise-thumb">
                {repdbImage(e.id) ? <img src={repdbImage(e.id)!} alt={e.name + ' starting position, illustration by RepDB'} loading="lazy" onError={event => { event.currentTarget.style.display = 'none' }} /> : <span aria-hidden="true" className="workout-no-art">EX</span>}
              </span><span className="workout-exercise-name">{e.name}<small>{e.muscle} · {e.equipment}</small></span><span className="workout-add-sign" aria-hidden="true">+</span></button>)}</div>
            <a className="repdb-credit" href="https://repdb.co" target="_blank" rel="noopener noreferrer">Exercise data by RepDB (repdb.co)</a>
          </div>}
          <label className="workout-notes">Notes<textarea maxLength={1000} rows={2} value={active.notes} onChange={e => setActive({ ...active, notes: e.target.value })} placeholder="How did it feel?"/></label>
          <div className="workout-actions"><button className="workout-primary" disabled={busy || active.exercises.length === 0} type="button" onClick={() => void finishWorkout()}>{editingId ? 'Save workout changes' : 'Finish & save workout'}</button>
            <button className="workout-secondary" disabled={busy || active.exercises.length === 0} type="button" onClick={() => void saveRoutine()}>Save as routine</button>
            <button className="workout-danger-text" type="button" onClick={discardCurrent}>{editingId ? 'Cancel editing' : 'Discard'}</button></div>
        </>}
      </section>}
      {view === 'routines' && <section className="card workout-panel"><h2>Your routines</h2><p className="subtitle">Build a routine here, save one during a workout, or convert an earlier workout from History.</p>
        {!routineDraft ? <button className="workout-primary" type="button" onClick={() => { setRoutineDraft({ name: '', exercises: [] }); setError('') }}>+ Create routine</button> : <div className="workout-routine-builder">
          <label className="workout-routine-name">Routine name<input value={routineDraft.name} maxLength={80} placeholder="e.g. Push Day" onChange={e => setRoutineDraft({ ...routineDraft, name: e.target.value })}/></label>
          <h3>Exercises ({routineDraft.exercises.length})</h3>
          {routineDraft.exercises.map((exercise, index) => <div className="workout-routine-exercise" key={exercise.id + index}><span>{index + 1}. {exercise.name}</span><button className="workout-danger-text" type="button" onClick={() => setRoutineDraft(current => current && ({ ...current, exercises: current.exercises.filter((_, i) => i !== index) }))}>Remove</button></div>)}
          <div className="workout-filters"><input aria-label="Search routine exercises" placeholder="Search exercises..." value={search} onChange={e => setSearch(e.target.value)}/>
            <select aria-label="Routine muscle group" value={muscle} onChange={e => setMuscle(e.target.value)}>{['All', 'Chest', 'Back', 'Shoulders', 'Legs', 'Arms', 'Core', 'Cardio'].map(v => <option key={v}>{v}</option>)}</select>
            <select aria-label="Routine equipment" value={equipment} onChange={e => setEquipment(e.target.value)}>{['All', 'Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight'].map(v => <option key={v}>{v}</option>)}</select>
          </div>
          <div className="workout-library-items workout-routine-picker">{catalog.map(exercise => <button type="button" key={exercise.id} onClick={() => setRoutineDraft(current => current && ({ ...current, exercises: [...current.exercises, exercise] }))}>
            <span className="workout-exercise-thumb">{repdbImage(exercise.id) ? <img src={repdbImage(exercise.id)!} alt={exercise.name + ' illustration by RepDB'} loading="lazy"/> : <span aria-hidden="true" className="workout-no-art">EX</span>}</span>
            <span className="workout-exercise-name">{exercise.name}<small>{exercise.muscle} · {exercise.equipment}</small></span><span className="workout-add-sign" aria-hidden="true">+</span>
          </button>)}</div>
          <a className="repdb-credit" href="https://repdb.co" target="_blank" rel="noopener noreferrer">Exercise data by RepDB (repdb.co)</a>
          <div className="workout-actions"><button className="workout-primary" type="button" disabled={busy || !routineDraft.exercises.length || !routineDraft.name.trim()} onClick={() => void saveNewRoutine()}>Save routine</button><button className="workout-secondary" type="button" onClick={() => setRoutineDraft(null)}>Cancel</button></div>
        </div>}
        {data.routines.length === 0 ? <p>No saved routines yet.</p> : data.routines.map(r => <div className="workout-history-row" key={r.id}><div><strong>{r.name}</strong><p>{r.exercises.map(e => e.name).join(' · ')}</p></div><div className="workout-inline-actions">
          <button className="workout-secondary" type="button" onClick={() => startFromRoutine(r.id)}>Start</button>
          <button className="workout-danger-text" disabled={busy} type="button" onClick={() => { if (window.confirm('Delete this routine?')) void persist({ ...data, routines: data.routines.filter(x => x.id !== r.id) }, 'Routine deleted.') }}>Delete</button></div></div>)}
      </section>}
      {view === 'history' && <section className="card workout-panel"><h2>Workout history</h2>
        {history.length === 0 ? <p>No completed workouts yet.</p> : history.map(s => <details className="workout-history-row" key={s.id}><summary><strong>{s.name}</strong> <small>{s.date} · {completedSets(s)} sets · {formatWeight(totalVolume(s), unit)} volume</small></summary>
          {s.exercises.map((e, i) => <p key={i}><strong>{e.exercise.name}:</strong> {e.sets.filter(t => t.completed).map(t => formatWeight(t.weight, unit) + ' × ' + t.reps + (t.kind === 'warmup' ? ' (warm-up)' : '')).join(', ') || 'No completed sets'}</p>)}
          {s.notes && <p><em>{s.notes}</em></p>}
          <button className="workout-secondary" disabled={busy || !!active || !!recoverable} type="button" onClick={() => startEditingWorkout(s)}>Edit workout</button>
          <button className="workout-secondary" disabled={busy} type="button" onClick={() => void saveHistoryAsRoutine(s)}>Save as routine</button>
          <button className="workout-danger-text" disabled={busy} type="button" onClick={() => { if (window.confirm('Delete this saved workout?')) void persist({ ...data, history: data.history.filter(x => x.id !== s.id) }, 'Workout deleted.') }}>Delete workout</button>
        </details>)}
      </section>}
      {view === 'progress' && <section className="card workout-panel"><h2>Strength & training insights</h2>
        <div className="workout-metrics"><div><small>Workouts</small><strong>{history.length}</strong></div><div><small>Completed sets</small><strong>{number(totalSets)}</strong></div><div><small>Total volume ({unit})</small><strong>{number(poundsToDisplay(volume,unit))}</strong></div></div>
        <label className="workout-progress-picker">Exercise<select value={selectedProgress} onChange={e => setSelectedProgressId(e.target.value)}>{allExercises.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
        <p>Personal best: <strong>{formatWeight(bestWeight(history, selectedProgress), unit)}</strong></p>
        <div className="workout-chart" role="img" aria-label="Best completed set weight per workout, oldest to newest">
          {progress.length ? progress.map((p, i) => <div className="workout-chart-column" key={p.date + i} title={p.date + ': ' + formatWeight(p.weight, unit)}><span>{number(poundsToDisplay(p.weight, unit))}</span><div style={{ height: Math.max(3, p.weight / chartMax * 130) + 'px' }}/><small>{p.date.slice(5)}</small></div>) : <p>Complete a workout with this exercise to see a strength chart.</p>}
        </div><p className="subtitle">Chart shows the heaviest completed set for this exercise in each workout. Compare like-for-like reps for meaningful progress.</p>
        <div className="workout-nutrition-link"><strong>Nutrition + training</strong><p>Your nutrition diary and workout history live together in Tanora. Use your nutrition dashboard to review intake on training days.</p><button className="workout-secondary" type="button" onClick={onNutrition}>Open nutrition dashboard</button></div>
      </section>}
      {view === 'tools' && <section className="card workout-panel"><h2>Gym tools</h2><RestTimerPanel timer={restTimer}/><PlateCalculator key={unit} unit={unit}/></section>}
      <p className="footer-note">{userId ? 'Workouts sync to your Tanora account.' : 'Guest workouts are saved only in this browser.'} Workout weights are stored internally in pounds, and displayed in {unit}.</p>
    </div>
  )
}
