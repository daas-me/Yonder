import { type CurrencyCode } from '../shared/model'

export type CurrencyQuote = { currency: CurrencyCode; rate: number; date: string }

const quoteCache = new Map<CurrencyCode, { quote: CurrencyQuote; fetchedAt: number }>()

export async function fetchCurrencyQuote(currency: CurrencyCode): Promise<CurrencyQuote> {
  if (currency === 'PHP') return { currency, rate: 1, date: new Date().toISOString().slice(0, 10) }
  const cached = quoteCache.get(currency)
  if (cached && Date.now() - cached.fetchedAt < 12 * 60 * 60 * 1000) return cached.quote
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 10000)
  let response: Response
  try {
    response = await fetch(`https://api.frankfurter.dev/v1/latest?base=PHP&symbols=${currency}`, { signal: controller.signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('Exchange rate request timed out. Please try again.')
    throw new Error('Exchange rates are temporarily unavailable. Please check your connection and try again.')
  } finally {
    window.clearTimeout(timeout)
  }
  if (!response.ok) throw new Error('Exchange rates are temporarily unavailable. Please try again.')
  const result = await response.json() as { date?: unknown; rates?: Record<string, unknown> }
  const rate = result.rates?.[currency]
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0 || typeof result.date !== 'string') {
    throw new Error(`A PHP to ${currency} exchange rate is not available.`)
  }
  const quote = { currency, rate, date: result.date }
  quoteCache.set(currency, { quote, fetchedAt: Date.now() })
  return quote
}
