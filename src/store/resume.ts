import { create } from 'zustand'
import { ApiError, leaveLobby, reconnect } from '../api/rest.ts'
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

const SKIP_KEY = 'aimafija.skipResume'

/** sljedeće učitavanje stranice ne vraća igrača u sobu (npr. "Na početnu" nakon greške) */
export function skipNextResume() {
  try {
    sessionStorage.setItem(SKIP_KEY, '1')
  } catch {
    // bez zastavice povratak u sobu je i dalje moguć
  }
}

function consumeSkip() {
  try {
    const skip = sessionStorage.getItem(SKIP_KEY) === '1'
    sessionStorage.removeItem(SKIP_KEY)
    return skip
  } catch {
    return false
  }
}

// Povratak u igru (spec 6.10), jednom po učitavanju: StrictMode pokrene efekt dvaput, a oba dobiju isti odgovor.
// check = false preskače poziv backendu, jer lobby i igra sami provjere svoju sesiju.
export function resumeSession(check: boolean) {
  started ??= run(check)
  return started
}

async function run(check: boolean): Promise<ResumeTarget | null> {
  const session = loadSession()
  if (consumeSkip()) check = false
  if (session && check) {
    try {
      const res = await reconnect(session)
      if (res.valid && res.lobbyCode === session.lobbyCode && res.lobbyStatus !== 'FINISHED') {
        useResumeStore.setState({ status: 'done', lobbyCode: res.lobbyCode, lobbyStatus: res.lobbyStatus })
        return { lobbyCode: res.lobbyCode, lobbyStatus: res.lobbyStatus }
      }
      // Igra je gotova ili sesija pripada drugoj sobi. Za završenu igru javlja se i backendu: inače bi igrač
      // nakon "Igraj ponovno" ostao u čekaonici kao igrač kojeg nema (a domaćin bi ostao bez zamjene).
      if (res.valid && res.lobbyCode === session.lobbyCode && res.lobbyStatus === 'FINISHED') {
        leaveLobby(session.lobbyCode, session).catch(() => {})
      }
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
