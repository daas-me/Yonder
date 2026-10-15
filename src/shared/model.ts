export type User = { id: string; name: string; email: string; password: string; homeCity: string; createdAt: string }
export type Cat = 'transport' | 'food' | 'lodging' | 'sights' | 'shopping' | 'other'
export const CATS: Record<Cat, { label: string; color: string }> = {
  transport: { label: 'Transport', color: '#2f6f9f' }, food: { label: 'Food', color: '#ec6a3c' }, lodging: { label: 'Lodging', color: '#7a5cc4' },
  sights: { label: 'Sights', color: '#17675b' }, shopping: { label: 'Shopping', color: '#c99a2e' }, other: { label: 'Other', color: '#6b6b6b' },
}
export const catOf = (a: Activity): Cat => a.category ?? 'other'
/* Journal entry; photo blobs live in IndexedDB under `id` */
export type Memory = { id: string; kind: 'photo' | 'note'; text: string; at: string; edited?: string }
export type Extra = { id: string; label: string; category: Cat; est: number; actual?: number }
export const THEMES = ['#17675b', '#ec6a3c', '#2f6f9f', '#7a5cc4', '#c2507a', '#b8862b', '#3c4a46', '#0f8a8a']
export type Check = { id: string; text: string; done: boolean }
export type Activity = { id: string; category?: Cat; title: string; date: string; time: string; location: string; cost: number; actual?: number; status?: ActStatus; notes: string; memories?: Memory[]; image?: string; lat?: number; lon?: number }
export type Trip = { id: string; ownerId: string; name: string; destination: string; start: string; end: string; description: string; budget?: number; checklist?: Check[]; geo?: { lat: number; lon: number }; memories?: Memory[]; extras?: Extra[]; color?: string; cover?: string; tagline?: string; activities: Activity[] }
export type ActStatus = 'ontime' | 'delayed' | 'cancelled'
export const STATUS: Record<ActStatus, { label: string; color: string }> = { ontime: { label: 'On time', color: '#17675b' }, delayed: { label: 'Delayed', color: '#c98a1a' }, cancelled: { label: 'Cancelled', color: '#c2453a' } }
