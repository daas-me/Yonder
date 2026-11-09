import { createPortal } from 'react-dom'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

export function Card({ title, hint, children, aside }: { title: string; hint?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="rounded-2xl bg-card p-5 ring-1 ring-line sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><h2 className="font-display text-xl font-semibold">{title}</h2>{hint && <p className="mt-0.5 text-sm text-ink/55">{hint}</p>}</div>
        {aside}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}

export function Row({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-line2 py-4 first:border-t-0 first:pt-0 last:pb-0">
      <div className="min-w-0 max-w-md"><div className="text-sm font-medium">{title}</div>{hint && <div className="text-xs text-ink/55">{hint}</div>}</div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (value: T) => void; label: string }) {
  return (
    <div className="inline-flex max-w-full rounded-lg bg-ink/5 p-0.5 text-xs" role="radiogroup" aria-label={label}>
      {options.map(([key, text]) => (
        <button type="button" role="radio" aria-checked={value === key} key={key} onClick={() => onChange(key)}
          className={`rounded-md px-2.5 py-1.5 transition sm:px-3 ${value === key ? 'bg-card font-semibold text-ink shadow-sm' : 'text-ink/55 hover:text-ink'}`}>{text}</button>
      ))}
    </div>
  )
}

export function ChipList({ items, onChange, placeholder, suggestions = [], max = 40 }: { items: string[]; onChange: (values: string[]) => void; placeholder: string; suggestions?: string[]; max?: number }) {
  const add = (value: string) => {
    const text = value.trim().slice(0, 60)
    if (text && !items.some(item => item.toLowerCase() === text.toLowerCase()) && items.length < max) onChange([...items, text])
  }
  const suggestionsLeft = suggestions.filter(suggestion => !items.some(item => item.toLowerCase() === suggestion.toLowerCase()))
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {items.map(item => (
          <span key={item} className="inline-flex items-center gap-1 rounded-full bg-pine/10 py-1 pl-3 pr-1 text-sm text-ink">
            {item}<button type="button" aria-label={`Remove ${item}`} onClick={() => onChange(items.filter(value => value !== item))} className="flex h-5 w-5 items-center justify-center rounded-full text-ink/50 hover:bg-clay/15 hover:text-clay">×</button>
          </span>
        ))}
        <input className="input min-w-32 flex-1 py-1.5 text-sm" placeholder={placeholder} disabled={items.length >= max}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault()
              add(event.currentTarget.value)
              event.currentTarget.value = ''
            }
          }}
          onBlur={event => { add(event.currentTarget.value); event.currentTarget.value = '' }} />
      </div>
      {suggestionsLeft.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {suggestionsLeft.map(suggestion => <button type="button" key={suggestion} onClick={() => add(suggestion)} className="rounded-full border border-dashed border-line2 px-2.5 py-0.5 text-xs text-ink/60 hover:border-pine hover:text-pine">+ {suggestion}</button>)}
        </div>
      )}
    </div>
  )
}

export function Switch({ on, onChange, label, disabled }: { on: boolean; onChange: (value: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-40 ${on ? 'bg-pine' : 'bg-ink/20'}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

export function SelectMenu({ value, options, onChange, label, className = '' }: {
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  label: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const closeOutside = (event: MouseEvent) => {
      if (!buttonRef.current?.contains(event.target as Node) && !menuRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])
  useLayoutEffect(() => {
    if (!open) return
    const placeMenu = () => {
      const anchor = buttonRef.current?.getBoundingClientRect()
      if (!anchor) return
      const edge = 8
      const gap = 8
      const below = window.innerHeight - anchor.bottom - edge - gap
      const above = anchor.top - edge - gap
      const menuHeight = Math.min(menuRef.current?.scrollHeight ?? 0, Math.max(below, above))
      const opensAbove = below < menuHeight && above > below
      const width = Math.min(Math.max(anchor.width, 176), window.innerWidth - edge * 2)
      const left = Math.max(edge, Math.min(anchor.right - width, window.innerWidth - width - edge))
      setMenuStyle({
        position: 'fixed',
        left,
        top: opensAbove ? Math.max(edge, anchor.top - gap - menuHeight) : anchor.bottom + gap,
        width,
        maxHeight: Math.max(0, opensAbove ? above : below),
        zIndex: 60,
      })
    }
    placeMenu()
    window.addEventListener('resize', placeMenu)
    window.addEventListener('scroll', placeMenu, true)
    return () => {
      window.removeEventListener('resize', placeMenu)
      window.removeEventListener('scroll', placeMenu, true)
    }
  }, [open, options.length])
  const selected = options.find(option => option.value === value)

  return (
    <div className={className}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
        className="flex h-10 min-w-36 items-center gap-3 rounded-xl border border-line2 bg-[#f7f8f6] px-3 text-left text-sm text-ink shadow-sm transition hover:border-pine/35 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine dark:bg-[#18211f] dark:hover:bg-[#202c29]"
      >
        <span className="min-w-0 flex-1 truncate">{selected?.label ?? value}</span>
        <svg aria-hidden="true" className={`h-4 w-4 shrink-0 text-ink/45 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 10 5 5 5-5" /></svg>
      </button>
      {open && createPortal(
        <div ref={menuRef} role="listbox" aria-label={label} style={menuStyle} className="overflow-y-auto rounded-xl border border-line2 bg-[#f7f8f6] p-1.5 shadow-lg dark:bg-[#18211f]">
          {options.map(option => {
            const active = option.value === value
            return (
              <button
                type="button"
                role="option"
                aria-selected={active}
                key={option.value}
                onClick={() => { onChange(option.value); setOpen(false) }}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2.5 text-left text-sm transition ${active ? 'bg-pine/10 font-semibold text-pine' : 'text-ink/70 hover:bg-ink/5 hover:text-ink'}`}
              >
                <span className="flex-1">{option.label}</span>
                {active && <svg aria-hidden="true" className="h-4 w-4 text-pine" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6" /></svg>}
              </button>
            )
          })}
        </div>,
        document.body,
      )}
    </div>
  )
}
