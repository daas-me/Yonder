import { catOf, CATS, type Activity, type Cat, type CostShareMode, type Extra, type Trip, type TripTraveler } from './model'
import { planned } from './utils'

export const DEFAULT_CATEGORY_SHARE_MODES: Record<Cat, CostShareMode> = {
  transport: 'equal',
  food: 'own',
  lodging: 'equal',
  sights: 'equal',
  shopping: 'own',
  other: 'equal',
}

export function categoryShareMode(trip: Trip, category: Cat): CostShareMode {
  return trip.categoryShareModes?.[category] ?? DEFAULT_CATEGORY_SHARE_MODES[category]
}

export function activityShareMode(trip: Trip, activity: Activity): CostShareMode {
  return activity.shareMode ?? categoryShareMode(trip, catOf(activity))
}

export function travelerLabel(traveler: TripTraveler, index: number) {
  return traveler.name.trim() || (index === 0 ? 'You' : `Traveler ${index + 1}`)
}

function distributeCents(amount: number, ids: string[]) {
  const cents = Math.round(amount * 100)
  const base = Math.floor(cents / ids.length)
  let remainder = cents - base * ids.length
  return Object.fromEntries(ids.map(id => {
    const share = base + (remainder-- > 0 ? 1 : 0)
    return [id, share / 100]
  }))
}

function normalizedActivityAmounts(trip: Trip, activity: Activity, value: number) {
  const travelers = trip.travelers ?? []
  if (!travelers.length) return { shares: {} as Record<string, number>, pending: false }
  const mode = activityShareMode(trip, activity)
  if (mode === 'own') {
    const amounts = activity.personalAmounts ?? {}
    const complete = travelers.every(({ id }) => Number.isFinite(amounts[id]) && amounts[id] >= 0)
    const total = travelers.reduce((sum, { id }) => sum + (amounts[id] ?? 0), 0)
    if (complete && total === 0 && value === 0) {
      return { shares: Object.fromEntries(travelers.map(({ id }) => [id, 0])), pending: false }
    }
    if (complete && total > 0) {
      if (value === activity.cost) return { shares: Object.fromEntries(travelers.map(({ id }) => [id, Math.round(amounts[id] * 100) / 100])), pending: false }
      const proportional = travelers.map(({ id }) => ({ id, raw: (value * amounts[id]) / total }))
      const rounded = proportional.map(({ id, raw }) => ({ id, cents: Math.floor(raw * 100), fraction: raw * 100 - Math.floor(raw * 100) }))
      let centsLeft = Math.round(value * 100) - rounded.reduce((sum, row) => sum + row.cents, 0)
      rounded.sort((a, b) => b.fraction - a.fraction)
      for (let index = 0; index < centsLeft; index++) rounded[index].cents++
      return { shares: Object.fromEntries(rounded.map(({ id, cents }) => [id, cents / 100])), pending: false }
    }
    return { shares: distributeCents(value, travelers.map(({ id }) => id)), pending: true }
  }
  const eligible = activity.sharedTravelerIds?.length
    ? travelers.filter(({ id }) => activity.sharedTravelerIds!.includes(id)).map(({ id }) => id)
    : travelers.map(({ id }) => id)
  return { shares: eligible.length ? distributeCents(value, eligible) : {}, pending: false }
}

export type TravelerCost = { id: string; label: string; planned: number; shared: number; ownOrders: number; actual: number }

export function travelerCostBreakdown(trip: Trip): TravelerCost[] {
  if (!trip.groupTrip || !trip.travelers?.length) return []
  const rows = trip.travelers.map((traveler, index) => ({
    id: traveler.id,
    label: travelerLabel(traveler, index),
    planned: 0,
    shared: 0,
    ownOrders: 0,
    actual: 0,
  }))
  const byId = new Map(rows.map(row => [row.id, row]))
  const addActivity = (activity: Activity, value: number, kind: 'planned' | 'actual') => {
    const { shares } = normalizedActivityAmounts(trip, activity, value)
    Object.entries(shares).forEach(([id, amount]) => {
      const row = byId.get(id)
      if (!row) return
      if (kind === 'planned') {
        row.planned += amount
        if (activityShareMode(trip, activity) === 'own') row.ownOrders += amount
        else row.shared += amount
      } else row.actual += amount
    })
  }
  trip.activities.forEach(activity => {
    if (activity.status !== 'cancelled') addActivity(activity, planned(activity), 'planned')
    if (activity.actual != null) addActivity(activity, activity.actual, 'actual')
  })
  ;(trip.extras ?? []).forEach((extra: Extra) => {
    const shares = distributeCents(extra.est, rows.map(row => row.id))
    Object.entries(shares).forEach(([id, amount]) => {
      const row = byId.get(id)!
      row.planned += amount
      row.shared += amount
    })
    if (extra.actual != null) {
      Object.entries(distributeCents(extra.actual, rows.map(row => row.id))).forEach(([id, amount]) => {
        byId.get(id)!.actual += amount
      })
    }
  })
  return rows.map(row => ({
    ...row,
    planned: Math.round(row.planned * 100) / 100,
    shared: Math.round(row.shared * 100) / 100,
    ownOrders: Math.round(row.ownOrders * 100) / 100,
    actual: Math.round(row.actual * 100) / 100,
  }))
}

export function incompleteOwnOrderCount(trip: Trip) {
  if (!trip.groupTrip || !trip.travelers?.length) return 0
  return trip.activities.filter(activity => activityShareMode(trip, activity) === 'own'
    && (activity.status !== 'cancelled')
    && !(activity.personalAmounts && trip.travelers!.every(({ id }) =>
      Number.isFinite(activity.personalAmounts?.[id]) && (activity.personalAmounts?.[id] ?? -1) >= 0)))
    .length
}

export function groupCategoryRows(trip: Trip) {
  const values = (Object.keys(CATS) as Cat[]).map(category => {
    const activities = trip.activities.filter(activity => catOf(activity) === category)
    const extras = (trip.extras ?? []).filter(extra => extra.category === category)
    return {
      category,
      label: category === 'other' ? 'Misc / Other' : CATS[category].label,
      planned: activities.reduce((sum, activity) => sum + planned(activity), 0) + extras.reduce((sum, extra) => sum + extra.est, 0),
      actual: activities.reduce((sum, activity) => sum + (activity.actual ?? 0), 0) + extras.reduce((sum, extra) => sum + (extra.actual ?? 0), 0),
    }
  })
  return values.filter(row => row.planned > 0 || row.actual > 0)
}
