import { useEffect, useRef, useState } from 'react'
import { ApiError, assetUrl, resizeImage } from '../../services'
import { Confirm, CURRENCIES, Field, Modal, PasswordInput, php, type Note, type Prefs, THEMES, type ThemePref, type Trip, type User } from '../../shared'
import { Card, SelectMenu } from './controls'
import DisplaySettings from './DisplaySettings'
import NotificationSettings from './NotificationSettings'
import PassportCard from './PassportCard'
import TripDefaults from './TripDefaults'

export type AccountTab = 'profile' | 'defaults' | 'notifications' | 'display' | 'security'
const TABS: [AccountTab, string][] = [['profile', 'Profile'], ['defaults', 'Trip defaults'], ['notifications', 'Notifications'], ['display', 'Display'], ['security', 'Security']]
const sectionIcon = (tab: AccountTab) => {
  const icon = {
    profile: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
    defaults: <><rect x="4" y="7" width="16" height="13" rx="2" /><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" /></>,
    notifications: <><path d="M6 10a6 6 0 0 1 12 0c0 4 1.4 5.6 2 6.5H4c.6-.9 2-2.5 2-6.5Z" /><path d="M10 19.5a2 2 0 0 0 4 0" /></>,
    display: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>,
    security: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
  }[tab]
  return <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
}

type Props = {
  user: User
  trips: Trip[]
  prefs: Prefs
  theme: ThemePref
  notes: Note[]
  initialTab?: AccountTab
  onSave: (profile: Pick<User, 'name' | 'email' | 'homeCity'>) => Promise<void>
  onPhotoUpload: (photo: Blob) => Promise<void>
  onPhotoRemove: () => Promise<void>
  onPasswordChange: (current: string, next: string) => Promise<void>
  onAvatarColor: (color: string) => void
  onPrefs: (patch: Partial<Prefs>) => void
  onEnsureCurrency: (currency: Prefs['currency']) => Promise<void>
  currencyRateDate?: string
  currencyError?: string
  onTheme: (theme: ThemePref) => void
  onSignOut: () => void
  onDeleteAccount: () => Promise<void>
  notify: (message: string) => void
}

