import { useState } from 'react'
import { assetUrl } from '../../services'
import { defaultTripCover, daysBetween, fmt, php, phpCompact, PlusIcon, Tag, total, totalActual, type Trip, type User } from '../../shared'
import CoverPicker from './CoverPicker'

/* Short city name for ticket labels, e.g. "Baguio City, Benguet" -> "Baguio City" */
export const city = (place: string) => (place || '').split(',')[0].trim() || 'Home'
/* (legacy) three-letter code */
export const code = (place: string) => {
  const w = (place || '???').split(',')[0].trim().replace(/[^a-zA-Z ]/g, '')
  const parts = w.split(/\s+/).filter(Boolean)
  return (parts.length >= 3 ? parts.map(p => p[0]).join('') : w.replace(/\s+/g, '')).slice(0, 3).toUpperCase().padEnd(3, 'X')
}

function Flap({ value }: { value: string }) {
  return <span className="flex gap-1">{value.split('').map((c, i) => <span key={i} className="flap inline-flex h-12 w-9 items-center justify-center text-2xl font-medium sm:h-14 sm:w-10 sm:text-3xl">{c}</span>)}</span>
}

export default function TripList({ trips, user, onOpen, onNew, onImport, onCover }: { trips: Trip[]; user: User; onOpen: (id: string) => void; onNew: () => void; onImport: () => void; onCover: (id: string, p: Pick<Trip, 'cover' | 'color'>) => void }) {
  const today = new Date().toISOString().slice(0, 10)
  const upcoming = trips.filter(t => t.end >= today).length
  const budget = trips.reduce((s, t) => s + total(t), 0)
  const [coverFor, setCoverFor] = useState<Trip | null>(null)
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<'all' | 'upcoming' | 'past'>('all')
  const [view, setViewRaw] = useState<'list' | 'grid'>(() => (localStorage.getItem('yonder.view') === 'grid' ? 'grid' : 'list'))
  const setView = (v: 'list' | 'grid') => { setViewRaw(v); localStorage.setItem('yonder.view', v) }
  const shown = trips.filter(t => (tab === 'all' || (tab === 'upcoming' ? t.end >= today : t.end < today)) && (t.name + ' ' + t.destination).toLowerCase().includes(q.toLowerCase()))
  const next = [...trips].filter(t => t.start >= today).sort((a, b) => a.start.localeCompare(b.start))[0]
  const from = city(user.homeCity || 'Home')
  const status = (t: Trip) => (t.end < today ? ['Arrived', 'bg-ink/8 text-ink/60'] : t.start <= today ? ['In progress', 'bg-clay/12 text-clay'] : daysBetween(today, t.start) - 1 <= 7 ? ['This week', 'bg-[#e8f3d6] text-[#4a6a1f] dark:bg-[#2c3a1c] dark:text-[#b9d98a]'] : ['Upcoming', 'bg-pine/10 text-pine'])

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-ink/55">Good to see you, {user.name.split(' ')[0]}</p>
          <h1 className="mt-1 font-display text-4xl sm:text-5xl">Your trips</h1>
        </div>
        <div className="flex gap-2"><button className="btn btn-ghost ring-1 ring-line" onClick={onImport}>Import</button><button className="btn btn-primary inline-flex items-center justify-center gap-2" onClick={onNew}><PlusIcon />New trip</button></div>
      </div>

      {/* Countdown + stats */}
      <div className="mb-10 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {next ? (
          <button onClick={() => onOpen(next.id)} className="soft group flex flex-wrap items-center gap-6 rounded-2xl border border-line bg-card p-5 text-left transition hover:border-line2">
            <div>
              <Tag className="text-ink/50">Next departure in</Tag>
              <div className="mt-2 flex items-end gap-3"><Flap value={String(Math.max(0, daysBetween(today, next.start) - 1)).padStart(2, '0')} /><span className="mono pb-1 text-xs font-medium uppercase">days</span></div>
            </div>
            <div className="min-w-0 flex-1 border-l border-dashed border-line2 pl-6">
              <div className="flex min-w-0 items-center gap-3 font-display text-xl"><span className="truncate">{from}</span><svg width="28" height="14" viewBox="0 0 28 14" className="text-clay"><path d="M0 7h24m-6-6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" fill="none" /></svg><span className="truncate">{city(next.destination)}</span></div>
              <div className="truncate font-semibold">{next.name}</div>
              <Tag className="text-ink/50">{next.destination} · {fmt(next.start, { weekday: 'short', month: 'short', day: 'numeric' })}</Tag>
            </div>
          </button>
        ) : (
          <div className="flex items-center rounded-2xl border border-dashed border-line2 p-5"><Tag className="text-ink/50">No upcoming departures. Plan one and the countdown starts.</Tag></div>
        )}
        <div className="soft grid grid-cols-3 overflow-hidden rounded-2xl border border-line bg-card">
          {[['Trips', String(trips.length)], ['Upcoming', String(upcoming)], ['Budgeted', phpCompact(budget)]].map(([l, v], i) => (
            <div key={l} className={`flex flex-col justify-between p-4 ${i ? 'border-l border-line' : ''} `}>
              <Tag className="opacity-60">{l}</Tag>
              <div className="mt-3 truncate font-display text-2xl">{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      {trips.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg bg-ink/5 p-1">
            {(['all', 'upcoming', 'past'] as const).map(k => (
              <button key={k} onClick={() => setTab(k)} className={`rounded-md px-3.5 py-1.5 text-sm capitalize transition ${tab === k ? 'bg-card font-medium text-ink shadow-sm' : 'text-ink/55 hover:text-ink'}`}>{k}</button>
            ))}
          </div>
          <input className="input max-w-xs" placeholder="Search trips or destinations" value={q} onChange={e => setQ(e.target.value)} />
          <Tag className="ml-auto text-ink/50">{shown.length} of {trips.length} shown</Tag>
          <div className="flex rounded-lg bg-ink/5 p-1" role="group" aria-label="Layout">
            {([['list', <path key="l" d="M4 6h16M4 12h16M4 18h16" />], ['grid', <path key="g" d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />]] as const).map(([k, icon]) => (
              <button key={k} onClick={() => setView(k)} aria-label={`${k} view`} aria-pressed={view === k} className={`rounded-md px-2.5 py-1.5 transition ${view === k ? 'bg-card text-ink shadow-sm' : 'text-ink/50 hover:text-ink'}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">{icon}</svg>
              </button>
            ))}
          </div>
        </div>
      )}
      {trips.length > 0 && shown.length === 0 && (
        <section className="mx-auto flex max-w-2xl flex-col items-center rounded-3xl border border-line bg-card/75 px-6 py-8 text-center shadow-sm sm:px-10 sm:py-10">
          <TripEmptyIllustration />
          <p className="mono mt-5 text-[10px] uppercase tracking-[.22em] text-ink/45">No matches this time</p>
          <h2 className="mt-2 font-display text-2xl sm:text-3xl">No trips match these filters</h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink/60">Try another search or switch back to all your trips.</p>
          <button className="btn btn-primary mt-5" onClick={() => { setQ(''); setTab('all') }}>Show all trips</button>
        </section>
      )}

      {trips.length === 0 ? (
        <section className="mx-auto flex max-w-3xl flex-col items-center overflow-hidden rounded-3xl border border-line bg-card/75 px-6 py-8 text-center shadow-sm sm:px-10 sm:py-10">
          <TripEmptyIllustration />
          <p className="mono mt-5 text-[10px] uppercase tracking-[.22em] text-ink/45">Your next story starts here</p>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl">No trips yet</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-ink/60">Start with a blank itinerary or bring in a plan you already have. Your trips will find a home here.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button className="btn btn-primary inline-flex items-center gap-2" onClick={onNew}><PlusIcon />Plan your first trip</button>
            <button className="btn btn-ghost ring-1 ring-line" onClick={onImport}>Import an itinerary</button>
          </div>
        </section>
      ) : (
        /* Boarding passes */
        <div className={view === 'grid' ? 'grid gap-5 sm:grid-cols-2 xl:grid-cols-3' : 'space-y-5'}>
          {[...shown].sort((a, b) => a.start.localeCompare(b.start)).map((t, i) => {
            const [st, stCls] = status(t)
            const color = t.color ?? ['#17675b', '#ec6a3c', '#3c4a46'][i % 3]
            const over = t.budget && total(t) > t.budget
            const tripDays = daysBetween(t.start, t.end)
            const tripNights = Math.max(0, tripDays - 1)
            if (view === 'grid') return (
              <div key={t.id} role="button" tabIndex={0} onClick={() => onOpen(t.id)} onKeyDown={e => e.key === 'Enter' && onOpen(t.id)}
                className="soft group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-line bg-card text-left transition hover:border-line2">
                <div className="relative h-36 shrink-0" style={{ backgroundColor: color }}>
                  <img src={assetUrl(t.cover ?? defaultTripCover(t.color ?? color, t.destination))} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                  <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-medium text-[#1c1c1e]"><span aria-hidden="true">{tripDays}d · {tripNights}n</span><span className="sr-only">{tripDays} {tripDays === 1 ? 'day' : 'days'}, {tripNights} {tripNights === 1 ? 'night' : 'nights'}</span></span>
                  <span className={`absolute right-3 top-3 rounded-full px-2.5 py-0.5 text-[11px] font-medium backdrop-blur ${stCls} bg-white/90`}>{st}</span>
                  <div className="absolute bottom-3 left-3 right-3 text-white"><h3 className="truncate text-base font-semibold">{t.name}</h3>{t.tagline && <p className="truncate text-xs opacity-85">{t.tagline}</p>}</div>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 truncate font-display text-base">{from}</div>
                    <div className="h-px min-w-6 flex-1 bg-[repeating-linear-gradient(90deg,var(--color-line2)_0_6px,transparent_6px_10px)]" />
                    <div className="min-w-0 truncate font-display text-base text-pine">{city(t.destination)}</div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-dashed border-line2 pt-3">
                    <div><Tag className="text-ink/45">Depart</Tag><div className="text-sm font-semibold tabular-nums">{fmt(t.start, { day: '2-digit', month: 'short' }).toUpperCase()}</div></div>
                    <div><Tag className="text-ink/45">Stops</Tag><div className="text-sm font-semibold tabular-nums">{t.activities.length}</div></div>
                    <div className="text-right"><Tag className="text-ink/45">Budget</Tag>                    <div className={`text-sm font-semibold tabular-nums ${over ? 'text-clay' : ''}`}>{phpCompact(total(t))}</div></div>
                  </div>
                  <div className="barcode mt-4 h-5 w-full" aria-hidden />
                </div>
                <button onClick={e => { e.stopPropagation(); setCoverFor(t) }} className="absolute right-3 top-11 rounded-full bg-black/45 px-2.5 py-0.5 text-[11px] text-white opacity-0 backdrop-blur transition group-hover:opacity-100 focus:opacity-100">{t.cover ? 'Change cover' : 'Add cover'}</button>
              </div>
            )
            return (
              <div key={t.id} role="button" tabIndex={0} onClick={() => onOpen(t.id)} onKeyDown={e => e.key === 'Enter' && onOpen(t.id)}
                className="soft group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-line bg-card text-left transition hover:border-line2 sm:flex-row">
                {/* Cover stub */}
                <div className="relative h-32 shrink-0 sm:h-auto sm:w-48" style={{ backgroundColor: color }}>
                  <img src={assetUrl(t.cover ?? defaultTripCover(t.color ?? color, t.destination))} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-medium text-[#1c1c1e]"><span aria-hidden="true">{tripDays}d · {tripNights}n</span><span className="sr-only">{tripDays} {tripDays === 1 ? 'day' : 'days'}, {tripNights} {tripNights === 1 ? 'night' : 'nights'}</span></span>
                  {t.tagline && <span className="absolute bottom-3 left-3 right-3 line-clamp-2 text-sm font-semibold leading-snug text-white">{t.tagline}</span>}
                  <button onClick={e => { e.stopPropagation(); setCoverFor(t) }} className="absolute right-3 top-3 rounded-full bg-black/45 px-2.5 py-0.5 text-[11px] text-white opacity-0 backdrop-blur transition group-hover:opacity-100 focus:opacity-100">{t.cover ? 'Change cover' : 'Add cover'}</button>
                </div>

                {/* Main ticket */}
                <div className="min-w-0 flex-1 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <Tag className="text-ink/50">Boarding pass · YND-{t.id.slice(0, 4).toUpperCase()}</Tag>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${stCls}`}>{st}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-4">
                    <div className="min-w-0"><Tag className="text-ink/45">From</Tag><div className="truncate font-display text-xl leading-tight">{from}</div></div>
                    <div className="relative h-px min-w-12 flex-1 bg-[repeating-linear-gradient(90deg,var(--color-line2)_0_6px,transparent_6px_10px)]"><svg width="22" height="22" viewBox="0 0 24 24" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-0.5 text-clay transition group-hover:translate-x-4" fill="currentColor"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" transform="rotate(90 12 12)" /></svg></div>
                    <div className="min-w-0 text-right"><Tag className="text-ink/45">To</Tag><div className="truncate font-display text-xl leading-tight text-pine">{city(t.destination)}</div></div>
                  </div>
                  <h3 className="mt-3 truncate text-base font-semibold">{t.name}</h3>
                  <p className="truncate text-sm text-ink/60">{t.destination}</p>
                  <div className="mt-4 grid grid-cols-3 gap-3 border-t border-dashed border-line2 pt-3">
                    <div><Tag className="text-ink/45">Depart</Tag><div className="text-sm font-semibold tabular-nums">{fmt(t.start, { day: '2-digit', month: 'short' }).toUpperCase()}</div></div>
                    <div><Tag className="text-ink/45">Return</Tag><div className="text-sm font-semibold tabular-nums">{fmt(t.end, { day: '2-digit', month: 'short', year: '2-digit' }).toUpperCase()}</div></div>
                    <div><Tag className="text-ink/45">Stops</Tag><div className="text-sm font-semibold tabular-nums">{t.activities.length}</div></div>
                  </div>
                </div>

                {/* Stub */}
                <div className="perf hidden w-4 shrink-0 border-l border-dashed border-line2 sm:block" />
                <div className="flex shrink-0 flex-row items-center justify-between gap-4 border-t border-dashed border-line2 p-5 sm:w-44 sm:flex-col sm:items-stretch sm:border-t-0">
                  <div>
                    <Tag className="text-ink/45">Budget</Tag>
                    <div className={`font-display text-xl leading-tight ${over ? 'text-clay' : ''}`}>{php(total(t))}</div>
                    {t.budget ? <Tag className={over ? 'text-clay' : 'text-ink/50'}>{over ? 'Over' : 'Limit'} {phpCompact(t.budget)}</Tag> : <Tag className="text-ink/40">No limit</Tag>}
                    {totalActual(t) > 0 && <div><Tag className="text-ink/50">Spent {phpCompact(totalActual(t))}</Tag></div>}
                  </div>
                  <div className="barcode h-8 w-24 sm:w-full" aria-hidden />
                </div>
              </div>
            )
          })}
        </div>
      )}
      {coverFor && <CoverPicker trip={coverFor} onClose={() => setCoverFor(null)} onSave={p => { onCover(coverFor.id, p); setCoverFor(null) }} />}
    </div>
  )
}

