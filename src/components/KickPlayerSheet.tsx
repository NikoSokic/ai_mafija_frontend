import { useState } from 'react'
import { ApiError, describeError, kickPlayer } from '../api/rest.ts'
import type { LobbyPlayerResponse } from '../api/types.ts'
import { useGameStore } from '../store/gameStore.ts'
import type { Session } from '../store/session.ts'
import Button from './Button.tsx'
import { useErrorToast } from './ErrorToast.tsx'
import Sheet from './Sheet.tsx'

type KickPlayerSheetProps = {
  open: boolean
  /** ostaje postavljen i dok se sheet zatvara, da tekst ne nestane prije izlaska */
  player: LobbyPlayerResponse | null
  code: string
  session: Session
  onClose: () => void
}

// Potvrda izbacivanja iz čekaonice (samo domaćin). Izbačeni se može ponovno pridružiti kodom sobe.
export default function KickPlayerSheet({ open, player, code, session, onClose }: KickPlayerSheetProps) {
  const [pending, setPending] = useState(false)
  const { toast, show } = useErrorToast()

  async function kick() {
    if (!player) return
    setPending(true)
    try {
      await kickPlayer(code, session, player.id)
    } catch (e) {
      // igrač je u međuvremenu sam otišao: isto što i uspjeh
      if (!(e instanceof ApiError && e.code === 'PLAYER_NOT_FOUND')) {
        show('Igrač nije izbačen', describeError(e, code))
        setPending(false)
        return
      }
    }
    // ne čeka se PLAYER_LEFT: ako veza ne radi, igrač svejedno nestaje s popisa
    useGameStore.getState().playerLeft(player.id, null, session.playerId)
    setPending(false)
    onClose()
  }

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={player ? `Izbaciti igrača ${player.nickname}?` : 'Izbaciti igrača?'}
        subtitle="Mjesto se oslobađa. Igrač se može vratiti s kodom sobe."
      >
        <div className="flex flex-col gap-2.5">
          <Button onClick={kick} disabled={pending}>
            {pending ? 'Izbacujem…' : 'Izbaci'}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Odustani
          </Button>
        </div>
      </Sheet>
      {toast}
    </>
  )
}
