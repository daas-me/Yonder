import { type Cat, type Check, php, type Trip, uid } from '../../shared'

/* ---------- Heuristic itinerary parser ---------- */
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const MON = '(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?'
const pad = (n: number) => String(n).padStart(2, '0')
const thisYear = new Date().getFullYear()

function findDate(s: string): { iso: string; raw: string } | null {
  let m = s.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/)
  if (m) return { iso: `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`, raw: m[0] }
  m = s.match(new RegExp(`\\b${MON}\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?`, 'i'))
  if (m) return { iso: `${m[3] ?? thisYear}-${pad(MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()) + 1)}-${pad(+m[2])}`, raw: m[0] }
  m = s.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${MON}(?:,?\\s+(\\d{4}))?`, 'i'))
  if (m) return { iso: `${m[3] ?? thisYear}-${pad(MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()) + 1)}-${pad(+m[1])}`, raw: m[0] }
  m = s.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/)
  if (m) return { iso: `${m[3]}-${pad(+m[1])}-${pad(+m[2])}`, raw: m[0] }
  return null
}
function findTime(s: string): { t: string; raw: string } | null {
  let m = s.match(/\b(\d{1,2})(?::(\d{2}))?\s*([ap])\.?\s?m\.?(?![a-z])/i)
  if (m) { let h = +m[1] % 12; if (m[3].toLowerCase() === 'p') h += 12; return { t: `${pad(h)}:${m[2] ?? '00'}`, raw: m[0] } }
  m = s.match(/\b([01]?\d|2[0-3])[:.h]([0-5]\d)\b/)
  if (m) return { t: `${pad(+m[1])}:${m[2]}`, raw: m[0] }
  return null
}
function findCost(s: string): { v: number; raw: string } | null {
  const m = s.match(/(?:php|₱|\bp(?=\s?\d)|cost:?|budget:?)\s?([\d,]+(?:\.\d{1,2})?)|([\d,]+(?:\.\d{1,2})?)\s?(?:php|pesos)/i)
  if (!m) return null
  const v = parseFloat((m[1] ?? m[2]).replace(/,/g, ''))
  return isNaN(v) ? null : { v, raw: m[0] }
}
const KEYWORDS: [Cat, RegExp][] = [
  ['transport', /\b(bus|flight|fly|airport|ferry|boat|van|taxi|grab|train|drive|depart|arrive|transfer|jeep|tricycle)\b/i],
  ['lodging', /\b(hotel|check[- ]?in|check[- ]?out|hostel|resort|airbnb|inn|lodge|stay)\b/i],
  ['food', /\b(breakfast|lunch|dinner|brunch|cafe|coffee|restaurant|eat|food|snack|market)\b/i],
  ['shopping', /\b(shop|mall|souvenir|pasalubong|buy)\b/i],
  ['sights', /\b(tour|visit|park|museum|beach|hike|view|falls|church|island|temple|swim|explore|sunset|sunrise)\b/i],
]
const guessCat = (s: string): Cat => KEYWORDS.find(([, r]) => r.test(s))?.[0] ?? 'other'

export type Draft = { id: string; title: string; location: string; time: string; cost: number; notes: string; category: Cat; date?: string; day?: number; keep: boolean }
export type Parsed = { name: string; destination: string; description: string; firstDate?: string; acts: Draft[] }

export function parseItinerary(text: string): Parsed {
  const out: Parsed = { name: '', destination: '', description: '', acts: [] }
  let curDate: string | undefined, curDay: number | undefined
  let last: Draft | null = null
  const lines = text.split(/\r?\n/).map(l => l.replace(/^[\s•*·▪\-–>]+/, '').trim()).filter(Boolean)
  for (const line of lines) {
    const kv = line.match(/^(trip(?:\s*name)?|title|name|destination|where|location|description|summary|about)\s*[:\-–]\s*(.+)$/i)
    if (kv) {
      const k = kv[1].toLowerCase()
      if (/dest|where|location/.test(k)) out.destination ||= kv[2]
      else if (/desc|summ|about/.test(k)) out.description ||= kv[2]
      else out.name ||= kv[2]
      if (!/dest|where|location|desc|summ|about/.test(k)) continue
      if (!out.acts.length) continue
    }
    const dayM = line.match(/^day\s*(\d{1,2})\b/i)
    const d = findDate(line)
    const t = findTime(line)
    if (dayM || (d && !t)) {
      if (dayM) curDay = +dayM[1]
      if (d) { curDate = d.iso; out.firstDate ??= d.iso } else if (dayM) curDate = undefined
      last = null
      continue
    }
    if (t) {
      const c = findCost(line)
      let rest = line
      for (const raw of [t.raw, c?.raw, d?.raw]) if (raw) rest = rest.replace(raw, ' ')
      rest = rest.replace(/\(\s*\)/g, '').replace(/\s{2,}/g, ' ').replace(/^[\s\-–—:|,.]+|[\s\-–—:|,(]+$/g, '')
      const parts = rest.split(/\s+(?:at|@|in)\s+|\s+[-–—|]\s+|\s*\|\s*/i)
      const title = (parts[0] || 'Activity').slice(0, 120)
      const location = (parts[1] || out.destination || title).replace(/[\s,.;]+$/, '').slice(0, 160)
      const notes = parts.slice(2).join(' · ').slice(0, 1000)
      if (d) out.firstDate ??= d.iso
      last = { id: uid(), title, location, time: t.t, cost: c?.v ?? 0, notes, category: guessCat(line), date: d?.iso ?? curDate, day: curDay, keep: true }
      out.acts.push(last)
      continue
    }
    if (last && /^(note|notes|tip|bring|remember)\b/i.test(line)) { last.notes = (last.notes ? last.notes + ' · ' : '') + line.replace(/^(notes?|tip)\s*[:\-]\s*/i, ''); continue }
    if (!out.name && !out.acts.length) { out.name = line.slice(0, 120); continue }
    if (last && !findCost(line)) last.notes = ((last.notes ? last.notes + ' · ' : '') + line).slice(0, 1000)
  }
  return out
}

export const SAMPLE = `Trip: Siargao Surf Escape
Destination: General Luna, Siargao
Description: Four days of waves, islands and coconut roads.

Day 1 - Dec 12, 2026
6:30 AM Flight to Siargao - NAIA Terminal 3 - PHP 4500
11:00 AM Check-in at Kermit Resort - General Luna - PHP 3200
6:00 PM Dinner at Shaka Cafe - Cloud 9 - PHP 650

Day 2 - Dec 13, 2026
8:00 AM Island hopping tour @ Naked Island - ₱1,800
Notes: bring dry bag and reef-safe sunscreen
5:30 PM Sunset at Cloud 9 Boardwalk - Cloud 9

Day 3 - Dec 14, 2026
9:00 AM Surf lesson - Jacking Horse - PHP 1000
2:00 PM Magpupungko Rock Pools - Pilar - PHP 200

Day 4 - Dec 15, 2026
10:00 AM Pasalubong shopping - General Luna Market - PHP 800
1:30 PM Flight home - Sayak Airport`
