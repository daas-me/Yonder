import { useEffect, useState } from 'react'
import { ApiError } from '../../services'
import { Field, Logo, PasswordInput } from '../../shared'

/* ---------------- Auth ---------------- */
type AuthMode = 'landing' | 'login' | 'register'

export default function AuthPage({ onLogin, onRegister, initialMode = 'landing', onModeChange }: { onLogin: (email: string, password: string) => Promise<void>; onRegister: (name: string, email: string, password: string) => Promise<void>; initialMode?: AuthMode; onModeChange?: (mode: 'login' | 'register') => void }) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
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
    <div className="auth-shell min-h-screen" data-mode={mode}>
      <section className="auth-landing-panel relative flex min-w-0 flex-col justify-between overflow-hidden border-r border-line bg-card p-6 sm:p-10 lg:p-12">
        <div className="auth-background-art absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
          <svg viewBox="0 0 760 640" fill="none" className="auth-route-illustration absolute">
            <circle cx="460" cy="320" r="248" fill="currentColor" opacity=".04" />
            <circle cx="460" cy="320" r="248" stroke="currentColor" strokeOpacity=".18" />
            <ellipse cx="460" cy="320" rx="112" ry="248" stroke="currentColor" strokeOpacity=".14" />
            <path d="M212 320h496M460 72c-58 66-88 151-88 248s30 182 88 248m0-496c58 66 88 151 88 248s-30 182-88 248" stroke="currentColor" strokeOpacity=".12" />
            <path d="M77 485c98-16 137-126 234-126 77 0 103 58 174 58 79 0 105-85 198-85" stroke="currentColor" strokeOpacity=".36" strokeWidth="2" strokeDasharray="7 11" strokeLinecap="round" />
            <circle cx="77" cy="485" r="8" fill="currentColor" fillOpacity=".2" stroke="currentColor" strokeOpacity=".55" strokeWidth="2" />
            <circle cx="311" cy="359" r="7" fill="currentColor" fillOpacity=".2" stroke="currentColor" strokeOpacity=".55" strokeWidth="2" />
            <circle cx="485" cy="417" r="7" fill="currentColor" fillOpacity=".2" stroke="currentColor" strokeOpacity=".55" strokeWidth="2" />
            <circle cx="683" cy="332" r="10" fill="var(--color-clay)" fillOpacity=".24" stroke="var(--color-clay)" strokeOpacity=".6" strokeWidth="2" />
          </svg>
        </div>
        <div className="relative z-10 flex items-center"><Logo /></div>
        <div className={`auth-hero relative z-10 ${mode === 'landing' ? 'auth-hero-welcome' : ''}`}>
          <div className="auth-copy">
            <h1 className="font-display text-5xl leading-[1.02] sm:text-6xl xl:text-7xl">Make room<br /><span className="text-pine">for the moments.</span></h1>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-ink/65 sm:text-base">Plan every day, discover places to go, and keep your travel budget on track. Bring your itinerary, trip details, and favorite memories together in one place—from the first idea to the journey home.</p>
            {mode === 'landing' && <div className="mt-7 flex flex-wrap gap-3">
                <button type="button" className="btn btn-primary px-6 py-3" onClick={() => onModeChange?.('login')}>Sign in</button>
                <button type="button" className="btn btn-ghost px-6 py-3 ring-1 ring-line2" onClick={() => onModeChange?.('register')}>Create an account</button>
              </div>}
          </div>
        </div>
        <div className="soft relative z-10 flex max-w-md rotate-[-1.5deg] overflow-hidden rounded-2xl border border-line bg-sand">
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
      </section>
      <section className="auth-panel flex min-w-0 items-center justify-center overflow-hidden p-6 sm:p-10">
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
      </section>
    </div>
  )
}
