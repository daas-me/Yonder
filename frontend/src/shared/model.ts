export type User = { id: string; name: string; email: string; homeCity: string; createdAt: string; photoUrl?: string; avatarColor?: string }
export type Cat = 'transport' | 'food' | 'lodging' | 'sights' | 'shopping' | 'other'
export const CATS: Record<Cat, { label: string; color: string }> = {
  transport: { label: 'Transport', color: '#2f6f9f' }, food: { label: 'Food', color: '#ec6a3c' }, lodging: { label: 'Lodging', color: '#7a5cc4' },
  sights: { label: 'Sights', color: '#17675b' }, shopping: { label: 'Shopping', color: '#c99a2e' }, other: { label: 'Other', color: '#6b6b6b' },
}
export const catOf = (a: Activity): Cat => a.category ?? 'other'
export type Memory = { id: string; kind: 'photo' | 'note'; text: string; at: string; edited?: string; photoUrl?: string }
export type Extra = { id: string; label: string; category: Cat; est: number; actual?: number }
export const THEMES = ['#17675b', '#ec6a3c', '#2f6f9f', '#7a5cc4', '#c2507a', '#b8862b', '#3c4a46', '#0f8a8a']
export type Check = { id: string; text: string; done: boolean }
export type TripTraveler = { id: string; name: string }
export type CostShareMode = 'equal' | 'own'
export type NotifyPrefs = { tripSoon: boolean; soonDays: number; packing: boolean; budget: boolean; budgetAt: number; logSpending: boolean; browser: boolean }
export const CURRENCIES = [
  { code: 'PHP', name: 'Philippine peso' }, { code: 'USD', name: 'US dollar' }, { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British pound' }, { code: 'JPY', name: 'Japanese yen' }, { code: 'AUD', name: 'Australian dollar' },
  { code: 'CAD', name: 'Canadian dollar' }, { code: 'SGD', name: 'Singapore dollar' }, { code: 'HKD', name: 'Hong Kong dollar' },
  { code: 'NZD', name: 'New Zealand dollar' }, { code: 'CHF', name: 'Swiss franc' }, { code: 'CNY', name: 'Chinese yuan' },
  { code: 'KRW', name: 'South Korean won' }, { code: 'THB', name: 'Thai baht' }, { code: 'MYR', name: 'Malaysian ringgit' },
  { code: 'IDR', name: 'Indonesian rupiah' }, { code: 'INR', name: 'Indian rupee' }, { code: 'ZAR', name: 'South African rand' },
  { code: 'SEK', name: 'Swedish krona' }, { code: 'NOK', name: 'Norwegian krone' }, { code: 'DKK', name: 'Danish krone' },
  { code: 'MXN', name: 'Mexican peso' }, { code: 'BRL', name: 'Brazilian real' }, { code: 'TRY', name: 'Turkish lira' },
  { code: 'PLN', name: 'Polish zloty' }, { code: 'CZK', name: 'Czech koruna' }, { code: 'ILS', name: 'Israeli new shekel' },
  { code: 'HUF', name: 'Hungarian forint' }, { code: 'ISK', name: 'Icelandic krona' }, { code: 'RON', name: 'Romanian leu' },
] as const
export type CurrencyCode = (typeof CURRENCIES)[number]['code']
export type Prefs = {
  clock: '12' | '24'
  temp: 'c' | 'f'
  currency: CurrencyCode
  tripType: 'solo' | 'group'
  pax: number
  companions: string[]
  splitRules: Partial<Record<Cat, CostShareMode>>
  packing: string[]
  dailyBudget?: number
  notify: NotifyPrefs
}
export type ThemePref = 'light' | 'dark' | 'system'
export const DEFAULT_NOTIFY: NotifyPrefs = { tripSoon: true, soonDays: 3, packing: true, budget: true, budgetAt: 90, logSpending: true, browser: false }
export const DEFAULT_PREFS: Prefs = { clock: '12', temp: 'c', currency: 'PHP', tripType: 'solo', pax: 2, companions: [], splitRules: {}, packing: [], notify: DEFAULT_NOTIFY }
export const prefsOf = (prefs?: Partial<Prefs> | null): Prefs => ({
  ...DEFAULT_PREFS,
  ...prefs,
  currency: CURRENCIES.find(({ code }) => code === prefs?.currency)?.code ?? DEFAULT_PREFS.currency,
  companions: prefs?.companions ?? DEFAULT_PREFS.companions,
  splitRules: prefs?.splitRules ?? DEFAULT_PREFS.splitRules,
  packing: prefs?.packing ?? DEFAULT_PREFS.packing,
  notify: { ...DEFAULT_NOTIFY, ...prefs?.notify },
})
export type Activity = { id: string; category?: Cat; title: string; date: string; time: string; location: string; cost: number; actual?: number; status?: ActStatus; notes: string; memories?: Memory[]; image?: string; lat?: number; lon?: number; shareMode?: CostShareMode; sharedTravelerIds?: string[]; personalAmounts?: Record<string, number> }
export type Trip = { id: string; ownerId: string; name: string; destination: string; start: string; end: string; description: string; budget?: number; checklist?: Check[]; geo?: { lat: number; lon: number }; memories?: Memory[]; extras?: Extra[]; color?: string; cover?: string; tagline?: string; groupTrip?: boolean; travelers?: TripTraveler[]; categoryShareModes?: Partial<Record<Cat, CostShareMode>>; activities: Activity[] }
export type ActStatus = 'ontime' | 'delayed' | 'cancelled'
export const STATUS: Record<ActStatus, { label: string; color: string }> = { ontime: { label: 'On time', color: '#17675b' }, delayed: { label: 'Delayed', color: '#c98a1a' }, cancelled: { label: 'Cancelled', color: '#c2453a' } }
