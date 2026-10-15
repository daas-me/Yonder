import { type Cat, type Check } from '../../shared'

export type Kind = 'stay' | 'eat' | 'tour' | 'transport' | 'shop'
export const KINDS: Record<Kind, { label: string; cat: Cat; time: string }> = {
  stay: { label: 'Stay', cat: 'lodging', time: '14:00' },
  eat: { label: 'Eat & drink', cat: 'food', time: '12:00' },
  tour: { label: 'Tours & sights', cat: 'sights', time: '09:00' },
  transport: { label: 'Transport', cat: 'transport', time: '08:00' },
  shop: { label: 'Shopping', cat: 'shopping', time: '16:00' },
}

export type Place = {
  id: string; name: string; kind: Kind; type: string; source: 'Wikivoyage' | 'Google Places'
  price?: string; priceLow?: number; priceHigh?: number; priceIsEstimate?: boolean
  amenities: string[]; description?: string; address?: string; hours?: string; phone?: string; url?: string; lat?: number; lon?: number; rating?: number; reviewCount?: number; ref?: string
}

/* ---------- Wikivoyage: community travel guide listings with real guide prices ---------- */
const clean = (s = '') => s
  .replace(/\{\{\s*(?:PHP|₱)\s*\|([^{}|]*)[^{}]*\}\}/gi, '₱$1').replace(/\{\{\s*(?:USD|US\$)\s*\|([^{}|]*)[^{}]*\}\}/gi, 'US$$$1')
  .replace(/\{\{[^{}]*\}\}/g, '').replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1').replace(/\[https?:\S+\s([^\]]+)\]/g, '$1')
  .replace(/\[https?:\S+\]/g, '').replace(/'{2,}/g, '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()

function splitParams(body: string) {
  const out: Record<string, string> = {}
  let depth = 0, cur = ''
  const parts: string[] = []
  for (let i = 0; i < body.length; i++) {
    const two = body.slice(i, i + 2)
    if (two === '{{' || two === '[[') { depth++; cur += two; i++; continue }
    if ((two === '}}' || two === ']]') && depth) { depth--; cur += two; i++; continue }
    if (body[i] === '|' && !depth) { parts.push(cur); cur = ''; continue }
    cur += body[i]
  }
  parts.push(cur)
  for (const p of parts) { const k = p.indexOf('='); if (k > 0) out[p.slice(0, k).trim().toLowerCase()] = p.slice(k + 1).trim() }
  return out
}

export function parsePrice(s?: string): { low?: number; high?: number } {
  if (!s) return {}
  const usd = /(?:US\$|USD|\$)/i.test(s) && !/(₱|PHP|\bP\s?\d)/i.test(s)
  const nums = [...s.replace(/,/g, '').matchAll(/(\d+(?:\.\d+)?)\s*(k)?/gi)].map(m => +m[1] * (m[2] ? 1000 : 1)).filter(n => n > 0 && n < 5e6)
  if (!nums.length) return /free/i.test(s) ? { low: 0, high: 0 } : {}
  const k = usd ? 57 : 1 // rough USD→PHP so totals stay in pesos
  return { low: Math.round(Math.min(...nums) * k), high: Math.round(Math.max(...nums) * k) }
}

export async function fromWikivoyage(dest: string): Promise<{ places: Place[]; page?: string }> {
  const api = 'https://en.wikivoyage.org/w/api.php?format=json&origin=*&'
  const names = [dest, dest.split(',')[0]]
  let title: string | undefined
  for (const n of names) {
    const j = await (await fetch(api + 'action=query&list=search&srlimit=1&srsearch=' + encodeURIComponent(n))).json().catch(() => null)
    title = j?.query?.search?.[0]?.title
    if (title) break
  }
  if (!title) return { places: [] }
  const j = await (await fetch(api + 'action=parse&prop=wikitext&redirects=1&page=' + encodeURIComponent(title))).json().catch(() => null)
  const text: string = j?.parse?.wikitext?.['*'] ?? ''
  const map: Record<string, Kind> = { sleep: 'stay', eat: 'eat', drink: 'eat', see: 'tour', do: 'tour', buy: 'shop', go: 'transport' }
  const places: Place[] = []
  const re = /\{\{\s*(see|do|buy|eat|drink|sleep|go|listing)\s*\n?\|/gi
  let m: RegExpExecArray | null
  let section: Kind = 'tour'
  while ((m = re.exec(text))) {
    // Track the latest ==Section== header to classify generic {{listing}} templates
    const before = text.slice(0, m.index)
    const h = [...before.matchAll(/^==\s*(Get in|Get around|See|Do|Buy|Eat|Drink|Sleep)\s*==/gim)].pop()?.[1]?.toLowerCase()
    if (h) section = h.startsWith('get') ? 'transport' : (map[h] ?? 'tour')
    let depth = 1, i = m.index + 2
    while (i < text.length && depth) { if (text.startsWith('{{', i)) { depth++; i += 2 } else if (text.startsWith('}}', i)) { depth--; i += 2 } else i++ }
    const p = splitParams(text.slice(m.index + m[0].length, i - 2))
    const name = clean(p.name)
    if (!name) continue
    const t = m[1].toLowerCase()
    const pr = parsePrice(clean(p.price))
    places.push({
      id: 'wv-' + places.length, name, kind: t === 'listing' ? section : map[t], type: t === 'listing' ? 'listing' : t, source: 'Wikivoyage',
      price: clean(p.price) || undefined, priceLow: pr.low, priceHigh: pr.high,
      amenities: [p.checkin && `Check-in ${clean(p.checkin)}`, p.checkout && `Check-out ${clean(p.checkout)}`].filter(Boolean) as string[],
      description: clean(p.content || p.description).slice(0, 360) || undefined, address: clean(p.address) || undefined, hours: clean(p.hours) || undefined,
      phone: clean(p.phone) || undefined, url: /^https?:/.test(p.url ?? '') ? p.url : undefined,
      lat: +p.lat || undefined, lon: +(p.long || p.lon) || undefined, ref: `https://en.wikivoyage.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
    })
  }
  return { places, page: title }
}
