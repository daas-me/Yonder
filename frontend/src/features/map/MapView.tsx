import { useEffect, useRef, useState } from 'react'
import { type Activity, catOf, CATS } from '../../shared'
import { loadGoogleMaps } from './googleMaps'

function popupContent(activity: Activity) {
  const content = document.createElement('div')
  const title = document.createElement('strong')
  title.textContent = activity.title
  content.append(title, document.createElement('br'), document.createTextNode(activity.location))
  return content
}

export default function MapView({ acts, center }: { acts: (Activity & { n: number })[]; center?: { lat: number; lon: number } }) {
  const el = useRef<HTMLDivElement>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true

    if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
      setMessage('Google Maps is not configured. Add VITE_GOOGLE_MAPS_API_KEY to frontend/.env.local and restart the frontend.')
      return () => { active = false }
    }
    if (!el.current) return

    let markers: google.maps.Marker[] = []
    let route: google.maps.Polyline | undefined
    setMessage('Loading Google Maps…')
    void loadGoogleMaps()
      .then(({ Map, InfoWindow }) => {
        if (!active || !el.current) return
        const map = new Map(el.current, {
          center: center ? { lat: center.lat, lng: center.lon } : { lat: 12.88, lng: 121.77 },
          zoom: center ? 12 : 5,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
        })
        const infoWindow = new InfoWindow()
        const points = acts.filter((activity): activity is typeof activity & { lat: number; lon: number } => activity.lat != null && activity.lon != null)
        markers = points.map(activity => {
          const marker = new google.maps.Marker({
            map,
            position: { lat: activity.lat, lng: activity.lon },
            label: { text: String(activity.n), color: '#ffffff', fontWeight: '600' },
            title: activity.title,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: CATS[catOf(activity)].color,
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
              scale: 14,
            },
          })
          marker.addListener('click', () => {
            infoWindow.setContent(popupContent(activity))
            infoWindow.open({ map, anchor: marker })
          })
          return marker
        })

        if (points.length > 1) {
          const bounds = new google.maps.LatLngBounds()
          points.forEach(point => bounds.extend({ lat: point.lat, lng: point.lon }))
          map.fitBounds(bounds, 48)
          route = new google.maps.Polyline({
            map,
            path: points.map(point => ({ lat: point.lat, lng: point.lon })),
            geodesic: true,
            strokeColor: '#17675b',
            strokeOpacity: 0.8,
            strokeWeight: 3,
          })
        } else if (points.length === 1) {
          map.setCenter({ lat: points[0].lat, lng: points[0].lon })
          map.setZoom(15)
        }

        setMessage('')
      })
      .catch(() => {
        if (active) setMessage('Google Maps could not load. Check that your API key, Maps JavaScript API, billing, and website restrictions are configured.')
      })

    return () => {
      active = false
      markers.forEach(marker => marker.setMap(null))
      route?.setMap(null)
      el.current?.replaceChildren()
    }
  }, [acts, center])

  return (
    <div className="relative h-[480px] w-full overflow-hidden rounded-2xl bg-moss ring-1 ring-line">
      <div ref={el} className="h-full w-full" />
      {message && (
        <div role="status" className="absolute inset-x-4 top-4 z-10 rounded-lg bg-white/95 p-3 text-sm text-ink shadow">
          {message}
        </div>
      )}
    </div>
  )
}
