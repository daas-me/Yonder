import { useState } from 'react'
import { activityShareMode, categoryShareMode, type Activity, type Cat, CATS, type CostShareMode, Field, fmt, Modal, THEMES, type Trip, uid } from '../../shared'

export function ActivityForm({ trip, act, initial, onSave, onClose }: { trip: Trip; act?: Activity; initial?: Partial<Activity>; onSave: (a: Activity) => void; onClose: () => void }) {
  const src: Partial<Activity> | undefined = act ?? initial
  const [f, setF] = useState({ category: src?.category ?? ('sights' as Cat), title: src?.title ?? '', date: src?.date ?? trip.start, time: src?.time ?? '09:00', location: src?.location ?? '', cost: src?.cost != null ? String(src.cost) : '0', actual: act?.actual != null ? String(act.actual) : '', notes: src?.notes ?? '' })
  const [shareMode, setShareMode] = useState<CostShareMode>(() => act ? activityShareMode(trip, act) : categoryShareMode(trip, f.category))
  const [sharedTravelerIds, setSharedTravelerIds] = useState<string[]>(() => act?.sharedTravelerIds?.length
    ? act.sharedTravelerIds
    : (trip.travelers ?? []).map(traveler => traveler.id))
  const [personalAmounts, setPersonalAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(act?.personalAmounts ?? {}).map(([id, amount]) => [id, String(amount)])))
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
    if (trip.groupTrip && shareMode === 'equal' && sharedTravelerIds.length === 0) er.payers = 'Choose at least one traveler to share this cost.'
    const enteredAmounts = Object.entries(personalAmounts).filter(([, amount]) => amount !== '')
    if (enteredAmounts.some(([, amount]) => !/^\d+(\.\d{1,2})?$/.test(amount))) er.payers = 'Enter a valid nonnegative amount with up to 2 decimals for each person.'
    if (f.notes.length > 1000) er.notes = 'Max 1,000 characters.'
    setErr(er)
    if (!Object.keys(er).length) {
      const amounts = Object.fromEntries(enteredAmounts.map(([id, amount]) => [id, Number(amount)]))
      const completeAmounts = trip.groupTrip && shareMode === 'own' && (trip.travelers ?? []).every(({ id }) => Object.prototype.hasOwnProperty.call(amounts, id))
      const effectiveCost = completeAmounts ? Object.values(amounts).reduce((sum, amount) => sum + amount, 0) : c
      onSave({
        ...(act ?? initial),
        id: act?.id ?? uid(),
        actual: f.actual ? Number(f.actual) : undefined,
        category: f.category,
        title: f.title.trim(),
        date: f.date,
        time: f.time,
        location: f.location.trim(),
        cost: effectiveCost,
        notes: f.notes,
        ...(trip.groupTrip ? { shareMode, sharedTravelerIds, personalAmounts: amounts } : {}),
      })
    }
  }
  return (
    <Modal title={act ? 'Edit activity' : 'Add activity'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Activity" error={err.title}><input className="input" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="Island hopping" /></Field>
        <Field label="Category">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CATS) as Cat[]).map(c => (
              <button type="button" key={c} onClick={() => { setF({ ...f, category: c }); if (!act) setShareMode(categoryShareMode(trip, c)) }} className="rounded-full border px-3 py-1 text-xs font-semibold transition"
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
          <div>
            <Field label={`Estimated cost (PHP${trip.groupTrip && shareMode === 'own' ? ', sum of each person' : ''})`} error={err.cost}><input className="input" inputMode="decimal" value={f.cost} onChange={e => setF({ ...f, cost: e.target.value })} /></Field>
          </div>
          <Field label="Actual spent (optional)" error={err.actual}><input className="input" inputMode="decimal" value={f.actual} placeholder="Log after" onChange={e => setF({ ...f, actual: e.target.value })} /></Field>
        </div>
        {trip.groupTrip && <>
          <section className="rounded-xl border border-line2 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Who pays</h3>
              <div className="flex rounded-lg bg-ink/5 p-0.5">
                {(['equal', 'own'] as CostShareMode[]).map(mode => <button key={mode} type="button" aria-pressed={shareMode === mode} onClick={() => setShareMode(mode)} className={`rounded-md px-2.5 py-1 text-xs transition ${shareMode === mode ? 'bg-card font-semibold text-ink shadow-sm ring-1 ring-line2' : 'text-ink/50 hover:text-ink'}`}>{mode === 'equal' ? 'Split equally' : 'Each pays own'}</button>)}
              </div>
            </div>
            {shareMode === 'equal' ? (
              <>
                <p className="mt-1 text-xs text-ink/55">Select who shares this activity cost.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(trip.travelers ?? []).map((traveler, index) => {
                    const selected = sharedTravelerIds.includes(traveler.id)
                    const label = traveler.name.trim() || (index === 0 ? 'You' : `Traveler ${index + 1}`)
                    const color = THEMES[index % THEMES.length]
                    return <button key={traveler.id} type="button" aria-pressed={selected} onClick={() => setSharedTravelerIds(ids => selected ? ids.filter(id => id !== traveler.id) : [...ids, traveler.id])} className={`inline-flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-xs font-medium transition ${selected ? '' : 'border-line2 text-ink/55'}`} style={selected ? { borderColor: color, backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`, color } : undefined}><span aria-hidden="true" className="inline-grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white" style={{ backgroundColor: color }}>{label.slice(0, 1).toUpperCase()}</span><span>{label}</span></button>
                  })}
                </div>
                {sharedTravelerIds.length > 0 && <p className="mt-2 text-xs text-ink/55">{`₱${(Number(f.cost || 0) / sharedTravelerIds.length).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} each across ${sharedTravelerIds.length} of ${(trip.travelers ?? []).length} travelers`}</p>}
              </>
            ) : (
              <>
                <p className="mt-1 text-xs text-ink/55">Enter what each traveler ordered or paid. Leave zero for anyone who did not participate. Actual spending follows these proportions.</p>
                <div className="mt-3 divide-y divide-line">
                  {(trip.travelers ?? []).map((traveler, index) => {
                    const label = traveler.name.trim() || (index === 0 ? 'You' : `Traveler ${index + 1}`)
                    const color = THEMES[index % THEMES.length]
                    return <label key={traveler.id} className="flex items-center gap-2 py-2 first:pt-0 last:pb-0">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white" style={{ backgroundColor: color }}>{label.slice(0, 1).toUpperCase()}</span>
                      <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
                      <input className="input w-24 text-right tabular-nums" aria-label={`${label} estimated amount`} inputMode="decimal" placeholder="0.00" value={personalAmounts[traveler.id] ?? ''} onChange={event => {
                        const next = { ...personalAmounts, [traveler.id]: event.target.value }
                        setPersonalAmounts(next)
                        const allEntered = (trip.travelers ?? []).every(item => next[item.id] !== undefined && /^\d+(\.\d{1,2})?$/.test(next[item.id]))
                        if (allEntered) setF(current => ({ ...current, cost: (trip.travelers ?? []).reduce((sum, item) => sum + Number(next[item.id]), 0).toFixed(2) }))
                      }} />
                    </label>
                  })}
                </div>
                {err.payers && <p className="mt-2 text-xs text-clay">{err.payers}</p>}
                <p className="mt-3 flex justify-between border-t border-line pt-2 text-xs text-ink/55"><span>Total, used as the estimated cost</span><strong className="text-ink">{f.cost === '' ? 'PHP 0.00' : `PHP ${Number(f.cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</strong></p>
              </>
            )}
            {err.payers && shareMode === 'equal' && <p className="mt-2 text-xs text-clay">{err.payers}</p>}
          </section>
        </>}
        <Field label="Notes (optional)" error={err.notes}><textarea className="input" rows={2} value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></Field>
        <div className="flex justify-end gap-2 pt-2"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary">{act ? 'Save changes' : 'Add activity'}</button></div>
      </form>
    </Modal>
  )
}
