import type { NotifyPrefs, Trip } from './model'
import { addDays, daysBetween, fmt, isoOf, php, total, totalActual } from './utils'

export type NoteKind = 'soon' | 'packing' | 'budget' | 'spending'
export type Note = { id: string; tripId: string; kind: NoteKind; title: string; body: string; tone: 'info' | 'warn' | 'alert' }

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export function notificationsFor(trips: Trip[], prefs: NotifyPrefs, today = isoOf(new Date())): Note[] {
  const notes: Note[] = []
  for (const trip of trips) {
    const until = daysBetween(today, trip.start) - 1
    if (prefs.tripSoon && until >= 0 && until <= prefs.soonDays) {
      notes.push({
        id: `soon:${trip.id}:${until}`,
        tripId: trip.id,
        kind: 'soon',
        tone: 'info',
        title: until === 0 ? `${trip.name} starts today` : until === 1 ? `${trip.name} starts tomorrow` : `${trip.name} starts in ${until} days`,
        body: `${trip.destination} · ${fmt(trip.start, { weekday: 'short', month: 'short', day: 'numeric' })}`,
      })
    }

    const unpacked = (trip.checklist ?? []).filter(item => !item.done).length
    if (prefs.packing && unpacked > 0 && until >= 0 && until <= Math.max(prefs.soonDays, 2)) {
      notes.push({
        id: `pack:${trip.id}:${until}:${unpacked}`,
        tripId: trip.id,
        kind: 'packing',
        tone: until <= 1 ? 'warn' : 'info',
        title: `${plural(unpacked, 'item')} left to pack`,
        body: `For ${trip.name}${until === 0 ? ', leaving today' : until === 1 ? ', leaving tomorrow' : ''}`,
      })
    }

    if (prefs.budget && trip.budget && trip.budget > 0 && trip.end >= today) {
      const logged = trip.activities.some(activity => activity.actual != null) || (trip.extras ?? []).some(extra => extra.actual != null)
      const amount = logged ? totalActual(trip) : total(trip)
      const percentage = amount / trip.budget * 100
      if (percentage >= prefs.budgetAt) {
        notes.push({
          id: `budget:${trip.id}:${logged ? 'a' : 'p'}:${Math.min(11, Math.floor(percentage / 10))}`,
          tripId: trip.id,
          kind: 'budget',
          tone: percentage > 100 ? 'alert' : 'warn',
          title: percentage > 100 ? `${trip.name} is over budget` : `${trip.name} is at ${Math.round(percentage)}% of its limit`,
          body: `${logged ? 'Spent' : 'Planned'} ${php(amount)} of ${php(trip.budget)}${percentage > 100 ? ` · ${php(amount - trip.budget)} over` : ''}`,
        })
      }
    }

    if (prefs.logSpending && trip.start <= today && today <= addDays(trip.end, 1)) {
      const missing = trip.activities.filter(activity => activity.date <= today && activity.status !== 'cancelled' && activity.actual == null && activity.cost > 0).length
      if (missing > 0) {
        notes.push({
          id: `spend:${trip.id}:${today}:${missing}`,
          tripId: trip.id,
          kind: 'spending',
          tone: 'info',
          title: `Log spending for ${plural(missing, 'activity', 'activities')}`,
          body: `${trip.name} · keeps your budget accurate`,
        })
      }
    }
  }
  const rank = { alert: 0, warn: 1, info: 2 }
  return notes.sort((a, b) => rank[a.tone] - rank[b.tone])
}
