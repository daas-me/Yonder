import type { Note } from '../../shared'

const MARKS: Record<Note['kind'], string> = { soon: '✈', packing: '✓', budget: '₱', spending: '₱' }

export default function NoteList({ notes, onOpen, onDismiss }: { notes: Note[]; onOpen?: (note: Note) => void; onDismiss?: (note: Note) => void }) {
  return (
    <ul className="divide-y divide-line2">
      {notes.map(note => (
        <li key={note.id} className="group relative">
          <button type="button" onClick={() => onOpen?.(note)} disabled={!onOpen} className="flex w-full items-start gap-3 rounded-xl p-2.5 pr-9 text-left transition enabled:hover:bg-ink/[.04]">
            <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${note.tone === 'alert' ? 'bg-clay/15 text-clay' : note.tone === 'warn' ? 'bg-[#c99a2e]/15 text-[#9b741e]' : 'bg-pine/10 text-pine'}`}>{MARKS[note.kind]}</span>
            <span className="min-w-0">
              <span className={`block text-sm font-semibold leading-snug ${note.tone === 'alert' ? 'text-clay' : ''}`}>{note.title}</span>
              <span className="block truncate text-xs text-ink/55">{note.body}</span>
            </span>
          </button>
          {onDismiss && <button type="button" aria-label={`Dismiss ${note.title}`} title="Dismiss" onClick={() => onDismiss(note)} className="absolute right-2 top-2.5 flex h-6 w-6 items-center justify-center rounded-md text-ink/35 opacity-0 transition hover:bg-ink/5 hover:text-ink group-hover:opacity-100 focus:opacity-100">×</button>}
        </li>
      ))}
    </ul>
  )
}
