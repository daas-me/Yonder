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
  const [side, setSide] = useState<'full' | 'rail' | 'hidden'>(() => load('yonder.sidebar', 'full'))
  useEffect(() => localStorage.setItem('yonder.sidebar', JSON.stringify(side)), [side])

  useEffect(() => localStorage.setItem('yonder.users', JSON.stringify(users)), [users])
  useEffect(() => { try { localStorage.setItem('yonder.trips', JSON.stringify(trips)) } catch { setMsg('Storage full — remove some photos to keep saving') } }, [trips])
  useEffect(() => localStorage.setItem('yonder.session', JSON.stringify(sessionId)), [sessionId])
  useEffect(() => { if (msg) { const t = setTimeout(() => setMsg(''), 2500); return () => clearTimeout(t) } }, [msg])

  const user = users.find(u => u.id === sessionId)
  const themeBtn = (
    <button onClick={() => setDark(!dark)} aria-label="Toggle dark mode" className="no-print flex h-9 w-9 items-center justify-center rounded opacity-80 hover:bg-current/10 hover:opacity-100">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">{dark ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></> : <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />}</svg>
    </button>
  )
  const toastEl = msg && <div className="no-print fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-ink px-5 py-2.5 text-sm text-sand shadow-lg">{msg}</div>
  const exitShare = () => { history.replaceState(null, '', location.pathname); setShared(null) }
  if (shared) return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-40 border-b border-line bg-ink text-sand">
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

  const today = new Date().toISOString().slice(0, 10)
  const navItems: { key: string; label: string; icon: string; active: boolean; on: () => void }[] = [
    { key: 'trips', label: 'My trips', icon: 'M3 12h13l-3-3m3 3l-3 3M21 5v14', active: view.page !== 'account', on: () => setView({ page: 'trips' }) },
    { key: 'new', label: 'New trip', icon: 'M12 5v14M5 12h14', active: false, on: () => setNewTrip(true) },
    { key: 'import', label: 'Import', icon: 'M12 4v11m0 0l-4-4m4 4l4-4M5 20h14', active: false, on: () => setImporting(true) },
    { key: 'account', label: 'Account', icon: 'M12 12a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 0114 0', active: view.page === 'account', on: () => setView({ page: 'account' }) },
  ]
  const Icon = ({ d }: { d: string }) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>

  return (
    <div className={`min-h-screen transition-[padding] duration-200 ${side === 'full' ? 'lg:pl-60' : side === 'rail' ? 'lg:pl-16' : 'lg:pl-0'}`}>
      {/* Sidebar (desktop): full / icon rail / hidden */}
      {side !== 'hidden' && (
        <aside className={`no-print fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-line bg-card transition-[width] duration-200 lg:flex ${side === 'rail' ? 'w-16' : 'w-60'}`}>
          <div className={`flex items-center border-b border-line py-4 ${side === 'rail' ? 'justify-center px-2' : 'justify-between px-4'}`}>
            <button onClick={() => setView({ page: 'trips' })} title="Yonder"><Logo compact={side === 'rail'} /></button>
            {side === 'full' && (
              <div className="flex">
                <button title="Collapse sidebar" aria-label="Collapse sidebar" onClick={() => setSide('rail')} className="rounded-md p-1.5 text-ink/50 hover:bg-ink/5 hover:text-ink"><Icon d="M15 6l-6 6 6 6" /></button>
                <button title="Hide sidebar" aria-label="Hide sidebar" onClick={() => setSide('hidden')} className="rounded-md p-1.5 text-ink/50 hover:bg-ink/5 hover:text-ink"><Icon d="M6 6l12 12M18 6L6 18" /></button>
              </div>
            )}
          </div>
          <nav className="flex-1 space-y-0.5 p-2">
            {navItems.map(n => (
              <button key={n.key} onClick={n.on} title={n.label} className={`flex w-full items-center gap-3 rounded-lg py-2 text-sm transition ${side === 'rail' ? 'justify-center px-0' : 'px-3'} ${n.active ? 'bg-pine/10 font-medium text-pine' : 'text-ink/65 hover:bg-ink/5 hover:text-ink'}`}>
                <Icon d={n.icon} />{side === 'full' && n.label}
              </button>
            ))}
          </nav>
          {side === 'full' && (
            <div className="mx-3 mb-3 grid grid-cols-2 gap-2 rounded-xl bg-sand p-3">
              <div><div className="font-display text-xl leading-none">{mine.length}</div><div className="mt-1 text-[11px] text-ink/50">trips</div></div>
              <div><div className="font-display text-xl leading-none">{mine.filter(t => t.end >= today).length}</div><div className="mt-1 text-[11px] text-ink/50">upcoming</div></div>
            </div>
          )}
          <div className={`flex items-center gap-2 border-t border-line p-3 ${side === 'rail' ? 'flex-col' : ''}`}>
            <div title={user.name} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-clay/15 text-sm font-medium text-clay">{user.name[0]?.toUpperCase()}</div>
            {side === 'full' && <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{user.name}</div><button className="text-xs text-ink/50 hover:text-clay" onClick={() => setSessionId(null)}>Sign out</button></div>}
            {themeBtn}
            {side === 'rail' && <button title="Expand sidebar" aria-label="Expand sidebar" onClick={() => setSide('full')} className="rounded-md p-1.5 text-ink/50 hover:bg-ink/5 hover:text-ink"><Icon d="M9 6l6 6-6 6" /></button>}
          </div>
        </aside>
      )}
      {side === 'hidden' && (
        <button onClick={() => setSide('full')} title="Show sidebar" aria-label="Show sidebar" className="no-print soft fixed left-4 top-4 z-40 hidden h-10 w-10 items-center justify-center rounded-xl border border-line bg-card text-ink/70 hover:text-ink lg:flex">
          <Icon d="M4 6h16M4 12h16M4 18h16" />
        </button>
      )}

      {/* Top bar (mobile) */}
      <header className="no-print sticky top-0 z-40 flex items-center justify-between border-b border-line bg-ink px-4 py-3 text-sand lg:hidden">
        <button onClick={() => setView({ page: 'trips' })}><Logo /></button>
        <div className="flex items-center gap-1">{themeBtn}
          <button onClick={() => setMenu(!menu)} className="flex h-8 w-8 items-center justify-center rounded-full bg-clay/15 text-sm font-medium text-clay">{user.name[0]?.toUpperCase()}</button>
        </div>
        {menu && (
          <div className="absolute right-3 top-14 w-48 rounded border border-line bg-card p-1 text-ink" onMouseLeave={() => setMenu(false)}>
            <div className="mono truncate px-3 py-2 text-[10px] text-ink/50">{user.email}</div>
            <button className="btn btn-danger w-full text-left" onClick={() => { setSessionId(null); setMenu(false) }}>Sign out</button>
          </div>
        )}
      </header>
      {/* Bottom nav (mobile) */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-ink lg:hidden">
        {navItems.map(n => (
          <button key={n.key} onClick={n.on} className={`flex flex-col items-center gap-1 py-2.5 text-[11px] ${n.active ? 'font-medium text-pine' : 'text-ink/55'}`}><Icon d={n.icon} />{n.label}</button>
        ))}
      </nav>
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-8 sm:px-8 lg:pb-12 lg:pt-10">
        {view.page === 'trips' && <TripList trips={mine} user={user} onOpen={id => setView({ page: 'trip', id })} onNew={() => setNewTrip(true)} onImport={() => setImporting(true)} onCover={(id, p) => { setTrips(ts => ts.map(t => (t.id === id ? { ...t, ...p } : t))); setMsg('Cover updated') }} />}
        {view.page === 'trip' && (current ? (
          <TripView trip={current} fresh={view.page === 'trip' && view.fresh} onBack={() => setView({ page: 'trips' })} onUpdate={updateTrip} toast={setMsg} key={current.id}
            onDuplicate={t => { const c = { ...t, ownerId: user.id }; setTrips(ts => [...ts, c]); setView({ page: 'trip', id: c.id }); setMsg('Template copied') }}
            onDelete={() => { delPhotos(photoIds(current)); setTrips(ts => ts.filter(t => t.id !== current.id)); setView({ page: 'trips' }); setMsg('Trip deleted') }} />
        ) : (
          <div className="py-20 text-center"><div className="text-sm text-clay">Error 404</div><h2 className="mt-1 font-display text-3xl">Trip not found</h2><button className="btn btn-primary mt-6" onClick={() => setView({ page: 'trips' })}>Back to trips</button></div>
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
