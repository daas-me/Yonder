import { useEffect, useState } from 'react'
import type { NotifyPrefs, Prefs } from '../../shared'
import { Card, Row, SelectMenu, Switch } from './controls'

export default function NotificationSettings({ prefs, onPrefs }: { prefs: Prefs; onPrefs: (patch: Partial<Prefs>) => void }) {
  const [permission, setPermission] = useState<NotificationPermission>(() => 'Notification' in window ? Notification.permission : 'denied')
  const notify = prefs.notify
  const supported = 'Notification' in window
  const setNotify = (patch: Partial<NotifyPrefs>) => onPrefs({ notify: { ...notify, ...patch } })

  useEffect(() => {
    if (supported) setPermission(Notification.permission)
  }, [notify.browser, supported])

  const testNotification = () => {
    if (!supported || Notification.permission !== 'granted') return
    const notification = new Notification('Yonder reminders are on', { body: 'We’ll let you know when a trip needs your attention.', icon: '/favicon.ico' })
    window.setTimeout(() => notification.close(), 5000)
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <Card title="Reminders" hint="Yonder checks your trips whenever you open it.">
        <Row title="Before a trip starts" hint="Get a reminder as your departure gets close.">
          <div className="flex items-center gap-3">
            {notify.tripSoon && <SelectMenu label="Trip reminder timing" value={String(notify.soonDays)} onChange={value => setNotify({ soonDays: Number(value) })}
              options={[1, 3, 7, 14].map(days => ({ value: String(days), label: `${days} ${days === 1 ? 'day' : 'days'} before` }))} />}
            <Switch label="Trip start reminders" on={notify.tripSoon} onChange={tripSoon => setNotify({ tripSoon })} />
          </div>
        </Row>
        <Row title="Unpacked items" hint="When your packing list isn’t finished close to departure.">
          <Switch label="Packing reminders" on={notify.packing} onChange={packing => setNotify({ packing })} />
        </Row>
        <Row title="Budget limit" hint="When planned or actual spending gets close to a trip’s limit.">
          <div className="flex items-center gap-3">
            {notify.budget && <SelectMenu label="Budget reminder threshold" value={String(notify.budgetAt)} onChange={value => setNotify({ budgetAt: Number(value) })}
              options={[{ value: '75', label: 'At 75%' }, { value: '90', label: 'At 90%' }, { value: '100', label: 'Only when over' }]} />}
            <Switch label="Budget reminders" on={notify.budget} onChange={budget => setNotify({ budget })} />
          </div>
        </Row>
        <Row title="Log your spending" hint="During a trip, for activities that don’t have an actual amount yet.">
          <Switch label="Spending reminders" on={notify.logSpending} onChange={logSpending => setNotify({ logSpending })} />
        </Row>
      </Card>

      <Card title="Browser pop-ups" hint="Also show reminders as notifications from your browser.">
        <Row title="Show pop-ups on this device" hint="Only while Yonder is open in a tab. There’s no server yet, so Yonder can’t notify you when it’s closed.">
          <Switch label="Browser notifications" disabled={!supported || permission === 'denied'} on={notify.browser} onChange={browser => setNotify({ browser })} />
        </Row>
        {!supported && <p className="text-xs text-ink/55">This browser doesn’t support notifications.</p>}
        {supported && permission === 'denied' && <p className="text-xs text-clay">Notifications are blocked for this site. Allow them in your browser’s site settings, then come back here.</p>}
        {notify.browser && permission === 'granted' && <button type="button" className="mt-1 text-xs font-semibold text-pine hover:underline" onClick={testNotification}>Send a test notification</button>}
      </Card>
    </div>
  )
}
