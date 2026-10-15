import { useEffect, useState } from 'react'
import { resizeImage } from '../../services'
import { Modal, THEMES, type Trip } from '../../shared'
import { getPhoto } from '../memories'

/* Choose a trip cover: upload, reuse a postcard/journal photo, or pick a theme color */
export default function CoverPicker({ trip, onSave, onClose }: { trip: Trip; onSave: (p: Pick<Trip, 'cover' | 'color'>) => void; onClose: () => void }) {
  const [cover, setCover] = useState(trip.cover)
  const [color, setColor] = useState(trip.color ?? THEMES[0])
  const [pool, setPool] = useState<{ key: string; src: string; from: string }[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const urls: string[] = []
    const items = trip.activities.filter(a => a.image).map(a => ({ key: a.id, src: a.image!, from: a.title }))
    ;(async () => {
      const mems = [...(trip.memories ?? []).map(m => ({ m, from: 'Trip journal' })), ...trip.activities.flatMap(a => (a.memories ?? []).map(m => ({ m, from: a.title })))].filter(x => x.m.kind === 'photo').slice(0, 30)
      for (const { m, from } of mems) {
        const b = await getPhoto(m.id).catch(() => undefined)
        if (b) { const u = URL.createObjectURL(b); urls.push(u); items.push({ key: m.id, src: u, from }) }
      }
      setPool([...items])
    })()
    return () => urls.forEach(URL.revokeObjectURL)
  }, [trip])

  // Blob URLs are temporary, so re-encode the chosen photo as a compact data URL
  const pick = async (src: string) => {
    if (src.startsWith('data:')) return setCover(src)
    setBusy(true)
    try { setCover(await resizeImage(new File([await (await fetch(src)).blob()], 'c.jpg'), 1200)) } finally { setBusy(false) }
  }

  return (
    <Modal title="Trip cover" onClose={onClose}>
      <div className="topo relative mb-5 h-36 overflow-hidden rounded-xl" style={{ backgroundColor: color }}>
        {cover && <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90" />}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-3">
          <div className="font-display text-lg font-semibold text-white">{trip.name}</div>
          {trip.tagline && <div className="font-hand text-xl leading-none text-white/90">{trip.tagline}</div>}
        </div>
        {busy && <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-sm text-white">Preparing…</div>}
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <label className="btn btn-primary cursor-pointer">Upload photo<input type="file" accept="image/*" className="hidden" onChange={async e => { const f = e.target.files?.[0]; if (f) { setBusy(true); try { setCover(await resizeImage(f, 1200)) } finally { setBusy(false) } } }} /></label>
        {cover && <button className="btn btn-danger ring-1 ring-line" onClick={() => setCover(undefined)}>Remove photo</button>}
      </div>

      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink/60">From this trip</div>
      {pool.length ? (
        <div className="mb-5 grid max-h-52 grid-cols-4 gap-2 overflow-auto">
          {pool.map(p => (
            <button key={p.key} title={p.from} onClick={() => pick(p.src)} className="group relative aspect-square overflow-hidden rounded-lg ring-1 ring-line hover:ring-2 hover:ring-pine">
              <img src={p.src} alt={p.from} className="h-full w-full object-cover" />
              <span className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-1 text-[10px] text-white opacity-0 group-hover:opacity-100">{p.from}</span>
            </button>
          ))}
        </div>
      ) : <p className="mb-5 rounded-lg bg-moss/60 p-3 text-sm text-ink/60">No trip photos yet. Photos you attach to Tripboard postcards or add to the journal will show up here.</p>}

      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink/60">Theme color</div>
      <div className="mb-6 flex flex-wrap gap-1.5">{THEMES.map(c => <button key={c} aria-label={`Theme ${c}`} onClick={() => setColor(c)} className={`h-8 w-8 rounded-full ring-offset-2 ring-offset-sand ${color === c ? 'ring-2 ring-ink' : ''}`} style={{ background: c }} />)}</div>

      <div className="flex justify-end gap-2"><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy} onClick={() => onSave({ cover, color })}>Save cover</button></div>
    </Modal>
  )
}
