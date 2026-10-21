import { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore.ts'

// Sekunde do roka; sat uređaja se ispravi za razliku prema poslužitelju
function secondsLeft(end: number, offset: number) {
  return Number.isFinite(end) ? Math.max(0, Math.ceil((end - (Date.now() + offset)) / 1000)) : 0
}

// Odbrojavanje do roka faze sa servera (phaseEndsAt), pa svi igrači vide isto vrijeme.
// Računa se od roka, a ne brojanjem otkucaja, pa ostaje točno i kad preglednik uspori
// timere (tab u pozadini, zaključan mobitel). `seconds` je uobičajeno trajanje faze (puni krug).
export function useCountdown(endsAt: string | null, seconds: number) {
  const offset = useGameStore((s) => s.clockOffset)
  const end = endsAt ? Date.parse(endsAt) : NaN
  const [left, setLeft] = useState(() => secondsLeft(end, offset))
  const [total, setTotal] = useState(seconds)

  // provjera češće od sekunde da prijelaz ne kasni; ista vrijednost ne izaziva render
  useEffect(() => {
    const id = window.setInterval(() => setLeft(secondsLeft(end, offset)), 250)
    return () => clearInterval(id)
  }, [end, offset])

  // domaćin je produžio raspravu: ukupno raste s njom da prsten ne prijeđe puni krug
  if (left > total) setTotal(left)

  return { left, total }
}
