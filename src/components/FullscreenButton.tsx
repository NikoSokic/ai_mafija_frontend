import { useState } from 'react'
import { fullscreenSupport, toggleFullscreen, useIsFullscreen } from '../lib/useFullscreen.ts'
import { loadSession } from '../store/session.ts'
import Button from './Button.tsx'
import IconButton from './IconButton.tsx'
import Sheet from './Sheet.tsx'

const INSTALL_STEPS = [
  'U Safariju dodirni Dijeli (kvadrat sa strelicom).',
  'Odaberi "Dodaj na početni zaslon".',
  'Otvori AI Mafiju s početnog zaslona: igra se otvara bez adresne trake.',
]

// Gumb u zaglavlju ekrana. Na iPhoneu Safari ne dopušta cijeli ekran za stranice, pa gumb objasni početni zaslon.
export default function FullscreenButton() {
  const [support] = useState(fullscreenSupport)
  const on = useIsFullscreen()
  const [stepsOpen, setStepsOpen] = useState(false)

  if (support === 'none') return null
  if (support === 'fullscreen') {
    return (
      <IconButton
        icon={on ? 'fullscreenExit' : 'fullscreen'}
        aria-label={on ? 'Izađi iz cijelog ekrana' : 'Cijeli ekran'}
        aria-pressed={on}
        onClick={toggleFullscreen}
      />
    )
  }

  return (
    <>
      <IconButton icon="fullscreen" aria-label="Kako igrati preko cijelog ekrana" onClick={() => setStepsOpen(true)} />
      <Sheet
        open={stepsOpen}
        onClose={() => setStepsOpen(false)}
        title="Igraj preko cijelog ekrana"
        subtitle="Na iPhoneu to radi kad igru dodaš na početni zaslon."
      >
        <ol className="mb-5 grid gap-2.5">
          {INSTALL_STEPS.map((step, i) => (
            <li key={step} className="flex items-start gap-3 text-[15px] leading-[1.45]">
              <span className="grid size-[26px] shrink-0 place-items-center rounded-full bg-surface-2 text-[13px] font-bold">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
        {/* aplikacija na početnom zaslonu ima odvojenu pohranu od Safarija, pa ne vidi sesiju */}
        {loadSession() && (
          <p className="mb-5 text-sm leading-[1.45] text-muted">
            Aplikacija s početnog zaslona ne zna za tvoju trenutnu sobu. Završi ovu igru u Safariju, a aplikaciju
            otvori za sljedeću.
          </p>
        )}
        <Button variant="secondary" onClick={() => setStepsOpen(false)}>
          U redu
        </Button>
      </Sheet>
    </>
  )
}
