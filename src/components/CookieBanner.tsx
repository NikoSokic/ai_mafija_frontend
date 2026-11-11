import { useEffect, useState } from 'react'
import { initAnalytics } from '../analytics.ts'
import ThemedPortal from './ThemedPortal.tsx'

const KEY = 'aimafija.consent'

// localStorage može baciti grešku (privatni prozor) – tada se pita ponovno
const getConsent = () => {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

// Pristanak za kolačiće (GDPR): GA se učitava tek nakon "Prihvaćam"
export default function CookieBanner() {
  const [consent, setConsent] = useState(getConsent)

  useEffect(() => {
    if (consent === 'yes') initAnalytics()
  }, [consent])

  if (consent === 'yes' || consent === 'no') return null

  const choose = (v: 'yes' | 'no') => {
    try {
      localStorage.setItem(KEY, v)
    } catch {
      // nema spremanja
    }
    setConsent(v)
  }

  return (
    <ThemedPortal>
      <div
        role="dialog"
        aria-label="Kolačići"
        className="fixed inset-x-0 bottom-[calc(16px+env(safe-area-inset-bottom))] z-[60] mx-auto w-[calc(100%-32px)] max-w-[388px] rounded-[18px] border border-line bg-surface-2 px-4 py-3.5 text-[14px] shadow-[0_18px_40px_-16px_rgba(0,0,0,.6)]"
      >
        <p className="text-muted">Koristimo kolačiće za anonimnu statistiku posjeta.</p>
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => choose('no')}
            className="cursor-pointer rounded-full px-3.5 py-2 text-[13px] font-semibold text-muted"
          >
            Odbij
          </button>
          <button
            type="button"
            onClick={() => choose('yes')}
            className="cursor-pointer rounded-full bg-accent px-3.5 py-2 text-[13px] font-semibold text-accent-ink"
          >
            Prihvaćam
          </button>
        </div>
      </div>
    </ThemedPortal>
  )
}
