import { useState } from 'react'
import { Confirm, Field, type Trip, type User } from '../../shared'

/* ---------------- Account ---------------- */
export default function AccountPage({ user, trips, onSave, onDeleteAccount, toast }: { user: User; trips: Trip[]; onSave: (u: User) => void; onDeleteAccount: () => void; toast: (m: string) => void }) {
  const [p, setP] = useState({ name: user.name, email: user.email, homeCity: user.homeCity })
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [err, setErr] = useState<Record<string, string>>({})
  const [confirm, setConfirm] = useState(false)
  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    const er: Record<string, string> = {}
    if (!p.name.trim()) er.name = 'Name is required.'
    if (!/^\S+@\S+\.\S+$/.test(p.email)) er.email = 'Enter a valid email.'
    setErr(er)
    if (!Object.keys(er).length) { onSave({ ...user, name: p.name.trim(), email: p.email.trim().toLowerCase(), homeCity: p.homeCity.trim() }); toast('Profile saved') }
  }
  const savePw = (e: React.FormEvent) => {
    e.preventDefault()
    const er: Record<string, string> = {}
    if (pw.current !== user.password) er.current = 'Current password is incorrect.'
    if (pw.next.length < 6) er.next = 'At least 6 characters.'
    if (pw.next !== pw.confirm) er.confirm = 'Passwords do not match.'
    setErr(er)
    if (!Object.keys(er).length) { onSave({ ...user, password: pw.next }); setPw({ current: '', next: '', confirm: '' }); toast('Password updated') }
  }
  const initials = user.name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()
  const card = 'rounded-2xl bg-card p-6 ring-1 ring-line sm:p-8'
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-5xl font-semibold">Account</h1>
      <div className="topo flex items-center gap-5 rounded-2xl bg-pine p-6 text-white">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f2c6a0] font-display text-2xl font-semibold text-pine">{initials}</div>
        <div className="flex-1">
          <div className="font-display text-2xl">{user.name}</div>
          <div className="text-sm text-white/70">{user.email} · Traveler since {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
        </div>
        <div className="hidden text-right sm:block"><div className="font-display text-3xl">{trips.length}</div><div className="text-xs text-white/60">trips planned</div></div>
      </div>
      <form onSubmit={saveProfile} className={card}>
        <h2 className="font-display text-2xl font-semibold">Profile</h2>
        <p className="mb-5 text-sm text-ink/60">How you appear in Yonder.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" error={err.name}><input className="input" value={p.name} onChange={e => setP({ ...p, name: e.target.value })} /></Field>
          <Field label="Email" error={err.email}><input className="input" value={p.email} onChange={e => setP({ ...p, email: e.target.value })} /></Field>
          <Field label="Home city"><input className="input" value={p.homeCity} placeholder="Quezon City" onChange={e => setP({ ...p, homeCity: e.target.value })} /></Field>
          <Field label="Currency"><input className="input bg-moss/50" value="Philippine Peso (PHP)" disabled /></Field>
        </div>
        <div className="mt-6 flex justify-end"><button className="btn btn-primary">Save profile</button></div>
      </form>
      <form onSubmit={savePw} className={card}>
        <h2 className="font-display text-2xl font-semibold">Credentials</h2>
        <p className="mb-5 text-sm text-ink/60">Change your sign-in password.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Current" error={err.current}><input className="input" type="password" value={pw.current} onChange={e => setPw({ ...pw, current: e.target.value })} /></Field>
          <Field label="New" error={err.next}><input className="input" type="password" value={pw.next} onChange={e => setPw({ ...pw, next: e.target.value })} /></Field>
          <Field label="Confirm" error={err.confirm}><input className="input" type="password" value={pw.confirm} onChange={e => setPw({ ...pw, confirm: e.target.value })} /></Field>
        </div>
        <div className="mt-6 flex justify-end"><button className="btn btn-primary">Update password</button></div>
      </form>
      <div className={`${card} flex flex-wrap items-center justify-between gap-4 ring-clay/30`}>
        <div><h2 className="font-display text-xl font-semibold text-clay">Delete account</h2><p className="text-sm text-ink/60">Removes your account and all trips permanently.</p></div>
        <button className="btn border border-clay text-clay hover:bg-clay hover:text-white" onClick={() => setConfirm(true)}>Delete account</button>
      </div>
      {confirm && <Confirm text="Your account and every trip and activity will be erased. This cannot be undone." onNo={() => setConfirm(false)} onYes={onDeleteAccount} />}
    </div>
  )
}
