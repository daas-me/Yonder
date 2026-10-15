import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { type Activity, catOf, CATS } from '../../shared'

export default function MapView({ acts, center }: { acts: (Activity & { n: number })[]; center?: { lat: number; lon: number } }) {
  const el = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!el.current) return
    const map = L.map(el.current, { scrollWheelZoom: false })
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { attribution: '© OpenStreetMap contributors © CARTO', subdomains: 'abcd', maxZoom: 19 }).addTo(map)
    const pts = acts.filter(a => a.lat != null && a.lon != null)
    pts.forEach(a => {
      const icon = L.divIcon({ className: '', iconSize: [28, 28], iconAnchor: [14, 14], html: `<div style="background:${CATS[catOf(a)].color};color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:600 12px Inter;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)">${a.n}</div>` })
      L.marker([a.lat!, a.lon!], { icon }).addTo(map).bindPopup(`<b>${a.title.replace(/</g, '&lt;')}</b><br>${a.location.replace(/</g, '&lt;')}`)
    })
    if (pts.length > 1) L.polyline(pts.map(a => [a.lat!, a.lon!] as [number, number]), { color: '#2f5d4e', weight: 3, dashArray: '6 6' }).addTo(map)
    if (pts.length) map.fitBounds(L.latLngBounds(pts.map(a => [a.lat!, a.lon!] as [number, number])).pad(0.25), { maxZoom: 15 })
    else map.setView(center ? [center.lat, center.lon] : [12.88, 121.77], center ? 12 : 5)
    return () => { map.remove() }
  }, [acts, center])
  return <div ref={el} className="h-[480px] w-full overflow-hidden rounded-2xl ring-1 ring-line" />
}
