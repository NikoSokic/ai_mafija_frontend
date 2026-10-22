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
}

// Potvrda izlaska iz sobe: javlja backendu (POST /leave) i briše sesiju na ovom uređaju.
export default function LeaveRoomSheet({ open, code, onClose, onLeft }: LeaveRoomSheetProps) {
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
        title="Napustiti sobu?"
        subtitle={`Na ovom uređaju više nećeš biti u sobi ${code}.`}
      >
        <div className="flex flex-col gap-2.5">
          <Button onClick={leave} disabled={pending}>
            Napusti sobu
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
