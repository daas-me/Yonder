import { useState } from 'react'
import { type Cat, CATS, DEFAULT_CATEGORY_SHARE_MODES, display, fromBaseCurrency, MAX_PAX, php, toBaseCurrency, type Prefs, type CostShareMode } from '../../shared'
import { Card, ChipList, Row, Seg } from './controls'

const PACKING = ['Valid ID', 'Phone charger', 'Power bank', 'Toiletries', 'Umbrella', 'Medicine kit', 'Sunscreen', 'Swimwear', 'Jacket', 'Eco bag']

export default function TripDefaults({ prefs, onPrefs }: { prefs: Prefs; onPrefs: (patch: Partial<Prefs>) => void }) {
  const initialBudgetText = prefs.dailyBudget == null ? '' : fromBaseCurrency(prefs.dailyBudget).toFixed(2)
  const [budgetText, setBudgetText] = useState(initialBudgetText)
  const [savedBudgetText, setSavedBudgetText] = useState(initialBudgetText)
  const [budgetError, setBudgetError] = useState('')
  const rules = { ...DEFAULT_CATEGORY_SHARE_MODES, ...prefs.splitRules }
  const minPax = Math.max(2, prefs.companions.length + 1)

  const saveBudget = () => {
    const value = budgetText.trim()
    if (value && !/^\d+(\.\d{1,2})?$/.test(value)) {
      setBudgetError('Enter a nonnegative amount with up to 2 decimals.')
      return
    }
    setBudgetError('')
    if (value === savedBudgetText) return
    setSavedBudgetText(value)
    onPrefs({ dailyBudget: value ? toBaseCurrency(Number(value)) : undefined })
  }
  const updateCompanions = (companions: string[]) => onPrefs({ companions, pax: Math.min(MAX_PAX, Math.max(prefs.pax, companions.length + 1)) })
  const tripDays = 4

  return (
    <div className="space-y-5 sm:space-y-6">
      <Card title="Who usually comes" hint="New trips start with these settings. You can still change them on each trip.">
        <Row title="Default trip type">
          <Seg value={prefs.tripType} options={[['solo', 'Solo'], ['group', 'Group']]} label="Default trip type" onChange={tripType => onPrefs({ tripType })} />
        </Row>
        <Row title="Usual travel companions" hint="These names are added to new group trips.">
          <div className="w-full sm:w-80">
            <ChipList items={prefs.companions} onChange={updateCompanions} placeholder="Add a name, e.g. Ana" max={MAX_PAX - 1} />
            {prefs.tripType === 'group' && <div className="mt-3 flex items-center justify-between gap-3 text-xs text-ink/60">
              <span>Usual group size, including you</span>
              <div className="flex items-center gap-2">
                <button type="button" aria-label="Remove one traveler" className="h-8 w-8 rounded-lg border border-line2" disabled={prefs.pax <= minPax} onClick={() => onPrefs({ pax: Math.max(minPax, prefs.pax - 1) })}>−</button>
                <span className="min-w-6 text-center font-semibold tabular-nums">{Math.max(minPax, prefs.pax)}</span>
                <button type="button" aria-label="Add one traveler" className="h-8 w-8 rounded-lg border border-line2" disabled={prefs.pax >= MAX_PAX} onClick={() => onPrefs({ pax: Math.min(MAX_PAX, prefs.pax + 1) })}>+</button>
              </div>
            </div>}
          </div>
        </Row>
      </Card>

      <Card title="Cost sharing" hint="How group trips split each kind of cost by default."
        aside={<button type="button" className="text-xs font-semibold text-pine hover:underline" onClick={() => onPrefs({ splitRules: {} })}>Reset to Yonder defaults</button>}>
        <div className="divide-y divide-line2 overflow-hidden rounded-xl border border-line2">
          {(Object.keys(CATS) as Cat[]).map(category => {
            const value = rules[category]
            return (
              <div key={category} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                <span className="flex items-center gap-2 text-sm"><span className="h-2 w-2 rounded-full" style={{ background: CATS[category].color }} />{category === 'other' ? 'Misc / Other' : CATS[category].label}</span>
                <Seg<CostShareMode> value={value} options={[['equal', 'Split equally'], ['own', 'Each pays own']]} label={`${CATS[category].label} cost sharing`} onChange={split => onPrefs({ splitRules: { ...prefs.splitRules, [category]: split } })} />
              </div>
            )
          })}
        </div>
      </Card>

      <Card title="Budget" hint="A daily amount can suggest a total limit for new trips.">
        <Row title={`Budget per day (${display.currency}, optional)`} hint={`A ${tripDays}-day trip would start with a ${prefs.dailyBudget ? php(prefs.dailyBudget * tripDays) : 'no'} limit.`}>
          <label className="flex w-full items-center gap-2 sm:w-48">
            <span className="font-semibold text-pine">{display.currency}</span>
            <input className="input min-w-0" inputMode="decimal" placeholder="e.g. 2500" value={budgetText}
              onChange={event => { setBudgetText(event.target.value); setBudgetError('') }}
              onBlur={saveBudget}
              onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); saveBudget() } }} />
          </label>
        </Row>
        {budgetError && <p role="alert" className="mt-2 text-xs text-clay">{budgetError}</p>}
      </Card>

      <Card title="Packing list template" hint="Added to the packing list of every new trip, including imported ones.">
        <ChipList items={prefs.packing} onChange={packing => onPrefs({ packing })} placeholder="Add an item and press Enter" suggestions={PACKING} max={60} />
      </Card>
    </div>
  )
}
