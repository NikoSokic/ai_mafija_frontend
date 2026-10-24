const key = (code: string) => `aimafija.narrated.${code}`

// Ključevi naracija koje je igrač u ovoj kartici već pročitao ("night-2", "morning-2"…),
// da se tekst ne ponovi nakon osvježavanja. sessionStorage, jer vrijedi samo za tu igru u tom tabu.
export function loadNarrated(code: string): string[] {
  try {
    const raw = sessionStorage.getItem(key(code))
    const data: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(data) ? data.filter((k): k is string => typeof k === 'string') : []
  } catch {
    return []
  }
}

export function markNarrated(code: string, narrationKey: string) {
  try {
    const keys = loadNarrated(code)
    if (!keys.includes(narrationKey)) sessionStorage.setItem(key(code), JSON.stringify([...keys, narrationKey]))
  } catch {
    // nema spremanja
  }
}

// Nova igra u istoj sobi (ili izlazak iz nje): naracije počinju ispočetka
export function clearNarrated(code: string) {
  try {
    sessionStorage.removeItem(key(code))
  } catch {
    // nema što obrisati
  }
}
