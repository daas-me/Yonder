import { useState } from 'react'
import { assetUrl, resizeImage } from '../../services'
import { DEFAULT_CATEGORY_SHARE_MODES, daysBetween, defaultTripCover, type Cat, type CostShareMode, type Extra, Field, FieldLabel, Modal, Section, php, planned, THEMES, type Prefs, type Trip, type TripTraveler, uid } from '../../shared'
import { ExtrasEditor } from '../budget'

/* ---------------- Trip form ---------------- */
type TripFormValues = Pick<Trip, 'name' | 'destination' | 'start' | 'end' | 'description' | 'budget' | 'extras' | 'color' | 'cover' | 'tagline' | 'groupTrip' | 'travelers' | 'categoryShareModes'>

export function TripForm({ trip, defaults, onSave, onClose }: { trip?: Trip; defaults?: Prefs; onSave: (t: TripFormValues) => void | boolean | Promise<void | boolean>; onClose: () => void }) {
  const [f, setF] = useState({ name: trip?.name ?? '', destination: trip?.destination ?? '', start: trip?.start ?? '', end: trip?.end ?? '', description: trip?.description ?? '', budget: trip?.budget ? String(trip.budget) : '', tagline: trip?.tagline ?? '', color: trip?.color ?? THEMES[0], cover: trip?.cover })
  const [budgetTouched, setBudgetTouched] = useState(Boolean(trip))
  const [groupTrip, setGroupTrip] = useState(trip?.groupTrip ?? defaults?.tripType === 'group')
  const [travelers, setTravelers] = useState<TripTraveler[]>(() => trip?.travelers?.length
    ? trip.travelers
    : Array.from({ length: Math.max(2, (defaults?.companions.length ?? 0) + 1, Math.min(99, defaults?.pax ?? 2)) }, (_, index) => ({ id: uid(), name: index === 0 ? '' : defaults?.companions[index - 1] ?? '' })))
  const [categoryShareModes, setCategoryShareModes] = useState<Partial<Record<Cat, CostShareMode>>>(trip?.categoryShareModes ?? defaults?.splitRules ?? {})
  const [extras, setExtras] = useState<Extra[]>(trip?.extras ?? [])
  const [err, setErr] = useState<Record<string, string>>({})
  const [pendingChanges, setPendingChanges] = useState<TripFormValues | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const dayCount = f.start && f.end && f.end >= f.start ? daysBetween(f.start, f.end) : 0
  const suggestedBudget = !trip && !budgetTouched && defaults?.dailyBudget && dayCount > 0
    ? String(Math.round(defaults.dailyBudget * dayCount * 100) / 100)
    : ''
  const budgetValue = suggestedBudget || f.budget
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const er: Record<string, string> = {}
    if (!f.name.trim() || f.name.trim().length > 120) er.name = 'Name is required (1–120 characters).'
    if (!f.destination.trim() || f.destination.trim().length > 120) er.destination = 'Destination is required (1–120 characters).'
    if (!f.start) er.start = 'Start date is required.'
    if (!f.end) er.end = 'End date is required.'
    if (f.start && f.end && f.end < f.start) er.end = 'End date must be on or after start date.'
    if (f.description.length > 1000) er.description = 'Max 1,000 characters.'
    if (budgetValue && !/^\d+(\.\d{1,2})?$/.test(budgetValue)) er.budget = 'Enter a nonnegative amount with up to 2 decimals.'
    if (groupTrip && (travelers.length < 2 || travelers.length > 99)) er.travelers = 'A group trip needs 2 to 99 travelers, including you.'
    if (extras.some(x => !x.label.trim())) er.extras = 'Give every misc expense a name, or remove it.'
    if (trip && f.start && f.end && trip.activities.some(a => a.date < f.start || a.date > f.end)) er.end = 'Some activities fall outside this new date range. Move them first.'
    setErr(er)
    if (!Object.keys(er).length) {
      const values: TripFormValues = {
      ...f,
      name: f.name.trim(),
      destination: f.destination.trim(),
      budget: budgetValue ? Number(budgetValue) : undefined,
      tagline: f.tagline.trim().slice(0, 80),
      extras: extras.map(x => ({ ...x, label: x.label.trim() })),
      groupTrip,
      travelers,
      categoryShareModes: Object.fromEntries((Object.keys(DEFAULT_CATEGORY_SHARE_MODES) as Cat[]).map(category =>
        [category, categoryShareModes[category] ?? DEFAULT_CATEGORY_SHARE_MODES[category]])),
      }
      if (trip) setPendingChanges(values)
      else void onSave(values)
    }
  }
  const confirmSave = async () => {
    if (!pendingChanges) return
    setSaving(true)
    setSaveError('')
    try {
      const result = await onSave(pendingChanges)
      if (result === false) setSaveError('The trip could not be saved. Please try again.')
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'The trip could not be saved. Please try again.')
    } finally {
      setSaving(false)
    }
  }
  const modalTitle = pendingChanges ? 'Confirm trip changes' : trip ? 'Edit trip' : 'Design a new trip'
  return (
    <Modal
      title={modalTitle}
      eyebrow={pendingChanges ? 'READY FOR REVIEW' : trip ? 'YOUR JOURNEY' : 'PLAN A JOURNEY'}
      subtitle={pendingChanges ? 'Take one last look before these updates are saved.' : trip ? 'Update the details, plans, and budget for this trip.' : 'Gather the details now. You can shape the itinerary as you go.'}
      icon={<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="m21 3-6.5 18-3.5-8-8-3.5L21 3Z" /><path d="M11 13 21 3" /></svg>}
      onClose={onClose}
      wide
      animated
    >
      {pendingChanges && trip ? (
        <div key="confirm-trip-changes" className="trip-confirm-content space-y-5">
          <div>
            <p className="font-display text-xl font-semibold">Save these changes?</p>
            <p className="mt-1 text-sm text-ink/60">Review the updated trip details before saving.</p>
          </div>
          <dl className="divide-y divide-line rounded-xl bg-sand/60 px-4">
            <div className="flex items-center justify-between gap-4 py-3 text-sm"><dt className="text-ink/55">Trip</dt><dd className="truncate text-right font-medium">{pendingChanges.name}</dd></div>
            <div className="flex items-center justify-between gap-4 py-3 text-sm"><dt className="text-ink/55">Destination</dt><dd className="truncate text-right font-medium">{pendingChanges.destination}</dd></div>
            <div className="flex items-center justify-between gap-4 py-3 text-sm"><dt className="text-ink/55">Trip type</dt><dd className="text-right font-medium">{pendingChanges.groupTrip ? `Group · ${pendingChanges.travelers?.length ?? 0} travelers` : 'Solo trip'}</dd></div>
            <div className="flex items-center justify-between gap-4 py-3 text-sm"><dt className="text-ink/55">Dates</dt><dd className="text-right font-medium">{pendingChanges.start} – {pendingChanges.end}</dd></div>
          </dl>
          {saveError && <p role="alert" className="rounded-lg bg-clay/10 px-3 py-2 text-sm text-clay">{saveError}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" disabled={saving} onClick={() => { setPendingChanges(null); setSaveError('') }}>Back to editing</button>
            <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void confirmSave()}>{saving ? 'Saving…' : 'Confirm changes'}</button>
          </div>
        </div>
      ) : (
      <form onSubmit={submit} className="space-y-4">
        <Field label="Trip name" error={err.name}><input className="input" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Summer in Siargao" /></Field>
        <Field label="Destination" error={err.destination}><input className="input" value={f.destination} onChange={e => setF({ ...f, destination: e.target.value })} placeholder="General Luna, Siargao" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date" error={err.start}><input className="input" type="date" value={f.start} onChange={e => setF({ ...f, start: e.target.value })} /></Field>
          <Field label="End date" error={err.end}><input className="input" type="date" value={f.end} onChange={e => setF({ ...f, end: e.target.value })} /></Field>
        </div>
        <Field label="Tagline (optional)"><input className="input" value={f.tagline} maxLength={80} placeholder="Salt, sun and slow mornings" onChange={e => setF({ ...f, tagline: e.target.value })} /></Field>
        <Field label="Description (optional)" error={err.description}><textarea className="input" rows={2} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></Field>

        <Section title="Who's going">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Group trip</p>
            <p className="mt-0.5 text-xs text-ink/50">{groupTrip ? 'On: add travelers and choose how costs are shared.' : 'Off: this is a solo trip, just you.'}</p>
          </div>
          <input type="checkbox" role="switch" aria-label="Group trip" checked={groupTrip} onChange={event => setGroupTrip(event.target.checked)} className="coming-soon-switch enabled-switch" />
        </div>
        {groupTrip && <>
          <div>
            <FieldLabel text="Number of travelers (including you)" />
            <div className="flex items-center gap-2">
              <div className="flex h-10 items-center overflow-hidden rounded-lg border border-line2">
                <button type="button" aria-label="Remove traveler" disabled={travelers.length <= 2} onClick={() => setTravelers(current => current.slice(0, -1))} className="inline-flex h-full w-10 items-center justify-center text-sm leading-none text-ink/60 hover:bg-ink/5 disabled:opacity-30">−</button>
                <span className="inline-flex h-full w-10 items-center justify-center text-sm font-semibold tabular-nums leading-none" aria-live="polite">{travelers.length}</span>
                <button type="button" aria-label="Add traveler" disabled={travelers.length >= 99} onClick={() => setTravelers(current => [...current, { id: uid(), name: '' }])} className="inline-flex h-full w-10 items-center justify-center text-sm leading-none text-ink/60 hover:bg-ink/5 disabled:opacity-30">+</button>
              </div>
              <span className="text-sm text-ink/55">pax</span>
            </div>
            {err.travelers && <span className="mt-1 block text-xs text-clay">{err.travelers}</span>}
          </div>
          <div>
            <FieldLabel text="Names (optional)" />
            <div className="grid gap-2 sm:grid-cols-2">
              {travelers.map((traveler, index) => (
                <input key={traveler.id} className="input" aria-label={index === 0 ? 'Your name' : `Traveler ${index + 1} name`} value={traveler.name} maxLength={80}
                  placeholder={index === 0 ? 'You' : `Traveler ${index + 1}`}
                  onChange={event => setTravelers(current => current.map(item => item.id === traveler.id ? { ...item, name: event.target.value } : item))} />
              ))}
            </div>
          </div>
          <div>
            <FieldLabel text="How costs are shared" className="!mb-0.5" />
            <p className="mb-2 text-xs text-ink/50">Default for new activities. You can change this on any activity, e.g. if one person pays for everyone.</p>
            <div className="overflow-hidden rounded-xl border border-line2">
              {(Object.keys(DEFAULT_CATEGORY_SHARE_MODES) as Cat[]).map(category => {
                const selected = categoryShareModes[category] ?? DEFAULT_CATEGORY_SHARE_MODES[category]
                return (
                  <div key={category} className="flex flex-wrap items-center justify-between gap-2 border-b border-line last:border-0 px-3 py-2">
                    <span className="flex items-center gap-2 text-sm"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: category === 'other' ? '#6b6b6b' : ({ transport: '#2f6f9f', food: '#ec6a3c', lodging: '#7a5cc4', sights: '#17675b', shopping: '#c99a2e' } as Record<string, string>)[category] }} />{category === 'other' ? 'Misc / Other' : category[0].toUpperCase() + category.slice(1)}</span>
                    <div className="flex rounded-lg bg-ink/5 p-0.5">
                      {(['equal', 'own'] as CostShareMode[]).map(mode => <button key={mode} type="button" aria-pressed={selected === mode} onClick={() => setCategoryShareModes(current => ({ ...current, [category]: mode }))} className={`rounded-md px-2.5 py-1 text-xs transition ${selected === mode ? 'bg-card font-semibold text-ink shadow-sm ring-1 ring-line2' : 'text-ink/50 hover:text-ink'}`}>{mode === 'equal' ? 'Split equally' : 'Each pays own'}</button>)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>}
        </Section>

        <Section title="Look & feel" hint="Theme colour and cover used on your ticket and trip page.">
          <div className="flex items-center gap-4">
            <div className="topo relative h-20 w-32 shrink-0 overflow-hidden rounded-lg" style={{ background: f.color }}>
              <img src={assetUrl(f.cover ?? defaultTripCover(f.color, f.destination))} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
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
        </Section>

        <Section title="Budget">
          <Field label="Budget limit (PHP, optional)" error={err.budget}><input className="input" inputMode="decimal" value={budgetValue} placeholder="e.g. 15000, your maximum spend" onChange={e => { setBudgetTouched(true); setF({ ...f, budget: e.target.value }) }} /></Field>
          {suggestedBudget && defaults?.dailyBudget != null && <p className="-mt-2 text-xs text-ink/55">Suggested from your {php(defaults.dailyBudget)} per day default × {dayCount} days. Type to change it.</p>}
          <div>
            <FieldLabel text="Miscellaneous spending" className="!mb-0.5" />
            <p className="mb-2 text-xs text-ink/55">Costs that aren't a scheduled activity, like insurance, tips, a SIM card or an emergency fund. Fill in Actual during or after the trip.</p>
            <ExtrasEditor items={extras} onChange={setExtras} />
            {err.extras && <span className="mt-1 block text-xs text-clay">{err.extras}</span>}
          </div>
          <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 rounded-lg bg-moss/60 px-3 py-2 text-sm">
            <span>Activities {php((trip?.activities ?? []).reduce((s, a) => s + planned(a), 0))} + misc {php(extras.reduce((s, x) => s + x.est, 0))}</span>
            <b>Budget {php((trip?.activities ?? []).reduce((s, a) => s + planned(a), 0) + extras.reduce((s, x) => s + x.est, 0))}</b>
          </div>
        </Section>
        <div className="flex justify-end gap-2 pt-2"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary">{trip ? 'Save changes' : 'Create trip'}</button></div>
      </form>
      )}
    </Modal>
  )
}
