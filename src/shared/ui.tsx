import type React from 'react'
export function Logo({ light }: { light?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${light ? 'text-white' : 'text-ink'}`}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 20l6-11 4 6 3-4 5 9z" /><circle cx="17" cy="5" r="2" /></svg>
      <span className="font-display text-2xl font-semibold tracking-tight">Yonder</span>
    </div>
  )
}

export function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink/60">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-clay">{error}</span>}
    </label>
  )
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl bg-sand p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-display text-2xl font-semibold">{title}</h3>
          <button className="btn btn-ghost px-2 py-1" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
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
