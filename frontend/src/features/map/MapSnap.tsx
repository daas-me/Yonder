import { useEffect, useRef, useState } from 'react'
import { loadGoogleMaps } from './googleMaps'

export function MapSnap({ lat, lon, zoom = 15, height = 150 }: { lat: number; lon: number; zoom?: number; height?: number }) {
  const el = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lon}`)}`

  useEffect(() => {
    let active = true
    let marker: google.maps.Marker | undefined
    setFailed(false)

    void loadGoogleMaps()
      .then(({ Map }) => {
        if (!active || !el.current) return
        const position = { lat, lng: lon }
        const map = new Map(el.current, {
          center: position,
          zoom,
          disableDefaultUI: true,
          gestureHandling: 'none',
          keyboardShortcuts: false,
          clickableIcons: false,
        })
        marker = new google.maps.Marker({ map, position })
      })
      .catch(() => {
        if (active) setFailed(true)
      })

    return () => {
      active = false
      marker?.setMap(null)
      el.current?.replaceChildren()
    }
  }, [lat, lon, zoom])

  return (
    <div className="relative w-full overflow-hidden bg-moss" style={{ height }}>
      <div ref={el} role="img" aria-label={`Google Maps preview at ${lat}, ${lon}`} className="h-full w-full" />
      {failed && (
        <a href={mapUrl} target="_blank" rel="noreferrer" className="absolute inset-0 flex items-center justify-center bg-moss px-3 text-center text-xs text-ink/70 hover:underline">
          Open this location in Google Maps
        </a>
      )}
    </div>
  )
}
