import { type Activity, type Trip } from './model'

export const uid = () => Math.random().toString(36).slice(2, 10)
export const load = <T,>(k: string, d: T): T => { try { return JSON.parse(localStorage.getItem(k) || '') as T } catch { return d } }
export const php = (n: number) => 'PHP ' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const fmt = (d: string, o: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) => new Date(d + 'T00:00').toLocaleDateString('en-US', o)
export const fmtTime = (t: string) => { const [h, m] = t.split(':').map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}` }
/* Cancelled activities free their budget back into headroom */
export const planned = (a: Activity) => (a.status === 'cancelled' ? 0 : a.cost)
export const total = (t: Trip) => t.activities.reduce((s, a) => s + planned(a), 0) + (t.extras ?? []).reduce((s, e) => s + e.est, 0)
export const sortActs = (a: Activity[]) => [...a].sort((x, y) => x.date.localeCompare(y.date) || x.time.localeCompare(y.time) || x.id.localeCompare(y.id))
export const totalActual = (t: Trip) => t.activities.reduce((s, a) => s + (a.actual ?? 0), 0) + (t.extras ?? []).reduce((s, e) => s + (e.actual ?? 0), 0)
export const daysBetween = (a: string, b: string) => Math.round((+new Date(b) - +new Date(a)) / 864e5) + 1

export const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const addDays = (iso: string, n: number) => { const d = new Date(iso + 'T00:00'); d.setDate(d.getDate() + n); return isoOf(d) }
export const dayList = (start: string, end: string) => { const o: string[] = []; for (let d = start; d <= end && o.length < 366; d = addDays(d, 1)) o.push(d); return o }
