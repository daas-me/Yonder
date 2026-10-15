export function WeatherIcon({ code, size = 22 }: { code: number; size?: number }) {
  const sun = <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>
  const cloud = <path d="M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11.6 1.5A3.3 3.3 0 0 0 7 18z" />
  const rain = <>{cloud}<path d="M9 21l1-2M13 21l1-2" /></>
  const storm = <>{cloud}<path d="M12 18l-2 4h3l-1 2" /></>
  const g = code === 0 ? sun : code <= 3 || code <= 48 ? cloud : code >= 95 ? storm : rain
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{g}</svg>
}
