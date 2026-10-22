import { motion } from 'framer-motion'
import { useState, type KeyboardEvent, type PointerEvent } from 'react'
import { ROLES, type RoleKey } from '../../data/roles.ts'
import { cx } from '../../lib/cx.ts'
import { riseItem } from '../../lib/motion.ts'
import type { Mode } from '../../store/roomSettings.ts'
import CardPattern from '../CardPattern.tsx'
import HoldButton from '../HoldButton.tsx'
import IconButton from '../IconButton.tsx'
import { Icon } from '../icons.tsx'
import RoleIcon from '../RoleIcon.tsx'
import RulesSheet from '../RulesSheet.tsx'
import { Screen, ScreenBody, ScreenFooter, ScreenTop } from '../Screen.tsx'

type RoleRevealProps = {
  role: RoleKey
  mode: Mode
  onReady: () => void
}

// Otkrivanje uloge (spec 6.5). Uživo se uloga vidi samo dok je prst na karti, online dodir okreće.
export default function RoleReveal({ role, mode, onReady }: RoleRevealProps) {
  const [open, setOpen] = useState(false)
  const [rulesOpen, setRulesOpen] = useState(false)
  const hold = mode === 'live'
  const info = ROLES[role]

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!hold) return
    // hvata pokazivač da se otpuštanje izvan karte ipak registrira
    e.currentTarget.setPointerCapture(e.pointerId)
    setOpen(true)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    if (!e.repeat) setOpen((o) => !o)
  }

  return (
    <Screen>
      <ScreenTop>
        <span className="flex-1" />
        <IconButton icon="info" aria-label="Pravila igre" onClick={() => setRulesOpen(true)} />
      </ScreenTop>
      <ScreenBody>
        <div className="flex flex-col items-center pt-1.5 text-center">
          <motion.p variants={riseItem} className="text-muted">
            Igra počinje. Tvoja uloga je tajna.
          </motion.p>

          <motion.div
            variants={riseItem}
            role="button"
            tabIndex={0}
            aria-pressed={open}
            aria-label={hold ? 'Drži za prikaz uloge' : 'Dodirni za prikaz uloge'}
            className="mt-2.5 mb-[18px] aspect-[3/4.2] w-[min(270px,74vw)] cursor-pointer touch-none [perspective:1200px] select-none [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none]"
            onPointerDown={handlePointerDown}
            onPointerUp={hold ? () => setOpen(false) : undefined}
            onPointerCancel={hold ? () => setOpen(false) : undefined}
            onClick={hold ? undefined : () => setOpen((o) => !o)}
            onKeyDown={handleKeyDown}
            onContextMenu={(e) => e.preventDefault()}
          >
            <div
              className={cx(
                'relative size-full [transform-style:preserve-3d]',
                'transition-transform duration-[750ms] ease-spring motion-reduce:duration-0',
                open && '[transform:rotateY(180deg)]',
              )}
            >
              <div
                aria-hidden={open}
                className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-[26px] border border-line bg-surface p-[22px] [backface-visibility:hidden]"
              >
                <CardPattern className="absolute inset-0 size-full opacity-45" />
                <div className="relative mt-auto grid size-[76px] place-items-center rounded-full border border-line bg-bg text-accent">
                  <Icon name="eye" size={30} strokeWidth={1.6} />
                </div>
                <div className="relative mt-auto rounded-full border border-line bg-bg px-3.5 py-2 text-[15px] font-semibold">
                  {hold ? 'Drži za prikaz' : 'Dodirni za prikaz'}
                </div>
              </div>

              <div
                aria-hidden={!open}
                className="absolute inset-0 flex [transform:rotateY(180deg)] flex-col items-center justify-center overflow-hidden rounded-[26px] border border-line p-[22px] [backface-visibility:hidden]"
                style={{
                  background: `linear-gradient(180deg, color-mix(in srgb, ${info.color} 22%, var(--surface)) 0, var(--surface) 62%)`,
                }}
              >
                {open && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 -translate-x-[120%] animate-shine bg-[linear-gradient(115deg,transparent_30%,rgba(255,255,255,.16)_45%,transparent_60%)] motion-reduce:animate-none"
                  />
                )}
                <RoleIcon role={role} size={84} iconSize={46} className="mb-[18px]" />
                <h3 className="text-[38px] font-bold tracking-[-.035em]" style={{ color: info.color }}>
                  {info.name}
                </h3>
                <div className="mt-1 mb-3.5 text-sm text-muted">
                  {info.team === 'mafia' ? 'Tim mafije' : 'Tim građana'}
                </div>
                <p className="max-w-[24ch] text-[15px] leading-[1.45]">{info.long}</p>
              </div>
            </div>
          </motion.div>

          <motion.p variants={riseItem} className="max-w-[30ch] text-[13px] text-muted">
            {hold
              ? 'Uloga se vidi samo dok držiš prst na kartici, da je susjedi ne vide.'
              : 'Dodirni ponovno za skrivanje.'}
          </motion.p>
        </div>
      </ScreenBody>
      <ScreenFooter rise>
        <HoldButton onConfirm={onReady}>Spreman sam</HoldButton>
        <p className="text-center text-[13px] text-muted">Drži gumb da potvrdiš.</p>
      </ScreenFooter>
      <RulesSheet open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </Screen>
  )
}
