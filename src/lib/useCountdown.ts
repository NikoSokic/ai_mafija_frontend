import { useEffect, useState } from 'react'

// Odbrojavanje u sekundama. Računa se od roka, a ne brojanjem otkucaja, pa ostaje točno
// i kad preglednik uspori timere (tab u pozadini, zaključan mobitel).
export function useCountdown(seconds: number) {
  const [endsAt, setEndsAt] = useState(() => Date.now() + seconds * 1000)
  const [left, setLeft] = useState(seconds)
  const [total, setTotal] = useState(seconds)

  // provjera češće od sekunde da prijelaz ne kasni; ista vrijednost ne izaziva render
  useEffect(() => {
    const id = window.setInterval(() => setLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))), 250)
    return () => clearInterval(id)
  }, [endsAt])

  /** produži odbrojavanje; ukupno vrijeme raste s njim da prsten ne prijeđe puni krug */
  function add(extra: number) {
    const next = left + extra
    setEndsAt(Date.now() + next * 1000)
    setLeft(next)
    setTotal((t) => Math.max(t, next))
  }

  return { left, total, add }
}
