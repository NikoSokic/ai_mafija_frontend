import { useState } from 'react'
import { decideReclaim, describeError } from '../api/rest.ts'
import { useGameStore } from '../store/gameStore.ts'
import { loadSession } from '../store/session.ts'
import Button from './Button.tsx'
import { useErrorToast } from './ErrorToast.tsx'
import Sheet from './Sheet.tsx'

// Domaćinu se pokaže zahtjev da se igrač vrati na novom uređaju: "Je li ovo [nadimak]?" Odobrenje daje
// novom uređaju pristup igračevoj ulozi, pa pitanje ostaje dok domaćin ne odgovori (ili dok ne istekne).
export default function ReclaimHostSheet({ code }: { code: string }) {
  const session = loadSession()
  const request = useGameStore((s) => s.reclaimRequests[0])
  const isHost = useGameStore((s) => s.lobby?.hostPlayerId != null && s.lobby.hostPlayerId === session?.playerId)
  const [pending, setPending] = useState(false)
  const { toast, show } = useErrorToast()

  async function decide(approve: boolean) {
    if (!request || !session || pending) return
    setPending(true)
    try {
      await decideReclaim(code, session, request.requestId, approve)
    } catch (e) {
      show('Odluka nije poslana', describeError(e, code))
    }
    // i istekao zahtjev (404) se miče s popisa, inače bi pitanje ostalo
    useGameStore.getState().reclaimResolved(request.requestId)
    setPending(false)
  }

  return (
    <>
      <Sheet
        open={isHost && request !== undefined}
        onClose={() => {}}
        dismissable={false}
        title={request ? `Je li ovo ${request.nickname}?` : undefined}
        subtitle="Netko se želi vratiti u igru na drugom mobitelu. Potvrdi samo ako znaš da je to taj igrač: dobit će njegovu ulogu."
      >
        <div className="flex flex-col gap-2.5">
          <Button disabled={pending} onClick={() => decide(true)}>
            Da, to je on
          </Button>
          <Button variant="secondary" disabled={pending} onClick={() => decide(false)}>
            Ne
          </Button>
        </div>
      </Sheet>
      {toast}
    </>
  )
}
