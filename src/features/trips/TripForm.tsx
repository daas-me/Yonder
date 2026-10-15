import { useState } from 'react'
import { resizeImage } from '../../services'
import { type Extra, Field, Modal, php, THEMES, type Trip } from '../../shared'
import { ExtrasEditor } from '../budget'

/* ---------------- Trip form ---------------- */
export function TripForm({ trip, onSave, onClose }: { trip?: Trip; onSave: (t: Pick<Trip, 'name' | 'destination' | 'start' | 'end' | 'description' | 'budget' | 'extras' | 'color' | 'cover' | 'tagline'>) => void; onClose: () => void }) {
  const [f, setF] = useState({ name: trip?.name ?? '', destination: trip?.destination ?? '', start: trip?.start ?? '', end: trip?.end ?? '', description: trip?.description ?? '', budget: trip?.budget ? String(trip.budget) : '', tagline: trip?.tagline ?? '', color: trip?.color ?? THEMES[0], cover: trip?.cover })
  const [extras, setExtras] = useState<Extra[]>(trip?.extras ?? [])
  const [err, setErr] = useState<Record<string, string>>({})
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const er: Record<string, string> = {}
    if (!f.name.trim() || f.name.trim().length > 120) er.name = 'Name is required (1–120 characters).'
    if (!f.destination.trim() || f.destination.trim().length > 120) er.destination = 'Destination is required (1–120 characters).'
    if (!f.start) er.start = 'Start date is required.'
    if (!f.end) er.end = 'End date is required.'
    if (f.start && f.end && f.end < f.start) er.end = 'End date must be on or after start date.'
    if (f.description.length > 1000) er.description = 'Max 1,000 characters.'
    if (f.budget && !/^\d+(\.\d{1,2})?$/.test(f.budget)) er.budget = 'Enter a nonnegative amount with up to 2 decimals.'
    if (extras.some(x => !x.label.trim())) er.extras = 'Give every misc expense a name, or remove it.'
    if (trip && f.start && f.end && trip.activities.some(a => a.date < f.start || a.date > f.end)) er.end = 'Some activities fall outside this new date range. Move them first.'
    setErr(er)
    if (!Object.keys(er).length) onSave({ ...f, name: f.name.trim(), destination: f.destination.trim(), budget: f.budget ? Number(f.budget) : undefined, tagline: f.tagline.trim().slice(0, 80), extras: extras.map(x => ({ ...x, label: x.label.trim() })) })
  }
  return (
    <Modal title={trip ? 'Edit trip' : 'Design a new trip'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Trip name" error={err.name}><input className="input" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Summer in Siargao" /></Field>
        <Field label="Destination" error={err.destination}><input className="input" value={f.destination} onChange={e => setF({ ...f, destination: e.target.value })} placeholder="General Luna, Siargao" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date" error={err.start}><input className="input" type="date" value={f.start} onChange={e => setF({ ...f, start: e.target.value })} /></Field>
          <Field label="End date" error={err.end}><input className="input" type="date" value={f.end} onChange={e => setF({ ...f, end: e.target.value })} /></Field>
        </div>
        <Field label="Tagline (optional)"><input className="input" value={f.tagline} maxLength={80} placeholder="Salt, sun and slow mornings" onChange={e => setF({ ...f, tagline: e.target.value })} /></Field>
        <Field label="Description (optional)" error={err.description}><textarea className="input" rows={2} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></Field>

        <fieldset className="rounded-xl p-4 ring-1 ring-line">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-ink/60">Look & feel</legend>
          <div className="flex items-center gap-4">
            <div className="topo relative h-20 w-32 shrink-0 overflow-hidden rounded-lg" style={{ background: f.color }}>
              {f.cover && <img src={f.cover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />}
              <span className="absolute bottom-1.5 left-2 right-2 truncate font-display text-sm font-semibold text-white drop-shadow">{f.name || 'Your trip'}</span>
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">{THEMES.map(c => <button type="button" key={c} aria-label={`Theme ${c}`} onClick={() => setF({ ...f, color: c })} className={`h-7 w-7 rounded-full ring-offset-2 ring-offset-sand ${f.color === c ? 'ring-2 ring-ink' : ''}`} style={{ background: c }} />)}</div>
              <div className="flex gap-2 text-sm">
                <label className="cursor-pointer font-semibold text-pine hover:underline">{f.cover ? 'Change cover photo' : 'Add cover photo'}<input type="file" accept="image/*" className="hidden" onChange={async e => { const file = e.target.files?.[0]; if (file) setF({ ...f, cover: await resizeImage(file, 1200) }) }} /></label>
                {f.cover && <button type="button" className="text-clay" onClick={() => setF({ ...f, cover: undefined })}>Remove</button>}
              </div>
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-3 rounded-xl p-4 ring-1 ring-line">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-ink/60">Budget</legend>
          <Field label="Budget limit in PHP (optional)" error={err.budget}><input className="input" inputMode="decimal" value={f.budget} placeholder="e.g. 15000, your maximum spend" onChange={e => setF({ ...f, budget: e.target.value })} /></Field>
          <div>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink/60">Miscellaneous / other spending</span>
            <p className="mb-2 text-xs text-ink/50">Costs that aren't a scheduled activity, like insurance, tips, a SIM card or an emergency fund. Fill in Actual during or after the trip.</p>
            <ExtrasEditor items={extras} onChange={setExtras} />
            {err.extras && <span className="mt-1 block text-xs text-clay">{err.extras}</span>}
          </div>
          <div className="flex justify-between rounded-lg bg-moss/60 px-3 py-2 text-sm">
            <span>Activities {php((trip?.activities ?? []).reduce((s, a) => s + a.cost, 0))} + misc {php(extras.reduce((s, x) => s + x.est, 0))}</span>
            <b>Budget {php((trip?.activities ?? []).reduce((s, a) => s + a.cost, 0) + extras.reduce((s, x) => s + x.est, 0))}</b>
          </div>
        </fieldset>
        <div className="flex justify-end gap-2 pt-2"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary">{trip ? 'Save changes' : 'Create trip'}</button></div>
      </form>
    </Modal>
  )
}
