import { motion } from 'framer-motion'
import { useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { LobbyPlayerResponse, TeammateResponse } from '../../api/types.ts'
import { ROLES, type RoleKey } from '../../data/roles.ts'
import { cx } from '../../lib/cx.ts'
import { riseItem } from '../../lib/motion.ts'
import { avatarOf, playerHue } from '../../lib/playerLook.ts'
import type { Mode } from '../../store/roomSettings.ts'
import { useGameStore } from '../../store/gameStore.ts'
import Avatar from '../Avatar.tsx'
import Button from '../Button.tsx'
import { Icon } from '../icons.tsx'
import MeTag from '../MeTag.tsx'
import RulesSheet from '../RulesSheet.tsx'
import { sidebarStatus } from './playerStatus.ts'

type GameSidebarProps = {
  /** faza bez broja, npr. "Noć" ili "Podjela uloga" */
  phase: string
  round: number
  /** igrači iz istog stanja koje prikazuje glavni dio ekrana, da ploča ne otkrije ništa prije njega */
  players: LobbyPlayerResponse[]
  meId: number
  hostId: number | null
  role: RoleKey | null
  mode: Mode
  teammates: TeammateResponse[]
  /** utišani igrači; samo danju (noću bi otkrili potez Dame) */
  silencedIds: number[]
}

const TAG = 'shrink-0 rounded-full px-1.5 py-px text-[11px] font-semibold'

// Bočna ploča igre – postoji samo na desktopu (GameScreen je renderira uz useIsDesktop).
// Samo prikazuje podatke koje igra već ima: ne šalje zahtjeve, nema timera, glasa ni vibracije.
// Tajno (vlastita uloga u svom retku i oznaka "Tvoj tim" uz suigrače mafije) po istom pravilu kao karta
// uloge: uživo samo dok igrač drži gumb, online stalno. Gumb uživo ima svaki igrač, da se po njemu
// ne vidi tko je mafija. Tajno je u DOM-u samo dok se vidi.
export default function GameSidebar({
  phase,
  round,
  players,
  meId,
  hostId,
  role,
  mode,
  teammates,
  silencedIds,
}: GameSidebarProps) {
  const awayIds = useGameStore((s) => s.awayIds)
  const [held, setHeld] = useState(false)
  const [rulesOpen, setRulesOpen] = useState(false)
  const hold = mode === 'live' && role !== null
  const secret = mode === 'online' || held
  const sorted = [...players].sort((a, b) => a.id - b.id)
  const alive = sorted.filter((p) => p.alive).length
  const team = new Set(teammates.map((t) => t.playerId))
  const info = role ? ROLES[role] : null

  function handlePointerDown(e: PointerEvent<HTMLButtonElement>) {
    // hvata pokazivač da se otpuštanje izvan gumba ipak registrira
    e.currentTarget.setPointerCapture(e.pointerId)
    setHeld(true)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    if (!e.repeat) setHeld((h) => !h)
  }

  return (
    <motion.div
      variants={riseItem}
      className="flex max-h-full min-h-0 flex-col rounded-card border border-line bg-surface/60 px-4 pt-4 pb-3"
    >
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h2 className="text-[15px] font-semibold">
          {phase} · runda {round}
        </h2>
        <span className="text-[13px] text-muted tabular-nums">
          {alive} od {sorted.length} u igri
        </span>
      </div>

      {/* zadnjih 12 px popisa blijedi: kad popis stane, to je prazan donji razmak, a kad ne stane, vidi se da ima još */}
      <ul className="mt-2 min-h-0 flex-1 overflow-y-auto px-1 pb-3 [scrollbar-width:thin] [mask-image:linear-gradient(to_bottom,#000_calc(100%-12px),transparent)]">
        {sorted.map((p) => {
          const isHost = hostId !== null ? p.id === hostId : p.host
          const status = sidebarStatus(p, { silenced: silencedIds.includes(p.id), away: awayIds.includes(p.id) })
          return (
            <li key={p.id} className="flex h-9 items-center gap-2">
              <Avatar emoji={avatarOf(p)} hue={playerHue(p.id)} size={26} dead={!p.alive} />
              <span className={cx('min-w-0 truncate text-sm font-semibold', !p.alive && 'text-muted')}>
                {p.nickname}
              </span>
              {p.id === meId && <MeTag />}
              {isHost && (
                <span className="shrink-0 text-window" title="Domaćin">
                  <Icon name="crown" size={14} strokeWidth={2} />
                  <span className="sr-only">Domaćin</span>
                </span>
              )}
              {secret && p.id === meId && info && (
                <span
                  className={TAG}
                  style={{ color: info.color, backgroundColor: `color-mix(in srgb, ${info.color} 15%, transparent)` }}
                >
                  {info.name}
                </span>
              )}
              {secret && team.has(p.id) && <span className={cx(TAG, 'bg-accent-soft text-accent')}>Tvoj tim</span>}
              <span
                className={cx(
                  'ml-auto shrink-0 pl-1 text-xs',
                  status === 'Nije tu' || status === 'Utišan' ? 'text-accent' : 'text-muted',
                )}
              >
                {status}
              </span>
            </li>
          )
        })}
      </ul>

      <div className="mt-2 flex shrink-0 items-center gap-2 border-t border-line pt-3">
        {hold && (
          <button
            type="button"
            aria-pressed={held}
            className={cx(
              'flex h-11 min-w-0 flex-1 touch-none flex-col items-center justify-center rounded-ctrl border select-none',
              '[-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none] [transition:background-color_.2s,border-color_.2s]',
              held ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface-2',
            )}
            onPointerDown={handlePointerDown}
            onPointerUp={() => setHeld(false)}
            onPointerCancel={() => setHeld(false)}
            onBlur={() => setHeld(false)}
            onKeyDown={handleKeyDown}
            onContextMenu={(e) => e.preventDefault()}
          >
            <span className="flex items-center gap-1.5 text-sm font-semibold">
              <Icon name="eye" size={16} />
              Prikaži tajno
            </span>
            <span className="text-[11px] leading-tight text-muted">drži gumb</span>
          </button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className={cx('h-11', hold ? 'shrink-0' : 'w-full')}
          onClick={() => setRulesOpen(true)}
        >
          <Icon name="info" size={17} />
          <span>Pravila</span>
        </Button>
      </div>
      <RulesSheet open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </motion.div>
  )
}
