import JSZip from 'jszip'
import { dayList, fmt, fmtTime, type Memory, sortActs, type Trip } from '../../shared'
import { fetchAsset } from '../../services'

/* Tiny IndexedDB blob store for journal photos (localStorage is too small) */
const db = new Promise<IDBDatabase>((res, rej) => {
  const r = indexedDB.open('yonder-memories', 1)
  r.onupgradeneeded = () => r.result.createObjectStore('photos')
  r.onsuccess = () => res(r.result)
  r.onerror = () => rej(r.error)
})
const tx = async <T,>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>) => {
  const s = (await db).transaction('photos', mode).objectStore('photos')
  return new Promise<T>((res, rej) => { const q = fn(s); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error) })
}
export const putPhoto = (id: string, b: Blob) => tx('readwrite', s => s.put(b, id))
export async function getPhoto(id: string, photoUrl?: string) {
  if (photoUrl) {
    const response = await fetchAsset(photoUrl)
    if (!response.ok) throw new Error(`Photo request failed (${response.status})`)
    return response.blob()
  }
  return tx<Blob | undefined>('readonly', s => s.get(id))
}
export const delPhotos = (ids: string[]) => Promise.all(ids.map(id => tx('readwrite', s => s.delete(id)))).catch(() => {})

export function photoIds(t: Trip) {
  return [...(t.memories ?? []), ...t.activities.flatMap(a => a.memories ?? [])].filter(m => m.kind === 'photo').map(m => m.id)
}

export function compress(file: File, max = 1600): Promise<Blob> {
  return new Promise((res, rej) => {
    const img = new Image()
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas'); c.width = img.width * k; c.height = img.height * k
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      c.toBlob(b => (b ? res(b) : rej()), 'image/jpeg', 0.85); URL.revokeObjectURL(img.src)
    }
    img.onerror = rej
    img.src = URL.createObjectURL(file)
  })
}

const safe = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 60) || 'untitled'
const stamp = (iso: string) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })

async function addFolder(zip: JSZip, header: string, mems: Memory[]) {
  const lines = [header, '='.repeat(header.length), '']
  let n = 0
  for (const m of mems) {
    if (m.kind === 'photo') {
      const b = await getPhoto(m.id, m.photoUrl)
      if (!b) continue
      const name = `photo-${String(++n).padStart(2, '0')}.jpg`
      zip.file(name, b)
      lines.push(`[${stamp(m.at)}] Photo ${name}${m.text ? ' - ' + m.text : ''}`)
    } else lines.push(`[${stamp(m.at)}]`, m.text, '')
  }
  zip.file('journal.txt', lines.join('\n'))
}

/* Builds Trip/Day N - Title/{photos, journal.txt}; optionally just one activity */
export async function downloadMemories(trip: Trip, onlyActivityId?: string) {
  const zip = new JSZip()
  const root = zip.folder(safe(trip.name))!
  const days = dayList(trip.start, trip.end)
  if (!onlyActivityId && trip.memories?.length) await addFolder(root.folder('00 Trip journal')!, `${trip.name} - Trip journal`, trip.memories)
  for (const a of sortActs(trip.activities)) {
    if (onlyActivityId && a.id !== onlyActivityId) continue
    if (!a.memories?.length) continue
    const d = days.indexOf(a.date) + 1
    const f = root.folder(`Day ${d} - ${safe(a.title)}`)!
    await addFolder(f, `${a.title} | ${fmt(a.date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} ${fmtTime(a.time)} | ${a.location}`, a.memories)
  }
  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const el = document.createElement('a')
  el.href = url
  el.download = `${safe(trip.name)}${onlyActivityId ? ' - ' + safe(trip.activities.find(a => a.id === onlyActivityId)?.title ?? '') : ''} memories.zip`
  el.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
