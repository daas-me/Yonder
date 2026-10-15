/* Static map snapshot composed from OpenStreetMap tiles */
export function MapSnap({ lat, lon, zoom = 15, height = 150 }: { lat: number; lon: number; zoom?: number; height?: number }) {
  const n = 2 ** zoom
  const px = ((lon + 180) / 360) * n * 256
  const r = (lat * Math.PI) / 180
  const py = ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n * 256
  const tx = Math.floor(px / 256), ty = Math.floor(py / 256)
  const tiles: [number, number][] = []
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) tiles.push([dx, dy])
  return (
    <div className="relative overflow-hidden bg-moss" style={{ height }}>
      <div className="absolute" style={{ left: `calc(50% - ${px - (tx - 1) * 256}px)`, top: `calc(50% - ${py - (ty - 1) * 256}px)`, width: 768, height: 768 }}>
        {tiles.map(([dx, dy]) => <img key={dx + ',' + dy} alt="" draggable={false} className="absolute h-64 w-64 max-w-none" style={{ left: (dx + 1) * 256, top: (dy + 1) * 256 }} src={`https://basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${(((tx + dx) % n) + n) % n}/${ty + dy}.png`} />)}
      </div>
      <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full" width="26" height="34" viewBox="0 0 26 34"><path d="M13 33S2 20 2 12a11 11 0 0 1 22 0c0 8-11 21-11 21z" fill="#ec6a3c" stroke="#fff" strokeWidth="2" /><circle cx="13" cy="12" r="4" fill="#fff" /></svg>
      <span className="absolute bottom-0 right-0 bg-white/80 px-1 text-[9px] text-black">© OpenStreetMap © CARTO</span>
    </div>
  )
}
