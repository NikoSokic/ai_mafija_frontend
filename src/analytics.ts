// Google Analytics 4 – učitava se tek kad igrač prihvati kolačiće (CookieBanner), nikad iz index.html
const GA_ID = 'G-QRQ10QF17M'

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

export function initAnalytics() {
  if (window.gtag) return
  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  document.head.appendChild(s)
  window.dataLayer = window.dataLayer || []
  // gtag.js očekuje baš objekt `arguments`, ne polje
  window.gtag = function () {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments)
  }
  window.gtag('js', new Date())
  window.gtag('config', GA_ID)
}

// Bez pristanka window.gtag ne postoji, pa se događaj jednostavno ne šalje
export const track = (name: string, params: Record<string, unknown> = {}) => window.gtag?.('event', name, params)
