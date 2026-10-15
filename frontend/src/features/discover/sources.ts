import { type Cat, type Check, php } from '../../shared'

export type Kind = 'stay' | 'eat' | 'tour' | 'transport' | 'shop'
export const KINDS: Record<Kind, { label: string; cat: Cat; time: string }> = {
  stay: { label: 'Stay', cat: 'lodging', time: '14:00' },
  eat: { label: 'Eat & drink', cat: 'food', time: '12:00' },
  tour: { label: 'Tours & sights', cat: 'sights', time: '09:00' },
  transport: { label: 'Transport', cat: 'transport', time: '08:00' },
  shop: { label: 'Shopping', cat: 'shopping', time: '16:00' },
}

export type Place = {
  id: string; name: string; kind: Kind; type: string; source: 'Wikivoyage' | 'OpenStreetMap'
  price?: string; priceLow?: number; priceHigh?: number; priceIsEstimate?: boolean
  amenities: string[]; description?: string; address?: string; hours?: string; phone?: string; url?: string; lat?: number; lon?: number; ref?: string
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

/* ---------- OpenStreetMap (Overpass): real nearby places with tagged amenities ---------- */
const EST: Record<string, [number, number, string]> = {
  hostel: [500, 1200, '/night'], guest_house: [1000, 2500, '/night'], motel: [1200, 2500, '/night'], apartment: [1800, 4500, '/night'],
  chalet: [2500, 6000, '/night'], resort: [3500, 12000, '/night'], hotel: [2000, 5000, '/night'],
  restaurant: [300, 800, '/person'], cafe: [150, 400, '/person'], fast_food: [150, 300, '/person'], bar: [300, 900, '/person'], pub: [300, 900, '/person'],
  attraction: [0, 500, ' entry'], museum: [50, 300, ' entry'], viewpoint: [0, 100, ' entry'], zoo: [150, 600, ' entry'], theme_park: [500, 2000, ' entry'],
  travel_agency: [800, 3500, ' per tour'], tour: [800, 3500, ' per tour'],
  bus_station: [50, 800, ' fare'], ferry_terminal: [150, 1500, ' fare'], car_rental: [1500, 3500, '/day'], taxi: [100, 500, ' ride'], airport: [2000, 8000, ' fare'],
  mall: [0, 0, ''], marketplace: [0, 0, ''], gift: [0, 0, ''],
}
const HOTEL_STARS: Record<string, [number, number]> = { '1': [1200, 2200], '2': [1500, 3000], '3': [2500, 5000], '4': [4500, 9000], '5': [8000, 20000] }
function osmAmenities(t: Record<string, string>) {
  const a: string[] = []
  const yes = (k: string) => t[k] && t[k] !== 'no'
  if (t.stars) a.push(`${t.stars}-star`)
  if (yes('internet_access')) a.push(t['internet_access:fee'] === 'no' || t.internet_access === 'wlan' ? 'Free Wi-Fi' : 'Wi-Fi')
  if (yes('air_conditioning')) a.push('Air-con')
  if (yes('swimming_pool') || t.leisure === 'swimming_pool') a.push('Pool')
  if (t.rooms) a.push(`${t.rooms} rooms`)
  if (t.cuisine) a.push(t.cuisine.split(';').slice(0, 2).map(c => c.replace(/_/g, ' ')).join(', '))
  if (yes('outdoor_seating')) a.push('Outdoor seating')
  if (yes('takeaway')) a.push('Takeaway')
  if (yes('delivery')) a.push('Delivery')
  if (t['diet:vegetarian'] && t['diet:vegetarian'] !== 'no') a.push('Vegetarian options')
  if (t.wheelchair === 'yes') a.push('Wheelchair accessible')
  if (t['payment:credit_cards'] === 'yes' || t['payment:cards'] === 'yes') a.push('Cards accepted')
  if (yes('parking')) a.push('Parking')
  if (t.fee === 'no') a.push('Free entry')
  return a
}
export async function fromOSM(lat: number, lon: number): Promise<Place[]> {
  const r = 6000
  const q = `[out:json][timeout:25];(
    nwr(around:${r},${lat},${lon})["tourism"~"^(hotel|hostel|guest_house|motel|resort|apartment|chalet)$"]["name"];
    nwr(around:${r},${lat},${lon})["leisure"="resort"]["name"];
    nwr(around:${r},${lat},${lon})["amenity"~"^(restaurant|cafe|fast_food|bar|pub)$"]["name"];
    nwr(around:${r},${lat},${lon})["tourism"~"^(attraction|museum|viewpoint|zoo|theme_park)$"]["name"];
    nwr(around:${r},${lat},${lon})["shop"~"^(travel_agency|mall|gift)$"]["name"];
    nwr(around:${r},${lat},${lon})["office"="travel_agent"]["name"];
    nwr(around:${r},${lat},${lon})["amenity"~"^(bus_station|ferry_terminal|car_rental|taxi|marketplace)$"]["name"];
    nwr(around:${r * 4},${lat},${lon})["aeroway"="aerodrome"]["iata"]["name"];
  );out center tags 250;`
  const res = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
  if (!res.ok) throw new Error('overpass')
  const j = await res.json()
  return (j.elements ?? []).map((e: { id: number; type: string; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags: Record<string, string> }): Place => {
    const t = e.tags
    const type = t.tourism || (t.leisure === 'resort' ? 'resort' : '') || t.amenity || (t.office ? 'tour' : '') || t.shop || (t.aeroway ? 'airport' : '') || 'place'
    const kind: Kind = /hotel|hostel|guest|motel|resort|apartment|chalet/.test(type) ? 'stay' : /restaurant|cafe|fast_food|bar|pub/.test(type) ? 'eat'
      : /bus|ferry|car_rental|taxi|airport/.test(type) ? 'transport' : /mall|gift|marketplace/.test(type) ? 'shop' : 'tour'
    let [lo, hi, unit] = EST[type] ?? [0, 0, '']
    if (type === 'hotel' && t.stars && HOTEL_STARS[t.stars[0]]) [lo, hi] = HOTEL_STARS[t.stars[0]]
    const tagged = t.charge || t.fee && /\d/.test(t.fee) ? t.charge || t.fee : undefined
    const pr = tagged ? parsePrice(tagged) : {}
    return {
      id: `osm-${e.type}-${e.id}`, name: t.name, kind, type: type.replace(/_/g, ' '), source: 'OpenStreetMap',
      price: tagged ?? (hi ? `${php(lo).replace('.00', '')} – ${php(hi).replace('.00', '')}${unit}` : undefined),
      priceLow: pr.low ?? (hi ? lo : undefined), priceHigh: pr.high ?? (hi ? hi : undefined), priceIsEstimate: !tagged && !!hi,
      amenities: osmAmenities(t), description: t.description || t['description:en'],
      address: [t['addr:housenumber'], t['addr:street'], t['addr:city'] || t['addr:municipality']].filter(Boolean).join(' ') || undefined,
      hours: t.opening_hours, phone: t.phone || t['contact:phone'], url: t.website || t['contact:website'] || t['contact:facebook'],
      lat: e.lat ?? e.center?.lat, lon: e.lon ?? e.center?.lon,
    }
  })
}
