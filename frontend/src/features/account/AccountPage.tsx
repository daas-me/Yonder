import { useState } from 'react'
import { ApiError, assetUrl, resizeImage } from '../../services'
import { Confirm, Field, PasswordInput, PlusIcon, type Trip, type User } from '../../shared'

/* ---------------- Account ---------------- */
export default function AccountPage({ user, trips, onSave, onPhotoUpload, onPhotoRemove, onPasswordChange, onDeleteAccount, toast }: { user: User; trips: Trip[]; onSave: (profile: Pick<User, 'name' | 'email' | 'homeCity'>) => Promise<void>; onPhotoUpload: (photo: Blob) => Promise<void>; onPhotoRemove: () => Promise<void>; onPasswordChange: (current: string, next: string) => Promise<void>; onDeleteAccount: () => Promise<void>; toast: (m: string) => void }) {
  const [p, setP] = useState({ name: user.name, email: user.email, homeCity: user.homeCity })
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [confirmPasswordChange, setConfirmPasswordChange] = useState(false)
  const [err, setErr] = useState<Record<string, string>>({})
  const [confirm, setConfirm] = useState(false)
  const [deleteErr, setDeleteErr] = useState('')
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const uploadPhoto = async (file?: File) => {
    if (!file) return
    setPhotoBusy(true)
    setPhotoError('')
    try {
      const compressed = await resizeImage(file, 640)
      await onPhotoUpload(await (await fetch(compressed)).blob())
      toast('Profile photo updated')
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : 'Could not upload your profile photo.')
    } finally {
      setPhotoBusy(false)
    }
  }
  const removePhoto = async () => {
    setPhotoBusy(true)
    setPhotoError('')
    try {
      await onPhotoRemove()
      toast('Profile photo removed')
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : 'Could not remove your profile photo.')
    } finally {
      setPhotoBusy(false)
    }
  }
  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    const er: Record<string, string> = {}
    if (!p.name.trim()) er.name = 'Name is required.'
    if (!/^\S+@\S+\.\S+$/.test(p.email)) er.email = 'Enter a valid email.'
    setErr(er)
    if (Object.keys(er).length) return
    try {
      await onSave({ name: p.name.trim(), email: p.email.trim().toLowerCase(), homeCity: p.homeCity.trim() })
      toast('Profile saved')
    } catch (error) {
      setErr(error instanceof ApiError ? error.fieldErrors : { email: 'Could not save your profile.' })
    }
  }
  const savePw = async (e: React.FormEvent) => {
    e.preventDefault()
    const er: Record<string, string> = {}
    if (pw.next.length < 6) er.next = 'At least 6 characters.'
    if (pw.next !== pw.confirm) er.confirm = 'Passwords do not match.'
    setErr(er)
    if (Object.keys(er).length) return
    setConfirmPasswordChange(true)
  }
  const updatePassword = async () => {
    try {
      await onPasswordChange(pw.current, pw.next)
      setPw({ current: '', next: '', confirm: '' })
      setConfirmPasswordChange(false)
      toast('Password updated')
    } catch (error) {
      setErr(error instanceof ApiError ? { current: error.message } : { current: 'Could not update your password.' })
      setConfirmPasswordChange(false)
    }
  }
  const deleteAccount = async () => {
    try {
      await onDeleteAccount()
    } catch (error) {
      setDeleteErr(error instanceof Error ? error.message : 'Could not delete your account.')
      setConfirm(false)
    }
  }
  const initials = user.name.trim().split(/\s+/).map(s => s[0]).slice(0, 2).join('').toUpperCase()
  const card = 'rounded-2xl border border-line bg-card p-5 shadow-sm sm:p-7'
  return (
    <div className="mx-auto max-w-4xl space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="mono text-[10px] font-medium uppercase tracking-[.2em] text-pine">Your Yonder profile</p><h1 className="mt-1 font-display text-4xl font-semibold sm:text-5xl">Account</h1></div>
        <p className="pb-1 text-sm text-ink/55">Manage your details, photo, and sign-in security.</p>
      </div>
      <div className="topo flex flex-wrap items-center gap-4 rounded-2xl bg-pine p-5 text-white sm:gap-5 sm:p-6">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/15 font-display text-2xl font-semibold text-white ring-2 ring-white/25 sm:h-[4.5rem] sm:w-[4.5rem]">
          {user.photoUrl ? <img src={assetUrl(user.photoUrl)} alt={`${user.name}'s profile`} className="h-full w-full object-cover" /> : initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="break-words font-display text-xl sm:text-2xl">{user.name}</div>
          <div className="mt-0.5 break-all text-sm text-white/75">{user.email}</div>
          <div className="mt-1 text-xs text-white/60">Traveler since {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
        </div>
        <div className="flex min-w-20 items-center gap-2 rounded-xl bg-white/10 px-3 py-2 sm:min-w-24 sm:flex-col sm:gap-0 sm:text-right"><div className="font-display text-2xl leading-none sm:text-3xl">{trips.length}</div><div className="text-xs text-white/65">trips planned</div></div>
      </div>
      <section className={card}>
        <div className="flex flex-wrap items-center gap-4 sm:gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-moss font-display text-2xl font-semibold text-pine ring-1 ring-line2 sm:h-20 sm:w-20">
            {user.photoUrl ? <img src={assetUrl(user.photoUrl)} alt={`${user.name}'s profile`} className="h-full w-full object-cover" /> : initials}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-semibold sm:text-2xl">Profile photo</h2>
            <p className="mt-1 text-sm text-ink/55">Personalize your account. Images are resized before upload.</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className={`btn btn-primary inline-flex items-center justify-center gap-2 ${photoBusy ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}>
                {!photoBusy && !user.photoUrl && <PlusIcon className="h-4 w-4" />}
                {photoBusy ? 'Saving…' : user.photoUrl ? 'Change photo' : 'Upload photo'}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={photoBusy}
                  onChange={event => { void uploadPhoto(event.target.files?.[0]); event.currentTarget.value = '' }} />
              </label>
              {user.photoUrl && <button type="button" className="btn btn-ghost" disabled={photoBusy} onClick={() => void removePhoto()}>Remove photo</button>}
            </div>
          </div>
        </div>
        {photoError && <p role="alert" className="mt-3 text-sm text-clay">{photoError}</p>}
      </section>
      <form onSubmit={saveProfile} className={card}>
        <div className="mb-5"><h2 className="font-display text-xl font-semibold sm:text-2xl">Personal details</h2><p className="mt-1 text-sm text-ink/55">Update how you appear and where your trips begin.</p></div>
        <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
          <Field label="Full name" error={err.name}><input className="input" autoComplete="name" value={p.name} onChange={e => setP({ ...p, name: e.target.value })} /></Field>
          <Field label="Email" error={err.email}><input className="input" type="email" autoComplete="email" value={p.email} onChange={e => setP({ ...p, email: e.target.value })} /></Field>
          <Field label="Home city"><input className="input" autoComplete="address-level2" value={p.homeCity} placeholder="Quezon City" onChange={e => setP({ ...p, homeCity: e.target.value })} /></Field>
          <div><span className="mb-1.5 block text-[13px] font-medium text-ink/80">Currency</span><div className="flex min-h-[42px] items-center gap-2 rounded-[10px] border border-line2 bg-moss/40 px-3.5 text-sm text-ink/70"><span aria-hidden="true" className="font-semibold text-pine">₱</span>Philippine Peso <span className="ml-auto text-xs text-ink/45">PHP</span></div></div>
        </div>
        <div className="mt-6 flex justify-end"><button className="btn btn-primary w-full sm:w-auto">Save profile</button></div>
      </form>
      <form onSubmit={savePw} className={card}>
        <div className="mb-5"><h2 className="font-display text-xl font-semibold sm:text-2xl">Password & security</h2><p className="mt-1 text-sm text-ink/55">Use a unique password to keep your account secure.</p></div>
        <div className="grid gap-x-5 gap-y-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Current" error={err.current}><PasswordInput value={pw.current} onChange={e => setPw({ ...pw, current: e.target.value })} placeholder="Enter your current password" autoComplete="current-password" /></Field>
          <Field label="New" error={err.next}><PasswordInput value={pw.next} onChange={e => setPw({ ...pw, next: e.target.value })} placeholder="At least 6 characters" autoComplete="new-password" /></Field>
          <Field label="Confirm" error={err.confirm}><PasswordInput value={pw.confirm} onChange={e => setPw({ ...pw, confirm: e.target.value })} placeholder="Re-enter your new password" autoComplete="new-password" /></Field>
        </div>
        <div className="mt-6 flex justify-end"><button className="btn btn-primary w-full sm:w-auto">Update password</button></div>
      </form>
      <div className={`${card} flex flex-wrap items-center justify-between gap-4 border-clay/25`}>
        <div className="min-w-0"><h2 className="font-display text-lg font-semibold text-clay sm:text-xl">Delete account</h2><p className="mt-1 text-sm text-ink/55">Permanently removes your account and all of its trips.</p></div>
        {deleteErr && <p role="alert" className="w-full text-sm text-clay">{deleteErr}</p>}
        <button className="btn w-full border border-clay text-clay hover:bg-clay hover:text-white sm:w-auto" onClick={() => { setDeleteErr(''); setConfirm(true) }}>Delete account</button>
      </div>
      {confirmPasswordChange && <Confirm
        title="Update your password?"
        text="Your current password will be replaced with the new password you entered. You’ll use it the next time you sign in."
        confirmLabel="Update password"
        confirmClassName="btn btn-primary"
        onNo={() => setConfirmPasswordChange(false)}
        onYes={() => void updatePassword()}
      />}
      {confirm && <Confirm title="Delete your account?" text="Your account and every trip and activity will be erased. This cannot be undone." onNo={() => setConfirm(false)} onYes={deleteAccount} />}
    </div>
  )
}
