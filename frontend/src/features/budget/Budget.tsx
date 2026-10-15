import { type Activity, type Cat, catOf, CATS, dayList, type Extra, fmt, fmtTime, php, planned as plannedCost, PlusIcon, sortActs, type Trip, uid } from '../../shared'

const r2 = (v: string) => { const n = Math.round(Math.max(0, Number(v) || 0) * 100) / 100; return Math.min(n, 9999999999.99) }

export function budgetStats(t: Trip) {
  const ex = t.extras ?? []
  const actEst = t.activities.reduce((s, a) => s + plannedCost(a), 0)
  const miscEst = ex.reduce((s, e) => s + e.est, 0)
  const actAct = t.activities.reduce((s, a) => s + (a.actual ?? 0), 0)
  const miscAct = ex.reduce((s, e) => s + (e.actual ?? 0), 0)
  const planned = actEst + miscEst, actual = actAct + miscAct
  const logged = t.activities.some(a => a.actual != null) || ex.some(e => e.actual != null)
  return { actEst, miscEst, actAct, miscAct, planned, actual, logged, limit: t.budget }
}

/* Inline editable list of trip-level miscellaneous / other costs */
export function ExtrasEditor({ items, onChange, readOnly, dense }: { items: Extra[]; onChange: (x: Extra[]) => void; readOnly?: boolean; dense?: boolean }) {
  const set = (id: string, p: Partial<Extra>) => onChange(items.map(x => (x.id === id ? { ...x, ...p } : x)))
  const cell = 'w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm outline-none hover:border-line2 focus:border-pine focus:bg-field'
  return (
    <div>
      {items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead><tr className="text-left text-xs text-ink/55">
              <th className="px-2 py-1 font-medium">Item</th><th className="px-2 py-1 font-medium">Type</th>
              <th className="px-2 py-1 text-right font-medium">Budgeted</th><th className="px-2 py-1 text-right font-medium">Actual</th><th className="w-8" />
            </tr></thead>
            <tbody>
              {items.map(x => (
                <tr key={x.id} className="border-t border-line">
                  <td className="px-0 py-1"><input className={cell} readOnly={readOnly} value={x.label} placeholder="e.g. Tips, SIM card, travel insurance" onChange={e => set(x.id, { label: e.target.value.slice(0, 120) })} /></td>
                  <td className="px-0 py-1 w-32">
                    <select className={cell} disabled={readOnly} value={x.category} onChange={e => set(x.id, { category: e.target.value as Cat })}>
                      {(Object.keys(CATS) as Cat[]).map(c => <option key={c} value={c}>{c === 'other' ? 'Misc / Other' : CATS[c].label}</option>)}
                    </select>
                  </td>
                  <td className="px-0 py-1 w-32"><input className={`${cell} text-right`} readOnly={readOnly} type="number" min={0} step="0.01" value={x.est} onChange={e => set(x.id, { est: r2(e.target.value) })} /></td>
                  <td className="px-0 py-1 w-32"><input className={`${cell} text-right`} readOnly={readOnly} type="number" min={0} step="0.01" placeholder="—" value={x.actual ?? ''} onChange={e => set(x.id, { actual: e.target.value === '' ? undefined : r2(e.target.value) })} /></td>
                  <td className="text-center">{!readOnly && <button type="button" aria-label="Remove" className="rounded px-2 py-1 text-clay hover:bg-clay/10" onClick={() => onChange(items.filter(i => i.id !== x.id))}>✕</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!readOnly && (
        <div className={`flex flex-wrap gap-2 ${items.length ? 'mt-2' : ''}`}>
          <button type="button" className="btn btn-ghost inline-flex items-center justify-center gap-2 px-3 py-1.5 text-pine ring-1 ring-line" onClick={() => onChange([...items, { id: uid(), label: '', category: 'other', est: 0 }])}><PlusIcon />Add expense</button>
          {!dense && items.length === 0 && ['Travel insurance', 'Tips & fees', 'Pasalubong', 'Emergency fund'].map(l => (
            <button type="button" key={l} className="inline-flex items-center justify-center gap-1 rounded-full border border-dashed border-line2 px-3 py-1 text-xs text-ink/60 hover:border-pine hover:text-pine"
              onClick={() => onChange([...items, { id: uid(), label: l, category: l === 'Pasalubong' ? 'shopping' : 'other', est: 0 }])}><PlusIcon className="h-3 w-3" />{l}</button>
          ))}
        </div>
      )}
    </div>
  )
}

export function BudgetTiles({ t, compact }: { t: Trip; compact?: boolean }) {
  const s = budgetStats(t)
  const tiles: [string, string, string, string?][] = [
    ['Budget', php(s.planned), 'Planned activities + misc'],
    ['Budget limit', s.limit ? php(s.limit) : 'Not set', s.limit ? (s.planned > s.limit ? `${php(s.planned - s.limit)} over plan` : `${php(s.limit - s.planned)} headroom`) : 'Optional spending cap', s.limit && s.planned > s.limit ? 'text-clay' : undefined],
    ['Actual spending', s.logged ? php(s.actual) : '—', s.logged ? (s.limit ? `${Math.round((s.actual / s.limit) * 100)}% of limit used` : `${Math.round((s.actual / (s.planned || 1)) * 100)}% of budget`) : 'Log as you go', s.limit && s.actual > s.limit ? 'text-clay' : undefined],
    ['Misc / Other', php(s.miscEst), `${(t.extras ?? []).length} item(s) · spent ${php(s.miscAct)}`],
  ]
  return (
    <div className={`grid gap-2 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
      {tiles.map(([l, v, sub, tone]) => (
        <div key={l} className="rounded-xl bg-sand/70 p-3 ring-1 ring-line">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink/50">{l}</div>
          <div className={`mt-0.5 font-display ${compact ? 'text-base' : 'text-xl'} font-semibold ${tone ?? ''}`}>{v}</div>
          <div className={`text-[11px] ${tone ?? 'text-ink/50'}`}>{sub}</div>
        </div>
      ))}
    </div>
  )
}

export function LimitBar({ t }: { t: Trip }) {
  const s = budgetStats(t)
  if (!s.limit) return null
  const pct = (v: number) => `${Math.min(100, (v / s.limit!) * 100)}%`
  return (
    <div>
      <div className="relative h-3 overflow-hidden rounded-full bg-moss">
        <div className="absolute inset-y-0 left-0 rounded-full bg-pine/35" style={{ width: pct(s.planned) }} />
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: pct(s.actual), background: s.actual > s.limit ? '#ec6a3c' : '#17675b' }} />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-ink/50"><span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-pine" />Spent · <span className="mr-1 inline-block h-2 w-2 rounded-full bg-pine/35" />Planned</span><span>Limit {php(s.limit)}</span></div>
    </div>
  )
}

const varCell = (est: number, act?: number) => {
  if (act == null) return <td className="px-3 py-2 text-right text-ink/30">—</td>
  const d = act - est
  return <td className={`px-3 py-2 text-right tabular-nums ${d > 0 ? 'text-clay' : d < 0 ? 'text-pine' : 'text-ink/50'}`}>{d === 0 ? '0.00' : `${d > 0 ? '+' : '−'}${Math.abs(d).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}</td>
}
const num = (v: number) => v.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function BudgetModal({ trip, readOnly, onUpdate, onClose }: { trip: Trip; readOnly?: boolean; onUpdate: (t: Trip) => void; onClose: () => void }) {
  const s = budgetStats(trip)
  const days = dayList(trip.start, trip.end)
  const acts = sortActs(trip.activities)
  const extras = trip.extras ?? []
  const cats = (Object.keys(CATS) as Cat[]).map(c => {
    const a = acts.filter(x => catOf(x) === c), e = extras.filter(x => x.category === c)
    return { c, est: a.reduce((s, x) => s + plannedCost(x), 0) + e.reduce((s, x) => s + x.est, 0), act: a.reduce((s, x) => s + (x.actual ?? 0), 0) + e.reduce((s, x) => s + (x.actual ?? 0), 0), n: a.length + e.length }
  }).filter(x => x.n)

  const csv = () => {
    const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
    const rows = [['Section', 'Day', 'Date', 'Time', 'Item', 'Category', 'Budgeted (PHP)', 'Actual (PHP)', 'Variance (PHP)']]
    acts.forEach(a => rows.push(['Activity', String(days.indexOf(a.date) + 1), a.date, a.time, a.title, CATS[catOf(a)].label, a.cost.toFixed(2), a.actual?.toFixed(2) ?? '', a.actual != null ? (a.actual - a.cost).toFixed(2) : '']))
    extras.forEach(e => rows.push(['Misc / Other', '', '', '', e.label, CATS[e.category].label, e.est.toFixed(2), e.actual?.toFixed(2) ?? '', e.actual != null ? (e.actual - e.est).toFixed(2) : '']))
    rows.push(['TOTAL', '', '', '', '', '', s.planned.toFixed(2), s.actual.toFixed(2), (s.actual - s.planned).toFixed(2)])
    if (s.limit) rows.push(['BUDGET LIMIT', '', '', '', '', '', s.limit.toFixed(2), '', ''])
    const url = URL.createObjectURL(new Blob([rows.map(r => r.map(q).join(',')).join('\n')], { type: 'text/csv' }))
    const el = document.createElement('a'); el.href = url; el.download = `${trip.name} budget.csv`; el.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6" onClick={onClose}>
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden modal-surface rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
          <div><h3 className="font-display text-2xl font-semibold">Budget breakdown</h3><p className="text-sm text-ink/55">{trip.name} · {fmt(trip.start)} – {fmt(trip.end, { month: 'short', day: 'numeric', year: 'numeric' })} · amounts in PHP</p></div>
          <div className="flex gap-2"><button className="btn btn-ghost ring-1 ring-line" onClick={csv}>Export CSV</button><button className="btn btn-ghost px-3" aria-label="Close" onClick={onClose}>✕</button></div>
        </div>
        <div className="min-h-0 flex-1 space-y-8 overflow-auto p-6">
          <div className="space-y-3"><BudgetTiles t={trip} /><LimitBar t={trip} /></div>

          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-[.2em] text-ink/50">Itinerary activities</h4>
            <div className="overflow-x-auto rounded-xl ring-1 ring-line">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-sand/70 text-left text-[11px] uppercase tracking-wider text-ink/55">
                  <tr><th className="px-3 py-2">Day / time</th><th className="px-3 py-2">Activity</th><th className="px-3 py-2">Category</th><th className="px-3 py-2 text-right">Budgeted</th><th className="px-3 py-2 text-right">Actual</th><th className="px-3 py-2 text-right">Variance</th></tr>
                </thead>
                {days.map((d, i) => {
                  const da = acts.filter(a => a.date === d)
                  if (!da.length) return null
                  const de = da.reduce((s, a) => s + plannedCost(a), 0), dl = da.filter(a => a.actual != null), dv = dl.reduce((s, a) => s + a.actual!, 0)
                  return (
                    <tbody key={d} className="border-t border-line">
                      {da.map(a => (
                        <tr key={a.id} className="hover:bg-sand/40">
                          <td className="whitespace-nowrap px-3 py-2 text-ink/60">Day {i + 1} · {fmtTime(a.time)}</td>
                          <td className="px-3 py-2"><div className="font-medium">{a.title}</div><div className="text-xs text-ink/50">{a.location}</div></td>
                          <td className="px-3 py-2"><span className="inline-flex items-center gap-1.5 text-xs"><span className="h-2 w-2 rounded-full" style={{ background: CATS[catOf(a)].color }} />{CATS[catOf(a)].label}</span></td>
                          <td className={`px-3 py-2 text-right tabular-nums ${a.status === 'cancelled' ? 'text-ink/40 line-through' : ''}`}>{num(a.cost)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{a.actual != null ? num(a.actual) : <span className="text-ink/30">—</span>}</td>
                          {varCell(plannedCost(a), a.actual)}
                        </tr>
                      ))}
                      <tr className="bg-moss/40 text-xs font-semibold">
                        <td className="px-3 py-1.5" colSpan={3}>Day {i + 1} subtotal · {fmt(d, { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{num(de)}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{dl.length ? num(dv) : '—'}</td>
                        {dl.length ? varCell(dl.reduce((s, a) => s + plannedCost(a), 0), dv) : <td />}
                      </tr>
                    </tbody>
                  )
                })}
                {!acts.length && <tbody><tr><td colSpan={6} className="px-3 py-6 text-center text-ink/50">No activities yet.</td></tr></tbody>}
              </table>
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-[.2em] text-ink/50">Miscellaneous / other spending</h4>
              <span className="text-xs text-ink/50">Costs not tied to an activity · budgeted {php(s.miscEst)} · spent {php(s.miscAct)}</span>
            </div>
            <div className="rounded-xl p-3 ring-1 ring-line"><ExtrasEditor items={extras} readOnly={readOnly} onChange={x => onUpdate({ ...trip, extras: x })} /></div>
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-[.2em] text-ink/50">By category</h4>
              <div className="overflow-hidden rounded-xl ring-1 ring-line">
                <table className="w-full text-sm">
                  <thead className="bg-sand/70 text-left text-[11px] uppercase tracking-wider text-ink/55"><tr><th className="px-3 py-2">Category</th><th className="px-3 py-2 text-right">Share</th><th className="px-3 py-2 text-right">Budgeted</th><th className="px-3 py-2 text-right">Actual</th></tr></thead>
                  <tbody>{cats.map(x => (
                    <tr key={x.c} className="border-t border-line">
                      <td className="px-3 py-2"><span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: CATS[x.c].color }} />{x.c === 'other' ? 'Misc / Other' : CATS[x.c].label}</span></td>
                      <td className="px-3 py-2 text-right text-ink/60">{s.planned ? Math.round((x.est / s.planned) * 100) : 0}%</td>
                      <td className="px-3 py-2 text-right tabular-nums">{num(x.est)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{x.act ? num(x.act) : '—'}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-[.2em] text-ink/50">Summary</h4>
              <table className="w-full overflow-hidden rounded-xl text-sm ring-1 ring-line">
                <tbody>
                  {([
                    ['Activities budget', s.actEst, s.actAct],
                    ['Misc / other budget', s.miscEst, s.miscAct],
                  ] as [string, number, number][]).map(([l, e, a]) => (
                    <tr key={l} className="border-b border-line"><td className="px-3 py-2 text-ink/70">{l}</td><td className="px-3 py-2 text-right tabular-nums">{num(e)}</td><td className="px-3 py-2 text-right tabular-nums text-ink/60">{num(a)}</td></tr>
                  ))}
                  <tr className="border-b border-line bg-moss/40 font-semibold"><td className="px-3 py-2">Total budget / actual</td><td className="px-3 py-2 text-right tabular-nums">{num(s.planned)}</td><td className="px-3 py-2 text-right tabular-nums">{num(s.actual)}</td></tr>
                  <tr className="border-b border-line"><td className="px-3 py-2 text-ink/70">Budget limit</td><td className="px-3 py-2 text-right tabular-nums" colSpan={2}>{s.limit ? num(s.limit) : 'Not set'}</td></tr>
                  {s.limit != null && s.limit > 0 && <>
                    <tr className="border-b border-line"><td className="px-3 py-2 text-ink/70">Limit − budget</td><td className={`px-3 py-2 text-right tabular-nums ${s.limit - s.planned < 0 ? 'text-clay' : 'text-pine'}`} colSpan={2}>{num(s.limit - s.planned)}</td></tr>
                    <tr><td className="px-3 py-2 text-ink/70">Limit − actual (remaining)</td><td className={`px-3 py-2 text-right font-semibold tabular-nums ${s.limit - s.actual < 0 ? 'text-clay' : 'text-pine'}`} colSpan={2}>{num(s.limit - s.actual)}</td></tr>
                  </>}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-ink/50">Budgeted figures come from your own estimates. Yonder doesn't book anything or check live prices.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
