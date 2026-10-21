// Izvještaji noći za jednu igru, samo u ovom pregledniku. Backend ne kaže tko je stradao noću
// (docs/backend-todo.md), pa ga GameScreen izračuna usporedbom živih igrača na kraju noći i na
// početku dana. Spremaju se po rundi da ih dan prikaže i nakon osvježavanja stranice.

export type NightReport = { killed: number[] }

/** runda → izvještaj te noći */
export type Reports = Record<number, NightReport>

const key = (code: string) => `aimafija.reports.${code}`

export function loadReports(code: string): Reports {
  try {
    const raw = localStorage.getItem(key(code))
    const data: unknown = raw ? JSON.parse(raw) : null
    return data && typeof data === 'object' && !Array.isArray(data) ? (data as Reports) : {}
  } catch {
    return {}
  }
}

export function saveReports(code: string, reports: Reports) {
  try {
    localStorage.setItem(key(code), JSON.stringify(reports))
  } catch {
    // nema spremanja
  }
}
