import { describe, expect, it } from 'vitest'
import { DEFAULT_NOTIFY } from './model'
import { notificationsFor } from './notifications'
import type { Trip } from './model'

const trip: Trip = {
  id: 'trip-1',
  ownerId: 'user-1',
  name: 'Baguio weekend',
  destination: 'Baguio',
  start: '2026-06-12',
  end: '2026-06-14',
  description: '',
  budget: 1000,
  checklist: [{ id: 'one', text: 'Valid ID', done: false }, { id: 'two', text: 'Umbrella', done: false }],
  activities: [{ id: 'activity-1', title: 'Bus', date: '2026-06-12', time: '08:00', location: 'Baguio', cost: 950, notes: '' }],
}

describe('account reminders', () => {
  it('creates trip, packing, and budget reminders from trip data', () => {
    const notes = notificationsFor([trip], DEFAULT_NOTIFY, '2026-06-10')

    expect(notes.map(note => note.kind).sort()).toEqual(['budget', 'packing', 'soon'])
  })

  it('respects disabled reminder preferences', () => {
    const notes = notificationsFor([trip], { ...DEFAULT_NOTIFY, budget: false, packing: false, tripSoon: false }, '2026-06-10')

    expect(notes).toEqual([])
  })
})
