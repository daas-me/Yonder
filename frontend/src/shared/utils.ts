import { type Activity, type Trip } from './model'

const TRIP_COVER_THEMES: Record<string, string> = {
  '#17675b': 'pine',
  '#ec6a3c': 'sunset',
  '#2f6f9f': 'sea',
  '#7a5cc4': 'violet',
  '#c2507a': 'rose',
  '#b8862b': 'gold',
  '#3c4a46': 'slate',
  '#0f8a8a': 'lagoon',
}
const COASTAL_DESTINATION = /\b(coast|coastal|beach|island|islands|bay|cove|lagoon|shore|palawan|siargao|boracay|el nido|coron|cebu|bohol|samar|camiguin|la union)\b/i

export function defaultTripCover(color?: string, destination?: string) {
  const theme = TRIP_COVER_THEMES[color?.toLowerCase() ?? '']
  const landscape = COASTAL_DESTINATION.test(destination ?? '') ? 'coast' : 'mountains'
  return theme ? `/covers/yonder-${theme}-${landscape}.svg` : `/covers/yonder-default-cover${landscape === 'coast' ? '-coast' : ''}.svg`
}

export const uid = () => Math.random().toString(36).slice(2, 10)
export const load = <T,>(k: string, d: T): T => { try { return JSON.parse(localStorage.getItem(k) || '') as T } catch { return d } }
export const MAX_PAX = 99
export const display = { clock24: false, fahrenheit: false, currency: 'PHP', currencyRate: 1 }
export const currencyCode = () => display.currency
export const currencySymbol = () => new Intl.NumberFormat('en-US', { style: 'currency', currency: display.currency, currencyDisplay: 'narrowSymbol' }).formatToParts(0).find(part => part.type === 'currency')?.value ?? display.currency
export const fromBaseCurrency = (amount: number) => amount * display.currencyRate
export const toBaseCurrency = (amount: number) => Math.round((amount / display.currencyRate) * 100) / 100
export const formatAmount = (amount: number, fractionDigits = 2) => fromBaseCurrency(amount).toLocaleString('en-US', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })
export const php = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: display.currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(fromBaseCurrency(n))
export const phpCompact = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: display.currency, maximumFractionDigits: 0 }).format(fromBaseCurrency(n))
export const fmt = (d: string, o: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) => new Date(d + 'T00:00').toLocaleDateString('en-US', o)
export const fmtTime = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return display.clock24 ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` : `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}
export const fmtTemp = (c: number) => `${Math.round(display.fahrenheit ? c * 9 / 5 + 32 : c)}°`
/* Cancelled activities free their budget back into headroom */
export const planned = (a: Activity) => (a.status === 'cancelled' ? 0 : a.cost)
export const total = (t: Trip) => t.activities.reduce((s, a) => s + planned(a), 0) + (t.extras ?? []).reduce((s, e) => s + e.est, 0)
export const sortActs = (a: Activity[]) => [...a].sort((x, y) => x.date.localeCompare(y.date) || x.time.localeCompare(y.time) || x.id.localeCompare(y.id))
export const totalActual = (t: Trip) => t.activities.reduce((s, a) => s + (a.actual ?? 0), 0) + (t.extras ?? []).reduce((s, e) => s + (e.actual ?? 0), 0)
export const daysBetween = (a: string, b: string) => Math.round((+new Date(b) - +new Date(a)) / 864e5) + 1

export const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const addDays = (iso: string, n: number) => { const d = new Date(iso + 'T00:00'); d.setDate(d.getDate() + n); return isoOf(d) }
export const dayList = (start: string, end: string) => { const o: string[] = []; for (let d = start; d <= end && o.length < 366; d = addDays(d, 1)) o.push(d); return o }
