import { type Trip } from './model'
import { uid } from './utils'

export function sampleTrip(ownerId: string): Trip {
  return {
    id: uid(), ownerId, name: 'Weekend in Baguio', destination: 'Baguio City, Benguet', start: '2026-11-20', end: '2026-11-22',
    description: 'Cool air, strawberries and pine forests.', budget: 3000, tagline: 'Sweater weather & strawberry taho',
    extras: [{ id: uid(), label: 'Pasalubong', category: 'shopping', est: 500 }, { id: uid(), label: 'Tips & taxi', category: 'other', est: 300 }],
    checklist: [{ id: uid(), text: 'Jacket', done: true }, { id: uid(), text: 'Umbrella', done: false }, { id: uid(), text: 'Valid ID', done: false }],
    activities: [
      { id: uid(), category: 'transport', title: 'Bus to Baguio', date: '2026-11-20', time: '06:00', location: 'Victory Liner Cubao', cost: 750, notes: 'Deluxe seat' },
      { id: uid(), category: 'food', title: 'Lunch at Good Taste', date: '2026-11-20', time: '12:30', location: 'Carino St.', cost: 450, notes: '' },
      { id: uid(), category: 'sights', title: 'Strawberry picking', date: '2026-11-21', time: '08:00', location: 'La Trinidad Farm', cost: 300.5, notes: '' },
      { id: uid(), category: 'sights', title: 'Mines View Park', date: '2026-11-21', time: '14:00', location: 'Mines View', cost: 250, notes: 'Bring jacket' },
    ],
  }
}
