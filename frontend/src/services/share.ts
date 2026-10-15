export function readShareToken(): string | null {
  const match = location.hash.match(/^#share=([A-Za-z0-9_-]{40,})$/)
  return match?.[1] ?? null
}

export function shareLink(token: string) {
  return `${location.origin}${location.pathname}#share=${token}`
}
