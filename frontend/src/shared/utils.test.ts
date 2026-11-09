// Runtime validation coverage for: trip budgeting and schedule ordering.
import { describe, expect, it } from 'vitest'
import type { Activity, Trip } from './model'
import { daysBetween, defaultTripCover, sortActs, total } from './utils'
import { incompleteOwnOrderCount, travelerCostBreakdown } from './groupTrips'

const activity = (overrides: Partial<Activity> = {}): Activity => ({
  id: 'activity-1',
  title: 'Visit the museum',
  date: '2026-06-12',
  time: '10:00',
  location: 'Baguio',
  cost: 500,
  notes: '',
  ...overrides,
})

const trip = (activities: Activity[], extras: Trip['extras'] = []): Trip => ({
  id: 'trip-1',
  ownerId: 'user-1',
  name: 'Baguio weekend',
  destination: 'Baguio',
  start: '2026-06-12',
  end: '2026-06-14',
  description: '',
  activities,
  extras,
})

describe('trip planning utilities', () => {
  it('chooses a default cover that matches the trip theme and destination', () => {
    expect(defaultTripCover('#7a5cc4', 'El Nido, Palawan')).toBe('/covers/yonder-violet-coast.svg')
    expect(defaultTripCover('#17675b', 'Baguio')).toBe('/covers/yonder-pine-mountains.svg')
    expect(defaultTripCover(undefined, 'Coron')).toBe('/covers/yonder-default-cover-coast.svg')
  })

  describe('group trip allocations', () => {
    const group: Trip = {
      ...trip([]),
      groupTrip: true,
      travelers: [{ id: 'you', name: '' }, { id: 'lee', name: 'Lee' }, { id: 'kai', name: 'Kai' }],
    }

    it('splits shared activities among selected travelers and miscellaneous costs among everyone', () => {
      const result = travelerCostBreakdown({
        ...group,
        activities: [activity({ cost: 100, sharedTravelerIds: ['you', 'lee'] })],
        extras: [{ id: 'fee', label: 'Fees', category: 'other', est: 30 }],
      })

      expect(result.map(({ planned }) => planned)).toEqual([60, 60, 10])
    })

    it('uses own-order amounts and distributes actual spending in the same proportions', () => {
      const result = travelerCostBreakdown({
        ...group,
        activities: [activity({ cost: 100, actual: 50, shareMode: 'own', personalAmounts: { you: 25, lee: 75, kai: 0 } })],
        extras: [],
      })

      expect(result.map(({ planned, actual, ownOrders }) => ({ planned, actual, ownOrders }))).toEqual([
        { planned: 25, actual: 12.5, ownOrders: 25 },
        { planned: 75, actual: 37.5, ownOrders: 75 },
        { planned: 0, actual: 0, ownOrders: 0 },
      ])
      expect(incompleteOwnOrderCount({ ...group, activities: [activity({ shareMode: 'own', personalAmounts: { you: 25 } })] })).toBe(1)
    })

    it('falls back to equal shares until own-order amounts are complete and preserves cents', () => {
      const result = travelerCostBreakdown({
        ...group,
        activities: [activity({ cost: 10, shareMode: 'own', personalAmounts: { you: 5 } })],
        extras: [],
      })

      expect(result.map(({ planned }) => planned)).toEqual([3.34, 3.33, 3.33])
    })
  })

  it('counts trip days inclusively so nights are one fewer than days', () => {
    const days = daysBetween('2026-06-12', '2026-06-13')

    expect(days).toBe(2)
    expect(days - 1).toBe(1)
  })

  it('excludes cancelled activities and includes estimated extras in the planned budget', () => {
    const plannedTrip = trip(
      [activity(), activity({ id: 'activity-2', cost: 900, status: 'cancelled' })],
      [{ id: 'extra-1', label: 'Snacks', category: 'food', est: 250 }],
    )

    expect(total(plannedTrip)).toBe(750)
  })

  it('sorts activities chronologically without changing the input list', () => {
    const later = activity({ id: 'later', date: '2026-06-13', time: '08:00' })
    const evening = activity({ id: 'evening', time: '18:00' })
    const morning = activity({ id: 'morning', time: '08:00' })
    const activities = [later, evening, morning]

    expect(sortActs(activities).map(({ id }) => id)).toEqual(['morning', 'evening', 'later'])
    expect(activities.map(({ id }) => id)).toEqual(['later', 'evening', 'morning'])
  })
})
