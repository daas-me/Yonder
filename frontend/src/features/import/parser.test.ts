import { describe, expect, it } from 'vitest'
import { parseItinerary } from './parser'

describe('itinerary group metadata', () => {
  it('reads an optional traveler count from the itinerary header', () => {
    const parsed = parseItinerary(`Trip: Weekend away
Destination: Baguio
Pax: 4
Day 1 - 2026-11-20
9:00 AM Breakfast - Baguio - PHP 300`)

    expect(parsed.travelerCount).toBe(4)
    expect(parsed.acts).toHaveLength(1)
  })

  it('leaves the trip solo when group metadata is not provided', () => {
    expect(parseItinerary('Trip: Solo day\n9:00 AM Museum - Baguio').travelerCount).toBeUndefined()
  })
})
