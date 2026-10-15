import { useEffect, useState, type ReactNode } from 'react'
import { api, assetUrl } from '../../services'
import { type Memory, PlusIcon, uid } from '../../shared'
import { compress, delPhotos, getPhoto } from './storage'

function usePhoto(id: string, photoUrl?: string) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (photoUrl) { setUrl(undefined); return }
    let u: string | undefined, live = true
    getPhoto(id).then(b => { if (b && live) { u = URL.createObjectURL(b); setUrl(u) } })
    return () => { live = false; if (u) URL.revokeObjectURL(u) }
  }, [id, photoUrl])
  return url
}

function Photo({ id, photoUrl, className, onClick }: { id: string; photoUrl?: string; className?: string; onClick?: () => void }) {
  const url = usePhoto(id, photoUrl)
  return photoUrl || url ? <img src={photoUrl ? assetUrl(photoUrl) : url} alt="" className={className} onClick={onClick} /> : <div className={`${className} animate-pulse bg-black/10`} />
}

type Props = {
  tripId: string; title: string; subtitle: string; cover?: ReactNode; memories: Memory[]; readOnly?: boolean
  onChange: (m: Memory[]) => void | Promise<void>; onDownload: () => Promise<void>; onClose: () => void; toast: (m: string) => void
}

export default function MemoriesModal({ tripId, title, subtitle, cover, memories, readOnly, onChange, onDownload, onClose, toast }: Props) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState('')
  const [view, setView] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null)
  const [confirmDel, setConfirmDel] = useState<Memory | null>(null)
  const photos = memories.filter(m => m.kind === 'photo')
  const sorted = [...memories].sort((a, b) => b.at.localeCompare(a.at))

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(`Saving ${files.length} photo${files.length > 1 ? 's' : ''}…`)
    const add: { memory: Memory; blob: Blob }[] = []
    for (const f of Array.from(files)) {
      if (!f.type.startsWith('image/')) continue
      try {
        const id = uid() + uid()
        add.push({ memory: { id, kind: 'photo', text: '', at: new Date().toISOString() }, blob: await compress(f) })
      } catch {
        toast(`Could not process ${f.name}`)
      }
    }
    if (!add.length) { setBusy(''); toast('No readable images'); return }
    try {
      await onChange([...memories, ...add.map(item => item.memory)])
      const uploaded: Memory[] = []
      for (const item of add) {
        try {
          const result = await api.uploadMemoryPhoto(tripId, item.memory.id, item.blob)
          uploaded.push({ ...item.memory, photoUrl: result.url })
        } catch (error) {
          toast(error instanceof Error ? `Could not upload a photo: ${error.message}` : 'Could not upload a photo')
          uploaded.push(item.memory)
        }
      }
      await onChange([...memories, ...uploaded])
      toast(`${uploaded.length} photo${uploaded.length > 1 ? 's' : ''} added`)
    } catch (error) {
      toast(error instanceof Error ? `Could not save photos: ${error.message}` : 'Could not save photos')
    } finally {
      setBusy('')
    }
  }
  const addNote = () => {
    if (!text.trim()) return
    onChange([...memories, { id: uid(), kind: 'note', text: text.trim().slice(0, 5000), at: new Date().toISOString() }]); setText('')
  }
  const remove = async (m: Memory) => {
    try {
      if (m.kind === 'photo' && m.photoUrl?.includes('/photos/memories/')) await api.deleteMemoryPhoto(tripId, m.id)
      await onChange(memories.filter(x => x.id !== m.id))
      if (m.kind === 'photo') await delPhotos([m.id])
      if (view === m.id) setView(null)
      toast('Memory removed')
    } catch (error) {
      toast(error instanceof Error ? `Could not remove memory: ${error.message}` : 'Could not remove memory')
    }
  }
  const saveEdit = () => {
    if (!editing?.text.trim()) return
    onChange(memories.map(m => (m.id === editing.id ? { ...m, text: editing.text.trim().slice(0, 5000), edited: new Date().toISOString() } : m)))
    setEditing(null); toast('Entry updated')
  }
  const caption = (id: string, t: string) => onChange(memories.map(m => (m.id === id ? { ...m, text: t.slice(0, 300) } : m)))
  const viewIdx = photos.findIndex(p => p.id === view)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6" onClick={onClose}>
      <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden bg-[#fffdf6] text-[#2b2b2b] shadow-2xl sm:flex-row" onClick={e => e.stopPropagation()}>
        {/* Postcard front */}
        <div className="relative shrink-0 border-b-2 border-dashed border-black/10 p-5 sm:w-[42%] sm:border-b-0 sm:border-r-2">
          <div className="overflow-hidden ring-1 ring-black/10">{cover}</div>
          <h3 className="mt-4 font-hand text-4xl leading-none">{title}</h3>
          <p className="mt-1 text-sm text-black/55">{subtitle}</p>
          <div className="mt-4 flex gap-4 text-sm text-black/60"><span><b className="font-display text-xl text-black">{photos.length}</b> photos</span><span><b className="font-display text-xl text-black">{memories.length - photos.length}</b> entries</span></div>
          <button className="mt-5 w-full rounded-lg border border-[#17675b] px-4 py-2.5 text-sm font-semibold text-[#17675b] hover:bg-[#17675b] hover:text-white disabled:opacity-40" disabled={!memories.length || !!busy}
            onClick={async () => { setBusy('Packing zip…'); try { await onDownload() } catch { toast('Could not build the zip') } setBusy('') }}>
            Download memories (.zip)
          </button>
          <span className="absolute right-5 top-5 hidden h-14 w-12 rotate-3 border-2 border-dashed border-[#ec6a3c]/60 sm:block" />
        </div>

        {/* Journal */}
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-black/10 px-5 py-3">
            <span className="text-xs font-semibold uppercase tracking-[.25em] text-black/45">Journal</span>
            <button className="rounded px-2 py-1 text-black/50 hover:bg-black/5" onClick={onClose} aria-label="Close">✕</button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-5">
            {!readOnly && (
              <div className="mb-6 rounded-xl bg-[#f4efe2] p-3">
                <textarea className="w-full resize-none bg-transparent font-hand text-2xl leading-snug outline-none placeholder:text-black/30" rows={3} placeholder="What happened here? How did it feel?" value={text} onChange={e => setText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote() }} />
                <div className="flex items-center justify-between gap-2">
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold text-[#17675b] hover:bg-black/5">
                    {busy || <><PlusIcon />Add photos</>}<input type="file" accept="image/*" multiple className="hidden" onChange={e => { addPhotos(e.target.files); e.target.value = '' }} />
                  </label>
                  <button className="rounded-lg bg-[#17675b] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40" disabled={!text.trim()} onClick={addNote}>Save entry</button>
                </div>
              </div>
            )}
            {photos.length > 0 && (
              <div className="mb-6 grid grid-cols-3 gap-2">
                {photos.map((p, i) => <div key={p.id} className="bg-white p-1 shadow-md" style={{ transform: `rotate(${[-1.5, 1, -0.5, 1.5][i % 4]}deg)` }}><Photo id={p.id} photoUrl={p.photoUrl} onClick={() => setView(p.id)} className="aspect-square w-full cursor-zoom-in object-cover transition hover:opacity-90" /></div>)}
              </div>
            )}
            {sorted.length === 0 ? <p className="py-10 text-center font-hand text-2xl text-black/35">No memories yet. Add your first photo or story.</p> : (
              <ol className="space-y-4">
                {sorted.map(m => (
                  <li key={m.id} className="group border-l-2 border-[#ec6a3c]/40 pl-4">
                    <div className="flex items-center justify-between text-xs text-black/45">
                      <span>{new Date(m.at).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · {m.kind === 'photo' ? 'Photo' : 'Entry'}{m.edited ? ' · edited' : ''}</span>
                      {!readOnly && editing?.id !== m.id && (
                        <span className="flex gap-3 opacity-60 group-hover:opacity-100">
                          {m.kind === 'note' && <button className="font-semibold text-[#17675b]" onClick={() => setEditing({ id: m.id, text: m.text })}>Edit</button>}
                          <button className="text-[#ec6a3c]" onClick={() => setConfirmDel(m)}>Remove</button>
                        </span>
                      )}
                    </div>
                    {m.kind === 'note' ? (editing?.id === m.id ? (
                      <div className="mt-2 rounded-lg bg-[#f4efe2] p-2">
                        <textarea autoFocus className="w-full resize-none bg-transparent font-hand text-2xl leading-snug outline-none" rows={3} value={editing.text}
                          onChange={e => setEditing({ ...editing, text: e.target.value })}
                          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveEdit(); if (e.key === 'Escape') { e.stopPropagation(); setEditing(null) } }} />
                        <div className="flex justify-end gap-2">
                          <button className="rounded px-3 py-1 text-sm text-black/60 hover:bg-black/5" onClick={() => setEditing(null)}>Cancel</button>
                          <button className="rounded bg-[#17675b] px-3 py-1 text-sm font-semibold text-white disabled:opacity-40" disabled={!editing.text.trim()} onClick={saveEdit}>Save</button>
                        </div>
                      </div>
                    ) : <p className="mt-1 whitespace-pre-wrap font-hand text-2xl leading-snug">{m.text}</p>) : (
                      <div className="mt-2 flex items-center gap-3">
                        <Photo id={m.id} photoUrl={m.photoUrl} onClick={() => setView(m.id)} className="h-14 w-14 cursor-zoom-in object-cover" />
                        <input className="flex-1 border-b border-dashed border-black/15 bg-transparent font-hand text-xl outline-none placeholder:text-black/30" placeholder={readOnly ? '' : 'Add a caption…'} readOnly={readOnly} value={m.text} onChange={e => caption(m.id, e.target.value)} />
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>

      {confirmDel && (
        <div className="fixed inset-0 z-[56] flex items-center justify-center bg-black/50 p-4" onClick={e => { e.stopPropagation(); setConfirmDel(null) }}>
          <div className="w-full max-w-sm rounded-2xl bg-[#fffdf6] p-6 text-[#2b2b2b] shadow-2xl" onClick={e => e.stopPropagation()}>
            <h4 className="font-display text-xl font-semibold">Remove this {confirmDel.kind === 'photo' ? 'photo' : 'entry'}?</h4>
            <p className="mt-2 text-sm text-black/60">This memory will be permanently deleted{confirmDel.kind === 'photo' ? ' from this browser' : ''}. This can't be undone.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="rounded-lg px-4 py-2 text-sm font-semibold hover:bg-black/5" onClick={() => setConfirmDel(null)}>Cancel</button>
              <button className="rounded-lg bg-[#ec6a3c] px-4 py-2 text-sm font-semibold text-white" onClick={() => { void remove(confirmDel); setConfirmDel(null) }}>Remove</button>
            </div>
          </div>
        </div>
      )}
      {view && viewIdx >= 0 && (
        <div className="fixed inset-0 z-[55] flex flex-col items-center justify-center bg-black/90 p-6" onClick={e => { e.stopPropagation(); setView(null) }}>
          <Photo id={view} photoUrl={photos[viewIdx].photoUrl} className="max-h-[80vh] max-w-full object-contain shadow-2xl" />
          {photos[viewIdx].text && <p className="mt-4 font-hand text-3xl text-white">{photos[viewIdx].text}</p>}
          <div className="mt-4 flex gap-3" onClick={e => e.stopPropagation()}>
            <button className="rounded-full bg-white/15 px-4 py-2 text-white disabled:opacity-30" disabled={viewIdx === 0} onClick={() => setView(photos[viewIdx - 1].id)}>← Prev</button>
            <span className="self-center text-sm text-white/60">{viewIdx + 1} / {photos.length}</span>
            <button className="rounded-full bg-white/15 px-4 py-2 text-white disabled:opacity-30" disabled={viewIdx === photos.length - 1} onClick={() => setView(photos[viewIdx + 1].id)}>Next →</button>
          </div>
        </div>
      )}
    </div>
  )
}
