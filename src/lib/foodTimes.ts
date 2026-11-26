// Diary times are stored as instants, never inferred from old record creation times.
export function localClock(): string {
  const date = new Date()
  return String(date.getHours()).padStart(2,'0') + ':' + String(date.getMinutes()).padStart(2,'0')
}
export function timeFromInstant(iso?: string | null): string {
  if (!iso) return localClock()
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return localClock()
  return String(date.getHours()).padStart(2,'0') + ':' + String(date.getMinutes()).padStart(2,'0')
}
export function instantFor(date: string, clock: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(clock)) {
    throw new Error('Choose a valid food date and time.')
  }
  const result = new Date(date + 'T' + clock + ':00')
  if (Number.isNaN(result.getTime()) || [
    result.getFullYear(),String(result.getMonth()+1).padStart(2,'0'),String(result.getDate()).padStart(2,'0')
  ].join('-') !== date) throw new Error('Invalid date/time in your timezone.')
  return result.toISOString()
}
export function readableTime(instant?: string | null): string {
  if (!instant) return 'Time not recorded'
  const value=new Date(instant)
  return Number.isNaN(value.getTime()) ? 'Time not recorded' :
    value.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})
}
export function sortDiaryByTime<T extends { id:string, eatenAt?:string|null }>(entries:T[]):T[]{
  return [...entries].sort((a,b) => {
    if (!a.eatenAt && !b.eatenAt) return a.id.localeCompare(b.id)
    if (!a.eatenAt) return 1
    if (!b.eatenAt) return -1
    return a.eatenAt.localeCompare(b.eatenAt) || a.id.localeCompare(b.id)
  })
}
