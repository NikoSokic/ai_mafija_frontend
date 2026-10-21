import { motion } from 'framer-motion'
import { useEffect, useId, useRef } from 'react'
import { EASE_OUT } from '../../lib/motion.ts'
import { playerHue } from '../../lib/playerLook.ts'
import Avatar from '../Avatar.tsx'
import Button from '../Button.tsx'
import ThemedPortal from '../ThemedPortal.tsx'

// Noć počinje 10 s nakon glasanja. Ako nitko ne pritisne Dalje, overlay se sam zatvori,
// da igrač koji je prvi na redu ne propusti svoj potez.
const AUTO_CLOSE_MS = 8000

// Tri pukotine preko avatara i kad se koja počne crtati (prototip .elim-av svg)
const CRACKS: [string, string][] = [
  ['M66 6 60 40l12 14-8 22 10 18-6 32', '.55s'],
  ['M60 40 34 52', '.7s'],
  ['M64 76 98 86', '.82s'],
]

type EliminationOverlayProps = {
  playerId: number
  nickname: string
  emoji: string
  /** izbačen je igrač na ovom uređaju */
  isMe: boolean
  onNext: () => void
}

// Izbacivanje glasanjem (prototip OVERLAYS.elim, spec 8): avatar se zatrese, pukne, posivi i spusti,
// zatim naslov i Dalje. Pozivatelj ga stavlja u AnimatePresence, da lagano nestane.
// Naslov je neutralan ("ispada"), jer backend ne zna rod igrača (spec 9).
export default function EliminationOverlay({ playerId, nickname, emoji, isMe, onNext }: EliminationOverlayProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  // ref da novi onNext iz roditelja ne pokreće odbrojavanje ispočetka
  const onNextRef = useRef(onNext)
  useEffect(() => {
    onNextRef.current = onNext
  })

  useEffect(() => {
    dialogRef.current?.focus()
    const t = window.setTimeout(() => onNextRef.current(), AUTO_CLOSE_MS)
    return () => clearTimeout(t)
  }, [])

  return (
    <ThemedPortal>
      <motion.div
        className="fixed inset-0 z-[55]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 0.3, ease: EASE_OUT } }}
        exit={{ opacity: 0, transition: { duration: 0.3, ease: EASE_OUT } }}
      >
        <div aria-hidden="true" className="absolute inset-0 bg-[rgba(5,6,14,.62)] backdrop-blur-[6px]" />
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="relative w-full max-w-[320px] text-center outline-none"
          >
            <div className="relative mx-auto mb-[26px] size-[132px]">
              <Avatar emoji={emoji} hue={playerHue(playerId)} size={132} className="animate-elim-av" />
              <svg viewBox="0 0 132 132" aria-hidden="true" className="pointer-events-none absolute inset-0 size-full">
                {CRACKS.map(([d, delay]) => (
                  <path
                    key={d}
                    d={d}
                    fill="none"
                    stroke="var(--bg)"
                    strokeWidth={3}
                    strokeLinecap="round"
                    className="animate-crack [stroke-dasharray:90] [stroke-dashoffset:90]"
                    style={{ animationDelay: delay }}
                  />
                ))}
              </svg>
            </div>
            <h2
              id={titleId}
              className="animate-rise text-[30px] leading-[1.15] font-bold tracking-[-.03em]"
              style={{ animationDelay: '1.25s' }}
            >
              {isMe ? 'Ispadaš iz igre' : `${nickname} ispada iz igre`}
            </h2>
            <p className="mt-2 mb-[26px] animate-rise text-[15px] text-muted" style={{ animationDelay: '1.4s' }}>
              Uloga ostaje tajna do kraja igre.
            </p>
            <div className="animate-rise" style={{ animationDelay: '1.55s' }}>
              <Button onClick={onNext}>Dalje</Button>
            </div>
          </div>
        </div>
      </motion.div>
    </ThemedPortal>
  )
}
