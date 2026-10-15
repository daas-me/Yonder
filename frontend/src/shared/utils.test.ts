// Runtime validation coverage for: trip budgeting and schedule ordering.
import { describe, expect, it } from 'vitest'
import type { Activity, Trip } from './model'
import { daysBetween, sortActs, total } from './utils'

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
