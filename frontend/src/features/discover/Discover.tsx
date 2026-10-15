import { useEffect, useMemo, useState } from 'react'
import { geocode } from '../../services'
import { type Activity, CATS, PlusIcon, type Trip } from '../../shared'
import { fromOSM, fromWikivoyage, type Kind, KINDS, type Place } from './sources'

const cache = new Map<string, { places: Place[]; page?: string; errors: string[] }>()

export default function Discover({ trip, fresh, added, onAdd }: { trip: Trip; fresh?: boolean; added: Set<string>; onAdd: (init: Partial<Activity>) => void }) {
  const [data, setData] = useState<{ places: Place[]; page?: string; errors: string[] } | null>(cache.get(trip.destination) ?? null)
  const [kind, setKind] = useState<Kind | 'all'>('all')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<'relevance' | 'low' | 'high'>('relevance')
  const [withPrice, setWithPrice] = useState(false)
  const [limit, setLimit] = useState(24)

  useEffect(() => {
    if (cache.has(trip.destination)) return
    let live = true
    ;(async () => {
      const errors: string[] = []
      const geo = trip.geo ?? (await geocode(trip.destination)) ?? (await geocode(trip.destination.split(',')[0]))
      const [wv, osm] = await Promise.all([
        fromWikivoyage(trip.destination).catch(() => { errors.push('Wikivoyage'); return { places: [] as Place[], page: undefined } }),
        geo ? fromOSM(geo.lat, geo.lon).catch(() => { errors.push('OpenStreetMap'); return [] as Place[] }) : Promise.resolve([] as Place[]),
      ])
      // Guide listings first; drop OSM duplicates of the same name
      const seen = new Set(wv.places.map(p => p.name.toLowerCase()))
      const res = { places: [...wv.places, ...osm.filter(p => !seen.has(p.name.toLowerCase()))], page: wv.page, errors }
      cache.set(trip.destination, res)
      if (live) setData(res)
    })()
    return () => { live = false }
  }, [trip.destination, trip.geo])

  const list = useMemo(() => {
    if (!data) return []
    let l = data.places.filter(p => (kind === 'all' || p.kind === kind) && (!withPrice || p.priceHigh != null) && (p.name + ' ' + (p.description ?? '') + ' ' + p.amenities.join(' ')).toLowerCase().includes(q.toLowerCase()))
    const score = (p: Place) => (p.source === 'Wikivoyage' ? 10 : 0) + p.amenities.length + (p.url ? 2 : 0) + (p.description ? 2 : 0) + (p.price ? 1 : 0)
    if (sort === 'relevance') l = [...l].sort((a, b) => score(b) - score(a))
    else l = [...l].filter(p => p.priceLow != null).sort((a, b) => (sort === 'low' ? a.priceLow! - b.priceLow! : b.priceHigh! - a.priceHigh!))
    return l
  }, [data, kind, q, sort, withPrice])
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: data?.places.length ?? 0 }
    data?.places.forEach(p => (c[p.kind] = (c[p.kind] ?? 0) + 1))
    return c
  }, [data])

  const add = (p: Place) => {
    const k = KINDS[p.kind]
    onAdd({
      title: (p.kind === 'stay' ? 'Check-in: ' : '') + p.name.slice(0, 110), category: k.cat, time: k.time,
      location: (p.address || p.name).slice(0, 160), cost: p.priceLow ?? 0, lat: p.lat, lon: p.lon,
      notes: [p.price && `Price: ${p.price}${p.priceIsEstimate ? ' (typical range)' : ''}`, p.amenities.length && p.amenities.join(', '), p.hours && `Hours: ${p.hours}`, p.phone, p.url].filter(Boolean).join(' · ').slice(0, 1000),
    })
  }
  const blog = (p: Place) => `https://www.google.com/search?q=${encodeURIComponent(`"${p.name}" ${trip.destination.split(',')[0]} travel blog review`)}`
  const chip = (k: Kind | 'all', label: string) => (
    <button key={k} onClick={() => { setKind(k); setLimit(24) }} className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${kind === k ? 'bg-pine text-white' : 'bg-card text-ink/70 ring-1 ring-line hover:ring-pine'}`}>
      {label} <span className="opacity-60">{counts[k] ?? 0}</span>
    </button>
  )

  return (
    <div>
      {fresh && (
        <div className="topo mb-6 rounded-2xl bg-pine p-6 text-white">
          <div className="text-xs font-semibold uppercase tracking-[.3em] text-white/60">Your trip is ready</div>
          <h3 className="mt-1 font-display text-2xl font-semibold">Here's what's around {trip.destination.split(',')[0]}</h3>
          <p className="mt-1 max-w-2xl text-sm text-white/75">Places to stay, eat, visit and get around, from travel guides and maps. Add anything to your itinerary in one click, then adjust the day and time.</p>
        </div>
      )}
      <div className="mb-4 flex flex-wrap gap-2">{chip('all', 'All')}{(Object.keys(KINDS) as Kind[]).map(k => chip(k, KINDS[k].label))}</div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <input className="input max-w-xs" placeholder="Search names, amenities, cuisine…" value={q} onChange={e => setQ(e.target.value)} />
        <select className="input w-auto" value={sort} onChange={e => setSort(e.target.value as typeof sort)}>
          <option value="relevance">Most detailed first</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-ink/70"><input type="checkbox" className="accent-[#17675b]" checked={withPrice} onChange={e => setWithPrice(e.target.checked)} />With price only</label>
      </div>

      {!data ? (
        <div className="grid gap-4 sm:grid-cols-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-44 animate-pulse rounded-2xl bg-card ring-1 ring-line" />)}</div>
      ) : !data.places.length ? (
        <div className="rounded-2xl border border-dashed border-line2 p-10 text-center text-sm text-ink/60">
          No places found for "{trip.destination}". Try a more specific destination, like "Baguio, Benguet" or "El Nido, Palawan".
          {data.errors.length > 0 && <div className="mt-2 text-clay">Couldn't reach: {data.errors.join(', ')}.</div>}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {list.slice(0, limit).map(p => {
              const isAdded = added.has(p.name.toLowerCase()) || added.has(('Check-in: ' + p.name).toLowerCase())
              return (
                <article key={p.id} className="flex flex-col rounded-2xl bg-card p-5 ring-1 ring-line">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider">
                        <span className="rounded-full px-2 py-0.5 text-white" style={{ background: CATS[KINDS[p.kind].cat].color }}>{KINDS[p.kind].label}</span>
                        <span className="text-ink/45">{p.type}</span>
                      </div>
                      <h4 className="font-display text-lg font-semibold leading-snug">{p.name}</h4>
                      {p.address && <p className="truncate text-xs text-ink/55">{p.address}</p>}
                    </div>
                    {p.price && (
                      <div className="shrink-0 text-right">
                        <div className="max-w-[140px] text-sm font-semibold text-pine">{p.price.length > 40 ? p.price.slice(0, 40) + '…' : p.price}</div>
                        <div className="text-[10px] text-ink/45">{p.priceIsEstimate ? 'typical range' : p.source === 'Wikivoyage' ? 'guide price' : 'listed'}</div>
                      </div>
                    )}
                  </div>
                  {p.description && <p className="mt-2 line-clamp-3 text-sm text-ink/70">{p.description}</p>}
                  {(p.amenities.length > 0 || p.hours) && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {p.amenities.slice(0, 6).map(a => <span key={a} className="rounded-md bg-moss px-2 py-0.5 text-xs capitalize text-ink/75">{a}</span>)}
                      {p.hours && <span className="rounded-md bg-sand px-2 py-0.5 text-xs text-ink/60 ring-1 ring-line" title={p.hours}>{p.hours.length > 28 ? p.hours.slice(0, 28) + '…' : p.hours}</span>}
                    </div>
                  )}
                  <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-4 text-xs">
                    {p.url && <a className="font-semibold text-pine hover:underline" href={p.url} target="_blank" rel="noreferrer">Website</a>}
                    {p.lat != null && <a className="font-semibold text-pine hover:underline" href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=17/${p.lat}/${p.lon}`} target="_blank" rel="noreferrer">Map</a>}
                    <a className="font-semibold text-pine hover:underline" href={blog(p)} target="_blank" rel="noreferrer">Blog reviews</a>
                    {p.ref && <a className="text-ink/50 hover:underline" href={p.ref} target="_blank" rel="noreferrer">Wikivoyage guide</a>}
                    <span className="ml-auto text-[10px] text-ink/40">via {p.source}</span>
                  </div>
                  <button disabled={isAdded} onClick={() => add(p)} className={`btn mt-3 inline-flex w-full items-center justify-center gap-2 ${isAdded ? 'bg-moss text-pine' : 'btn-primary'}`}>{!isAdded && <PlusIcon />}{isAdded ? 'Added to itinerary' : 'Add to itinerary'}</button>
                </article>
              )
            })}
          </div>
          {list.length === 0 && <p className="py-10 text-center text-sm text-ink/60">Nothing matches these filters.</p>}
          {list.length > limit && <div className="mt-6 text-center"><button className="btn btn-ghost ring-1 ring-line" onClick={() => setLimit(l => l + 24)}>Show more ({list.length - limit})</button></div>}
          <p className="mt-8 rounded-xl bg-moss/50 p-4 text-xs leading-relaxed text-ink/60">
            <b>About these suggestions.</b> Listings come from the <a className="underline" href={data.page ? `https://en.wikivoyage.org/wiki/${encodeURIComponent(data.page.replace(/ /g, '_'))}` : 'https://en.wikivoyage.org'} target="_blank" rel="noreferrer">Wikivoyage{data.page ? ` "${data.page}"` : ''}</a> travel guide and from <a className="underline" href="https://www.openstreetmap.org" target="_blank" rel="noreferrer">OpenStreetMap</a>, both written by volunteers.
            "Guide price" is quoted from Wikivoyage. "Typical range" is Yonder's estimate for that type of place in the Philippines, not a live rate. "Blog reviews" searches the web for travel bloggers who have written about the place. Always check prices and availability before you book.
            {data.errors.length > 0 && <span className="text-clay"> Couldn't reach {data.errors.join(', ')} right now.</span>}
          </p>
        </>
      )}
    </div>
  )
}
