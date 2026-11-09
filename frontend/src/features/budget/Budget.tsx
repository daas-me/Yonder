import { useEffect, useId, useState } from 'react'
import { type Activity, type Cat, catOf, CATS, dayList, type Extra, fmt, fmtTime, php, planned as plannedCost, PlusIcon, sortActs, THEMES, type Trip, uid, useModalScrollLock } from '../../shared'
import { incompleteOwnOrderCount, travelerCostBreakdown } from '../../shared'

const r2 = (v: string) => { const n = Math.round(Math.max(0, Number(v) || 0) * 100) / 100; return Math.min(n, 9999999999.99) }
const phpCompact = (v: number) => `₱${Math.round(v).toLocaleString('en-PH')}`

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

export function budgetCategoryBreakdown(t: Trip) {
  const categories = (Object.keys(CATS) as Cat[])
    .map(category => ({
      key: category,
      label: category === 'other' ? 'Misc / Other' : CATS[category].label,
      value: t.activities.filter(activity => catOf(activity) === category).reduce((sum, activity) => sum + plannedCost(activity), 0)
        + (t.extras ?? []).filter(extra => extra.category === category).reduce((sum, extra) => sum + extra.est, 0),
      color: CATS[category].color,
    }))
    .filter(category => category.value > 0)
    .sort((a, b) => b.value - a.value)

  const visible: Array<{ key: string; label: string; value: number; color: string }> = categories.slice(0, 3)
  const remaining = categories.slice(3)
  if (remaining.length) {
    visible.push({
      key: 'more',
      label: `${remaining.length} more`,
      value: remaining.reduce((sum, category) => sum + category.value, 0),
      color: '#8b948e',
    })
  }
  return visible
}

