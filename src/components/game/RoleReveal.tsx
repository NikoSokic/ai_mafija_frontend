import { motion } from 'framer-motion'
import { useState, type KeyboardEvent, type PointerEvent } from 'react'
import { beginNight, describeError } from '../../api/rest.ts'
import type { LobbyPlayerResponse, TeammateResponse } from '../../api/types.ts'
import { ROLES, type RoleKey } from '../../data/roles.ts'
import { cx } from '../../lib/cx.ts'
import { EASE_SPRING, riseItem } from '../../lib/motion.ts'
import { avatarById, avatarOf, playerHue } from '../../lib/playerLook.ts'
import type { Mode } from '../../store/roomSettings.ts'
import type { Session } from '../../store/session.ts'
import Avatar from '../Avatar.tsx'
import CardPattern from '../CardPattern.tsx'
import { useErrorToast } from '../ErrorToast.tsx'
import HoldButton from '../HoldButton.tsx'
import IconButton from '../IconButton.tsx'
import { Icon } from '../icons.tsx'
import RoleIcon from '../RoleIcon.tsx'
import RulesSheet from '../RulesSheet.tsx'
import { Screen, ScreenBody, ScreenFooter, ScreenTop } from '../Screen.tsx'

type RoleRevealProps = {
  role: RoleKey
  mode: Mode
  /** suigrači iz tima mafije; za ostale uloge prazno */
  teammates: TeammateResponse[]
  players: LobbyPlayerResponse[]
  code: string
  session: Session
  isHost: boolean
  /** igrač je javio "Spreman sam" (ili je to backend već zapamtio) */
  ready: boolean
  /** readyPlayerIds iz javnog stanja */
  readyPlayerIds: number[]
  onReady: () => void
}

// Otkrivanje uloge (spec 6.5) u uvodu prve noći. Uživo se uloga vidi samo dok je prst na karti,
// online dodir okreće. Noć počinje kad su svi spremni ili kad domaćin ne želi čekati.
export default function RoleReveal({
  role,
  mode,
  teammates,
  players,
  code,
  session,
  isHost,
  ready,
  readyPlayerIds,
  onReady,
}: RoleRevealProps) {
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
                {teammates.length > 0 && (
                  <ul className="mt-3.5 flex flex-wrap justify-center gap-2">
                    {teammates.map((t) => {
                      const mate = t.roleName in ROLES ? ROLES[t.roleName as RoleKey] : null
                      return (
                        <li
                          key={t.playerId}
                          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface-2 pr-3 pl-1 text-[13px] font-medium"
                        >
                          <Avatar emoji={avatarById(players, t.playerId)} hue={playerHue(t.playerId)} size={24} />
                          {t.nickname}
                          <span style={{ color: mate?.color }}>{mate?.name ?? t.roleName}</span>
                        </li>
                      )
                    })}
                  </ul>
                )}
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
        {ready ? (
          <ReadyWait code={code} session={session} isHost={isHost} players={players} readyIds={readyPlayerIds} />
        ) : (
          <>
            <HoldButton onConfirm={onReady}>Spreman sam</HoldButton>
            <p className="text-center text-[13px] text-muted">Drži gumb da potvrdiš.</p>
          </>
        )}
      </ScreenFooter>
      <RulesSheet open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </Screen>
  )
}

type ReadyWaitProps = {
  code: string
  session: Session
  isHost: boolean
  players: LobbyPlayerResponse[]
  readyIds: number[]
}

// Čekanje ostalih (prototip roleCta): "Spremno X od Y" i avatari spremnih, svaki uskoči kad stigne.
// Broje se živi igrači, kao readyTotal u backendu. Domaćin može pokrenuti noć i bez ostalih.
function ReadyWait({ code, session, isHost, players, readyIds }: ReadyWaitProps) {
  const [starting, setStarting] = useState(false)
  const { toast, show } = useErrorToast()
  const alive = players.filter((p) => p.alive)
  const ready = alive.filter((p) => readyIds.includes(p.id) || p.id === session.playerId)

  // Noć dalje stiže događajem; gumb ostaje ugašen dok ekran ne prijeđe u noć
  async function begin() {
    setStarting(true)
    try {
      await beginNight(code, session)
    } catch (e) {
      show('Noć nije pokrenuta', describeError(e, code))
      setStarting(false)
    }
  }

  return (
    <>
      <div className="text-center">
        <p role="status" className="text-[13px] text-muted">
          Spremno {ready.length} od {alive.length}
        </p>
        <ul className="mt-2.5 flex min-h-8 flex-wrap justify-center gap-1.5">
          {ready.map((p) => (
            <motion.li
              key={p.id}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: EASE_SPRING }}
            >
              <Avatar emoji={avatarOf(p)} hue={playerHue(p.id)} size={32} />
              <span className="sr-only">{p.nickname}</span>
            </motion.li>
          ))}
        </ul>
      </div>
      {isHost && ready.length < alive.length && (
        <HoldButton variant="secondary" disabled={starting} onConfirm={begin}>
          Počni noć bez čekanja
        </HoldButton>
      )}
      {toast}
    </>
  )
}
