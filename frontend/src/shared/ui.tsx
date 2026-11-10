import { useEffect, useId, useState, type ChangeEvent, type ReactNode } from 'react'

let activeModalCount = 0
let previousBodyOverflow = ''
let previousRootOverflow = ''

export function useModalScrollLock() {
  useEffect(() => {
    if (activeModalCount === 0) {
      previousBodyOverflow = document.body.style.overflow
      previousRootOverflow = document.documentElement.style.overflow
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
    }
    activeModalCount++
    return () => {
      activeModalCount--
      if (activeModalCount === 0) {
        document.body.style.overflow = previousBodyOverflow
        document.documentElement.style.overflow = previousRootOverflow
      }
    }
  }, [])
}

export function Logo({ light, compact }: { light?: boolean; compact?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 ${light ? 'text-white' : 'text-ink'}`}>
      <img src="/yonder_logo.png" alt={compact ? 'Yonder' : ''} className="h-8 w-8 shrink-0 rounded-lg object-contain" />
      {!compact && <span className={`font-serif text-2xl font-bold leading-none tracking-tight ${light ? 'text-white' : 'text-pine'}`}>Yonder</span>}
    </div>
  )
}

export function PlusIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className}><path d="M12 5v14M5 12h14" /></svg>
}

/* Small monospaced tag used for labels and metadata */
export function Tag({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`mono text-[10px] font-medium uppercase tracking-wider ${className}`}>{children}</span>
}

/* Form label: sentence case; a trailing "(optional)" or "(...)" is shown as a muted hint */
export function FieldLabel({ text, className = '' }: { text: string; className?: string }) {
  const m = text.match(/^(.*?)\s*\((.+)\)$/)
  return <span className={`mb-1.5 flex items-baseline gap-1.5 text-[13px] font-medium text-ink/80 ${className}`}>{m ? m[1] : text}{m && <span className="text-xs font-normal text-ink/45">{m[2]}</span>}</span>
}

/* Grouped form section with heading and optional helper text */
export function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-xl border border-line2 p-4">
      <h4 className="text-sm font-semibold text-ink">{title}</h4>
      {hint && <p className="mt-0.5 text-xs text-ink/55">{hint}</p>}
      <div className="mt-3 space-y-4">{children}</div>
    </section>
  )
}

export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <FieldLabel text={label} />
      {children}
      {error && <span className="mt-1 block text-xs text-clay">{error}</span>}
    </label>
  )
}

export function PasswordInput({ value, onChange, placeholder, autoComplete }: { value: string; onChange: (event: ChangeEvent<HTMLInputElement>) => void; placeholder: string; autoComplete: string }) {
  const [visible, setVisible] = useState(false)
  const inputId = useId()

  return (
    <div className="relative">
      <input
        id={inputId}
        className="input pr-16"
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        className="absolute inset-y-0 right-2 my-auto h-8 rounded px-2 text-sm font-medium text-ink/65 hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine"
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        aria-controls={inputId}
        onClick={() => setVisible(!visible)}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          {visible ? (
            <>
              <path d="M3 3l18 18" />
              <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
              <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 8.5 4.5 9.5 7-.4 1-1.2 2.2-2.3 3.3" />
              <path d="M6.2 6.2C4.3 7.5 3 9.4 2.5 12c1 2.5 4.5 7 9.5 7 1.3 0 2.5-.3 3.5-.8" />
            </>
          ) : (
            <>
              <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
              <circle cx="12" cy="12" r="3" />
            </>
          )}
        </svg>
      </button>
    </div>
  )
}

export function UserAvatar({ user, className = 'h-8 w-8 text-sm', imageUrl }: {
  user: { name: string; photoUrl?: string; avatarColor?: string }
  className?: string
  imageUrl?: string
}) {
  const initials = user.name.trim().split(/\s+/).filter(Boolean).map(part => part[0]).slice(0, 2).join('').toUpperCase() || '?'
  return user.photoUrl
    ? <img src={imageUrl ?? user.photoUrl} alt="" className={`shrink-0 rounded-full object-cover ${className}`} />
    : <span className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${className}`} style={{ background: user.avatarColor ?? '#ec6a3c' }}>{initials}</span>
}

