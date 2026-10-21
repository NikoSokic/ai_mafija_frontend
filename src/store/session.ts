const KEY = 'aimafija.session'

export interface Session {
  playerId: number
  playerToken: string
  lobbyCode: string
}

// localStorage može baciti grešku (privatni prozor, blokirani podaci) – tada sesija jednostavno nije spremljena
export function saveSession(session: Session) {
  try {
    localStorage.setItem(KEY, JSON.stringify(session))
  } catch {
    // nema spremanja
  }
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

// Token više ne vrijedi (npr. baza je obrisana) – igrač opet ulazi u sobu
export function clearSession() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // nema što obrisati
  }
}