export default function AccountPage({ user, trips, prefs, theme, initialTab = 'profile', onSave, onPhotoUpload, onPhotoRemove, onPasswordChange, onAvatarColor, onPrefs, onEnsureCurrency, currencyRateDate, currencyError, onTheme, onSignOut, onDeleteAccount, notify }: Props) {
  const [tab, setTab] = useState<AccountTab>(initialTab)
  const [profile, setProfile] = useState({ name: user.name, email: user.email, homeCity: user.homeCity })
  const [prefsDraft, setPrefsDraft] = useState(prefs)
  const [themeDraft, setThemeDraft] = useState(theme)
  const [pendingPhoto, setPendingPhoto] = useState<string | null | undefined>(undefined)
  const [avatarColorDraft, setAvatarColorDraft] = useState<string | null>(null)
  const [password, setPassword] = useState({ current: '', next: '', confirm: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [review, setReview] = useState<'profile' | 'photo' | 'settings' | 'password' | null>(null)
  const [reviewError, setReviewError] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedMessage, setSavedMessage] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [sectionMenuOpen, setSectionMenuOpen] = useState(false)
  const sectionMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => setTab(initialTab), [initialTab])
  useEffect(() => setPrefsDraft(prefs), [prefs])
  useEffect(() => setThemeDraft(theme), [theme])
  useEffect(() => {
    if (!sectionMenuOpen) return
    const closeOutside = (event: MouseEvent) => {
      if (!sectionMenuRef.current?.contains(event.target as Node)) setSectionMenuOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSectionMenuOpen(false)
    }
    document.addEventListener('mousedown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [sectionMenuOpen])

  const savePrefs = (patch: Partial<Prefs>) => {
    setPrefsDraft(current => ({
      ...current,
      ...patch,
      splitRules: patch.splitRules ?? current.splitRules,
      packing: patch.packing ?? current.packing,
      companions: patch.companions ?? current.companions,
      notify: patch.notify ?? current.notify,
    }))
  }
  const saveProfile = (event: React.FormEvent) => {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (!profile.name.trim()) nextErrors.name = 'Name is required.'
    if (!/^\S+@\S+\.\S+$/.test(profile.email.trim())) nextErrors.email = 'Enter a valid email.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    setReviewError('')
    setReview('profile')
  }
  const validatePassword = (event: React.FormEvent) => {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (password.next.length < 6) nextErrors.next = 'At least 6 characters.'
    if (password.next !== password.confirm) nextErrors.confirm = 'Passwords do not match.'
    setErrors(nextErrors)
    if (!Object.keys(nextErrors).length) {
      setReviewError('')
      setReview('password')
    }
  }
  const updatePassword = async () => {
    try {
      await onPasswordChange(password.current, password.next)
      setPassword({ current: '', next: '', confirm: '' })
      setReview(null)
      setSavedMessage('Your password has been updated.')
    } catch (error) {
      setErrors(error instanceof ApiError ? { current: error.message } : { current: 'Could not update your password.' })
      setReviewError(error instanceof Error ? error.message : 'Could not update your password.')
    }
  }
  const deleteAccount = async () => {
    try {
      await onDeleteAccount()
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Could not delete your account.')
      setConfirmDelete(false)
    }
  }
  const uploadPhoto = async (file?: File) => {
    if (!file) return
    try {
      setPendingPhoto(await resizeImage(file, 320))
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not upload your profile photo.')
    }
  }
  const removePhoto = () => setPendingPhoto(user.photoUrl ? null : undefined)
  const profileDetailsChanged = profile.name.trim() !== user.name || profile.email.trim().toLowerCase() !== user.email || profile.homeCity.trim() !== user.homeCity
  const profileChanged = profileDetailsChanged || prefsDraft.currency !== prefs.currency
  const profilePhotoChanged = pendingPhoto !== undefined
  const avatarColorChanged = avatarColorDraft !== null && avatarColorDraft !== (user.avatarColor ?? '#ec6a3c')
  const settingsChanges = [
    ...(themeDraft !== theme ? [{ label: 'Theme', value: themeDraft }] : []),
    ...(prefsDraft.tripType !== prefs.tripType ? [{ label: 'Default trip type', value: prefsDraft.tripType }] : []),
    ...(prefsDraft.pax !== prefs.pax ? [{ label: 'Default group size', value: String(prefsDraft.pax) }] : []),
    ...(JSON.stringify(prefsDraft.companions) !== JSON.stringify(prefs.companions) ? [{ label: 'Companions', value: `${prefsDraft.companions.length} saved` }] : []),
    ...(prefsDraft.dailyBudget !== prefs.dailyBudget ? [{ label: 'Daily budget', value: prefsDraft.dailyBudget ? php(prefsDraft.dailyBudget) : 'Not set' }] : []),
    ...(JSON.stringify(prefsDraft.splitRules) !== JSON.stringify(prefs.splitRules) ? [{ label: 'Cost-sharing defaults', value: 'Updated' }] : []),
    ...(JSON.stringify(prefsDraft.packing) !== JSON.stringify(prefs.packing) ? [{ label: 'Packing list defaults', value: `${prefsDraft.packing.length} items` }] : []),
    ...(prefsDraft.clock !== prefs.clock ? [{ label: 'Time format', value: prefsDraft.clock === '24' ? '24-hour' : '12-hour' }] : []),
    ...(prefsDraft.temp !== prefs.temp ? [{ label: 'Temperature format', value: prefsDraft.temp === 'f' ? 'Fahrenheit' : 'Celsius' }] : []),
    ...(prefsDraft.currency !== prefs.currency ? [{ label: 'Currency', value: prefsDraft.currency }] : []),
    ...(['tripSoon', 'soonDays', 'packing', 'budget', 'budgetAt', 'logSpending', 'browser'] as const)
      .filter(key => prefsDraft.notify[key] !== prefs.notify[key])
      .map(key => ({
        label: `Notification · ${({
          tripSoon: 'trip start reminders', soonDays: 'trip reminder timing', packing: 'packing reminders',
          budget: 'budget reminders', budgetAt: 'budget reminder threshold', logSpending: 'spending reminders', browser: 'browser notifications',
        })[key]}`,
        value: String(prefsDraft.notify[key]),
      })),
  ]
  const hasSettingsChanges = settingsChanges.length > 0
  const previewUser: User = {
    ...user,
    ...profile,
    photoUrl: pendingPhoto === undefined ? user.photoUrl : pendingPhoto ?? undefined,
    avatarColor: avatarColorDraft ?? user.avatarColor,
  }
  const reviewChanges = async () => {
    setSaving(true)
    setReviewError('')
    try {
      if (review === 'profile') {
        const nextProfile = { name: profile.name.trim(), email: profile.email.trim().toLowerCase(), homeCity: profile.homeCity.trim() }
        if (prefsDraft.currency !== prefs.currency) await onEnsureCurrency(prefsDraft.currency)
        if (profileDetailsChanged) await onSave(nextProfile)
        if (prefsDraft.currency !== prefs.currency) onPrefs({ currency: prefsDraft.currency })
        setProfile(nextProfile)
        setReview(null)
        setSavedMessage(profileDetailsChanged ? 'Your profile details have been saved.' : 'Your currency preference has been saved.')
      } else if (review === 'photo') {
        if (pendingPhoto !== undefined) {
          if (pendingPhoto) await onPhotoUpload(await (await fetch(pendingPhoto)).blob())
          else await onPhotoRemove()
          setPendingPhoto(undefined)
        }
        if (avatarColorChanged && avatarColorDraft) onAvatarColor(avatarColorDraft)
        setAvatarColorDraft(null)
        setReview(null)
        setSavedMessage('Your profile photo changes have been saved.')
      } else if (review === 'settings') {
        if (prefsDraft.currency !== prefs.currency) await onEnsureCurrency(prefsDraft.currency)
        if (prefsDraft.notify.browser && !prefs.notify.browser) {
          if (!('Notification' in window)) throw new Error('This browser does not support notifications.')
          const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission
          if (permission !== 'granted') throw new Error(permission === 'denied' ? 'Notifications are blocked for this site.' : 'Allow notifications to apply this setting.')
        }
        onPrefs(prefsDraft)
        onTheme(themeDraft)
        setReview(null)
        setSavedMessage('Your account settings have been saved.')
      } else if (review === 'password') {
        await updatePassword()
      }
    } catch (error) {
      const fieldErrors = error instanceof ApiError ? Object.values(error.fieldErrors) : []
      setReviewError(fieldErrors.length ? fieldErrors.join(' ') : error instanceof Error ? error.message : 'Could not apply these changes.')
    } finally {
      setSaving(false)
    }
  }
  const closeReview = () => {
    if (saving) return
    setReview(null)
    setReviewError('')
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 sm:space-y-6">
      <div>
        <h1 className="font-display text-4xl font-semibold sm:text-5xl">Account</h1>
        <p className="mt-1 text-sm text-ink/55">Your profile, trip defaults, reminders and how Yonder looks.</p>
      </div>
      <PassportCard user={previewUser} trips={trips} onAvatar={setPendingPhoto} />

      <div className="rounded-xl bg-ink/5 p-1">
        <div ref={sectionMenuRef} className="relative sm:hidden">
          <button
            type="button"
            aria-label="Choose account section"
            aria-haspopup="listbox"
            aria-expanded={sectionMenuOpen}
            aria-controls="account-section-options"
            onClick={() => setSectionMenuOpen(open => !open)}
            className="flex h-11 w-full items-center gap-3 rounded-xl border border-line2 bg-[#f7f8f6] px-3 text-left text-sm font-semibold text-ink shadow-sm transition hover:border-pine/35 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine dark:bg-[#18211f] dark:hover:bg-[#202c29]"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center text-pine" aria-hidden="true">{sectionIcon(tab)}</span>
            <span className="min-w-0 flex-1 truncate">{TABS.find(([key]) => key === tab)?.[1]}</span>
            <svg aria-hidden="true" className={`h-4 w-4 shrink-0 text-ink/45 transition-transform ${sectionMenuOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 10 5 5 5-5" /></svg>
          </button>
          {sectionMenuOpen && (
            <div id="account-section-options" role="listbox" aria-label="Account sections" className="absolute left-0 top-full z-30 mt-2 w-full overflow-hidden rounded-xl border border-line2 bg-[#f7f8f6] p-1.5 shadow-lg dark:bg-[#18211f]">
              {TABS.map(([key, label]) => {
                const active = key === tab
                return (
                  <button
                    key={key}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => { setTab(key); setErrors({}); setSectionMenuOpen(false) }}
                    className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left text-sm transition ${active ? 'bg-pine/10 font-semibold text-pine' : 'text-ink/70 hover:bg-ink/5 hover:text-ink'}`}
                  >
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center ${active ? 'text-pine' : 'text-ink/50'}`}>{sectionIcon(key)}</span>
                    <span className="flex-1">{label}</span>
                    {active && <svg aria-hidden="true" className="h-4 w-4 text-pine" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6" /></svg>}
                  </button>
                )
              })}
            </div>
          )}
        </div>
        <nav className="hidden gap-1 overflow-x-auto sm:flex" aria-label="Account sections">
          {TABS.map(([key, label]) => (
            <button type="button" key={key} onClick={() => { setTab(key); setErrors({}) }} aria-current={tab === key ? 'page' : undefined}
              className={`shrink-0 rounded-lg px-4 py-2 text-sm transition ${tab === key ? 'bg-card font-semibold text-ink shadow-sm' : 'text-ink/55 hover:text-ink'}`}>{label}</button>
          ))}
        </nav>
      </div>

      {tab === 'profile' && (
        <div className="space-y-5 sm:space-y-6">
          <form onSubmit={event => { void saveProfile(event) }}>
            <Card title="Profile" hint="How you appear in Yonder.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name" error={errors.name}><input className="input" autoComplete="name" value={profile.name} onChange={event => setProfile({ ...profile, name: event.target.value })} /></Field>
                <Field label="Email" error={errors.email}><input className="input" type="email" autoComplete="email" value={profile.email} onChange={event => setProfile({ ...profile, email: event.target.value })} /></Field>
                <Field label="Home city (optional)"><input className="input" autoComplete="address-level2" value={profile.homeCity} placeholder="Quezon City" onChange={event => setProfile({ ...profile, homeCity: event.target.value })} /></Field>
                <Field label="Currency">
                  <SelectMenu value={prefsDraft.currency} label="Currency" options={CURRENCIES.map(({ code, name }) => ({ value: code, label: `${name} (${code})` }))} onChange={value => {
                    const currency = CURRENCIES.find(option => option.code === value)?.code
                    if (currency) savePrefs({ currency })
                  }} className="w-full" />
                  <p className="mt-1 text-xs text-ink/50">{prefsDraft.currency !== prefs.currency ? 'The exchange rate will be checked when you save changes.' : currencyError || (currencyRateDate && prefsDraft.currency !== 'PHP' ? `Converted using Frankfurter daily rates dated ${currencyRateDate}.` : prefsDraft.currency === 'PHP' ? 'Trip amounts are stored in PHP.' : 'Loading the latest exchange rate…')}</p>
                </Field>
              </div>
              <p className="mt-2 text-xs text-ink/50">Your home city is the departure point on your boarding passes.</p>
              <div className="mt-6 flex justify-end"><button className="btn btn-primary w-full sm:w-auto" disabled={!profileChanged}>Save changes</button></div>
            </Card>
          </form>

          <Card title="Profile photo" hint="Shown on your passport and in the sidebar. Changes apply after review.">
            <div className="flex flex-wrap items-center gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full font-display text-xl font-semibold text-white" style={{ backgroundColor: previewUser.avatarColor ?? '#ec6a3c' }}>
                {previewUser.photoUrl ? <img src={assetUrl(previewUser.photoUrl)} alt="" className="h-full w-full object-cover" /> : previewUser.name.trim().split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <label className="btn btn-ghost cursor-pointer px-3 py-1.5 text-sm text-pine ring-1 ring-line">{previewUser.photoUrl ? 'Change photo' : 'Upload photo'}
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={event => { void uploadPhoto(event.currentTarget.files?.[0]); event.currentTarget.value = '' }} />
                  </label>
                  {previewUser.photoUrl && <button type="button" className="btn btn-danger px-3 py-1.5 text-sm ring-1 ring-line" onClick={removePhoto}>Remove photo</button>}
                </div>
                {!previewUser.photoUrl && <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-xs text-ink/55">Initials colour</span>
                  {[...new Set(['#ec6a3c', ...THEMES])].map(color => (
                    <button type="button" key={color} aria-label={`Initials colour ${color}`} aria-pressed={(previewUser.avatarColor ?? '#ec6a3c') === color}
                      onClick={() => setAvatarColorDraft(color)} className={`h-6 w-6 rounded-full ring-offset-2 ring-offset-sand ${(previewUser.avatarColor ?? '#ec6a3c') === color ? 'ring-2 ring-ink' : ''}`} style={{ background: color }} />
                  ))}
                </div>}
                {(profilePhotoChanged || avatarColorChanged) && <button type="button" className="btn btn-primary px-3 py-1.5 text-sm" onClick={() => { setReviewError(''); setReview('photo') }}>Save changes</button>}
              </div>
            </div>
          </Card>
        </div>
      )}

      {tab === 'defaults' && <TripDefaults prefs={prefsDraft} onPrefs={savePrefs} />}
      {tab === 'display' && <DisplaySettings prefs={prefsDraft} theme={themeDraft} onTheme={setThemeDraft} onPrefs={savePrefs} />}
      {tab === 'notifications' && <NotificationSettings prefs={prefsDraft} onPrefs={savePrefs} />}
      {['defaults', 'display', 'notifications'].includes(tab) && (
        <div className="flex justify-end">
          <button type="button" className="btn btn-primary w-full sm:w-auto" disabled={!hasSettingsChanges} onClick={() => { setReviewError(''); setReview('settings') }}>Save changes</button>
        </div>
      )}

      {tab === 'security' && (
        <div className="space-y-5 sm:space-y-6">
          <form onSubmit={event => { void validatePassword(event) }}>
            <Card title="Password" hint="Change your sign-in password.">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Current" error={errors.current}><PasswordInput value={password.current} onChange={event => setPassword({ ...password, current: event.target.value })} placeholder="Enter your current password" autoComplete="current-password" /></Field>
                <Field label="New" error={errors.next}><PasswordInput value={password.next} onChange={event => setPassword({ ...password, next: event.target.value })} placeholder="At least 6 characters" autoComplete="new-password" /></Field>
                <Field label="Confirm" error={errors.confirm}><PasswordInput value={password.confirm} onChange={event => setPassword({ ...password, confirm: event.target.value })} placeholder="Re-enter your new password" autoComplete="new-password" /></Field>
              </div>
              <div className="mt-6 flex justify-end"><button className="btn btn-primary w-full sm:w-auto">Update password</button></div>
            </Card>
          </form>
          <Card title="Session" hint={`Signed in as ${user.email} on this browser.`}>
            <button type="button" className="btn btn-ghost ring-1 ring-line" onClick={onSignOut}>Sign out</button>
          </Card>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-card p-5 ring-1 ring-clay/30 sm:p-7">
            <div><h2 className="font-display text-xl font-semibold text-clay">Delete account</h2><p className="text-sm text-ink/60">Removes your account, trips and journal photos permanently.</p></div>
            {deleteError && <p role="alert" className="w-full text-sm text-clay">{deleteError}</p>}
            <button type="button" className="btn w-full border border-clay text-clay hover:bg-clay hover:text-white sm:w-auto" onClick={() => { setDeleteError(''); setConfirmDelete(true) }}>Delete account</button>
          </div>
        </div>
      )}
      {review && (
        <Modal
          title="Review account changes"
          eyebrow="ACCOUNT SETTINGS"
          subtitle="Take one last look before your account updates are saved."
          icon={<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M12 3 4.5 6v5.5c0 4.5 3.2 7.7 7.5 9.5 4.3-1.8 7.5-5 7.5-9.5V6L12 3Z" /><path d="m9 12 2 2 4-4" /></svg>}
          onClose={closeReview}
          wide
          animated
        >
          <div className="trip-confirm-content space-y-5">
            <div>
              <p className="font-display text-xl font-semibold">
                {review === 'profile' ? 'Save profile changes?' : review === 'photo' ? 'Save profile photo changes?' : review === 'password' ? 'Update your password?' : 'Save these settings?'}
              </p>
              <p className="mt-1 text-sm text-ink/60">
                {review === 'password' ? 'Confirm to replace your current password. Your password values are never displayed here.' : `Review your ${review === 'photo' ? 'photo and initials colour' : review === 'profile' ? 'profile and currency details' : review === 'settings' ? 'settings' : ''} before they are saved.`}
              </p>
            </div>
            <dl className="divide-y divide-line rounded-xl bg-sand/60 px-4">
              {review === 'profile' && (
                <>
                  {profile.name.trim() !== user.name && <div className="flex items-center justify-between gap-4 py-3 text-sm"><dt className="text-ink/55">Name</dt><dd className="truncate text-right font-medium">{profile.name.trim()}</dd></div>}
                  {profile.email.trim().toLowerCase() !== user.email && <div className="flex items-center justify-between gap-4 py-3 text-sm"><dt className="text-ink/55">Email</dt><dd className="truncate text-right font-medium">{profile.email.trim().toLowerCase()}</dd></div>}
                  {profile.homeCity.trim() !== user.homeCity && <div className="flex items-center justify-between gap-4 py-3 text-sm"><dt className="text-ink/55">Home city</dt><dd className="truncate text-right font-medium">{profile.homeCity.trim() || 'Not set'}</dd></div>}
                  {prefsDraft.currency !== prefs.currency && <div className="flex items-center justify-between gap-4 py-3 text-sm"><dt className="text-ink/55">Currency</dt><dd className="text-right font-medium">{prefsDraft.currency}</dd></div>}
                </>
              )}
              {review === 'photo' && (
                <>
                  {profilePhotoChanged && <div className="flex items-center justify-between gap-4 py-3 text-sm"><dt className="text-ink/55">Profile photo</dt><dd className="text-right font-medium">{pendingPhoto ? 'New photo' : 'Remove photo'}</dd></div>}
                  {avatarColorChanged && <div className="flex items-center justify-between gap-4 py-3 text-sm"><dt className="text-ink/55">Initials colour</dt><dd className="flex items-center gap-2 text-right font-medium"><span className="h-4 w-4 rounded-full" style={{ backgroundColor: avatarColorDraft ?? undefined }} />Updated</dd></div>}
                </>
              )}
              {review === 'settings' && settingsChanges.map(change => <div key={change.label} className="flex items-center justify-between gap-4 py-3 text-sm"><dt className="text-ink/55">{change.label}</dt><dd className="truncate text-right font-medium">{change.value}</dd></div>)}
              {review === 'password' && <div className="flex items-center justify-between gap-4 py-3 text-sm"><dt className="text-ink/55">Password</dt><dd className="text-right font-medium">Will be changed</dd></div>}
            </dl>
            {reviewError && <p role="alert" className="rounded-lg bg-clay/10 px-3 py-2 text-sm text-clay">{reviewError}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-ghost" disabled={saving} onClick={closeReview}>Back to editing</button>
              <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void reviewChanges()}>{saving ? 'Saving…' : review === 'password' ? 'Confirm password change' : 'Confirm changes'}</button>
            </div>
          </div>
        </Modal>
      )}
      {savedMessage && (
        <Modal title="Changes saved" onClose={() => setSavedMessage('')} animated>
          <div className="text-center">
            <span className="trip-confirm-check mx-auto grid h-14 w-14 place-items-center rounded-full bg-pine/10 text-pine" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="trip-confirm-checkmark h-7 w-7"><path d="m5 12 4 4L19 6" /></svg>
            </span>
            <p className="trip-confirm-title mt-4 font-display text-xl font-semibold">All set</p>
            <p className="trip-confirm-description mt-1 text-sm text-ink/60">{savedMessage}</p>
            <button type="button" className="trip-confirm-button btn btn-primary mt-6 min-w-28" onClick={() => setSavedMessage('')}>Done</button>
          </div>
        </Modal>
      )}
      {confirmDelete && <Confirm
        title="Delete your account?"
        text="This permanently removes your account, trips, activities, and journal photos. This action cannot be undone."
        eyebrow="PERMANENT ACTION"
        icon={<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" /></svg>}
        animated
        confirmLabel="Delete account"
        onNo={() => setConfirmDelete(false)}
        onYes={() => { void deleteAccount() }}
      />}
    </div>
  )
}
