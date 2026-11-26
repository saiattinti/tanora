import type { WorkoutSession } from './workoutTypes'
import { validWorkoutData } from './workoutTypes'

// Drafts are browser-local and scoped to the signed-in user or guest.
export type WorkoutDraft = {
  version: 1
  session: WorkoutSession
  editingId: string | null
  savedAt: number
}

export function workoutDraftKey(userId: string | null): string {
  return 'tanora-workout-draft-v1-' + (userId ?? 'guest')
}

export function readWorkoutDraft(userId: string | null): WorkoutDraft | null {
  try {
    const raw = localStorage.getItem(workoutDraftKey(userId))
    if (!raw) return null
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object') return null
    const candidate = value as Partial<WorkoutDraft>
    if (candidate.version !== 1 || !candidate.session ||
      (candidate.editingId !== null && typeof candidate.editingId !== 'string') ||
      typeof candidate.savedAt !== 'number') return null
    const wrap = { history: [candidate.session], routines: [] }
    if (!validWorkoutData(wrap)) return null
    return candidate as WorkoutDraft
  } catch {
    return null
  }
}

export function storeWorkoutDraft(userId: string | null, draft: WorkoutDraft): void {
  localStorage.setItem(workoutDraftKey(userId), JSON.stringify(draft))
}

export function removeWorkoutDraft(userId: string | null): void {
  localStorage.removeItem(workoutDraftKey(userId))
}
