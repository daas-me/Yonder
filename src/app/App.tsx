import { useEffect, useState } from 'react'
import { AccountPage } from '../features/account'
import { AuthPage } from '../features/auth'
import { ImportModal } from '../features/import'
import { TripView } from '../features/itinerary'
import { delPhotos, photoIds } from '../features/memories'
import { TripForm, TripList } from '../features/trips'
import { readShare } from '../services'
import { load, Logo, sampleTrip, type Trip, uid, type User } from '../shared'

/* ---------------- App ---------------- */
export default function App() {
  const [users, setUsers] = useState<User[]>(() => {
    const u = load<User[]>('yonder.users', [])
    return u.length ? u : [{ id: 'demo', name: 'Juan Dela Cruz', email: 'demo@yonder.ph', password: 'yonder123', homeCity: 'Manila', createdAt: '2026-01-10T00:00:00Z' }]
  })
  const [trips, setTrips] = useState<Trip[]>(() => load<Trip[] | null>('yonder.trips', null) ?? [sampleTrip('demo')])
  const [sessionId, setSessionId] = useState<string | null>(() => load<string | null>('yonder.session', null))
  const [view, setView] = useState<{ page: 'trips' } | { page: 'trip'; id: string; fresh?: boolean } | { page: 'account' }>({ page: 'trips' })
  const [newTrip, setNewTrip] = useState(false)
  const [importing, setImporting] = useState(false)
  const [shared, setShared] = useState<Trip | null>(() => readShare())
  const [dark, setDark] = useState<boolean>(() => load('yonder.dark', window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false))
  useEffect(() => { document.documentElement.classList.toggle('dark', dark); localStorage.setItem('yonder.dark', JSON.stringify(dark)) }, [dark])
  useEffect(() => { const h = () => setShared(readShare()); window.addEventListener('hashchange', h); return () => window.removeEventListener('hashchange', h) }, [])
  const [msg, setMsg] = useState('')
  const [menu, setMenu] = useState(false)

  useEffect(() => localStorage.setItem('yonder.users', JSON.stringify(users)), [users])
  useEffect(() => { try { localStorage.setItem('yonder.trips', JSON.stringify(trips)) } catch { setMsg('Storage full — remove some photos to keep saving') } }, [trips])
  useEffect(() => localStorage.setItem('yonder.session', JSON.stringify(sessionId)), [sessionId])
  useEffect(() => { if (msg) { const t = setTimeout(() => setMsg(''), 2500); return () => clearTimeout(t) } }, [msg])

  const user = users.find(u => u.id === sessionId)
  const themeBtn = (
    <button onClick={() => setDark(!dark)} aria-label="Toggle dark mode" className="no-print flex h-9 w-9 items-center justify-center rounded-full text-ink/70 hover:bg-black/5 dark:hover:bg-white/10">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">{dark ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></> : <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />}</svg>
    </button>
  )
  const toastEl = msg && <div className="no-print fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-pine px-5 py-2.5 text-sm text-white shadow-lg">{msg}</div>
  const exitShare = () => { history.replaceState(null, '', location.pathname); setShared(null) }
  if (shared) return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-40 border-b border-line bg-sand/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Logo />
          <div className="flex items-center gap-2">{themeBtn}
            {user && <button className="btn btn-ghost ring-1 ring-line" onClick={() => { const t = { ...shared, id: uid(), ownerId: user.id, memories: undefined }; setTrips(ts => [...ts, t]); exitShare(); setView({ page: 'trip', id: t.id }); setMsg('Saved to your trips') }}>Save to my trips</button>}
            <button className="btn btn-primary" onClick={exitShare}>{user ? 'Back to Yonder' : 'Plan your own'}</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-10"><TripView trip={shared} readOnly onBack={exitShare} onUpdate={() => {}} onDelete={() => {}} onDuplicate={() => {}} toast={setMsg} /></main>
      {toastEl}
    </div>
  )
  if (!user) return <div className="relative"><div className="absolute right-4 top-4 z-10">{themeBtn}</div><AuthPage users={users} onLogin={u => { setSessionId(u.id); setView({ page: 'trips' }) }} onRegister={u => { setUsers([...users, u]); setSessionId(u.id); setView({ page: 'trips' }) }} /></div>

  const mine = trips.filter(t => t.ownerId === user.id)
  const current = view.page === 'trip' ? mine.find(t => t.id === view.id) : undefined
  const updateTrip = (t: Trip) => setTrips(ts => ts.map(x => (x.id === t.id ? t : x)))

  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-40 border-b border-line bg-sand/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <button onClick={() => setView({ page: 'trips' })}><Logo /></button>
          <nav className="flex items-center gap-1">
            {themeBtn}
            <button className={`btn btn-ghost ${view.page !== 'account' ? 'text-pine' : 'text-ink/60'}`} onClick={() => setView({ page: 'trips' })}>Trips</button>
            <div className="relative">
              <button onClick={() => setMenu(!menu)} className="ml-2 flex h-9 w-9 items-center justify-center rounded-full bg-pine text-sm font-semibold text-white">{user.name[0]?.toUpperCase()}</button>
              {menu && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl bg-card p-2 shadow-xl ring-1 ring-line" onMouseLeave={() => setMenu(false)}>
                  <div className="px-3 py-2 text-xs text-ink/50">{user.email}</div>
                  <button className="btn btn-ghost w-full text-left" onClick={() => { setView({ page: 'account' }); setMenu(false) }}>Account settings</button>
                  <button className="btn btn-danger w-full text-left" onClick={() => { setSessionId(null); setMenu(false) }}>Sign out</button>
                </div>
              )}
            </div>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-10">
        {view.page === 'trips' && <TripList trips={mine} user={user} onOpen={id => setView({ page: 'trip', id })} onNew={() => setNewTrip(true)} onImport={() => setImporting(true)} onCover={(id, p) => { setTrips(ts => ts.map(t => (t.id === id ? { ...t, ...p } : t))); setMsg('Cover updated') }} />}
        {view.page === 'trip' && (current ? (
          <TripView trip={current} fresh={view.page === 'trip' && view.fresh} onBack={() => setView({ page: 'trips' })} onUpdate={updateTrip} toast={setMsg} key={current.id}
            onDuplicate={t => { const c = { ...t, ownerId: user.id }; setTrips(ts => [...ts, c]); setView({ page: 'trip', id: c.id }); setMsg('Template copied') }}
            onDelete={() => { delPhotos(photoIds(current)); setTrips(ts => ts.filter(t => t.id !== current.id)); setView({ page: 'trips' }); setMsg('Trip deleted') }} />
        ) : (
          <div className="py-20 text-center"><h2 className="font-display text-3xl">Trip not found</h2><button className="btn btn-primary mt-6" onClick={() => setView({ page: 'trips' })}>Back to trips</button></div>
        ))}
        {view.page === 'account' && <AccountPage user={user} trips={mine} toast={setMsg}
          onSave={u => { if (users.some(x => x.email === u.email && x.id !== u.id)) return setMsg('That email is already in use'); setUsers(users.map(x => (x.id === u.id ? u : x))) }}
          onDeleteAccount={() => { delPhotos(mine.flatMap(photoIds)); setTrips(trips.filter(t => t.ownerId !== user.id)); setUsers(users.filter(u => u.id !== user.id)); setSessionId(null) }} />}
      </main>
      {newTrip && <TripForm onClose={() => setNewTrip(false)} onSave={v => {
        const t: Trip = { ...v, id: uid(), ownerId: user.id, activities: [] }
        setTrips([...trips, t]); setNewTrip(false); setView({ page: 'trip', id: t.id, fresh: true }); setMsg('Trip created')
      }} />}
      {importing && <ImportModal onClose={() => setImporting(false)} onCreate={v => {
        const t: Trip = { ...v, id: uid(), ownerId: user.id }
        setTrips(ts => [...ts, t]); setImporting(false); setView({ page: 'trip', id: t.id, fresh: true }); setMsg('Itinerary imported')
      }} />}
      {toastEl}
    </div>
  )
}
