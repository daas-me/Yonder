import { addDays, dayList, isoOf } from '../shared'

export type Weather = { date: string; code: number; max: number; min: number; rain?: number; kind: 'forecast' | 'history' | 'lastyear' }
export async function weatherFor(geo: { lat: number; lon: number }, start: string, end: string): Promise<Record<string, Weather>> {
  const today = isoOf(new Date())
  const fEnd = addDays(today, 15)
  const out: Record<string, Weather> = {}
  const q = `latitude=${geo.lat}&longitude=${geo.lon}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`
  const take = async (url: string, map: (d: string) => string, kind: Weather['kind']) => {
    try {
      const j = await (await fetch(url)).json()
      j.daily?.time?.forEach((d: string, i: number) => { if (j.daily.weathercode[i] != null) out[map(d)] = { date: map(d), code: j.daily.weathercode[i], max: j.daily.temperature_2m_max[i], min: j.daily.temperature_2m_min[i], rain: j.daily.precipitation_probability_max?.[i], kind } })
    } catch { /* ignore */ }
  }
  const days = dayList(start, end)
  const fc = days.filter(d => d >= today && d <= fEnd)
  const past = days.filter(d => d < addDays(today, -5))
  const later = days.filter(d => d > fEnd)
  const shift = (d: string, y: number) => `${+d.slice(0, 4) + y}${d.slice(4)}`
  const jobs: Promise<void>[] = []
  if (fc.length) jobs.push(take(`https://api.open-meteo.com/v1/forecast?${q},precipitation_probability_max&start_date=${fc[0]}&end_date=${fc[fc.length - 1]}`, d => d, 'forecast'))
  if (past.length) jobs.push(take(`https://archive-api.open-meteo.com/v1/archive?${q}&start_date=${past[0]}&end_date=${past[past.length - 1]}`, d => d, 'history'))
  if (later.length) {
    let y = -1; while (shift(later[later.length - 1], y) > addDays(today, -5)) y--
    jobs.push(take(`https://archive-api.open-meteo.com/v1/archive?${q}&start_date=${shift(later[0], y)}&end_date=${shift(later[later.length - 1], y)}`, d => shift(d, -y), 'lastyear'))
  }
  await Promise.all(jobs)
  return out
}
export const weatherLabel = (c: number) => c === 0 ? 'Clear' : c <= 2 ? 'Partly cloudy' : c === 3 ? 'Overcast' : c <= 48 ? 'Fog' : c <= 57 ? 'Drizzle' : c <= 67 ? 'Rain' : c <= 77 ? 'Snow' : c <= 82 ? 'Showers' : 'Storm'
