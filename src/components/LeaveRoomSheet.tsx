import { useState } from 'react'
import { leaveRoom } from '../lib/leaveRoom.ts'
import Button from './Button.tsx'
import { useErrorToast } from './ErrorToast.tsx'
import Sheet from './Sheet.tsx'

type LeaveRoomSheetProps = {
  open: boolean
  code: string
  onClose: () => void
  /** sesija je već obrisana */
  onLeft: () => void
  /** igra je u tijeku: izlazak znači ispadanje, bez povratka */
  inGame?: boolean
}

// Potvrda izlaska iz sobe: javlja backendu (POST /leave) i briše sesiju na ovom uređaju.
export default function LeaveRoomSheet({ open, code, onClose, onLeft, inGame = false }: LeaveRoomSheetProps) {
  const [pending, setPending] = useState(false)
  const { toast, show } = useErrorToast()

  async function leave() {
    setPending(true)
    const result = await leaveRoom(code)
    setPending(false)
    if (result.ok) onLeft()
    else show('Nisam uspio izaći iz sobe', result.message)
  }

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={inGame ? 'Napustiti igru?' : 'Napustiti sobu?'}
        subtitle={
          inGame
            ? `Ispadaš iz igre u sobi ${code} i ne možeš se vratiti. Tvoja uloga ostaje tajna.`
            : `Na ovom uređaju više nećeš biti u sobi ${code}.`
        }
      >
        <div className="flex flex-col gap-2.5">
          <Button onClick={leave} disabled={pending}>
            {inGame ? 'Napusti igru' : 'Napusti sobu'}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Ostani
          </Button>
        </div>
      </Sheet>
      {toast}
    </>
  )
}
