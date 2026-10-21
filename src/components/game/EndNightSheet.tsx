import Button from '../Button.tsx'
import Sheet from '../Sheet.tsx'

type EndNightSheetProps = {
  open: boolean
  sending: boolean
  onClose: () => void
  onConfirm: () => void
}

// Potvrda domaćinu prije nego ručno završi noć (za slučaj da noć zapne, spec 10.2)
export default function EndNightSheet({ open, sending, onClose, onConfirm }: EndNightSheetProps) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Završiti noć?"
      subtitle="Uloge koje još nisu odigrale preskaču potez. Koristi ovo samo ako je noć zapela."
    >
      <div className="flex flex-col gap-2.5">
        <Button disabled={sending} onClick={onConfirm}>
          {sending ? 'Završavam noć…' : 'Završi noć'}
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Odustani
        </Button>
      </div>
    </Sheet>
  )
}
