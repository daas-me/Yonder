import { useState } from 'react'
import { daysBetween, fmt, php, total, type Trip, type User } from '../../shared'
import CoverPicker from './CoverPicker'

/* ---------------- Trips list ---------------- */
export default function TripList({ trips, user, onOpen, onNew, onImport, onCover }: { trips: Trip[]; user: User; onOpen: (id: string) => void; onNew: () => void; onImport: () => void; onCover: (id: string, p: Pick<Trip, 'cover' | 'color'>) => void }) {
  const today = new Date().toISOString().slice(0, 10)
  const upcoming = trips.filter(t => t.end >= today).length
  const budget = trips.reduce((s, t) => s + total(t), 0)
  const [coverFor, setCoverFor] = useState<Trip | null>(null)
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<'all' | 'upcoming' | 'past'>('all')
  const shown = trips.filter(t => (tab === 'all' || (tab === 'upcoming' ? t.end >= today : t.end < today)) && (t.name + ' ' + t.destination).toLowerCase().includes(q.toLowerCase()))
  const next = [...trips].filter(t => t.start >= today).sort((a, b) => a.start.localeCompare(b.start))[0]
  return (
    <div>
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-ink/60">Hello, {user.name.split(' ')[0]}</p>
          <h1 className="font-display text-5xl font-semibold">Your trips</h1>
        </div>
        <div className="flex gap-2"><button className="btn btn-ghost ring-1 ring-line" onClick={onImport}>Import itinerary</button><button className="btn btn-primary" onClick={onNew}>+ New trip</button></div>
      </div>
      <div className="mb-10 grid grid-cols-3 gap-3 sm:gap-4">
        {[['Trips', trips.length], ['Upcoming', upcoming], ['Total estimate', php(budget)]].map(([l, v]) => (
          <div key={l} className="rounded-2xl border border-line bg-card/60 p-4 sm:p-5">
            <div className="text-xs uppercase tracking-wider text-ink/50">{l}</div>
            <div className="mt-1 font-display text-lg font-semibold sm:text-2xl">{v}</div>
          </div>
        ))}
      </div>
      {next && (
        <button onClick={() => onOpen(next.id)} className="mb-8 flex w-full items-center gap-5 rounded-2xl bg-[#f2c6a0]/40 p-5 text-left ring-1 ring-[#f2c6a0] hover:bg-[#f2c6a0]/60">
          <div className="text-center"><div className="font-display text-4xl font-semibold text-clay">{daysBetween(today, next.start) - 1}</div><div className="text-xs uppercase tracking-wider text-ink/60">days to go</div></div>
          <div className="border-l border-[#e0b18c] pl-5"><div className="text-xs uppercase tracking-wider text-ink/50">Next adventure</div><div className="font-display text-xl font-semibold">{next.name}</div><div className="text-sm text-ink/60">{next.destination} · {fmt(next.start)}</div></div>
        </button>
      )}
      {trips.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <input className="input max-w-xs" placeholder="Search trips or destinations" value={q} onChange={e => setQ(e.target.value)} />
          <div className="flex rounded-lg bg-moss p-1">
            {(['all', 'upcoming', 'past'] as const).map(k => (
              <button key={k} onClick={() => setTab(k)} className={`rounded-md px-3 py-1.5 text-sm font-semibold capitalize ${tab === k ? 'bg-card text-pine shadow-sm' : 'text-ink/60'}`}>{k}</button>
            ))}
          </div>
        </div>
      )}
      {trips.length > 0 && shown.length === 0 && <p className="py-10 text-center text-sm text-ink/60">No trips match your search.</p>}
      {trips.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-line2 p-14 text-center">
          <h3 className="font-display text-2xl">No trips yet</h3>
          <p className="mt-2 text-sm text-ink/60">Somewhere out yonder is waiting. Create your first plan.</p>
          <div className="mt-6 flex justify-center gap-2"><button className="btn btn-ghost ring-1 ring-line" onClick={onImport}>Import from a file</button><button className="btn btn-primary" onClick={onNew}>Plan a trip</button></div>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[...shown].sort((a, b) => a.start.localeCompare(b.start)).map((t, i) => (
            <div key={t.id} role="button" tabIndex={0} onClick={() => onOpen(t.id)} onKeyDown={e => e.key === 'Enter' && onOpen(t.id)} className="group cursor-pointer overflow-hidden rounded-2xl bg-card text-left shadow-sm ring-1 ring-line transition hover:-translate-y-1 hover:shadow-lg">
              <div className="topo relative h-28 overflow-hidden" style={{ backgroundColor: t.color ?? ['#2f5d4e', '#c8623d', '#3d5a80'][i % 3] }}>
                {t.cover && <img src={t.cover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90" />}
                {t.tagline && <span className="absolute bottom-2 left-4 right-32 truncate font-hand text-xl text-white drop-shadow">{t.tagline}</span>}
                <span className="absolute left-4 top-4 rounded-full bg-card/90 px-3 py-1 text-xs font-semibold">{daysBetween(t.start, t.end)} days</span>
                <button onClick={e => { e.stopPropagation(); setCoverFor(t) }} className="absolute bottom-2 right-3 z-10 flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1 text-xs font-semibold text-white opacity-0 backdrop-blur transition group-hover:opacity-100 focus:opacity-100"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h3l2-3h6l2 3h3v12H4z" /><circle cx="12" cy="13" r="3.5" /></svg>{t.cover ? 'Change cover' : 'Add cover'}</button>
                {t.end < today && <span className="absolute right-4 top-4 rounded-full bg-ink/40 px-3 py-1 text-xs text-white">Past</span>}
              </div>
              <div className="p-5">
                <h3 className="font-display text-xl font-semibold group-hover:text-pine">{t.name}</h3>
                <p className="text-sm text-ink/60">{t.destination}</p>
                <div className="mt-4 flex items-center justify-between border-t border-dashed border-line pt-3 text-sm">
                  <span>{fmt(t.start)} – {fmt(t.end, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  <span className={`font-semibold ${t.budget && total(t) > t.budget ? 'text-clay' : 'text-pine'}`}>{php(total(t))}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {coverFor && <CoverPicker trip={coverFor} onClose={() => setCoverFor(null)} onSave={p => { onCover(coverFor.id, p); setCoverFor(null) }} />}
    </div>
  )
}
