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
  /** Old workout records without kind are treated as working sets. */
  kind?: 'working' | 'warmup'
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

export function isWorkingSet(set: WorkoutSet): boolean {
  return set.kind !== 'warmup'
}

export function lastWorkingSets(sessions: WorkoutSession[], exerciseId: string): WorkoutSet[] {
  const previous = sessions
    .filter(session => session.exercises.some(item => item.exercise.id === exerciseId))
    .sort((a, b) => b.date.localeCompare(a.date))
    .find(session => session.exercises.some(item =>
      item.exercise.id === exerciseId && item.sets.some(set => set.completed && isWorkingSet(set))))
  if (!previous) return []
  return previous.exercises
    .filter(item => item.exercise.id === exerciseId)
    .flatMap(item => item.sets)
    .filter(set => set.completed && isWorkingSet(set))
}

export const exerciseLibrary: Exercise[] = [
  ["Barbell Bench Press","Chest","Barbell"],
  ["Incline Barbell Bench Press","Chest","Barbell"],
  ["Decline Barbell Bench Press","Chest","Barbell"],
  ["Close-Grip Bench Press","Chest","Barbell"],
  ["Barbell Floor Press","Chest","Barbell"],
  ["Dumbbell Bench Press","Chest","Dumbbell"],
  ["Incline Dumbbell Press","Chest","Dumbbell"],
  ["Decline Dumbbell Press","Chest","Dumbbell"],
  ["Dumbbell Chest Fly","Chest","Dumbbell"],
  ["Incline Dumbbell Fly","Chest","Dumbbell"],
  ["Dumbbell Floor Press","Chest","Dumbbell"],
  ["Dumbbell Pullover","Chest","Dumbbell"],
  ["Chest Fly","Chest","Machine"],
  ["Machine Chest Press","Chest","Machine"],
  ["Incline Machine Chest Press","Chest","Machine"],
  ["Pec Deck Fly","Chest","Machine"],
  ["Smith Machine Bench Press","Chest","Machine"],
  ["Cable Chest Fly","Chest","Cable"],
  ["Low-to-High Cable Fly","Chest","Cable"],
  ["High-to-Low Cable Fly","Chest","Cable"],
  ["Cable Chest Press","Chest","Cable"],
  ["Push-Up","Chest","Bodyweight"],
  ["Incline Push-Up","Chest","Bodyweight"],
  ["Decline Push-Up","Chest","Bodyweight"],
  ["Diamond Push-Up","Chest","Bodyweight"],
  ["Chest Dip","Chest","Bodyweight"],
  ["Barbell Row","Back","Barbell"],
  ["Pendlay Row","Back","Barbell"],
  ["Deadlift","Back","Barbell"],
  ["Rack Pull","Back","Barbell"],
  ["Landmine Row","Back","Barbell"],
  ["One-Arm Dumbbell Row","Back","Dumbbell"],
  ["Chest-Supported Dumbbell Row","Back","Dumbbell"],
  ["Dumbbell Row","Back","Dumbbell"],
  ["Dumbbell Shrug","Back","Dumbbell"],
  ["Lat Pulldown","Back","Cable"],
  ["Close-Grip Lat Pulldown","Back","Cable"],
  ["Straight-Arm Pulldown","Back","Cable"],
  ["Seated Cable Row","Back","Cable"],
  ["Single-Arm Cable Row","Back","Cable"],
  ["Face Pull","Back","Cable"],
  ["Cable Pullover","Back","Cable"],
  ["Machine Row","Back","Machine"],
  ["Chest-Supported Machine Row","Back","Machine"],
  ["Assisted Pull-Up","Back","Machine"],
  ["Reverse Pec Deck","Back","Machine"],
  ["Back Extension Machine","Back","Machine"],
  ["Pull-Up","Back","Bodyweight"],
  ["Chin-Up","Back","Bodyweight"],
  ["Neutral-Grip Pull-Up","Back","Bodyweight"],
  ["Inverted Row","Back","Bodyweight"],
  ["Superman Hold","Back","Bodyweight"],
  ["Back Extension","Back","Bodyweight"],
  ["Overhead Press","Shoulders","Barbell"],
  ["Seated Barbell Shoulder Press","Shoulders","Barbell"],
  ["Push Press","Shoulders","Barbell"],
  ["Upright Row","Shoulders","Barbell"],
  ["Seated Dumbbell Shoulder Press","Shoulders","Dumbbell"],
  ["Standing Dumbbell Shoulder Press","Shoulders","Dumbbell"],
  ["Arnold Press","Shoulders","Dumbbell"],
  ["Dumbbell Lateral Raise","Shoulders","Dumbbell"],
  ["Front Raise","Shoulders","Dumbbell"],
  ["Reverse Fly","Shoulders","Dumbbell"],
  ["Dumbbell Rear Delt Row","Shoulders","Dumbbell"],
  ["Cable Lateral Raise","Shoulders","Cable"],
  ["Cable Front Raise","Shoulders","Cable"],
  ["Cable Rear Delt Fly","Shoulders","Cable"],
  ["Face Pull (Shoulders)","Shoulders","Cable"],
  ["Machine Shoulder Press","Shoulders","Machine"],
  ["Machine Lateral Raise","Shoulders","Machine"],
  ["Reverse Pec Deck (Shoulders)","Shoulders","Machine"],
  ["Pike Push-Up","Shoulders","Bodyweight"],
  ["Handstand Push-Up","Shoulders","Bodyweight"],
  ["Barbell Squat","Legs","Barbell"],
  ["Front Squat","Legs","Barbell"],
  ["Romanian Deadlift","Legs","Barbell"],
  ["Conventional Deadlift","Legs","Barbell"],
  ["Sumo Deadlift","Legs","Barbell"],
  ["Barbell Hip Thrust","Legs","Barbell"],
  ["Good Morning","Legs","Barbell"],
  ["Barbell Lunge","Legs","Barbell"],
  ["Bulgarian Split Squat (Barbell)","Legs","Barbell"],
  ["Goblet Squat","Legs","Dumbbell"],
  ["Dumbbell Romanian Deadlift","Legs","Dumbbell"],
  ["Dumbbell Walking Lunge","Legs","Dumbbell"],
  ["Dumbbell Step-Up","Legs","Dumbbell"],
  ["Bulgarian Split Squat","Legs","Dumbbell"],
  ["Dumbbell Sumo Squat","Legs","Dumbbell"],
  ["Dumbbell Calf Raise","Legs","Dumbbell"],
  ["Leg Press","Legs","Machine"],
  ["Hack Squat","Legs","Machine"],
  ["Leg Extension","Legs","Machine"],
  ["Seated Leg Curl","Legs","Machine"],
  ["Lying Leg Curl","Legs","Machine"],
  ["Leg Curl","Legs","Machine"],
  ["Hip Abduction Machine","Legs","Machine"],
  ["Hip Adduction Machine","Legs","Machine"],
  ["Seated Calf Raise","Legs","Machine"],
  ["Standing Calf Raise","Legs","Machine"],
  ["Smith Machine Squat","Legs","Machine"],
  ["Cable Pull-Through","Legs","Cable"],
  ["Cable Glute Kickback","Legs","Cable"],
  ["Cable Hip Abduction","Legs","Cable"],
  ["Bodyweight Squat","Legs","Bodyweight"],
  ["Reverse Lunge","Legs","Bodyweight"],
  ["Walking Lunge","Legs","Bodyweight"],
  ["Glute Bridge","Legs","Bodyweight"],
  ["Single-Leg Glute Bridge","Legs","Bodyweight"],
  ["Wall Sit","Legs","Bodyweight"],
  ["Step-Up","Legs","Bodyweight"],
  ["Nordic Hamstring Curl","Legs","Bodyweight"],
  ["Single-Leg Calf Raise","Legs","Bodyweight"],
  ["Barbell Curl","Arms","Barbell"],
  ["EZ-Bar Curl","Arms","Barbell"],
  ["Preacher Curl (EZ Bar)","Arms","Barbell"],
  ["Reverse Curl","Arms","Barbell"],
  ["Close-Grip Bench Press (Triceps)","Arms","Barbell"],
  ["Skull Crusher","Arms","Barbell"],
  ["Overhead Barbell Triceps Extension","Arms","Barbell"],
  ["Dumbbell Curl","Arms","Dumbbell"],
  ["Incline Dumbbell Curl","Arms","Dumbbell"],
  ["Hammer Curl","Arms","Dumbbell"],
  ["Concentration Curl","Arms","Dumbbell"],
  ["Cross-Body Hammer Curl","Arms","Dumbbell"],
  ["Dumbbell Preacher Curl","Arms","Dumbbell"],
  ["Dumbbell Triceps Kickback","Arms","Dumbbell"],
  ["Overhead Dumbbell Triceps Extension","Arms","Dumbbell"],
  ["Lying Dumbbell Triceps Extension","Arms","Dumbbell"],
  ["Cable Biceps Curl","Arms","Cable"],
  ["Rope Hammer Curl","Arms","Cable"],
  ["Bayesian Cable Curl","Arms","Cable"],
  ["Cable Preacher Curl","Arms","Cable"],
  ["Triceps Pushdown","Arms","Cable"],
  ["Rope Triceps Pushdown","Arms","Cable"],
  ["Overhead Cable Triceps Extension","Arms","Cable"],
  ["Single-Arm Cable Pushdown","Arms","Cable"],
  ["Machine Preacher Curl","Arms","Machine"],
  ["Machine Triceps Extension","Arms","Machine"],
  ["Assisted Dip","Arms","Machine"],
  ["Bench Dip","Arms","Bodyweight"],
  ["Parallel Bar Dip","Arms","Bodyweight"],
  ["Diamond Push-Up (Triceps)","Arms","Bodyweight"],
  ["Chin-Up (Biceps)","Arms","Bodyweight"],
  ["Plank","Core","Bodyweight"],
  ["Side Plank","Core","Bodyweight"],
  ["Crunch","Core","Bodyweight"],
  ["Bicycle Crunch","Core","Bodyweight"],
  ["Reverse Crunch","Core","Bodyweight"],
  ["Hanging Leg Raise","Core","Bodyweight"],
  ["Hanging Knee Raise","Core","Bodyweight"],
  ["Lying Leg Raise","Core","Bodyweight"],
  ["Dead Bug","Core","Bodyweight"],
  ["Bird Dog","Core","Bodyweight"],
  ["Mountain Climber","Core","Bodyweight"],
  ["Hollow Body Hold","Core","Bodyweight"],
  ["Ab Wheel Rollout","Core","Bodyweight"],
  ["Russian Twist","Core","Bodyweight"],
  ["Cable Crunch","Core","Cable"],
  ["Pallof Press","Core","Cable"],
  ["Cable Woodchop","Core","Cable"],
  ["Ab Crunch Machine","Core","Machine"],
  ["Rotary Torso Machine","Core","Machine"],
  ["Weighted Russian Twist","Core","Dumbbell"],
  ["Dumbbell Side Bend","Core","Dumbbell"],
  ["Weighted Sit-Up","Core","Dumbbell"],
  ["Treadmill Run","Cardio","Machine"],
  ["Stationary Bike","Cardio","Machine"],
  ["Elliptical","Cardio","Machine"],
  ["Rowing Machine","Cardio","Machine"],
  ["Stair Climber","Cardio","Machine"],
  ["Burpee","Cardio","Bodyweight"],
  ["Jumping Jack","Cardio","Bodyweight"],
  ["Jump Rope","Cardio","Bodyweight"],
  ["High Knees","Cardio","Bodyweight"],
  ["Box Jump","Cardio","Bodyweight"],
  ["Walking","Cardio","Bodyweight"],
  ["Running","Cardio","Bodyweight"],
].map(([name, muscle, equipment]) => ({
  id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/g, ''),
  name, muscle, equipment,
}))

export function totalVolume(session: WorkoutSession): number {
  return session.exercises.reduce((volume, item) =>
    volume + item.sets.filter(set => set.completed && isWorkingSet(set)).reduce(
      (value, set) => value + set.weight * set.reps, 0
    ), 0)
}

export function completedSets(session: WorkoutSession): number {
  return session.exercises.reduce((count, item) =>
    count + item.sets.filter(set => set.completed && isWorkingSet(set)).length, 0)
}

export function bestWeight(sessions: WorkoutSession[], exerciseId: string): number {
  return Math.max(0, ...sessions.flatMap(session => session.exercises
    .filter(item => item.exercise.id === exerciseId)
    .flatMap(item => item.sets.filter(set => set.completed && isWorkingSet(set)).map(set => set.weight))))
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
        t.reps >= 0 && Number.isFinite(t.weight) && t.weight >= 0 && typeof t.completed === 'boolean' &&
        (t.kind === undefined || t.kind === 'warmup' || t.kind === 'working')))) &&
    data.routines.every(r => r && typeof r.id === 'string' && typeof r.name === 'string' &&
      Array.isArray(r.exercises) && r.exercises.every(e => e && typeof e.id === 'string' &&
        typeof e.name === 'string'))
}
