import { useState } from 'react'
import { addDays, daysBetween, Field, fmt, Modal, type Trip, uid } from '../../shared'

export default function DuplicateForm({ trip, onSave, onClose }: { trip: Trip; onSave: (t: Trip) => void; onClose: () => void }) {
  const [name, setName] = useState(trip.name + ' (again)')
  const [start, setStart] = useState(addDays(new Date().toISOString().slice(0, 10), 30))
  const len = daysBetween(trip.start, trip.end) - 1
  return (
    <Modal title="Use as template" onClose={onClose}>
      <p className="mb-4 text-sm text-ink/70">Copies every activity, cover photo, map pin and packing item to a new trip. Journals stay with the original trip. Dates shift to the new start date. Actual spending and packed ticks are cleared.</p>
      <form className="space-y-4" onSubmit={e => {
        e.preventDefault()
        if (!name.trim() || !start) return
        const shift = daysBetween(trip.start, start) - 1
        onSave({
          ...trip, id: uid(), memories: undefined, name: name.trim().slice(0, 120), start, end: addDays(start, len),
          checklist: (trip.checklist ?? []).map(c => ({ ...c, id: uid(), done: false })),
          extras: (trip.extras ?? []).map(x => ({ ...x, id: uid(), actual: undefined })),
          activities: trip.activities.map(a => ({ ...a, id: uid(), date: addDays(a.date, shift), actual: undefined, memories: undefined })),
        })
      }}>
        <Field label="New trip name"><input className="input" value={name} onChange={e => setName(e.target.value)} /></Field>
        <Field label="New start date"><input className="input" type="date" value={start} onChange={e => setStart(e.target.value)} /></Field>
        {start && <p className="text-sm text-ink/60">Ends {fmt(addDays(start, len), { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })} · {len + 1} days</p>}
        <div className="flex justify-end gap-2"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary">Create copy</button></div>
      </form>
    </Modal>
  )
}
