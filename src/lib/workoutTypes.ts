export type Exercise = {
  id: string
  name: string
  muscle: string
  equipment: string
}

export type WorkoutSet = {
  id: string
  reps: number
  weight: number
  completed: boolean
}

export type WorkoutExercise = {
  exercise: Exercise
  sets: WorkoutSet[]
}

export type WorkoutSession = {
  id: string
  name: string
  date: string
  exercises: WorkoutExercise[]
  notes: string
}

export type WorkoutRoutine = {
  id: string
  name: string
  exercises: Exercise[]
}

export type WorkoutData = {
  history: WorkoutSession[]
  routines: WorkoutRoutine[]
}

export const emptyWorkoutData: WorkoutData = { history: [], routines: [] }

export const exerciseLibrary: Exercise[] = [
  ['Barbell Bench Press', 'Chest', 'Barbell'], ['Incline Dumbbell Press', 'Chest', 'Dumbbell'],
  ['Chest Fly', 'Chest', 'Machine'], ['Push-Up', 'Chest', 'Bodyweight'],
  ['Pull-Up', 'Back', 'Bodyweight'], ['Lat Pulldown', 'Back', 'Cable'],
  ['Barbell Row', 'Back', 'Barbell'], ['Seated Cable Row', 'Back', 'Cable'],
  ['Deadlift', 'Back', 'Barbell'], ['Overhead Press', 'Shoulders', 'Barbell'],
  ['Dumbbell Lateral Raise', 'Shoulders', 'Dumbbell'], ['Reverse Fly', 'Shoulders', 'Dumbbell'],
  ['Barbell Squat', 'Legs', 'Barbell'], ['Leg Press', 'Legs', 'Machine'],
  ['Romanian Deadlift', 'Legs', 'Barbell'], ['Leg Extension', 'Legs', 'Machine'],
  ['Leg Curl', 'Legs', 'Machine'], ['Calf Raise', 'Legs', 'Machine'],
  ['Dumbbell Curl', 'Arms', 'Dumbbell'], ['Hammer Curl', 'Arms', 'Dumbbell'],
  ['Triceps Pushdown', 'Arms', 'Cable'], ['Skull Crusher', 'Arms', 'Barbell'],
  ['Plank', 'Core', 'Bodyweight'], ['Cable Crunch', 'Core', 'Cable'],
  ['Hanging Leg Raise', 'Core', 'Bodyweight'],
].map(([name, muscle, equipment]) => ({
  id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/g, ''),
  name, muscle, equipment,
}))

export function totalVolume(session: WorkoutSession): number {
  return session.exercises.reduce((volume, item) =>
    volume + item.sets.filter(set => set.completed).reduce(
      (value, set) => value + set.weight * set.reps, 0
    ), 0)
}

export function completedSets(session: WorkoutSession): number {
  return session.exercises.reduce((count, item) =>
    count + item.sets.filter(set => set.completed).length, 0)
}

export function bestWeight(sessions: WorkoutSession[], exerciseId: string): number {
  return Math.max(0, ...sessions.flatMap(session => session.exercises
    .filter(item => item.exercise.id === exerciseId)
    .flatMap(item => item.sets.filter(set => set.completed).map(set => set.weight))))
}

export function validWorkoutData(value: unknown): value is WorkoutData {
  if (!value || typeof value !== 'object') return false
  const data = value as Partial<WorkoutData>
  if (!Array.isArray(data.history) || !Array.isArray(data.routines)) return false
  return data.history.every(s => s && typeof s.id === 'string' && typeof s.name === 'string' &&
    typeof s.date === 'string' && Array.isArray(s.exercises) &&
    s.exercises.every(e => e && e.exercise && typeof e.exercise.id === 'string' &&
      typeof e.exercise.name === 'string' && Array.isArray(e.sets) &&
      e.sets.every(t => t && typeof t.id === 'string' && Number.isFinite(t.reps) &&
        t.reps >= 0 && Number.isFinite(t.weight) && t.weight >= 0 && typeof t.completed === 'boolean'))) &&
    data.routines.every(r => r && typeof r.id === 'string' && typeof r.name === 'string' &&
      Array.isArray(r.exercises) && r.exercises.every(e => e && typeof e.id === 'string' &&
        typeof e.name === 'string'))
}
