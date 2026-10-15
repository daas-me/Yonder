import type { Trip, User } from '../shared'

type ApiFailure = {
  status: number
  error: string
  message: string
  fieldErrors?: Record<string, string>
}

export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: Record<string, string>

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '')

export function assetUrl(url: string) {
  if (/^(?:data:|https?:)/i.test(url) || baseUrl.startsWith('/')) return url
  return new URL(url, new URL(baseUrl, location.origin).origin).toString()
}

export function fetchAsset(url: string) {
  const resolved = assetUrl(url)
  const apiOrigin = new URL(baseUrl, location.origin).origin
  const credentials: RequestCredentials = new URL(resolved, location.origin).origin === apiOrigin ? 'include' : 'same-origin'
  return fetch(resolved, { credentials })
}

async function csrfToken() {
  const response = await fetch(`${baseUrl}/auth/csrf`, { credentials: 'include' })
  if (!response.ok) throw new ApiError(response.status, 'Could not initialize a secure API session')
  const result = (await response.json()) as { token: string }
  return result.token
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase()
  const headers = new Headers(init.headers)
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) headers.set('X-XSRF-TOKEN', await csrfToken())

  const response = await fetch(`${baseUrl}${path}`, { ...init, method, headers, credentials: 'include' })
  if (!response.ok) {
    let failure: Partial<ApiFailure> = {}
    try {
      failure = (await response.json()) as ApiFailure
    } catch {
      failure.message = response.status === 401 ? 'Please sign in to continue' : `Request failed (${response.status})`
    }
    throw new ApiError(response.status, failure.message ?? `Request failed (${response.status})`, failure.fieldErrors)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export const api = {
  register: (name: string, email: string, password: string) =>
    request<User>('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  login: (email: string, password: string) =>
    request<User>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  currentUser: () => request<User>('/auth/me'),
  updateProfile: (profile: Pick<User, 'name' | 'email' | 'homeCity'>) =>
    request<User>('/me', { method: 'PUT', body: JSON.stringify(profile) }),
  uploadProfilePhoto: async (blob: Blob) => {
    const form = new FormData()
    form.append('file', blob, 'profile.jpg')
    return request<User>('/me/photo', { method: 'PUT', body: form })
  },
  deleteProfilePhoto: () => request<void>('/me/photo', { method: 'DELETE' }),
  updatePassword: (currentPassword: string, newPassword: string) =>
    request<void>('/me/password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) }),
  deleteAccount: () => request<void>('/me', { method: 'DELETE' }),
  uploadTripCover: async (tripId: string, blob: Blob) => {
    const form = new FormData()
    form.append('file', blob, 'cover.jpg')
    return request<{ url: string }>(`/trips/${encodeURIComponent(tripId)}/photos/cover`, { method: 'PUT', body: form })
  },
  listTrips: () => request<Trip[]>('/trips'),
  createTrip: (trip: Trip) => request<Trip>('/trips', { method: 'POST', body: JSON.stringify(trip) }),
  updateTrip: (trip: Trip) =>
    request<Trip>(`/trips/${encodeURIComponent(trip.id)}`, { method: 'PUT', body: JSON.stringify(trip) }),
  deleteTrip: (id: string) => request<void>(`/trips/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  sharedTrip: (token: string) => request<Trip>(`/shared/${encodeURIComponent(token)}`),
  createShare: (tripId: string) =>
    request<{ token: string; expiresAt: string }>(`/trips/${encodeURIComponent(tripId)}/share`, { method: 'POST' }),
  revokeShares: (tripId: string) => request<void>(`/trips/${encodeURIComponent(tripId)}/shares`, { method: 'DELETE' }),
  uploadMemoryPhoto: async (tripId: string, memoryId: string, blob: Blob) => {
    const form = new FormData()
    form.append('file', blob, `${memoryId}.jpg`)
    return request<{ url: string }>(`/trips/${encodeURIComponent(tripId)}/photos/memories/${encodeURIComponent(memoryId)}`, { method: 'PUT', body: form })
  },
  deleteMemoryPhoto: (tripId: string, memoryId: string) =>
    request<void>(`/trips/${encodeURIComponent(tripId)}/photos/memories/${encodeURIComponent(memoryId)}`, { method: 'DELETE' }),
  uploadActivityPhoto: async (tripId: string, activityId: string, blob: Blob) => {
    const form = new FormData()
    form.append('file', blob, `${activityId}.jpg`)
    return request<{ url: string }>(`/trips/${encodeURIComponent(tripId)}/photos/activities/${encodeURIComponent(activityId)}`, { method: 'PUT', body: form })
  },
  deleteActivityPhoto: (tripId: string, activityId: string) =>
    request<void>(`/trips/${encodeURIComponent(tripId)}/photos/activities/${encodeURIComponent(activityId)}`, { method: 'DELETE' }),
}
