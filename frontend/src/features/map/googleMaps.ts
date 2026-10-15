import { importLibrary, setOptions } from '@googlemaps/js-api-loader'

let mapsLibrary: Promise<google.maps.MapsLibrary> | undefined

export function loadGoogleMaps() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  if (!apiKey) return Promise.reject(new Error('Google Maps API key is missing.'))

  if (!mapsLibrary) {
    setOptions({ key: apiKey, v: 'weekly' })
    mapsLibrary = importLibrary('maps') as Promise<google.maps.MapsLibrary>
  }
  return mapsLibrary
}
