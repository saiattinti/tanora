import { supabase } from './supabase'
import { emptyWorkoutData, validWorkoutData } from './workoutTypes'
import type { WorkoutData } from './workoutTypes'

const guestKey = 'tanora-workout-data-guest'

export async function loadWorkoutData(userId: string | null): Promise<WorkoutData> {
  if (!userId) {
    try {
      const raw = localStorage.getItem(guestKey)
      const parsed: unknown = raw ? JSON.parse(raw) : null
      return validWorkoutData(parsed) ? parsed : emptyWorkoutData
    } catch {
      return emptyWorkoutData
    }
  }

  const { data, error } = await supabase
    .from('workout_data')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return validWorkoutData(data?.data) ? data.data : emptyWorkoutData
}

export async function saveWorkoutData(userId: string | null, value: WorkoutData): Promise<void> {
  if (!validWorkoutData(value)) throw new Error('Invalid workout data.')
  if (!userId) {
    localStorage.setItem(guestKey, JSON.stringify(value))
    return
  }
  const { error } = await supabase
    .from('workout_data')
    .upsert({ user_id: userId, data: value, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' })
  if (error) throw new Error(error.message)
}
