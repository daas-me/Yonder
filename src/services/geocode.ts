export async function geocode(q: string): Promise<{ lat: number; lon: number } | null> {
  // Photon (OSM data) allows embedded/browser use; Nominatim is a fallback
  try {
    const j = await (await fetch('https://photon.komoot.io/api/?limit=1&q=' + encodeURIComponent(q))).json()
    const c = j.features?.[0]?.geometry?.coordinates
    if (c) return { lat: c[1], lon: c[0] }
  } catch { /* try fallback */ }
  try {
    const j = await (await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(q))).json()
    return j[0] ? { lat: +j[0].lat, lon: +j[0].lon } : null
  } catch { return null }
}
