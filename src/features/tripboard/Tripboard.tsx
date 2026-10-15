import { type Weather } from '../../services'
import { type Activity, catOf, CATS, fmt, fmtTime, php, type Trip } from '../../shared'
import { MapSnap } from '../map'
import { downloadMemories } from '../memories'
import { WeatherIcon } from '../weather'

type Props = {
  trip: Trip; days: { date: string; acts: Activity[] }[]; weather: Record<string, Weather>; readOnly?: boolean; memCount: number
  onOpenJournal: (id: 'trip' | string) => void; onAttach: (a: Activity, f?: File) => void; onLocate: (a: Activity) => Promise<boolean>
  onPatch: (id: string, p: Partial<Activity>) => void; toast: (m: string) => void
}

/* Corkboard view: pinned postcards per day; clicking a card opens its memories journal */
export default function Tripboard({ trip, days, weather, readOnly, memCount, onOpenJournal, onAttach, onLocate, onPatch, toast }: Props) {
  return (
            <div className="cork rounded-3xl p-5 sm:p-8">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-md font-hand text-2xl leading-tight text-white drop-shadow">Tap a postcard to open its journal: add photos and stories while you travel.</p>
                <button className="no-print rounded-lg bg-[#fffdf6] px-4 py-2 text-sm font-semibold text-[#17675b] shadow-md hover:bg-white disabled:opacity-50" disabled={!memCount}
                  onClick={() => downloadMemories(trip).catch(() => toast('Could not build the zip'))}>Download all memories{memCount ? ` (${memCount})` : ''}</button>
              </div>
              {(
                <div role="button" tabIndex={0} onClick={() => onOpenJournal('trip')} className="relative mx-auto mb-10 w-64 -rotate-1 cursor-pointer bg-[#fffdf6] p-3 pb-4 text-[#2b2b2b] shadow-xl transition hover:rotate-0 hover:scale-[1.03]">
                  <Pin color="#17675b" />
                  {trip.geo ? <MapSnap lat={trip.geo.lat} lon={trip.geo.lon} zoom={11} height={140} /> : <div className="h-[140px] bg-moss" />}
                  {!!trip.memories?.length && <Stamp n={trip.memories.length} />}
                  <div className="mt-2 text-center font-hand text-2xl leading-none">{trip.destination.split(',')[0]}</div>
                  <div className="text-center font-hand text-lg text-black/60">{fmt(trip.start)} – {fmt(trip.end)} · trip journal</div>
                </div>
              )}
              <div className="space-y-10">
                {days.map((d, i) => (
                  <section key={d.date}>
                    <div className="mb-5 flex flex-wrap items-center gap-3">
                      <div className="tape relative rotate-[-2deg] bg-[#fdf3c4] px-4 py-1.5 font-hand text-2xl text-[#3b3b3b] shadow-md">Day {i + 1} · {fmt(d.date, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                      {weather[d.date] && <span className="rotate-1 bg-white/90 px-2 py-1 text-xs text-black shadow"><span className="inline-flex items-center gap-1"><WeatherIcon code={weather[d.date].code} size={14} />{Math.round(weather[d.date].max)}°</span></span>}
                    </div>
                    {d.acts.length === 0 ? <p className="font-hand text-2xl text-white/80">free day — wander!</p> : (
                      <div className="grid gap-7 sm:grid-cols-2 xl:grid-cols-3">
                        {d.acts.map((a, j) => (
                          <div key={a.id} role="button" tabIndex={0} onClick={() => onOpenJournal(a.id)} onKeyDown={e => e.key === 'Enter' && onOpenJournal(a.id)} className="group relative cursor-pointer bg-[#fffdf6] p-3 pb-4 text-[#2b2b2b] shadow-[0_10px_25px_rgba(0,0,0,.35)] transition hover:z-10 hover:rotate-0 hover:scale-[1.03]" style={{ transform: `rotate(${[-2.5, 1.5, -1, 2, -1.8][(i + j) % 5]}deg)` }}>
                            <Pin color={CATS[catOf(a)].color} />
                            {!!a.memories?.length && <Stamp n={a.memories.length} />}
                            {a.image ? <img src={a.image} alt={a.title} className="h-40 w-full object-cover" />
                              : a.lat != null ? <MapSnap lat={a.lat} lon={a.lon!} />
                              : <div className="flex h-40 items-center justify-center bg-[repeating-linear-gradient(45deg,#f1ece0_0_10px,#ebe4d4_10px_20px)] font-hand text-xl text-black/40">{readOnly ? a.location : 'add a photo or map'}</div>}
                            {a.image && a.lat != null && <div className="absolute right-5 top-36 w-20 rotate-6 border-2 border-white shadow-md"><MapSnap lat={a.lat} lon={a.lon!} zoom={14} height={60} /></div>}
                            <div className="mt-3 flex items-baseline justify-between gap-2">
                              <span className="font-hand text-2xl leading-tight">{a.title}</span>
                              <span className="shrink-0 text-xs font-semibold text-black/50">{fmtTime(a.time)}</span>
                            </div>
                            <div className="text-xs text-black/60">{a.location} · {php(a.cost)}</div>
                            {a.notes && <div className="mt-1 font-hand text-lg leading-tight text-[#2f6f9f]">{a.notes}</div>}
                            {!readOnly && (
                              <div onClick={e => e.stopPropagation()} className="no-print mt-3 flex flex-wrap gap-1 border-t border-dashed border-black/15 pt-2 text-xs">
                                <label className="cursor-pointer rounded px-2 py-1 font-semibold text-[#17675b] hover:bg-black/5">{a.image ? 'Change photo' : 'Attach photo'}<input type="file" accept="image/*" className="hidden" onChange={e => onAttach(a, e.target.files?.[0])} /></label>
                                {a.lat == null && <button className="rounded px-2 py-1 font-semibold text-[#17675b] hover:bg-black/5" onClick={async () => toast((await onLocate(a)) ? 'Map snapshot added' : 'Location not found')}>Map snapshot</button>}
                                {a.image && <button className="rounded px-2 py-1 text-[#ec6a3c] hover:bg-black/5" onClick={() => onPatch(a.id, { image: undefined })}>Remove photo</button>}
                                {a.lat != null && <button className="rounded px-2 py-1 text-[#ec6a3c] hover:bg-black/5" onClick={() => onPatch(a.id, { lat: undefined, lon: undefined })}>Remove map</button>}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                ))}
              </div>
            </div>
  )
}

function Stamp({ n }: { n: number }) {
  return <span className="absolute right-2 top-2 z-10 rotate-6 rounded-sm border-2 border-[#ec6a3c] bg-[#fffdf6]/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#ec6a3c]">{n} {n === 1 ? 'memory' : 'memories'}</span>
}

function Pin({ color }: { color: string }) {
  return <span className="absolute -top-2 left-1/2 z-10 h-5 w-5 -translate-x-1/2 rounded-full shadow-[0_3px_4px_rgba(0,0,0,.45)]" style={{ background: `radial-gradient(circle at 35% 35%, #fff8 0 15%, ${color} 40%)` }} />
}
