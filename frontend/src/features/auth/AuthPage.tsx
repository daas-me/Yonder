import { useEffect, useState } from 'react'
import { ApiError } from '../../services'
import { Field, Logo, PasswordInput } from '../../shared'

/* ---------------- Auth ---------------- */
export default function AuthPage({ onLogin, onRegister, initialMode = 'login', onModeChange }: { onLogin: (email: string, password: string) => Promise<void>; onRegister: (name: string, email: string, password: string) => Promise<void>; initialMode?: 'login' | 'register'; onModeChange?: (mode: 'login' | 'register') => void }) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode)
  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '' })
  const [err, setErr] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })
  useEffect(() => setMode(initialMode), [initialMode])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const er: Record<string, string> = {}
    const email = f.email.trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(email)) er.email = 'Enter a valid email address.'
    if (mode === 'register') {
      if (!f.name.trim()) er.name = 'Your name is required.'
      if (f.password.length < 8 || !/[a-z]/.test(f.password) || !/[A-Z]/.test(f.password) || !/\d/.test(f.password) || !/[^A-Za-z0-9]/.test(f.password)) {
        er.password = 'Use at least 8 characters, including an uppercase letter, a lowercase letter, a number, and a special character.'
      }
      if (f.password !== f.confirm) er.confirm = 'Passwords do not match.'
    } else if (f.password.length < 6) er.password = 'Password must be at least 6 characters.'
    setErr(er)
    if (Object.keys(er).length) return
    setBusy(true)
    try {
      if (mode === 'register') await onRegister(f.name.trim(), email, f.password)
      else await onLogin(email, f.password)
    } catch (error) {
      const apiError = error instanceof ApiError ? error : undefined
      if (mode === 'login' && apiError?.status === 401) {
        setErr({ form: "We couldn't sign you in. Check your email and password, or choose Create one if you haven't registered yet." })
      } else if (apiError?.fieldErrors && Object.keys(apiError.fieldErrors).length > 0) {
        setErr(apiError.fieldErrors)
      } else {
        setErr({ form: apiError?.message ?? 'Could not complete your request. Please try again.' })
      }
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
            <div className="mono text-[10px] uppercase tracking-wider text-ink/45">Boarding pass · YND-0053</div>
            <div className="mt-2 flex items-center gap-3 font-display text-3xl"><span>CGY</span><span className="h-px flex-1 bg-[repeating-linear-gradient(90deg,var(--color-line2)_0_6px,transparent_6px_10px)]" /><span className="text-pine">CEB</span></div>
            <div className="mono mt-4 grid grid-cols-3 text-[10px] uppercase text-ink/45"><span>Depart<br /><b className="text-sm font-normal text-ink">17 DEC</b></span><span>Days<br /><b className="text-sm font-normal text-ink">08</b></span><span>Budget<br /><b className="text-sm font-normal text-ink">₱13,000</b></span></div>
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
          <Field label="Password" error={err.password}><PasswordInput value={f.password} onChange={set('password')} placeholder={mode === 'register' ? 'At least 8 characters' : 'Enter your password'} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} /></Field>
          {mode === 'register' && <p className="-mt-2 text-xs leading-relaxed text-ink/55">At least 8 characters with uppercase and lowercase letters, a number, and a special character.</p>}
          {mode === 'register' && <Field label="Confirm password" error={err.confirm}><PasswordInput value={f.confirm} onChange={set('confirm')} placeholder="Re-enter your password" autoComplete="new-password" /></Field>}
          {err.form && <p role="alert" className="rounded-xl border border-clay/20 bg-clay/10 px-3 py-2.5 text-sm leading-relaxed text-clay">{err.form}</p>}
          <button className="btn btn-primary inline-flex w-full items-center justify-center py-3" disabled={busy} aria-busy={busy}>
            {busy ? mode === 'register' ? 'Creating account...' : 'Signing in...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
          {busy && <p role="status" className="sr-only">{mode === 'register' ? 'Creating account...' : 'Signing in...'}</p>}
          <p className="text-center text-sm text-ink/60">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button type="button" className="font-semibold text-pine underline-offset-4 hover:underline" onClick={() => {
              const nextMode = mode === 'login' ? 'register' : 'login'
              setMode(nextMode)
              setErr({})
              onModeChange?.(nextMode)
            }}>
              {mode === 'login' ? 'Create one' : 'Sign in'}
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
