import { fmtTemp, fmtTime, type Prefs, type ThemePref } from '../../shared'
import { Card, Row, Seg } from './controls'

const THEMES: { value: ThemePref; label: string; background: string; accent: string; card: string }[] = [
  { value: 'light', label: 'Light', background: '#eef1ee', accent: '#17675b', card: '#fff' },
  { value: 'dark', label: 'Dark', background: '#0c1311', accent: '#5fc4b0', card: '#1b2422' },
  { value: 'system', label: 'Match device', background: 'linear-gradient(135deg, #eef1ee 50%, #0c1311 50%)', accent: '#17675b', card: 'rgba(255,255,255,.75)' },
]

export default function DisplaySettings({ prefs, theme, onTheme, onPrefs }: { prefs: Prefs; theme: ThemePref; onTheme: (theme: ThemePref) => void; onPrefs: (patch: Partial<Prefs>) => void }) {
  return (
    <div className="space-y-5 sm:space-y-6">
      <Card title="Appearance" hint="Saved on this device.">
        <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Theme">
          {THEMES.map(option => (
            <button type="button" key={option.value} role="radio" aria-checked={theme === option.value} onClick={() => onTheme(option.value)}
              className={`group rounded-xl p-1.5 text-left ring-1 transition ${theme === option.value ? 'ring-2 ring-pine' : 'ring-line2 hover:ring-ink/30'}`}>
              <span className="block h-20 overflow-hidden rounded-lg p-2" style={{ background: option.background }}>
                <span className="block h-2 w-10 rounded-full" style={{ background: option.accent }} />
                <span className="mt-2 block h-9 rounded-md shadow-sm" style={{ background: option.card }} />
              </span>
              <span className="mt-1 flex items-center gap-1.5 px-1 text-sm"><span className={`h-3 w-3 rounded-full border ${theme === option.value ? 'border-pine bg-pine' : 'border-ink/30'}`} />{option.label}</span>
            </button>
          ))}
        </div>
      </Card>
      <Card title="Formats" hint="Applies wherever times and temperatures appear, including exports.">
        <Row title="Time format" hint={`Activities show as ${fmtTime('14:30')}.`}>
          <Seg value={prefs.clock} options={[['12', '12-hour · 2:30 PM'], ['24', '24-hour · 14:30']]} label="Time format" onChange={clock => onPrefs({ clock })} />
        </Row>
        <Row title="Temperature" hint={`A warm Siargao afternoon reads ${fmtTemp(31)}.`}>
          <Seg value={prefs.temp} options={[['c', 'Celsius °C'], ['f', 'Fahrenheit °F']]} label="Temperature format" onChange={temp => onPrefs({ temp })} />
        </Row>
      </Card>
    </div>
  )
}
