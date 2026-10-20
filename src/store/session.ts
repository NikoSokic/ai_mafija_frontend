const KEY = 'aimafija.session'

export interface Session {
  playerId: number
  playerToken: string
  lobbyCode: string
}

export function saveSession(session: Session) {
  localStorage.setItem(KEY, JSON.stringify(session))
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}