function BudgetPlanSummary({ trip, boxed = true }: { trip: Trip; boxed?: boolean }) {
  const stats = budgetStats(trip)
  const hasLimit = stats.limit != null && stats.limit > 0
  const remaining = hasLimit ? stats.limit! - stats.planned : undefined
  const usage = hasLimit ? Math.min(100, (stats.planned / stats.limit!) * 100) : 0

  return (
    <section className={boxed ? 'rounded-xl p-4 ring-1 ring-line' : ''} aria-label="Planned budget summary">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-ink/50">Planned budget</div>
      <div className="mt-1 font-display text-2xl font-semibold tabular-nums">{phpCompact(stats.planned)}</div>
      {hasLimit && (
        <div className={`mt-2 inline-flex max-w-full rounded-full px-2.5 py-1 text-xs font-medium tabular-nums ${remaining! < 0 ? 'bg-clay/10 text-clay' : 'bg-pine/10 text-pine'}`}>
          <span className="truncate">{remaining! < 0 ? `${phpCompact(Math.abs(remaining!))} over` : `${phpCompact(remaining!)} left`} of {phpCompact(stats.limit!)} limit</span>
        </div>
      )}
      {hasLimit && (
        <>
          <div
            role="progressbar"
            aria-label="Planned budget used"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(100, Math.round(usage))}
            className="mt-3 h-2.5 overflow-hidden rounded-full bg-ink/10"
          >
            <div
              className={`h-full rounded-full transition-[width] ${remaining! < 0 ? 'bg-clay' : 'bg-pine'}`}
              style={{ width: `${usage}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-ink/45">
            <span>Activities {phpCompact(stats.actEst)} · Misc {phpCompact(stats.miscEst)}</span>
            <span>Limit</span>
          </div>
        </>
      )}
      {!hasLimit && <p className="mt-2 text-xs text-ink/50">Activities {phpCompact(stats.actEst)} · Misc {phpCompact(stats.miscEst)}</p>}
    </section>
  )
}

function BudgetCategorySummary({ trip, boxed = true }: { trip: Trip; boxed?: boolean }) {
  const categories = budgetCategoryBreakdown(trip)
  const planned = budgetStats(trip).planned
  const largest = categories[0]
  const stops: string[] = []
  let percentage = 0
  categories.forEach(category => {
    const start = percentage
    percentage += (category.value / planned) * 100
    stops.push(`${category.color} ${start}% ${percentage}%`)
  })

  return (
    <section className={boxed ? 'rounded-xl p-4 ring-1 ring-line' : 'mt-4 border-t border-line pt-4'} aria-label="Planned budget by category">
      <h4 className="text-[10px] font-semibold uppercase tracking-wider text-ink/50">Where it goes</h4>
      {categories.length > 0 ? (
        <div className="mt-3 grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-3">
          <div
            role="img"
            aria-label={`${Math.round((largest.value / planned) * 100)}% ${largest.label}`}
            className="relative aspect-square w-[5.5rem] rounded-full"
            style={{ background: `conic-gradient(${stops.join(', ')})` }}
          >
            <div className="absolute inset-[18%] flex flex-col items-center justify-center rounded-full bg-white text-center dark:bg-[#18201e]">
              <span className="text-sm font-semibold leading-tight">{Math.round((largest.value / planned) * 100)}%</span>
              <span className="max-w-full truncate px-1 text-[9px] leading-tight text-ink/50">{largest.label}</span>
            </div>
          </div>
          <ul className="min-w-0 space-y-1.5">
            {categories.map(category => (
              <li key={category.key} className="flex items-center justify-between gap-2 text-xs">
                <span className="flex min-w-0 items-center gap-2 text-ink/75">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
                  <span className="truncate">{category.label}</span>
                </span>
                <span className="shrink-0 tabular-nums text-ink/60">{phpCompact(category.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-3 text-xs text-ink/50">Add activities or expenses to see your planned budget split.</p>
      )}
    </section>
  )
}

export function BudgetOverview({ trip }: { trip: Trip }) {
  return (
    <div className="rounded-xl bg-sand/35 p-4 ring-1 ring-line">
      <BudgetPlanSummary trip={trip} boxed={false} />
      <BudgetCategorySummary trip={trip} boxed={false} />
      {trip.groupTrip && <PerPersonSummary trip={trip} />}
    </div>
  )
}

function PerPersonSummary({ trip, boxed = false, detailed = false }: { trip: Trip; boxed?: boolean; detailed?: boolean }) {
  const [showAll, setShowAll] = useState(false)
  const rows = travelerCostBreakdown(trip)
  const pending = incompleteOwnOrderCount(trip)
  if (!rows.length) return null
  const hasActual = trip.activities.some(activity => activity.actual != null) || (trip.extras ?? []).some(extra => extra.actual != null)
  const amounts = rows.map(row => hasActual ? row.actual : row.planned)
  const allEqual = amounts.every(amount => Math.abs(amount - amounts[0]) < 0.01)
  const maxAmount = Math.max(...amounts, 0)
  const visibleRows = detailed || showAll ? rows : rows.slice(0, 5)
  return (
    <section className={`${boxed ? 'rounded-xl p-4 ring-1 ring-line' : 'mt-4 border-t border-line pt-4'}`} aria-label="Group trip cost per person">
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-ink/50">{hasActual ? 'Spent per person' : 'Planned per person'}</h4>
        <span className="text-[10px] text-ink/45">{rows.length} pax</span>
      </div>
      {allEqual ? (
        <div className="mt-2 flex items-center gap-2.5 rounded-xl bg-moss/50 px-3 py-2.5">
          <div className="flex shrink-0 items-center pl-1.5" aria-label={`${rows.length} travelers`}>
            {rows.slice(0, 5).map((row, index) => {
              const color = THEMES[index % THEMES.length]
              return <span key={row.id} aria-hidden="true" className="-ml-1.5 grid h-7 w-7 place-items-center rounded-full border-2 border-card text-[10px] font-semibold text-white" style={{ backgroundColor: color }}>{row.label.slice(0, 1).toUpperCase()}</span>
            })}
            {rows.length > 5 && <span className="-ml-1.5 grid h-7 w-7 place-items-center rounded-full border-2 border-card bg-ink/60 text-[9px] font-semibold text-white">+{rows.length - 5}</span>}
          </div>
          <span className="min-w-0 flex-1 truncate text-sm text-ink/65">Everyone pays</span>
          <strong className="shrink-0 text-sm tabular-nums">{php(amounts[0])}</strong>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          {visibleRows.map((row, index) => {
            const amount = hasActual ? row.actual : row.planned
            const color = THEMES[index % THEMES.length]
            return <div key={row.id} className="flex items-center gap-2.5">
              <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white" style={{ backgroundColor: color }}>{row.label.slice(0, 1).toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="min-w-0 truncate text-ink/75">{row.label}</span>
                  <strong className="shrink-0 tabular-nums">{php(amount)}</strong>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/10">
                  <div className="h-full rounded-full transition-[width]" style={{ width: `${maxAmount ? (amount / maxAmount) * 100 : 0}%`, backgroundColor: color }} />
                </div>
              </div>
            </div>
          })}
          {!detailed && rows.length > 5 && <button type="button" className="w-full py-1 text-xs font-medium text-pine hover:underline" onClick={() => setShowAll(value => !value)}>{showAll ? 'Show less' : `Show all ${rows.length}`}</button>}
        </div>
      )}
      <p className="mt-2 text-[11px] leading-relaxed text-ink/45">Food and shopping are paid per order; everything else is split equally.{pending > 0 && <> <span className="text-clay">{pending} activity {pending === 1 ? 'still needs' : 'still need'} per-person amounts</span>, so {pending === 1 ? 'it is' : 'they are'} split equally for now.</>}</p>
    </section>
  )
}

function PerPersonTable({ trip }: { trip: Trip }) {
  const rows = travelerCostBreakdown(trip)
  if (!rows.length) return null
  return (
    <div className="mt-5">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-[.2em] text-ink/50">Per person</h4>
      <div className="overflow-x-auto rounded-xl ring-1 ring-line">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-sand/70 text-left text-[10px] font-semibold uppercase tracking-wider text-ink/55">
            <tr><th className="px-2.5 py-2">Traveler</th><th className="px-2.5 py-2 text-right">Shared</th><th className="px-2.5 py-2 text-right">Own orders</th><th className="px-2.5 py-2 text-right">Total</th><th className="px-2.5 py-2 text-right">Spent</th></tr>
          </thead>
          <tbody>{rows.map((row, index) => (
            <tr key={row.id} className="border-t border-line">
              <td className="px-2.5 py-2"><span className="inline-flex items-center gap-2 whitespace-nowrap font-medium"><span aria-hidden="true" className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[9px] font-semibold text-white" style={{ backgroundColor: THEMES[index % THEMES.length] }}>{row.label.slice(0, 1).toUpperCase()}</span>{row.label}</span></td>
              <td className="px-2.5 py-2 text-right tabular-nums">{num(row.shared)}</td>
              <td className="px-2.5 py-2 text-right tabular-nums">{num(row.ownOrders)}</td>
              <td className="px-2.5 py-2 text-right font-semibold tabular-nums">{num(row.planned)}</td>
              <td className="px-2.5 py-2 text-right tabular-nums">{num(row.actual)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-ink/45">Shared costs are split equally among the people on each item; own orders are what each person entered. Misc expenses are shared by everyone.</p>
    </div>
  )
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

export function budgetCsvRows(trip: Trip) {
  const stats = budgetStats(trip)
  const days = dayList(trip.start, trip.end)
  const rows = [['Section', 'Day', 'Date', 'Time', 'Item', 'Category', 'Budgeted (PHP)', 'Actual (PHP)', 'Variance (PHP)']]
  const extras = trip.extras ?? []
  sortActs(trip.activities).forEach(activity => {
    const planned = plannedCost(activity)
    rows.push([
      'Activity',
      String(days.indexOf(activity.date) + 1),
      activity.date,
      activity.time,
      activity.title,
      CATS[catOf(activity)].label,
      planned.toFixed(2),
      activity.actual?.toFixed(2) ?? '',
      activity.actual != null ? (activity.actual - planned).toFixed(2) : '',
    ])
  })
  extras.forEach(extra => rows.push([
    'Misc / Other', '', '', '', extra.label, CATS[extra.category].label,
    extra.est.toFixed(2), extra.actual?.toFixed(2) ?? '',
    extra.actual != null ? (extra.actual - extra.est).toFixed(2) : '',
  ]))
  rows.push(['TOTAL', '', '', '', '', '', stats.planned.toFixed(2), stats.actual.toFixed(2), (stats.actual - stats.planned).toFixed(2)])
  if (stats.limit) rows.push(['BUDGET LIMIT', '', '', '', '', '', stats.limit.toFixed(2), '', ''])
  if (trip.groupTrip) {
    rows.push(['PER PERSON', '', '', '', 'Traveler', 'Shared (PHP)', 'Own orders (PHP)', 'Planned total (PHP)', 'Actual (PHP)'])
    travelerCostBreakdown(trip).forEach(row => rows.push([
      'Traveler', '', '', '', row.label, row.shared.toFixed(2), row.ownOrders.toFixed(2), row.planned.toFixed(2), row.actual.toFixed(2),
    ]))
  }
  return rows
}

export function BudgetModal({ trip, readOnly, onUpdate, onClose }: { trip: Trip; readOnly?: boolean; onUpdate: (t: Trip) => void; onClose: () => void }) {
  useModalScrollLock()
  const titleId = useId()
  const s = budgetStats(trip)
  const days = dayList(trip.start, trip.end)
  const acts = sortActs(trip.activities)
  const extras = trip.extras ?? []
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])
  const cats = (Object.keys(CATS) as Cat[]).map(c => {
    const a = acts.filter(x => catOf(x) === c), e = extras.filter(x => x.category === c)
    return {
      c,
      est: a.reduce((s, x) => s + plannedCost(x), 0) + e.reduce((s, x) => s + x.est, 0),
      act: a.reduce((s, x) => s + (x.actual ?? 0), 0) + e.reduce((s, x) => s + (x.actual ?? 0), 0),
      logged: a.some(x => x.actual != null) || e.some(x => x.actual != null),
      n: a.length + e.length,
    }
  }).filter(x => x.n)

  const csv = () => {
    const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
    const rows = budgetCsvRows(trip)
    const url = URL.createObjectURL(new Blob([rows.map(r => r.map(q).join(',')).join('\n')], { type: 'text/csv' }))
    const el = document.createElement('a'); el.href = url; el.download = `${trip.name} budget.csv`; el.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden modal-surface rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="z-10 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line2 bg-sand/70 px-6 py-4 shadow-[0_2px_8px_-6px_rgba(22,32,29,0.28)]">
          <div><h3 id={titleId} className="font-display text-2xl font-semibold">Budget breakdown</h3><p className="text-sm text-ink/55">{trip.name} · {fmt(trip.start)} – {fmt(trip.end, { month: 'short', day: 'numeric', year: 'numeric' })} · amounts in PHP</p></div>
          <div className="flex gap-2"><button className="btn btn-ghost ring-1 ring-line" onClick={csv}>Export CSV</button><button className="btn btn-ghost px-3" aria-label="Close" onClick={onClose}>✕</button></div>
        </div>
        <div className="modal-scroll min-h-0 flex-1 space-y-8 overflow-auto p-6">
        <div className={`grid gap-4 ${trip.groupTrip ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
          <BudgetPlanSummary trip={trip} />
          <BudgetCategorySummary trip={trip} />
          {trip.groupTrip && <PerPersonSummary trip={trip} boxed detailed />}
        </div>

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

          <section className="space-y-5">
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
                      <td className="px-3 py-2 text-right tabular-nums">{x.logged ? num(x.act) : '—'}</td>
                    </tr>
                  ))}
                    <tr className="bg-moss/40 font-semibold">
                      <td className="px-3 py-2">Total</td>
                      <td className="px-3 py-2 text-right text-ink/60">{s.planned ? '100%' : '—'}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{num(s.planned)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{s.logged ? num(s.actual) : '—'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            {trip.groupTrip && <PerPersonTable trip={trip} />}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-3" aria-hidden="true">
                <span className="h-px flex-1 bg-gradient-to-r from-transparent via-ink/15 to-ink/15" />
                <span className="h-1 w-1 shrink-0 rounded-full bg-pine/55" />
                <span className="h-px flex-1 bg-gradient-to-l from-transparent via-ink/15 to-ink/15" />
              </div>
              <p className="text-center text-[11px] leading-relaxed text-ink/50">Estimates are for planning only — Yonder doesn’t book services or verify live prices.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
