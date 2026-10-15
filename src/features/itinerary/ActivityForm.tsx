import { useState } from 'react'
import { type Activity, type Cat, CATS, Field, fmt, Modal, type Trip, uid } from '../../shared'

export function ActivityForm({ trip, act, initial, onSave, onClose }: { trip: Trip; act?: Activity; initial?: Partial<Activity>; onSave: (a: Activity) => void; onClose: () => void }) {
  const src: Partial<Activity> | undefined = act ?? initial
  const [f, setF] = useState({ category: src?.category ?? ('sights' as Cat), title: src?.title ?? '', date: src?.date ?? trip.start, time: src?.time ?? '09:00', location: src?.location ?? '', cost: src?.cost != null ? String(src.cost) : '0', actual: act?.actual != null ? String(act.actual) : '', notes: src?.notes ?? '' })
  const [err, setErr] = useState<Record<string, string>>({})
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const er: Record<string, string> = {}
    if (!f.title.trim() || f.title.length > 120) er.title = 'Title is required (1–120 characters).'
    if (!f.date || f.date < trip.start || f.date > trip.end) er.date = `Date must be between ${fmt(trip.start)} and ${fmt(trip.end)}.`
    if (!f.time) er.time = 'Start time is required.'
    if (!f.location.trim() || f.location.length > 160) er.location = 'Location is required (1–160 characters).'
    const c = Number(f.cost)
    if (f.cost === '' || isNaN(c) || c < 0 || c > 9999999999.99 || !/^\d+(\.\d{1,2})?$/.test(f.cost)) er.cost = 'Enter a nonnegative amount with up to 2 decimals.'
    if (f.actual && !/^\d+(\.\d{1,2})?$/.test(f.actual)) er.actual = 'Enter a nonnegative amount with up to 2 decimals.'
    if (f.notes.length > 1000) er.notes = 'Max 1,000 characters.'
    setErr(er)
    if (!Object.keys(er).length) onSave({ ...(act ?? initial), id: act?.id ?? uid(), actual: f.actual ? Number(f.actual) : undefined, category: f.category, title: f.title.trim(), date: f.date, time: f.time, location: f.location.trim(), cost: c, notes: f.notes })
  }
  return (
    <Modal title={act ? 'Edit activity' : 'Add activity'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Activity" error={err.title}><input className="input" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="Island hopping" /></Field>
        <Field label="Category">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CATS) as Cat[]).map(c => (
              <button type="button" key={c} onClick={() => setF({ ...f, category: c })} className="rounded-full border px-3 py-1 text-xs font-semibold transition"
                style={f.category === c ? { background: CATS[c].color, borderColor: CATS[c].color, color: '#fff' } : { borderColor: '#d9d2c3' }}>{CATS[c].label}</button>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date" error={err.date}><input className="input" type="date" min={trip.start} max={trip.end} value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></Field>
          <Field label="Start time" error={err.time}><input className="input" type="time" value={f.time} onChange={e => setF({ ...f, time: e.target.value })} /></Field>
        </div>
        <Field label="Location" error={err.location}><input className="input" value={f.location} onChange={e => setF({ ...f, location: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Estimated cost (PHP)" error={err.cost}><input className="input" inputMode="decimal" value={f.cost} onChange={e => setF({ ...f, cost: e.target.value })} /></Field>
          <Field label="Actual spent (optional)" error={err.actual}><input className="input" inputMode="decimal" value={f.actual} placeholder="Log after" onChange={e => setF({ ...f, actual: e.target.value })} /></Field>
        </div>
        <Field label="Notes (optional)" error={err.notes}><textarea className="input" rows={2} value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></Field>
        <div className="flex justify-end gap-2 pt-2"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary">{act ? 'Save changes' : 'Add activity'}</button></div>
      </form>
    </Modal>
  )
}
