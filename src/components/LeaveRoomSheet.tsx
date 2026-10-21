import { clearSession } from '../store/session.ts'
import Button from './Button.tsx'
import Sheet from './Sheet.tsx'

type LeaveRoomSheetProps = {
  open: boolean
  code: string
  onClose: () => void
  /** sesija je već obrisana */
  onLeft: () => void
}

// Potvrda izlaska iz sobe. Backend nema izlazak (docs/backend-todo.md), pa se briše samo sesija na ovom uređaju.
export default function LeaveRoomSheet({ open, code, onClose, onLeft }: LeaveRoomSheetProps) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Napustiti sobu?"
      subtitle={`Na ovom uređaju više nećeš biti u sobi ${code}.`}
    >
      <div className="flex flex-col gap-2.5">
        <Button
          onClick={() => {
            clearSession()
            onLeft()
          }}
        >
          Napusti sobu
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Ostani
        </Button>
      </div>
    </Sheet>
  )
}
