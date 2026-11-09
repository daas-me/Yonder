import { useState } from 'react'
import { assetUrl, resizeImage } from '../../services'
import { daysBetween, isoOf, type Trip, type User, UserAvatar } from '../../shared'

const cityOf = (destination: string) => destination.split(',')[0].trim()
const mrz = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z]/g, '<')
const STAMPS = [{ top: 0, right: 112, rotation: -12 }, { top: 14, right: 4, rotation: 9 }, { top: 92, right: 150, rotation: 7 }, { top: 100, right: 36, rotation: -7 }]

export default function PassportCard({ user, trips, onAvatar }: { user: User; trips: Trip[]; onAvatar: (photo: string) => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const today = isoOf(new Date())
  const days = trips.reduce((sum, trip) => sum + daysBetween(trip.start, trip.end), 0)
  const places = new Set(trips.map(trip => cityOf(trip.destination).toLowerCase()).filter(Boolean)).size
  const seen = new Set<string>()
  const stamps = [...trips].sort((a, b) => b.start.localeCompare(a.start)).filter(trip => {
    const city = cityOf(trip.destination).toLowerCase()
    if (!city || seen.has(city)) return false
    seen.add(city)
    return true
  }).slice(0, 4)
  const passportNo = `YND${user.id.replace(/[^a-z0-9]/gi, '').slice(0, 6).toUpperCase().padEnd(6, '0')}`
  const nameParts = user.name.trim().split(/\s+/)
  const last = nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0] ?? ''
  const first = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : ''
  const line1 = `P<PHL${mrz(last)}<<${mrz(first)}`.padEnd(44, '<').slice(0, 44)
  const created = new Date(user.createdAt)
  const line2 = `${passportNo}<PHL${Number.isNaN(created.valueOf()) ? '000000' : created.toISOString().slice(2, 10).replace(/-/g, '')}<${trips.length}T${days}D`.padEnd(44, '<').slice(0, 44)
  const memberSince = Number.isNaN(created.valueOf()) ? '—' : created.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

  const upload = async (file?: File) => {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const resized = await resizeImage(file, 320)
      onAvatar(resized)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update your profile photo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="relative overflow-hidden rounded-3xl p-5 text-white shadow-[0_24px_48px_-24px_rgba(14,74,66,.7)] sm:p-8" style={{ background: 'linear-gradient(135deg, #0d4740 0%, #17675b 55%, #1f7d6e 100%)' }}>
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[.09]" viewBox="0 0 400 200" preserveAspectRatio="none" aria-hidden="true">
        {Array.from({ length: 16 }, (_, index) => <path key={index} d={`M0 ${8 + index * 12}C70 ${index * 12 - 10} 130 ${30 + index * 12} 200 ${8 + index * 12}S330 ${index * 12 - 10} 400 ${8 + index * 12}`} fill="none" stroke="#fff" strokeWidth=".7" />)}
      </svg>
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#ec6a3c]/20 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute right-6 top-6 hidden h-44 w-64 lg:block" aria-hidden="true">
        {stamps.map((trip, index) => {
          const position = STAMPS[index]
          const warm = index % 2 === 1
          const ended = trip.end < today
          return (
            <div key={trip.id} className={`absolute flex flex-col items-center justify-center border-2 text-center ${index % 2 ? 'h-[72px] w-28 rounded-xl' : 'h-[84px] w-[84px] rounded-full'}`}
              style={{ top: position.top, right: position.right, transform: `rotate(${position.rotation}deg)`, borderColor: warm ? '#ffb48f' : 'rgba(255,255,255,.6)', color: warm ? '#ffcfb5' : 'rgba(255,255,255,.75)', boxShadow: `inset 0 0 0 4px ${warm ? 'rgba(255,180,143,.45)' : 'rgba(255,255,255,.3)'}` }}>
              <span className="mono text-[8px] tracking-[.2em]">{ended ? 'ARRIVED' : 'BOUND FOR'}</span>
              <span className="max-w-[90%] truncate text-[13px] font-bold uppercase leading-tight">{cityOf(trip.destination)}</span>
              <span className="mono text-[8px] tracking-wider">{new Date(`${trip.start}T00:00`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()}</span>
            </div>
          )
        })}
      </div>
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6 lg:pr-72">
        <label className={`group relative w-fit shrink-0 ${busy ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`} title="Change photo">
          <UserAvatar user={user} imageUrl={user.photoUrl ? assetUrl(user.photoUrl) : undefined} className="h-24 w-20 !rounded-2xl text-3xl ring-4 ring-white/15 sm:h-28 sm:w-24" />
          <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/45 text-xs font-semibold opacity-0 transition group-hover:opacity-100">{busy ? 'Saving…' : 'Change photo'}</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={busy} onChange={event => { void upload(event.currentTarget.files?.[0]); event.currentTarget.value = '' }} />
        </label>
        <div className="min-w-0 flex-1">
          <div className="mono text-[10px] tracking-[.28em] text-white/60">YONDER · TRAVEL PASSPORT</div>
          <h2 className="mt-1 truncate font-display text-3xl font-semibold sm:text-4xl">{user.name}</h2>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
            {([['Home city', user.homeCity || 'Not set'], ['Member since', memberSince], ['Passport no.', passportNo]] as const).map(([label, value]) => (
              <div key={label} className="min-w-0"><dt className="mono text-[10px] uppercase tracking-wider text-white/50">{label}</dt><dd className="truncate font-medium">{value}</dd></div>
            ))}
          </dl>
        </div>
      </div>
      <div className="relative mt-5 grid grid-cols-3 gap-2 sm:mt-6 sm:max-w-lg">
        {([[trips.length, trips.length === 1 ? 'trip planned' : 'trips planned'], [days, 'days of travel'], [places, places === 1 ? 'place' : 'places']] as const).map(([value, label]) => (
          <div key={label} className="rounded-xl bg-white/10 px-3 py-2.5 ring-1 ring-white/10 backdrop-blur-sm sm:px-4 sm:py-3">
            <div className="font-display text-xl font-semibold tabular-nums sm:text-2xl">{value}</div>
            <div className="text-[10px] text-white/65 sm:text-[11px]">{label}</div>
          </div>
        ))}
      </div>
      <div className="relative mt-5 overflow-hidden whitespace-nowrap border-t border-white/15 pt-3 font-mono text-[9px] leading-relaxed tracking-[.16em] text-white/40 sm:mt-6 sm:text-[11px] sm:tracking-[.22em]" aria-hidden="true">
        <div>{line1}</div><div>{line2}</div>
      </div>
      {error && <p role="alert" className="relative mt-2 text-xs text-[#ffd0be]">{error}</p>}
    </section>
  )
}
