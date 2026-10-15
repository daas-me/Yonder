import { useState } from 'react'
import { ApiError } from '../../services'
import { Field, Logo, PasswordInput } from '../../shared'

/* ---------------- Auth ---------------- */
export default function AuthPage({ onLogin, onRegister }: { onLogin: (email: string, password: string) => Promise<void>; onRegister: (name: string, email: string, password: string) => Promise<void> }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '' })
  const [err, setErr] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const er: Record<string, string> = {}
    const email = f.email.trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(email)) er.email = 'Enter a valid email address.'
    if (f.password.length < 6) er.password = 'Password must be at least 6 characters.'
    if (mode === 'register') {
      if (!f.name.trim()) er.name = 'Your name is required.'
      if (f.password !== f.confirm) er.confirm = 'Passwords do not match.'
    }
    setErr(er)
    if (Object.keys(er).length) return
    setBusy(true)
    try {
      if (mode === 'register') await onRegister(f.name.trim(), email, f.password)
      else await onLogin(email, f.password)
    } catch (error) {
      const apiError = error instanceof ApiError ? error : undefined
      setErr(apiError?.fieldErrors ?? { password: apiError?.message ?? 'Could not sign in. Please try again.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-line bg-card p-12 lg:flex">
        <div className="flex items-center"><Logo /></div>
        <div>
          <h1 className="font-display text-6xl leading-[1.02]">Make room<br /><span className="text-pine">for the moments.</span></h1>
          <p className="mt-5 max-w-md text-ink/65">Plan every day, discover places to go, and keep your travel budget on track. Bring your itinerary, trip details, and favorite memories together in one place—from the first idea to the journey home.</p>
        </div>
        <div className="soft flex max-w-md rotate-[-1.5deg] overflow-hidden rounded-2xl border border-line bg-sand">
          <div className="flex-1 p-5">
            <div className="mono text-[10px] uppercase tracking-wider text-ink/45">Boarding pass · YND-0001</div>
            <div className="mt-2 flex items-center gap-3 font-display text-3xl"><span>MNL</span><span className="h-px flex-1 bg-[repeating-linear-gradient(90deg,var(--color-line2)_0_6px,transparent_6px_10px)]" /><span className="text-pine">BAG</span></div>
            <div className="mono mt-4 grid grid-cols-3 text-[10px] uppercase text-ink/45"><span>Depart<br /><b className="text-sm font-normal text-ink">20 Nov</b></span><span>Days<br /><b className="text-sm font-normal text-ink">03</b></span><span>Budget<br /><b className="text-sm font-normal text-ink">₱3,000</b></span></div>
          </div>
          <div className="flex w-24 flex-col justify-between border-l border-dashed border-line2 p-4">
            <span className="mono text-[10px] uppercase text-ink/45">Seat 1A</span>
            <div className="barcode h-8 w-full" />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h2 className="font-display text-3xl">{mode === 'login' ? 'Welcome back' : 'Start your journey'}</h2>
          <p className="pb-2 text-sm text-ink/60">{mode === 'login' ? 'Sign in to your travel plans.' : 'Create an account to plan trips.'}</p>
          {mode === 'register' && <Field label="Full name" error={err.name}><input className="input" value={f.name} onChange={set('name')} /></Field>}
          <Field label="Email" error={err.email}><input className="input" type="email" value={f.email} onChange={set('email')} placeholder="you@example.com" /></Field>
          <Field label="Password" error={err.password}><PasswordInput value={f.password} onChange={set('password')} placeholder={mode === 'register' ? 'At least 6 characters' : 'Enter your password'} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} /></Field>
          {mode === 'register' && <Field label="Confirm password" error={err.confirm}><PasswordInput value={f.confirm} onChange={set('confirm')} placeholder="Re-enter your password" autoComplete="new-password" /></Field>}
          <button className="btn btn-primary w-full py-3" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
          <p className="text-center text-sm text-ink/60">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button type="button" className="font-semibold text-pine underline-offset-4 hover:underline" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr({}) }}>
              {mode === 'login' ? 'Create one' : 'Sign in'}
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
