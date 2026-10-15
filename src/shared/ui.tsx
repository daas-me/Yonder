import { useEffect, type ReactNode } from 'react'
export function Logo({ light, compact }: { light?: boolean; compact?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 ${light ? 'text-white' : 'text-ink'}`}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pine text-white">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 5l7 8 7-8M12 13v7" /></svg>
      </span>
      {!compact && <span className="font-display text-xl leading-none">Yonder</span>}
    </div>
  )
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

export function Confirm({ text, onYes, onNo }: { text: string; onYes: () => void; onNo: () => void }) {
  return (
    <Modal title="Are you sure?" onClose={onNo}>
      <p className="mb-6 text-sm text-ink/70">{text}</p>
      <div className="flex justify-end gap-2">
        <button className="btn btn-ghost" onClick={onNo}>Cancel</button>
        <button className="btn bg-clay text-white hover:opacity-90" onClick={onYes}>Delete</button>
      </div>
    </Modal>
  )
}
