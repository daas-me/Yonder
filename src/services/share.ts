import { type Trip } from '../shared'

/* Share links: trip encoded in the URL hash (photos excluded to keep links short) */
export function shareLink(t: Trip) {
  const lite = { ...t, ownerId: '', memories: undefined, cover: undefined, activities: t.activities.map(({ image: _i, memories: _m, ...a }) => a) }
  const b = btoa(unescape(encodeURIComponent(JSON.stringify(lite)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${location.origin}${location.pathname}#share=${b}`
}
export function readShare(): Trip | null {
  const m = location.hash.match(/^#share=(.+)$/)
  if (!m) return null
  try { return JSON.parse(decodeURIComponent(escape(atob(m[1].replace(/-/g, '+').replace(/_/g, '/'))))) as Trip } catch { return null }
}
