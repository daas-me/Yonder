import { describe, expect, it } from 'vitest'
import { display, type Trip } from '../../shared'
import { budgetCategoryBreakdown, budgetCsvRows } from './Budget'

const trip: Trip = {
  id: 'trip-1',
  ownerId: 'user-1',
  name: 'Baguio weekend',
  destination: 'Baguio',
  start: '2026-06-12',
  end: '2026-06-12',
  description: '',
  budget: 1000,
  activities: [
    {
      id: 'cancelled',
      title: 'Cancelled tour',
      date: '2026-06-12',
      time: '10:00',
      location: 'Baguio',
      cost: 500,
      actual: 50,
      status: 'cancelled',
      notes: '',
    },
    {
      id: 'active',
      title: 'Museum visit',
      date: '2026-06-12',
      time: '12:00',
      location: 'Baguio',
      cost: 200,
      actual: 150,
      notes: '',
    },
  ],
  extras: [{ id: 'extra', label: 'Snacks', category: 'food', est: 100, actual: 80 }],
}

describe('budget CSV export', () => {
  it('excludes cancelled activity estimates from rows and variance to match totals', () => {
    const rows = budgetCsvRows(trip)

    expect(rows[1]).toEqual([
      'Activity', '1', '2026-06-12', '10:00', 'Cancelled tour', 'Other', '0.00', '50.00', '50.00',
    ])
    expect(rows.at(-2)).toEqual([
      'TOTAL', '', '', '', '', '', '300.00', '280.00', '-20.00',
    ])
  })

  it('exports converted amounts and the selected currency code', () => {
    display.currency = 'USD'
    display.currencyRate = 0.015829
    const rows = budgetCsvRows(trip)

    expect(rows[0][6]).toBe('Budgeted (USD)')
    expect(rows[1][6]).toBe('0.00')
    expect(rows[2][6]).toBe('3.17')

    display.currency = 'PHP'
    display.currencyRate = 1
  })
})

describe('budget category summary', () => {
  it('shows the three largest categories and groups the rest', () => {
    const categorizedTrip: Trip = {
      ...trip,
      activities: [
        { ...trip.activities[0], category: 'food', cost: 1000, status: 'cancelled' },
        { ...trip.activities[1], category: 'food', cost: 700 },
        { ...trip.activities[1], id: 'lodging', category: 'lodging', cost: 500 },
        { ...trip.activities[1], id: 'transport', category: 'transport', cost: 300 },
        { ...trip.activities[1], id: 'sights', category: 'sights', cost: 200 },
        { ...trip.activities[1], id: 'shopping', category: 'shopping', cost: 100 },
        { ...trip.activities[1], id: 'other', category: 'other', cost: 50 },
      ],
      extras: [],
    }

    expect(budgetCategoryBreakdown(categorizedTrip)).toEqual([
      { key: 'food', label: 'Food', value: 700, color: '#ec6a3c' },
      { key: 'lodging', label: 'Lodging', value: 500, color: '#7a5cc4' },
      { key: 'transport', label: 'Transport', value: 300, color: '#2f6f9f' },
      { key: 'more', label: '3 more', value: 350, color: '#8b948e' },
    ])
  })

  it('returns no categories when planned costs are zero', () => {
    const cancelledTrip: Trip = {
      ...trip,
      activities: [{ ...trip.activities[0], category: 'food', cost: 500, status: 'cancelled' }],
      extras: [],
    }

    expect(budgetCategoryBreakdown(cancelledTrip)).toEqual([])
  })
})
