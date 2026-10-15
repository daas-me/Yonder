import { useEffect, useMemo, useRef, useState } from 'react'
import { geocode, resizeImage, shareLink, type Weather, weatherFor, weatherLabel } from '../../services'
import { type Activity, type Cat, catOf, CATS, type Check, Confirm, dayList, daysBetween, fmt, fmtTime, type Memory, Modal, php, sortActs, total, totalActual, type Trip, uid } from '../../shared'
import { BudgetModal, BudgetTiles, LimitBar } from '../budget'
import { Discover } from '../discover'
import { MapSnap, MapView } from '../map'
import { delPhotos, downloadMemories, MemoriesModal } from '../memories'
import { Tripboard } from '../tripboard'
import { CoverPicker, DuplicateForm, TripForm } from '../trips'
import { WeatherIcon } from '../weather'
import { ActivityForm } from './ActivityForm'

type Props = { trip: Trip; fresh?: boolean; readOnly?: boolean; onBack: () => void; onUpdate: (t: Trip) => void; onDelete: () => void; onDuplicate: (t: Trip) => void; toast: (m: string) => void }

export default function TripView({ trip, fresh, readOnly, onBack, onUpdate, onDelete, onDuplicate, toast }: Props) {
  const [editTrip, setEditTrip] = useState(false)
  const [actForm, setActForm] = useState<{ act?: Activity; init?: Partial<Activity> } | null>(null)
  const [confirm, setConfirm] = useState<null | { kind: 'trip' } | { kind: 'act'; id: string }>(null)
  const [mode, setMode] = useState<'timeline' | 'board' | 'map' | 'discover'>(fresh && !readOnly ? 'discover' : 'timeline')
  const [share, setShare] = useState('')
  const [dup, setDup] = useState(false)
  const [weather, setWeather] = useState<Record<string, Weather>>({})
  const [locating, setLocating] = useState(false)
  const [budgetOpen, setBudgetOpen] = useState(false)
  const [coverOpen, setCoverOpen] = useState(false)
  const [journal, setJournal] = useState<null | 'trip' | string>(null)
  const tripRef = useRef(trip)
  tripRef.current = trip

  const sorted = useMemo(() => sortActs(trip.activities), [trip.activities])
  const days = useMemo(() => dayList(trip.start, trip.end).map(date => ({ date, acts: sorted.filter(a => a.date === date) })), [sorted, trip.start, trip.end])
  const numbered = useMemo(() => sorted.map((a, i) => ({ ...a, n: i + 1 })), [sorted])
  const sum = total(trip)
  const spent = totalActual(trip)
  const logged = trip.activities.filter(a => a.actual != null)
  const today = new Date().toISOString().slice(0, 10)
  const status = today < trip.start ? `Starts in ${daysBetween(today, trip.start) - 1} days` : today > trip.end ? 'Completed' : 'Happening now'
  const byCat = (Object.keys(CATS) as Cat[]).map(c => ({ c, v: trip.activities.filter(a => catOf(a) === c).reduce((s, a) => s + a.cost, 0) + (trip.extras ?? []).filter(e => e.category === c).reduce((s, e) => s + e.est, 0) })).filter(x => x.v > 0)

  // Weather: geocode destination once, then load per-day weather
  useEffect(() => {
    let live = true
    ;(async () => {
      let geo = trip.geo
      if (!geo) {
        geo = (await geocode(trip.destination)) ?? (await geocode(trip.destination.split(',')[0])) ?? undefined
        if (geo && live && !readOnly) onUpdate({ ...tripRef.current, geo })
      }
      if (geo) { const w = await weatherFor(geo, trip.start, trip.end); if (live) setWeather(w) }
    })()
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.destination, trip.start, trip.end, trip.geo?.lat])

  const patchAct = (id: string, p: Partial<Activity>) => onUpdate({ ...tripRef.current, activities: tripRef.current.activities.map(a => (a.id === id ? { ...a, ...p } : a)) })
  const locate = async (a: Activity) => {
    const g = (await geocode(`${a.location}, ${trip.destination}`)) ?? (await geocode(a.location))
    if (g) patchAct(a.id, g)
    return !!g
  }
  const locateAll = async () => {
    setLocating(true)
    let miss = 0
    for (const a of tripRef.current.activities.filter(a => a.lat == null)) {
      if (!(await locate(a))) miss++
      await new Promise(r => setTimeout(r, 1100)) // respect Nominatim rate limit
    }
    setLocating(false)
    toast(miss ? `${miss} location(s) could not be found` : 'All activities pinned')
  }
  const attach = async (a: Activity, f?: File) => {
    if (!f) return
    try { patchAct(a.id, { image: await resizeImage(f) }); toast('Photo attached') } catch { toast('Could not read that image') }
  }
  const memCount = (trip.memories?.length ?? 0) + trip.activities.reduce((s, a) => s + (a.memories?.length ?? 0), 0)
  const openAct = journal && journal !== 'trip' ? trip.activities.find(a => a.id === journal) : undefined
  const list = trip.checklist ?? []
  const setList = (c: Check[]) => onUpdate({ ...trip, checklist: c })
  const [item, setItem] = useState('')

  const W = ({ d }: { d: string }) => {
    const w = weather[d]
    if (!w) return null
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-moss px-2.5 py-0.5 text-xs text-ink/80" title={w.kind === 'lastyear' ? 'Same day last year (forecast opens ~16 days before)' : w.kind === 'history' ? 'Recorded weather' : 'Forecast'}>
        <WeatherIcon code={w.code} size={14} /> {weatherLabel(w.code)} {Math.round(w.max)}°/{Math.round(w.min)}°
        {w.kind === 'lastyear' && <span className="text-ink/50">· last yr</span>}
        {w.rain != null && <span className="text-ink/50">· {w.rain}% rain</span>}
      </span>
    )
  }

  const tab = (k: typeof mode, label: string) => (
    <button key={k} onClick={() => setMode(k)} className={`rounded-md px-3 py-1.5 text-sm font-semibold ${mode === k ? 'bg-card text-pine shadow-sm' : 'text-ink/60'}`}>{label}</button>
  )
  const heroBtn = 'btn bg-white/15 text-white hover:bg-white/25 px-3'

  return (
    <div>
      {!readOnly && <button className="no-print btn btn-ghost -ml-3 mb-4 text-ink/60" onClick={onBack}>← All trips</button>}
      <div className="topo relative mb-8 overflow-hidden rounded-3xl p-8 text-white sm:p-10 print:rounded-none print:!bg-none print:p-0 print:text-black" style={{ backgroundColor: trip.color ?? '#2f5d4e' }}>
        {trip.cover && <><img src={trip.cover} alt="" className="no-print absolute inset-0 h-full w-full object-cover" /><div className="no-print absolute inset-0" style={{ background: `linear-gradient(100deg, ${trip.color ?? '#2f5d4e'} 15%, ${trip.color ?? '#2f5d4e'}99 55%, transparent)` }} /></>}
        <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="no-print mb-3 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">{readOnly ? 'Shared itinerary · view only' : status}</span>
            <p className="text-xs uppercase tracking-[.3em] opacity-60">{trip.destination}</p>
            <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">{trip.name}</h1>
            <p className="mt-2 opacity-75">{fmt(trip.start, { weekday: 'short', month: 'long', day: 'numeric' })} — {fmt(trip.end, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}</p>
            {trip.tagline && <p className="mt-3 font-hand text-3xl leading-none opacity-90">{trip.tagline}</p>}
            {trip.description && <p className="mt-4 max-w-xl text-sm opacity-70">{trip.description}</p>}
          </div>
          <div className="no-print flex flex-wrap gap-2">
            {!readOnly && <button className={heroBtn} onClick={() => setEditTrip(true)}>Edit</button>}
            {!readOnly && <button className={heroBtn} onClick={() => setCoverOpen(true)}>Cover</button>}
            {!readOnly && <button className={heroBtn} onClick={() => setDup(true)}>Use as template</button>}
            {!readOnly && <button className={heroBtn} onClick={() => { const l = shareLink(trip); setShare(l); navigator.clipboard?.writeText(l).then(() => toast('Share link copied'), () => {}) }}>Share</button>}
            <button className={heroBtn} onClick={() => { setMode(m => (m === 'map' ? 'timeline' : m)); setTimeout(() => window.print(), 50) }}>Print / PDF</button>
            {!readOnly && <button className="btn bg-white/15 px-3 text-white hover:bg-clay" onClick={() => setConfirm({ kind: 'trip' })}>Delete</button>}
          </div>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4 border-t border-white/20 pt-6 sm:grid-cols-4 print:border-black/20">
          <div><div className="text-xs opacity-60">Days</div><div className="font-display text-2xl">{days.length}</div></div>
          <div><div className="text-xs opacity-60">Activities</div><div className="font-display text-2xl">{trip.activities.length}</div></div>
          <div><div className="text-xs opacity-60">Budget{trip.budget ? ` · limit ${php(trip.budget)}` : ''}</div><div className="font-display text-2xl">{php(sum)}</div></div>
          <div><div className="text-xs opacity-60">Actual spending</div><div className="font-display text-2xl">{logged.length || (trip.extras ?? []).some(e => e.actual != null) ? php(spent) : '—'}</div></div>
        </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_300px] print:block">
        <div className="min-w-0">
          <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex rounded-lg bg-moss p-1">{tab('timeline', 'Timeline')}{tab('board', 'Tripboard')}{tab('map', 'Map')}{!readOnly && tab('discover', 'Discover')}</div>
            <div className="flex gap-2">
              {!readOnly && (mode === 'board' || mode === 'map') && <button className="btn btn-ghost ring-1 ring-line" disabled={locating} onClick={locateAll}>{locating ? 'Pinning…' : 'Pin all locations'}</button>}
              {!readOnly && <button className="btn btn-primary" onClick={() => setActForm({})}>+ Add activity</button>}
            </div>
          </div>

          {mode === 'timeline' && (
            <div className="space-y-8">
              {days.map((d, i) => (
                <section key={d.date} className="break-inside-avoid">
                  <div className="mb-3 flex flex-wrap items-baseline gap-3">
                    <span className="font-display text-lg font-semibold text-clay">Day {i + 1}</span>
                    <span className="text-sm text-ink/60">{fmt(d.date, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                    <W d={d.date} />
                  </div>
                  {d.acts.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-line2 px-4 py-3 text-sm text-ink/50">Nothing planned — a free day.</p>
                  ) : (
                    <ol className="relative ml-2 space-y-3 border-l-2 border-moss pl-6">
                      {d.acts.map(a => (
                        <li key={a.id} className="relative break-inside-avoid">
                          <span className="absolute -left-[33px] top-4 h-3.5 w-3.5 rounded-full border-2 border-sand bg-pine" />
                          <div className="group flex flex-wrap items-start justify-between gap-3 rounded-xl bg-card p-4 ring-1 ring-line">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 text-xs font-semibold"><span className="text-pine">{fmtTime(a.time)}</span><span className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider text-white" style={{ background: CATS[catOf(a)].color }}>{CATS[catOf(a)].label}</span></div>
                              <div className="font-semibold">{a.title}</div>
                              <div className="text-sm text-ink/60">{a.location}</div>
                              {a.notes && <div className="mt-1 text-xs italic text-ink/50">{a.notes}</div>}
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">{php(a.cost)}</div>
                              {a.actual != null && <div className={`text-xs ${a.actual > a.cost ? 'text-clay' : 'text-pine'}`}>Spent {php(a.actual)}</div>}
                              {!readOnly && (
                                <div className="no-print mt-1 flex gap-1 opacity-70 group-hover:opacity-100">
                                  <button className="btn btn-ghost px-2 py-1 text-xs" onClick={() => setActForm({ act: a })}>Edit</button>
                                  <button className="btn btn-danger px-2 py-1 text-xs" onClick={() => setConfirm({ kind: 'act', id: a.id })}>Delete</button>
                                </div>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
              ))}
            </div>
          )}

          {mode === 'board' && <Tripboard trip={trip} days={days} weather={weather} readOnly={readOnly} memCount={memCount} onOpenJournal={setJournal} onAttach={attach} onLocate={locate} onPatch={patchAct} toast={toast} />}

          {mode === 'discover' && <Discover trip={trip} fresh={fresh} added={new Set(trip.activities.map(a => a.title.toLowerCase()))} onAdd={init => setActForm({ init })} />}

          {mode === 'map' && (
            <div>
              <MapView acts={numbered} center={trip.geo} />
              <ol className="mt-4 grid gap-2 sm:grid-cols-2">
                {numbered.map(a => (
                  <li key={a.id} className="flex items-center gap-3 rounded-lg bg-card px-3 py-2 text-sm ring-1 ring-line">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ background: CATS[catOf(a)].color }}>{a.n}</span>
                    <span className="min-w-0 flex-1 truncate">{a.title} <span className="text-ink/50">· {a.location}</span></span>
                    {a.lat == null && !readOnly && <button className="text-xs font-semibold text-pine" onClick={async () => toast((await locate(a)) ? 'Pinned' : 'Location not found')}>Pin</button>}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        <aside className="h-fit space-y-6 lg:sticky lg:top-24 print:mt-8">
          <div className="rounded-2xl bg-card p-6 ring-1 ring-line break-inside-avoid">
            <div className="flex items-baseline justify-between"><h3 className="font-display text-xl font-semibold">Budget</h3>
              <button className="no-print text-xs font-semibold text-pine hover:underline" onClick={() => setBudgetOpen(true)}>Expand table →</button></div>
            <div className="mt-4 space-y-3"><BudgetTiles t={trip} compact /><LimitBar t={trip} /></div>
            {byCat.length > 0 && (
              <div className="mt-5">
                <div className="flex h-3 overflow-hidden rounded-full">{byCat.map(x => <div key={x.c} style={{ width: `${(x.v / sum) * 100}%`, background: CATS[x.c].color }} />)}</div>
                <div className="mt-3 space-y-1.5 text-sm">{byCat.map(x => (
                  <div key={x.c} className="flex items-center justify-between"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: CATS[x.c].color }} />{x.c === 'other' ? 'Misc / Other' : CATS[x.c].label}</span><span>{php(x.v)}</span></div>
                ))}</div>
              </div>
            )}
            <button className="no-print btn btn-ghost mt-5 w-full ring-1 ring-line" onClick={() => setBudgetOpen(true)}>View full breakdown</button>
            {!readOnly && <p className="mt-3 text-xs text-ink/50">Log actual spending on each activity, or on misc items in the breakdown.</p>}
          </div>
          <div className="rounded-2xl bg-card p-6 ring-1 ring-line break-inside-avoid">
            <div className="flex items-baseline justify-between"><h3 className="font-display text-xl font-semibold">Packing list</h3><span className="text-xs text-ink/50">{list.filter(c => c.done).length}/{list.length} packed</span></div>
            <ul className="mt-4 space-y-1">
              {list.map(c => (
                <li key={c.id} className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-sand">
                  <input type="checkbox" disabled={readOnly} className="h-4 w-4 accent-[#2f5d4e]" checked={c.done} onChange={() => setList(list.map(x => (x.id === c.id ? { ...x, done: !x.done } : x)))} />
                  <span className={`flex-1 text-sm ${c.done ? 'text-ink/40 line-through' : ''}`}>{c.text}</span>
                  {!readOnly && <button className="no-print text-xs text-clay opacity-0 group-hover:opacity-100" aria-label="Remove" onClick={() => setList(list.filter(x => x.id !== c.id))}>✕</button>}
                </li>
              ))}
              {list.length === 0 && <li className="text-sm text-ink/50">No items yet.</li>}
            </ul>
            {!readOnly && (
              <form className="no-print mt-3 flex gap-2" onSubmit={e => { e.preventDefault(); if (item.trim()) { setList([...list, { id: uid(), text: item.trim().slice(0, 120), done: false }]); setItem('') } }}>
                <input className="input" placeholder="Add an item" value={item} onChange={e => setItem(e.target.value)} />
                <button className="btn btn-primary px-3">Add</button>
              </form>
            )}
          </div>
        </aside>
      </div>

      {editTrip && <TripForm trip={trip} onClose={() => setEditTrip(false)} onSave={v => { onUpdate({ ...tripRef.current, ...v, geo: v.destination === trip.destination ? trip.geo : undefined }); setEditTrip(false); toast('Trip updated') }} />}
      {actForm && <ActivityForm trip={trip} act={actForm.act} initial={actForm.init} onClose={() => setActForm(null)} onSave={a => {
        const prev = actForm.act
        const moved = prev && prev.location !== a.location
        const next = moved ? { ...a, lat: undefined, lon: undefined } : a
        onUpdate({ ...trip, activities: prev ? trip.activities.map(x => (x.id === a.id ? next : x)) : [...trip.activities, next] })
        setActForm(null); toast(prev ? 'Activity updated' : 'Activity added')
      }} />}
      {confirm && <Confirm
        text={confirm.kind === 'trip' ? `"${trip.name}" and all ${trip.activities.length} activities will be permanently deleted.` : 'This activity will be removed from your itinerary.'}
        onNo={() => setConfirm(null)}
        onYes={() => {
          if (confirm.kind === 'trip') onDelete()
          else {
            const gone = trip.activities.find(a => a.id === confirm.id)
            delPhotos((gone?.memories ?? []).filter(m => m.kind === 'photo').map(m => m.id))
            onUpdate({ ...trip, activities: trip.activities.filter(a => a.id !== confirm.id) }); toast('Activity deleted')
          }
          setConfirm(null)
        }} />}
      {share && (
        <Modal title="Share itinerary" onClose={() => setShare('')}>
          <p className="mb-4 text-sm text-ink/70">Anyone with this link can view a read-only copy of this trip as it is right now. Photos aren't included; map pins are. Make a new link after you change the trip.</p>
          <div className="flex gap-2">
            <input className="input" readOnly value={share} onFocus={e => e.target.select()} />
            <button className="btn btn-primary" onClick={() => navigator.clipboard?.writeText(share).then(() => toast('Link copied'), () => toast('Copy failed — select and copy manually'))}>Copy</button>
          </div>
        </Modal>
      )}
      {journal && (journal === 'trip' || openAct) && (
        <MemoriesModal
          key={journal}
          readOnly={readOnly}
          title={openAct ? openAct.title : trip.name}
          subtitle={openAct ? `${fmt(openAct.date, { weekday: 'long', month: 'long', day: 'numeric' })} · ${fmtTime(openAct.time)} · ${openAct.location}` : `${trip.destination} · whole-trip journal`}
          cover={openAct ? (openAct.image ? <img src={openAct.image} alt="" className="h-56 w-full object-cover" /> : openAct.lat != null ? <MapSnap lat={openAct.lat} lon={openAct.lon!} height={224} /> : <div className="h-56 bg-[repeating-linear-gradient(45deg,#f1ece0_0_10px,#ebe4d4_10px_20px)]" />)
            : trip.geo ? <MapSnap lat={trip.geo.lat} lon={trip.geo.lon} zoom={11} height={224} /> : <div className="h-56 bg-moss" />}
          memories={(openAct ? openAct.memories : trip.memories) ?? []}
          onChange={(m: Memory[]) => (openAct ? patchAct(openAct.id, { memories: m }) : onUpdate({ ...tripRef.current, memories: m }))}
          onDownload={() => downloadMemories(trip, openAct?.id)}
          onClose={() => setJournal(null)}
          toast={toast}
        />
      )}
      {coverOpen && <CoverPicker trip={trip} onClose={() => setCoverOpen(false)} onSave={p => { onUpdate({ ...tripRef.current, ...p }); setCoverOpen(false); toast('Cover updated') }} />}
      {budgetOpen && <BudgetModal trip={trip} readOnly={readOnly} onUpdate={onUpdate} onClose={() => setBudgetOpen(false)} />}
      {dup && <DuplicateForm trip={trip} onClose={() => setDup(false)} onSave={t => { setDup(false); onDuplicate(t) }} />}
    </div>
  )
}
