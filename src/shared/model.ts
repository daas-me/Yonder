export type User = { id: string; name: string; email: string; password: string; homeCity: string; createdAt: string }
export type Cat = 'transport' | 'food' | 'lodging' | 'sights' | 'shopping' | 'other'
export const CATS: Record<Cat, { label: string; color: string }> = {
  transport: { label: 'Transport', color: '#3d5a80' }, food: { label: 'Food', color: '#c8623d' }, lodging: { label: 'Lodging', color: '#7b5ea7' },
  sights: { label: 'Sights', color: '#2f5d4e' }, shopping: { label: 'Shopping', color: '#d49a2a' }, other: { label: 'Other', color: '#8a8577' },
}
export const catOf = (a: Activity): Cat => a.category ?? 'other'
/* Journal entry; photo blobs live in IndexedDB under `id` */
export type Memory = { id: string; kind: 'photo' | 'note'; text: string; at: string; edited?: string }
export type Extra = { id: string; label: string; category: Cat; est: number; actual?: number }
export const THEMES = ['#2f5d4e', '#c8623d', '#3d5a80', '#7b5ea7', '#b0812d', '#1f6f8b', '#a23e48', '#3b3b3b']
export type Check = { id: string; text: string; done: boolean }
export type Activity = { id: string; category?: Cat; title: string; date: string; time: string; location: string; cost: number; actual?: number; notes: string; memories?: Memory[]; image?: string; lat?: number; lon?: number }
export type Trip = { id: string; ownerId: string; name: string; destination: string; start: string; end: string; description: string; budget?: number; checklist?: Check[]; geo?: { lat: number; lon: number }; memories?: Memory[]; extras?: Extra[]; color?: string; cover?: string; tagline?: string; activities: Activity[] }
