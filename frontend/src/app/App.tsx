import { useEffect, useRef, useState } from 'react'
import { AccountPage } from '../features/account'
import { AuthPage } from '../features/auth'
import { ImportModal } from '../features/import'
import { TripView } from '../features/itinerary'
import { delPhotos, photoIds } from '../features/memories'
import { TripForm, TripList } from '../features/trips'
import { ApiError, api, assetUrl, readShareToken } from '../services'
import { Confirm, load, Logo, type Trip, uid, type User } from '../shared'

/* ---------------- App ---------------- */
function UserAvatar({ user, className = 'h-10 w-10' }: { user: User; className?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-clay/15 font-semibold text-clay ring-1 ring-ink/5 ${className}`} aria-hidden="true">
      {user.photoUrl
        ? <img src={assetUrl(user.photoUrl)} alt="" className="h-full w-full object-cover" />
        : (user.name.trim()[0] || user.email[0] || '?').toUpperCase()}
    </span>
  )
}

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [trips, setTrips] = useState<Trip[]>([])
  const [authLoading, setAuthLoading] = useState(true)
  const [view, setView] = useState<{ page: 'trips' } | { page: 'trip'; id: string; fresh?: boolean } | { page: 'account' }>({ page: 'trips' })
  const [newTrip, setNewTrip] = useState(false)
  const [importing, setImporting] = useState(false)
  const [shared, setShared] = useState<Trip | null>(null)
  const [shareLoading, setShareLoading] = useState(false)
  const [shareError, setShareError] = useState('')
  const [dark, setDark] = useState<boolean>(() => load('yonder.dark', false))
  useEffect(() => { document.documentElement.classList.toggle('dark', dark); localStorage.setItem('yonder.dark', JSON.stringify(dark)) }, [dark])
  useEffect(() => {
    let active = true
    let requestId = 0
    const loadShared = () => {
      const currentRequest = ++requestId
      const token = readShareToken()
      setShared(null)
      setShareError('')
      setShareLoading(Boolean(token))
      if (token) {
        api.sharedTrip(token)
          .then(trip => { if (active && currentRequest === requestId) setShared(trip) })
          .catch(error => { if (active && currentRequest === requestId) setShareError(error instanceof Error ? error.message : 'This share link is unavailable') })
          .finally(() => { if (active && currentRequest === requestId) setShareLoading(false) })
      }
    }
    loadShared()
    window.addEventListener('hashchange', loadShared)
    return () => { active = false; window.removeEventListener('hashchange', loadShared) }
  }, [])
  const [msg, setMsg] = useState('')
  const [menu, setMenu] = useState(false)
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const [side, setSide] = useState<'full' | 'rail' | 'hidden'>(() => load('yonder.sidebar', 'full'))
  useEffect(() => localStorage.setItem('yonder.sidebar', JSON.stringify(side)), [side])

  useEffect(() => {
    let active = true
    api.currentUser()
      .then(async currentUser => ({ currentUser, trips: await api.listTrips() }))
      .then(result => {
        if (active) { setUser(result.currentUser); setTrips(result.trips) }
      })
      .catch(error => {
        if (active && (!(error instanceof ApiError) || error.status !== 401)) {
          setMsg(error instanceof Error ? error.message : 'Could not connect to Yonder API')
        }
      })
      .finally(() => { if (active) setAuthLoading(false) })
    return () => { active = false }
  }, [])
  useEffect(() => { if (msg) { const t = setTimeout(() => setMsg(''), 2500); return () => clearTimeout(t) } }, [msg])

  const signIn = async (email: string, password: string) => {
    const signedInUser = await api.login(email, password)
    const userTrips = await api.listTrips()
    setUser(signedInUser)
    setTrips(userTrips)
    setView({ page: 'trips' })
  }
  const register = async (name: string, email: string, password: string) => {
    await api.register(name, email, password)
    await signIn(email, password)
  }
  const saveQueues = useRef(new Map<string, Promise<void>>())
  const persistTrip = (trip: Trip) => {
    setTrips(currentTrips => currentTrips.map(current => current.id === trip.id ? trip : current))
    const previous = saveQueues.current.get(trip.id) ?? Promise.resolve()
    const pending = previous.catch(() => {}).then(async () => {
      try {
        let toSave = trip
        if (trip.cover?.startsWith('data:')) {
          const blob = await (await fetch(trip.cover)).blob()
          const { url } = await api.uploadTripCover(trip.id, blob)
          toSave = { ...trip, cover: url }
        }
        const saved = await api.updateTrip(toSave)
        setTrips(currentTrips => currentTrips.map(current => current.id === saved.id ? saved : current))
      } catch (error) {
        setMsg(error instanceof Error ? `Could not save trip: ${error.message}` : 'Could not save trip')
        try {
          setTrips(await api.listTrips())
        } catch (reloadError) {
          setMsg(reloadError instanceof Error ? `Save failed and trips could not be reloaded: ${reloadError.message}` : 'Save failed and trips could not be reloaded')
        }
      }
    })
    saveQueues.current.set(trip.id, pending)
    return pending
  }
  const createTrip = async (trip: Trip) => {
    const cover = trip.cover
    const saved = await api.createTrip({ ...trip, cover: undefined })
    if (cover?.startsWith('data:')) {
      const blob = await (await fetch(cover)).blob()
      const { url } = await api.uploadTripCover(saved.id, blob)
      saved.cover = url
    }
    setTrips(currentTrips => [...currentTrips, saved])
    return saved
  }
  const signOut = async () => {
    try {
      await api.logout()
      setUser(null); setTrips([]); setMenu(false); setConfirmSignOut(false)
    } catch (error) {
      setMsg(error instanceof Error ? error.message : 'Could not sign out')
    }
  }
  const themeBtn = (
    <button onClick={() => setDark(!dark)} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} className="no-print flex h-9 w-9 items-center justify-center rounded opacity-80 hover:bg-current/10 hover:opacity-100">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">{dark ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></> : <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />}</svg>
    </button>
  )
  const toastEl = msg && <div className="no-print fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-ink px-5 py-2.5 text-sm text-sand shadow-lg">{msg}</div>
  const exitShare = () => { history.replaceState(null, '', location.pathname); setShared(null); setShareError(''); setShareLoading(false) }
  if (shareLoading) return <div className="flex min-h-screen items-center justify-center text-sm text-ink/60">Opening shared itinerary…</div>
  if (shareError) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <Logo />
      <p className="max-w-md text-sm text-ink/70">{shareError}. Share links are revocable and expire after 30 days.</p>
      <button className="btn btn-primary" onClick={exitShare}>Continue to Yonder</button>
    </div>
  )
  if (shared) return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-40 border-b border-line bg-ink text-sand">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Logo />
          <div className="flex items-center gap-2">{themeBtn}
            {user && <button className="btn btn-ghost ring-1 ring-line" onClick={() => {
              const copy: Trip = {
                ...shared,
                id: uid(),
                ownerId: user.id,
                memories: undefined,
                checklist: shared.checklist?.map(item => ({ ...item, id: uid() })),
                extras: shared.extras?.map(item => ({ ...item, id: uid() })),
                activities: shared.activities.map(activity => ({ ...activity, id: uid(), image: undefined, memories: undefined })),
              }
              void createTrip(copy)
                .then(t => { exitShare(); setView({ page: 'trip', id: t.id }); setMsg('Saved to your trips') })
                .catch(error => setMsg(error instanceof Error ? error.message : 'Could not save trip'))
            }}>Save to my trips</button>}
            <button className="btn btn-primary" onClick={exitShare}>{user ? 'Back to Yonder' : 'Plan your own'}</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-10"><TripView trip={shared} readOnly onBack={exitShare} onUpdate={() => {}} onDelete={() => {}} onDuplicate={() => {}} toast={setMsg} /></main>
      {toastEl}
    </div>
  )
  if (authLoading) return <div className="flex min-h-screen items-center justify-center text-sm text-ink/60">Connecting to Yonder…</div>
  if (!user) return <div className="relative"><div className="absolute right-4 top-4 z-10">{themeBtn}</div><AuthPage onLogin={signIn} onRegister={register} />{toastEl}</div>

  const mine = trips.filter(t => t.ownerId === user.id)
  const current = view.page === 'trip' ? mine.find(t => t.id === view.id) : undefined
  const updateTrip = persistTrip

  const today = new Date().toISOString().slice(0, 10)
  const navItems: { key: string; label: string; icon: string; active: boolean; on: () => void }[] = [
    { key: 'trips', label: 'My trips', icon: 'M3 12h13l-3-3m3 3l-3 3M21 5v14', active: view.page !== 'account', on: () => setView({ page: 'trips' }) },
    { key: 'new', label: 'New trip', icon: 'M12 5v14M5 12h14', active: false, on: () => setNewTrip(true) },
    { key: 'import', label: 'Import', icon: 'M12 4v11m0 0l-4-4m4 4l4-4M5 20h14', active: false, on: () => setImporting(true) },
    { key: 'account', label: 'Account', icon: 'M12 12a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 0114 0', active: view.page === 'account', on: () => setView({ page: 'account' }) },
  ]
  const Icon = ({ d, className = '' }: { d: string; className?: string }) => <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><path d={d} /></svg>
  const openAccount = () => { setView({ page: 'account' }); setMenu(false) }
  const navButtonClass = (active: boolean, compact: boolean) =>
    `group relative flex w-full items-center gap-3 rounded-xl py-2.5 text-sm transition-colors ${compact ? 'justify-center px-0' : 'px-3'} ${active ? 'bg-pine/10 font-semibold text-pine shadow-sm ring-1 ring-pine/10' : 'text-ink/65 hover:bg-ink/5 hover:text-ink'}`

  return (
    <div className={`min-h-screen transition-[padding] duration-200 ${side === 'full' ? 'lg:pl-60' : side === 'rail' ? 'lg:pl-16' : 'lg:pl-0'}`}>
      {/* Sidebar (desktop): full / icon rail / hidden */}
      {side !== 'hidden' && (
        <aside className={`no-print fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-line bg-card/90 shadow-[8px_0_32px_-24px_rgba(22,32,29,.35)] backdrop-blur-xl transition-[width] duration-200 lg:flex ${side === 'rail' ? 'w-[4.5rem]' : 'w-64'}`}>
          <div className={`flex min-h-16 items-center border-b border-line py-4 ${side === 'rail' ? 'justify-center px-2' : 'justify-between px-4'}`}>
            <button onClick={() => setView({ page: 'trips' })} title="Yonder"><Logo compact={side === 'rail'} /></button>
            {side === 'full' && (
              <div className="flex">
                <button title="Collapse sidebar" aria-label="Collapse sidebar" onClick={() => setSide('rail')} className="rounded-md p-1.5 text-ink/50 hover:bg-ink/5 hover:text-ink"><Icon d="M15 6l-6 6 6 6" /></button>
                <button title="Hide sidebar" aria-label="Hide sidebar" onClick={() => setSide('hidden')} className="rounded-md p-1.5 text-ink/50 hover:bg-ink/5 hover:text-ink"><Icon d="M6 6l12 12M18 6L6 18" /></button>
              </div>
            )}
          </div>
          <nav aria-label="Main navigation" className="flex-1 space-y-1 px-3 py-5">
            {side === 'full' && <div className="px-3 pb-2 mono text-[10px] font-medium uppercase tracking-[.18em] text-ink/40">Plan your journey</div>}
            {navItems.map(n => (
              <button key={n.key} onClick={n.on} title={side === 'rail' ? n.label : undefined} aria-label={side === 'rail' ? n.label : undefined} aria-current={n.active ? 'page' : undefined} className={navButtonClass(n.active, side === 'rail')}>
                {n.active && side === 'full' && <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-pine" />}
                <Icon d={n.icon} className="shrink-0" />{side === 'full' && <span className="flex-1 text-left">{n.label}</span>}
                {side === 'full' && n.key === 'trips' && <span className={`rounded-full px-2 py-0.5 text-[10px] tabular-nums ${n.active ? 'bg-pine/10' : 'bg-ink/5 text-ink/45'}`}>{mine.length}</span>}
              </button>
            ))}
          </nav>
          {side === 'full' && (
            <div className="mx-3 mb-3 rounded-2xl border border-line bg-gradient-to-br from-pine/10 via-card to-clay/10 p-3.5">
              <div className="mb-3 flex items-center justify-between"><span className="mono text-[10px] font-medium uppercase tracking-wider text-ink/45">Your journeys</span><Icon d="M3 12h18m-7-7 7 7-7 7" className="h-4 w-4 text-pine" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><div className="font-display text-2xl leading-none">{mine.length}</div><div className="mt-1 text-[11px] text-ink/50">total trips</div></div>
                <div><div className="font-display text-2xl leading-none">{mine.filter(t => t.end >= today).length}</div><div className="mt-1 text-[11px] text-ink/50">upcoming</div></div>
              </div>
              <button onClick={() => setNewTrip(true)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-pine px-3 py-2 text-xs font-semibold text-white transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine">
                <Icon d="M12 5v14M5 12h14" className="h-4 w-4" /> Plan a trip
              </button>
            </div>
          )}
          <div className={`border-t border-line p-3 ${side === 'rail' ? 'flex flex-col items-center gap-2' : 'space-y-2'}`}>
            {side === 'full' ? (
              <>
                <button onClick={openAccount} aria-current={view.page === 'account' ? 'page' : undefined} className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition ${view.page === 'account' ? 'bg-pine/10' : 'hover:bg-ink/5'}`}>
                  <UserAvatar user={user} className="h-10 w-10" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{user.name}</span>
                    <span className="block truncate text-xs text-ink/50">{user.homeCity || user.email}</span>
                  </span>
                  <Icon d="M9 18l6-6-6-6" className="h-4 w-4 text-ink/35" />
                </button>
                <div className="flex items-center gap-2">
                  <button onClick={() => setDark(!dark)} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} title={dark ? 'Switch to light mode' : 'Switch to dark mode'} className="flex h-9 w-9 items-center justify-center rounded-lg text-ink/55 transition hover:bg-ink/5 hover:text-ink">
                    <Icon d={dark ? 'M12 2v2m0 16v2m10-10h-2M4 12H2m17.07 7.07-1.42-1.42M6.35 6.35 4.93 4.93m14.14 0-1.42 1.42M6.35 17.65l-1.42 1.42M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0' : 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z'} className="h-4 w-4" />
                  </button>
                  <button onClick={() => setConfirmSignOut(true)} title="Sign out" aria-label="Sign out of Yonder" className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold text-ink/50 transition hover:bg-clay/10 hover:text-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay">
                    <Icon d="M10 17l5-5-5-5m5 5H3m9-9h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" className="h-4 w-4" /><span>Sign out</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <button onClick={openAccount} title={`${user.name} — Account`} aria-label={`${user.name} — Account`} className="rounded-full transition hover:ring-2 hover:ring-pine/40"><UserAvatar user={user} className="h-9 w-9" /></button>
                <button onClick={() => setConfirmSignOut(true)} title="Sign out" aria-label="Sign out of Yonder" className="flex h-9 w-9 items-center justify-center rounded-lg text-ink/45 transition hover:bg-clay/10 hover:text-clay"><Icon d="M10 17l5-5-5-5m5 5H3m9-9h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" /></button>
                {themeBtn}
                <button title="Expand sidebar" aria-label="Expand sidebar" onClick={() => setSide('full')} className="rounded-md p-1.5 text-ink/50 hover:bg-ink/5 hover:text-ink"><Icon d="M9 6l6 6-6 6" /></button>
              </>
            )}
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
          <button onClick={() => setMenu(!menu)} aria-label="Open account menu" aria-expanded={menu} className="rounded-full transition hover:ring-2 hover:ring-pine/50"><UserAvatar user={user} className="h-9 w-9" /></button>
        </div>
        {menu && (
          <div className="absolute right-3 top-14 w-64 rounded-2xl border border-line bg-card p-2 text-ink shadow-xl backdrop-blur-xl">
            <div className="flex items-center gap-3 border-b border-line px-2 pb-3 pt-1"><UserAvatar user={user} /><span className="min-w-0"><span className="block truncate text-sm font-semibold">{user.name}</span><span className="block truncate text-xs text-ink/50">{user.email}</span></span></div>
            <button onClick={openAccount} className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-ink/75 transition hover:bg-ink/5 hover:text-ink"><Icon d="M12 12a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 0114 0" />Account settings<Icon d="M9 18l6-6-6-6" className="ml-auto h-4 w-4" /></button>
            <button onClick={() => setConfirmSignOut(true)} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-clay transition hover:bg-clay/10"><Icon d="M10 17l5-5-5-5m5 5H3m9-9h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" />Sign out of Yonder</button>
          </div>
        )}
      </header>
      {/* Bottom nav (mobile) */}
      <nav aria-label="Main navigation" className="no-print fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] text-ink shadow-[0_-8px_24px_-20px_rgba(22,32,29,.5)] backdrop-blur-xl lg:hidden">
        {navItems.map(n => (
          <button key={n.key} onClick={n.on} aria-current={n.active ? 'page' : undefined} className={`flex flex-col items-center gap-1 py-2.5 text-[11px] transition ${n.active ? 'font-semibold text-pine' : 'text-ink/55 hover:text-ink'}`}><span className={`flex h-8 w-12 items-center justify-center rounded-xl transition ${n.active ? 'bg-pine/10' : ''}`}><Icon d={n.icon} /></span>{n.label}</button>
        ))}
      </nav>
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-8 sm:px-8 lg:pb-12 lg:pt-10">
        {view.page === 'trips' && <TripList trips={mine} user={user} onOpen={id => setView({ page: 'trip', id })} onNew={() => setNewTrip(true)} onImport={() => setImporting(true)} onCover={(id, p) => { const trip = mine.find(item => item.id === id); if (trip) { persistTrip({ ...trip, ...p }); setMsg('Cover updated') } }} />}
        {view.page === 'trip' && (current ? (
          <TripView trip={current} fresh={view.page === 'trip' && view.fresh} onBack={() => setView({ page: 'trips' })} onUpdate={updateTrip} toast={setMsg} key={current.id}
            onDuplicate={t => {
              void createTrip({ ...t, id: uid(), ownerId: user.id })
                .then(c => { setView({ page: 'trip', id: c.id }); setMsg('Template copied') })
                .catch(error => setMsg(error instanceof Error ? error.message : 'Could not copy trip'))
            }}
            onDelete={() => {
              void api.deleteTrip(current.id).then(() => {
                delPhotos(photoIds(current)); setTrips(ts => ts.filter(t => t.id !== current.id)); setView({ page: 'trips' }); setMsg('Trip deleted')
              }).catch(error => setMsg(error instanceof Error ? error.message : 'Could not delete trip'))
            }} />
        ) : (
          <div className="py-20 text-center"><div className="text-sm text-clay">Error 404</div><h2 className="mt-1 font-display text-3xl">Trip not found</h2><button className="btn btn-primary mt-6" onClick={() => setView({ page: 'trips' })}>Back to trips</button></div>
        ))}
        {view.page === 'account' && <AccountPage user={user} trips={mine} toast={setMsg}
          onSave={async profile => setUser(await api.updateProfile(profile))}
          onPhotoUpload={async photo => setUser(await api.uploadProfilePhoto(photo))}
          onPhotoRemove={async () => { await api.deleteProfilePhoto(); setUser(current => current ? { ...current, photoUrl: undefined } : current) }}
          onPasswordChange={(current, next) => api.updatePassword(current, next)}
          onDeleteAccount={async () => {
            await api.deleteAccount()
            delPhotos(mine.flatMap(photoIds))
            setTrips([]); setUser(null); setView({ page: 'trips' })
          }} />}
      </main>
      {newTrip && <TripForm onClose={() => setNewTrip(false)} onSave={v => {
        const t: Trip = { ...v, id: uid(), ownerId: user.id, activities: [] }
        void createTrip(t).then(saved => { setNewTrip(false); setView({ page: 'trip', id: saved.id, fresh: true }); setMsg('Trip created') })
          .catch(error => setMsg(error instanceof Error ? error.message : 'Could not create trip'))
      }} />}
      {importing && <ImportModal onClose={() => setImporting(false)} onCreate={v => {
        const t: Trip = { ...v, id: uid(), ownerId: user.id }
        void createTrip(t).then(saved => { setImporting(false); setView({ page: 'trip', id: saved.id, fresh: true }); setMsg('Itinerary imported') })
          .catch(error => setMsg(error instanceof Error ? error.message : 'Could not import itinerary'))
      }} />}
      {confirmSignOut && <Confirm
        title="Sign out of Yonder?"
        text="You can sign back in any time to access your trips and account."
        confirmLabel="Sign out"
        onNo={() => setConfirmSignOut(false)}
        onYes={() => void signOut()}
      />}
      {toastEl}
    </div>
  )
}