function TripEmptyIllustration() {
  return (
    <svg aria-hidden="true" viewBox="0 0 520 250" fill="none" className="h-auto w-full max-w-[460px]">
      <defs>
        <linearGradient id="empty-sky" x1="260" y1="14" x2="260" y2="226" gradientUnits="userSpaceOnUse">
          <stop stopColor="#DCEBE3" />
          <stop offset="1" stopColor="#F5EAD5" />
        </linearGradient>
        <linearGradient id="empty-hill-back" x1="151" y1="127" x2="203" y2="240" gradientUnits="userSpaceOnUse">
          <stop stopColor="#91B69E" />
          <stop offset="1" stopColor="#668C77" />
        </linearGradient>
        <linearGradient id="empty-hill-front" x1="294" y1="162" x2="316" y2="242" gradientUnits="userSpaceOnUse">
          <stop stopColor="#498271" />
          <stop offset="1" stopColor="#17675B" />
        </linearGradient>
        <filter id="empty-shadow" x="166" y="34" width="218" height="227" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>
      <rect x="18" y="12" width="484" height="224" rx="28" fill="url(#empty-sky)" />
      <circle cx="403" cy="63" r="26" fill="#E7AD58" />
      <circle cx="403" cy="63" r="39" fill="#E7AD58" fillOpacity=".16" />
      <path d="M49 145c30-7 43-44 77-46 37-2 46 34 83 32 30-1 44-28 77-27 37 1 48 33 79 34 26 1 42-17 76-19v117H49V145Z" fill="url(#empty-hill-back)" fillOpacity=".75" />
      <path d="M18 187c36-17 57-8 91-26 36-19 49-45 85-43 41 2 53 51 99 53 41 2 61-42 102-39 36 3 52 31 107 28v76H18v-49Z" fill="url(#empty-hill-front)" />
      <path d="m96 180 13 25h-26l13-25Zm18 17 10 19h-20l10-19Zm274-16 12 23h-24l12-23Zm17 19 9 17h-18l9-17Z" fill="#F4EAD6" fillOpacity=".9" />
      <g filter="url(#empty-shadow)" opacity=".2">
        <rect x="213" y="54" width="130" height="162" rx="16" fill="#132D27" />
      </g>
      <g transform="rotate(-5 273 131)">
        <rect x="205" y="44" width="130" height="162" rx="16" fill="#FFFCF5" />
        <rect x="217" y="57" width="106" height="67" rx="9" fill="#DCEBE3" />
        <path d="M217 102c18-10 25-24 40-22 13 2 18 19 31 18 13-1 20-12 35-9v35H217v-22Z" fill="#17675B" fillOpacity=".85" />
        <circle cx="298" cy="76" r="8" fill="#E7AD58" />
        <rect x="219" y="137" width="67" height="8" rx="4" fill="#263C34" fillOpacity=".78" />
        <rect x="219" y="152" width="97" height="5" rx="2.5" fill="#263C34" fillOpacity=".2" />
        <rect x="219" y="163" width="81" height="5" rx="2.5" fill="#263C34" fillOpacity=".2" />
        <path d="M304 181h12" stroke="#E77B4B" strokeWidth="3" strokeLinecap="round" />
      </g>
      <path d="M121 76c8-8 17-8 25 0m-16 0c8-8 17-8 25 0" stroke="#fff" strokeOpacity=".9" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
