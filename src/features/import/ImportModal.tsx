import { useMemo, useState } from 'react'
import { type Activity, addDays, type Cat, catOf, CATS, type Check, type Extra, Field, fmt, fmtTime, isoOf, Modal, php, sortActs, THEMES, type Trip, uid } from '../../shared'
import { ExtrasEditor } from '../budget'
import { extractText } from './extractText'
import { type Draft, type Parsed, parseItinerary, SAMPLE } from './parser'

/* ---------- UI ---------- */
export default function ImportModal({ onClose, onCreate }: { onClose: () => void; onCreate: (t: Omit<Trip, 'id' | 'ownerId'>) => void }) {
  const [text, setText] = useState('')
  const [parsed, setParsed] = useState<Parsed | null>(null)
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [meta, setMeta] = useState({ name: '', destination: '', start: isoOf(new Date()) })
  const [drag, setDrag] = useState(false)
  const [plan, setPlan] = useState<{ limit: string; color: string; extras: Extra[] }>({ limit: '', color: THEMES[0], extras: [] })

  const run = (t: string) => {
    const p = parseItinerary(t)
    if (!p.acts.length) { setErr('No timed activities found. Add lines with a time, e.g. "9:00 AM Museum visit - Intramuros - PHP 200".'); return }
    setErr(''); setParsed(p)
    setMeta({ name: p.name || 'Imported trip', destination: p.destination || p.acts[0].location, start: p.firstDate ?? isoOf(new Date()) })
  }
  const onFile = async (f?: File) => {
    if (!f) return
    if (!/\.(txt|md|docx|pdf)$/i.test(f.name)) { setErr('Use a .txt, .md, .docx or .pdf file.'); return }
    setBusy(`Reading ${f.name}…`); setErr('')
    try { const t = await extractText(f); setText(t); run(t) } catch { setErr('Could not read that file. Try copying the text and pasting it here instead.') }
    setBusy('')
  }

  // Resolve dates: explicit date wins; otherwise Day N from the chosen start date
  const resolved = useMemo(() => {
    if (!parsed) return []
    return parsed.acts.map(a => ({ ...a, date: a.date ?? addDays(meta.start, (a.day ?? 1) - 1) }))
  }, [parsed, meta.start])
  const kept = resolved.filter(a => a.keep)
  const range = kept.length ? { start: kept.reduce((m, a) => (a.date < m ? a.date : m), kept[0].date), end: kept.reduce((m, a) => (a.date > m ? a.date : m), kept[0].date) } : null
  const upd = (id: string, p: Partial<Draft>) => setParsed(s => s && { ...s, acts: s.acts.map(a => (a.id === id ? { ...a, ...p } : a)) })
  const hasDayOnly = parsed?.acts.some(a => !a.date)

  const create = () => {
    if (!parsed || !range || !meta.name.trim() || !meta.destination.trim()) return
    const acts: Activity[] = sortActs(kept.map(a => ({ id: uid(), title: a.title, location: a.location || meta.destination, time: a.time, cost: a.cost, notes: a.notes, category: a.category, date: a.date })))
    onCreate({ name: meta.name.trim().slice(0, 120), destination: meta.destination.trim().slice(0, 120), start: range.start, end: range.end, description: parsed.description.slice(0, 1000), activities: acts, checklist: [],
      color: plan.color, budget: /^\d+(\.\d{1,2})?$/.test(plan.limit) && +plan.limit > 0 ? +plan.limit : undefined, extras: plan.extras.filter(x => x.label.trim()) })
  }

  return (
    <Modal title={parsed ? 'Review your itinerary' : 'Import an itinerary'} onClose={onClose}>
      {!parsed ? (
        <div className="space-y-4">
          <label onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files[0]) }}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition ${drag ? 'border-pine bg-moss' : 'border-line2 hover:bg-moss/50'}`}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-pine"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M12 18v-6M9 15l3-3 3 3" /></svg>
            <span className="mt-3 font-semibold">{busy || 'Drop a file or click to upload'}</span>
            <span className="mt-1 text-xs text-ink/50">.txt, .docx or .pdf. Everything is read in your browser.</span>
            <input type="file" accept=".txt,.md,.docx,.pdf" className="hidden" onChange={e => onFile(e.target.files?.[0])} />
          </label>
          <div className="flex items-center gap-3 text-xs text-ink/40"><span className="h-px flex-1 bg-line" />or paste text<span className="h-px flex-1 bg-line" /></div>
          <textarea className="input font-mono text-xs" rows={7} value={text} onChange={e => setText(e.target.value)} placeholder={'Day 1 - Nov 20\n8:00 AM Breakfast at Cafe by the Ruins - PHP 400\n10:00 AM Burnham Park - Baguio'} />
          {err && <p className="text-sm text-clay">{err}</p>}
          <div className="flex flex-wrap justify-between gap-2">
            <button className="btn btn-ghost text-pine" onClick={() => { setText(SAMPLE); run(SAMPLE) }}>Try a sample</button>
            <button className="btn btn-primary" disabled={!text.trim()} onClick={() => run(text)}>Read itinerary</button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="rounded-lg bg-moss p-3 text-sm text-ink/70">Found <b>{parsed.acts.length}</b> activities. Check the details, untick anything that's wrong, then create the trip.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Trip name"><input className="input" value={meta.name} onChange={e => setMeta({ ...meta, name: e.target.value })} /></Field>
            <Field label="Destination"><input className="input" value={meta.destination} onChange={e => setMeta({ ...meta, destination: e.target.value })} /></Field>
            {hasDayOnly && <Field label="Day 1 starts on"><input className="input" type="date" value={meta.start} onChange={e => setMeta({ ...meta, start: e.target.value })} /></Field>}
          </div>
          <details className="rounded-xl p-3 ring-1 ring-line" open>
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-ink/60">Budget & look</summary>
            <div className="mt-3 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Budget limit (PHP, optional)"><input className="input" inputMode="decimal" placeholder="e.g. 20000" value={plan.limit} onChange={e => setPlan({ ...plan, limit: e.target.value })} /></Field>
                <Field label="Trip color"><div className="flex flex-wrap gap-1.5 pt-1">{THEMES.map(c => <button type="button" key={c} aria-label={`Theme ${c}`} onClick={() => setPlan({ ...plan, color: c })} className={`h-7 w-7 rounded-full ring-offset-2 ring-offset-sand ${plan.color === c ? 'ring-2 ring-ink' : ''}`} style={{ background: c }} />)}</div></Field>
              </div>
              <div><span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink/60">Miscellaneous / other spending</span><ExtrasEditor items={plan.extras} onChange={x => setPlan({ ...plan, extras: x })} /></div>
            </div>
          </details>
          {range && <p className="text-sm text-ink/60">{fmt(range.start, { month: 'long', day: 'numeric', year: 'numeric' })} – {fmt(range.end, { month: 'long', day: 'numeric', year: 'numeric' })} · budget {php(kept.reduce((s, a) => s + a.cost, 0) + plan.extras.reduce((s, x) => s + x.est, 0))}{plan.limit && +plan.limit > 0 ? ` of ${php(+plan.limit)} limit` : ''}</p>}
          <ul className="max-h-80 space-y-2 overflow-auto pr-1">
            {sortActs(resolved as Activity[]).map(a0 => {
              const a = a0 as unknown as Draft & { date: string }
              return (
                <li key={a.id} className={`rounded-xl bg-card p-3 ring-1 ring-line ${a.keep ? '' : 'opacity-40'}`}>
                  <div className="flex items-start gap-3">
                    <input type="checkbox" className="mt-1 h-4 w-4 accent-[#2f5d4e]" checked={a.keep} onChange={() => upd(a.id, { keep: !a.keep })} />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-pine">{fmt(a.date, { weekday: 'short', month: 'short', day: 'numeric' })} · {fmtTime(a.time)}</span>
                        <select className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white" style={{ background: CATS[catOf(a as unknown as Activity)].color }} value={a.category} onChange={e => upd(a.id, { category: e.target.value as Cat })}>
                          {(Object.keys(CATS) as Cat[]).map(c => <option key={c} value={c} className="bg-card text-ink">{CATS[c].label}</option>)}
                        </select>
                      </div>
                      <input className="w-full bg-transparent font-semibold outline-none" value={a.title} onChange={e => upd(a.id, { title: e.target.value })} />
                      <div className="flex gap-2">
                        <input className="min-w-0 flex-1 bg-transparent text-sm text-ink/60 outline-none" value={a.location} onChange={e => upd(a.id, { location: e.target.value })} />
                        <input className="w-24 bg-transparent text-right text-sm outline-none" inputMode="decimal" value={a.cost} onChange={e => upd(a.id, { cost: Math.max(0, Number(e.target.value) || 0) })} />
                      </div>
                      {a.notes && <div className="text-xs italic text-ink/50">{a.notes}</div>}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="flex justify-between gap-2">
            <button className="btn btn-ghost" onClick={() => setParsed(null)}>← Back</button>
            <button className="btn btn-primary" disabled={!kept.length} onClick={create}>Create trip with {kept.length} activities</button>
          </div>
        </div>
      )}
    </Modal>
  )
}
