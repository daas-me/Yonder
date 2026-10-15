import { useState } from 'react'
import { Field, Logo, type Trip, uid, type User } from '../../shared'

/* ---------------- Auth ---------------- */
export default function AuthPage({ users, onLogin, onRegister }: { users: User[]; onLogin: (u: User) => void; onRegister: (u: User) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '' })
  const [err, setErr] = useState<Record<string, string>>({})
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const er: Record<string, string> = {}
    const email = f.email.trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(email)) er.email = 'Enter a valid email address.'
    if (f.password.length < 6) er.password = 'Password must be at least 6 characters.'
    if (mode === 'register') {
      if (!f.name.trim()) er.name = 'Your name is required.'
      if (f.password !== f.confirm) er.confirm = 'Passwords do not match.'
      if (users.some(u => u.email === email)) er.email = 'An account with this email already exists.'
      setErr(er)
      if (Object.keys(er).length) return
      onRegister({ id: uid(), name: f.name.trim(), email, password: f.password, homeCity: '', createdAt: new Date().toISOString() })
    } else {
      setErr(er)
      if (Object.keys(er).length) return
      const u = users.find(u => u.email === email && u.password === f.password)
      if (!u) return setErr({ password: 'Incorrect email or password.' })
      onLogin(u)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="topo relative hidden flex-col justify-between bg-pine p-12 text-white lg:flex">
        <Logo light />
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[.3em] text-white/60">Trip & itinerary planner</p>
          <h1 className="font-display text-6xl leading-[1.05]">Every journey,<br /><em className="text-[#f2c6a0]">one page.</em></h1>
          <p className="mt-6 max-w-md text-white/75">Gather scattered notes, messages and spreadsheets into a single day-by-day itinerary with a running budget estimate.</p>
        </div>
        <div className="flex gap-10 text-sm text-white/70">
          <div><div className="font-display text-3xl text-white">Trips</div>dates & destinations</div>
          <div><div className="font-display text-3xl text-white">Days</div>ordered schedules</div>
          <div><div className="font-display text-3xl text-white">₱</div>budget totals</div>
        </div>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h2 className="font-display text-4xl font-semibold">{mode === 'login' ? 'Welcome back' : 'Start your journey'}</h2>
          <p className="pb-2 text-sm text-ink/60">{mode === 'login' ? 'Sign in to your travel plans.' : 'Create an account to plan trips.'}</p>
          {mode === 'register' && <Field label="Full name" error={err.name}><input className="input" value={f.name} onChange={set('name')} /></Field>}
          <Field label="Email" error={err.email}><input className="input" type="email" value={f.email} onChange={set('email')} placeholder="you@example.com" /></Field>
          <Field label="Password" error={err.password}><input className="input" type="password" value={f.password} onChange={set('password')} /></Field>
          {mode === 'register' && <Field label="Confirm password" error={err.confirm}><input className="input" type="password" value={f.confirm} onChange={set('confirm')} /></Field>}
          <button className="btn btn-primary w-full py-3">{mode === 'login' ? 'Sign in' : 'Create account'}</button>
          <p className="text-center text-sm text-ink/60">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button type="button" className="font-semibold text-pine underline-offset-4 hover:underline" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr({}) }}>
              {mode === 'login' ? 'Create one' : 'Sign in'}
            </button>
          </p>
          {mode === 'login' && <p className="rounded-lg bg-moss p-3 text-center text-xs text-ink/70">Demo account: <b>demo@yonder.ph</b> / <b>yonder123</b></p>}
        </form>
      </div>
    </div>
  )
}
