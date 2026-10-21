import { create } from 'zustand'
import { ApiError, reconnect } from '../api/rest.ts'
import type { LobbyStatus } from '../api/types.ts'
import { clearSession, loadSession } from './session.ts'

interface ResumeStore {
  /** checking dok traje provjera spremljene sesije pri pokretanju aplikacije */
  status: 'checking' | 'done'
  /** soba iz provjere i njezino stanje; null = nepoznato (nema veze ili se nije provjeravalo) */
  lobbyCode: string | null
  lobbyStatus: LobbyStatus | null
}

export const useResumeStore = create<ResumeStore>(() => ({
  status: 'checking',
  lobbyCode: null,
  lobbyStatus: null,
}))

export type ResumeTarget = { lobbyCode: string; lobbyStatus: LobbyStatus }

// Ekran za sobu u kojoj je igrač; kad stanje nije poznato, lobby sam prebaci u igru
export const roomPath = (code: string, status: LobbyStatus | null) =>
  status === 'IN_PROGRESS' ? `/igra/${code}` : `/soba/${code}`

let started: Promise<ResumeTarget | null> | null = null

// Povratak u igru (spec 6.10), jednom po učitavanju: StrictMode pokrene efekt dvaput, a oba dobiju isti odgovor.
// check = false preskače poziv backendu, jer lobby i igra sami provjere svoju sesiju.
export function resumeSession(check: boolean) {
  started ??= run(check)
  return started
}

async function run(check: boolean): Promise<ResumeTarget | null> {
  const session = loadSession()
  if (session && check) {
    try {
      const res = await reconnect(session)
      if (res.valid && res.lobbyCode === session.lobbyCode && res.lobbyStatus !== 'FINISHED') {
        useResumeStore.setState({ status: 'done', lobbyCode: res.lobbyCode, lobbyStatus: res.lobbyStatus })
        return { lobbyCode: res.lobbyCode, lobbyStatus: res.lobbyStatus }
      }
      // igra je gotova ili sesija pripada drugoj sobi
      clearSession()
    } catch (e) {
      // Igrač ne postoji ili token ne vrijedi – sesija je stara. Bez veze sesija ostaje za kasnije.
      if (e instanceof ApiError && (e.status === 401 || e.status === 404)) clearSession()
      else console.error(e)
    }
  }
  useResumeStore.setState({ status: 'done', lobbyCode: null, lobbyStatus: null })
  return null
}
