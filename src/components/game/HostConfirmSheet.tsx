import Button from '../Button.tsx'
import Sheet from '../Sheet.tsx'

type HostConfirmSheetProps = {
  open: boolean
  title: string
  subtitle: string
  /** npr. "Završi noć" */
  confirmLabel: string
  /** tekst gumba dok se zahtjev šalje */
  sendingLabel: string
  sending: boolean
  onClose: () => void
  onConfirm: () => void
}

// Potvrda domaćinu prije nego ručno završi noć ili glasanje (za slučaj da zapne, spec 10.2)
export default function HostConfirmSheet({
  open,
  title,
  subtitle,
  confirmLabel,
  sendingLabel,
  sending,
  onClose,
  onConfirm,
}: HostConfirmSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title={title} subtitle={subtitle}>
      <div className="flex flex-col gap-2.5">
        <Button disabled={sending} onClick={onConfirm}>
          {sending ? sendingLabel : confirmLabel}
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Odustani
        </Button>
      </div>
    </Sheet>
  )
}
