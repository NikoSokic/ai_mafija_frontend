import { ApiError, describeError, leaveLobby } from '../api/rest.ts'
import { clearSession, loadSession } from '../store/session.ts'

// Javi backendu da igrač odlazi iz sobe i obriše sesiju na ovom uređaju. Greške koje znače "tu više nisi"
// (usred igre, token ne vrijedi, soba ne postoji) završavaju lokalnim izlaskom; `message` je samo kad
// izlazak nije uspio (nema veze, greška poslužitelja) i igrač ostaje u sobi.
export async function leaveRoom(code: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const session = loadSession()
  if (session) {
    try {
      await leaveLobby(code, session)
    } catch (e) {
      const local = e instanceof ApiError && e.status >= 400 && e.status < 500
      if (!local) return { ok: false, message: describeError(e, code) }
    }
  }
  clearSession()
  return { ok: true }
}
