import { useEffect, useId, useState, type ChangeEvent, type ReactNode } from 'react'
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

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-[2px] sm:items-center" onClick={onClose}>
      <div className={`flex max-h-[90vh] w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} flex-col overflow-hidden rounded-2xl modal-surface rounded-2xl shadow-2xl`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h3 className="font-display text-lg">{title}</h3>
          <button className="rounded-md px-2 py-1 text-ink/50 hover:bg-ink/5 hover:text-ink" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="overflow-auto p-6">{children}</div>
      </div>
    </div>
  )
}

export function Confirm({ text, onYes, onNo, title = 'Are you sure?', confirmLabel = 'Delete', confirmClassName = 'btn bg-clay text-white hover:opacity-90' }: { text: string; onYes: () => void; onNo: () => void; title?: string; confirmLabel?: string; confirmClassName?: string }) {
  return (
    <Modal title={title} onClose={onNo}>
      <p className="mb-6 text-sm text-ink/70">{text}</p>
      <div className="flex justify-end gap-2">
        <button className="btn btn-ghost" onClick={onNo}>Cancel</button>
        <button className={confirmClassName} onClick={onYes}>{confirmLabel}</button>
      </div>
    </Modal>
  )
}