export function Modal({ title, onClose, children, wide, animated = false, eyebrow, subtitle, icon }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean; animated?: boolean; eyebrow?: string; subtitle?: string; icon?: ReactNode }) {
  useModalScrollLock()
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 backdrop-blur-[2px] sm:items-center sm:p-4 ${animated ? 'modal-enter-backdrop' : ''}`} onClick={e => { e.stopPropagation(); onClose() }}>
      <div className={`flex max-h-[90vh] min-w-0 w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} flex-col overflow-hidden rounded-2xl modal-surface shadow-2xl ${animated ? 'modal-enter-panel' : ''}`} onClick={e => e.stopPropagation()}>
        <div className={`flex items-center justify-between border-b border-line px-5 py-4 sm:px-6 ${eyebrow || subtitle || icon ? 'bg-gradient-to-r from-moss/70 via-card to-clay/[.04] py-5 sm:py-6' : ''}`}>
          <div className="flex min-w-0 items-center gap-3.5">
            {icon && <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-pine/10 text-pine ring-1 ring-pine/10">{icon}</span>}
            <div className="min-w-0">
              {eyebrow && <p className="mono text-[10px] font-semibold uppercase tracking-[.2em] text-pine/75">{eyebrow}</p>}
              <h3 className={`truncate font-display font-semibold ${eyebrow || subtitle ? 'mt-0.5 text-xl sm:text-2xl' : 'text-lg'}`}>{title}</h3>
              {subtitle && <p className="mt-1 max-w-xl text-xs leading-relaxed text-ink/55 sm:text-sm">{subtitle}</p>}
            </div>
          </div>
          <button className="ml-3 shrink-0 rounded-lg p-2 text-ink/45 transition hover:bg-ink/5 hover:text-ink" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-scroll min-h-0 min-w-0 overflow-auto p-4 sm:p-6">{children}</div>
      </div>
    </div>
  )
}

export function Confirm({ text, onYes, onNo, title = 'Are you sure?', confirmLabel = 'Delete', confirmClassName = 'btn bg-clay text-white hover:opacity-90', eyebrow = 'PLEASE CONFIRM', icon = <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M12 9v4m0 4h.01" /><path d="M10.3 3.9 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3l-7.5-13.1a2 2 0 0 0-3.4 0Z" /></svg>, animated = true }: { text: string; onYes: () => void; onNo: () => void; title?: string; confirmLabel?: string; confirmClassName?: string; eyebrow?: string; icon?: ReactNode; animated?: boolean }) {
  return (
    <Modal title={title} onClose={onNo} eyebrow={eyebrow} icon={icon} animated={animated}>
      <p className="mb-6 text-sm leading-relaxed text-ink/65">{text}</p>
      <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
        <button className="btn btn-ghost ring-1 ring-line" onClick={onNo}>Cancel</button>
        <button className={confirmClassName} onClick={onYes}>{confirmLabel}</button>
      </div>
    </Modal>
  )
}

export function Notice({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <Modal title="Yonder update" onClose={onClose} animated>
      <div className="text-center">
        <span className="trip-confirm-check mx-auto grid h-14 w-14 place-items-center rounded-full bg-pine/10 text-pine" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="trip-confirm-checkmark h-7 w-7"><path d="m5 12 4 4L19 6" /></svg>
        </span>
        <p className="trip-confirm-title mt-4 font-display text-xl font-semibold">All set</p>
        <p className="trip-confirm-description mt-1 text-sm text-ink/60">{text}</p>
        <button className="trip-confirm-button btn btn-primary mt-6 min-w-28" onClick={onClose}>Done</button>
      </div>
    </Modal>
  )
}
