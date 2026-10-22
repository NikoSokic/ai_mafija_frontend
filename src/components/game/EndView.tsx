import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router'
import type { LobbyPlayerResponse, Winner } from '../../api/types.ts'
import { isRoleKey, ROLES, type RoleKey, type Team } from '../../data/roles.ts'
import { EASE_SPRING, riseItem } from '../../lib/motion.ts'
import { avatarById, playerHue } from '../../lib/playerLook.ts'
import { clearNotes } from '../../store/notes.ts'
import { clearSeenRole } from '../../store/seenRole.ts'
import { leaveLobby } from '../../api/rest.ts'
import { clearSession, type Session } from '../../store/session.ts'
import Avatar from '../Avatar.tsx'
import Button from '../Button.tsx'
import Chip from '../Chip.tsx'
import IconButton from '../IconButton.tsx'
import MeTag from '../MeTag.tsx'
import Particles, { type ParticlesHandle } from '../Particles.tsx'
import RoleChip from '../RoleChip.tsx'
import { Screen, ScreenBody, ScreenFooter, ScreenTop } from '../Screen.tsx'
import Skyline from '../Skyline.tsx'
import { endFateText } from './playerStatus.ts'

type EndViewProps = {
  code: string
  session: Session
  players: LobbyPlayerResponse[]
  winner: Winner | null
  /** broj dana igre */
  round: number
  /** moja uloga iz GET /game-state; služi kad javni popis ne nosi ulogu */
  myRole: RoleKey | null
  isHost: boolean
}

const GROUPS: { team: Team; label: string; color: string }[] = [
  { team: 'mafia', label: 'Tim mafije', color: 'var(--role-mafia)' },
  { team: 'town', label: 'Tim građana', color: 'var(--role-gradanin)' },
]

// Kraj igre (spec 6.9): pobjednik, konfeti, naslov slovo po slovo i popis igrača sa sudbinom.
// Backend nema "igraj ponovno" (docs/backend-todo.md), pa domaćin otvara novu sobu s istim postavkama.
export default function EndView({ code, session, players, winner, round, myRole, isHost }: EndViewProps) {
  const navigate = useNavigate()
  const particles = useRef<ParticlesHandle>(null)
  const mafiaWin = winner === 'MAFIA_WIN'
  const title = winner ? (mafiaWin ? 'Mafija pobjeđuje' : 'Građani pobjeđuju') : 'Kraj igre'
  const sentence = !winner
    ? ''
    : mafiaWin
      ? 'Posljednja svjetla u gradu su se ugasila.'
      : 'Mafija je razotkrivena. Grad napokon diše.'

  useEffect(() => {
    const id = window.setTimeout(() => particles.current?.burst(), 350)
    return () => window.clearTimeout(id)
  }, [])

  const meId = session.playerId
  const sorted = useMemo(() => [...players].sort((a, b) => a.id - b.id), [players])

  const emojiOf = (id: number) => avatarById(players, id)
  // Uloga iz javnog popisa; za sebe rezervno iz privatnog stanja
  const roleOf = (p: LobbyPlayerResponse): RoleKey | null => {
    const name = p.roleName ?? (p.id === meId ? myRole : null)
    return name && isRoleKey(name) ? name : null
  }
  const unknown = sorted.filter((p) => !roleOf(p))

  // Backendu se javlja bez čekanja; ako ne uspije, soba svejedno ostaje iza igrača
  function leaveRoom() {
    leaveLobby(code, session).catch(() => {})
    clearSession()
    clearSeenRole(code)
    clearNotes(code)
  }

  function goHome() {
    leaveRoom()
    navigate('/', { replace: true })
  }

  // Postavke stare sobe (aimafija.room) ostaju, pa ih /nova može pročitati
  function newRoom() {
    leaveRoom()
    navigate('/nova', { state: { from: code } })
  }

  return (
    <Screen>
      <Particles ref={particles} />
      <ScreenTop>
        <span className="flex-1" />
        <IconButton icon="x" aria-label="Zatvori" onClick={goHome} />
      </ScreenTop>

      <ScreenBody withSky>
        <Headline title={title} sentence={sentence} round={round} />

        <motion.div variants={riseItem}>
          {GROUPS.map(({ team, label, color }) => {
            const rows = sorted.filter((p) => {
              const role = roleOf(p)
              return role && ROLES[role].team === team
            })
            if (!rows.length) return null
            return (
              <section key={team}>
                <h3 className="mt-[22px] mb-1.5 flex items-center gap-2 text-[15px] font-semibold">
                  <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
                  {label}
                  {(team === 'mafia') === mafiaWin && <Chip className="h-[22px] px-2 text-xs">pobjeda</Chip>}
                </h3>
                {rows.map((p) => (
                  <FateRow key={p.id} player={p} meId={meId} emoji={emojiOf(p.id)} role={roleOf(p)} />
                ))}
              </section>
            )
          })}
          {unknown.length > 0 && (
            <section>
              <h3 className="mt-[22px] mb-1.5 text-[15px] font-semibold">Igrači</h3>
              {unknown.map((p) => (
                <FateRow key={p.id} player={p} meId={meId} emoji={emojiOf(p.id)} role={null} />
              ))}
            </section>
          )}
        </motion.div>
      </ScreenBody>

      <Skyline players={sorted} stateOf={(p) => (p.alive ? 'on' : 'off')} />
      <ScreenFooter rise className="bg-sky">
        {isHost ? (
          <>
            <Button onClick={newRoom}>Nova soba s istim postavkama</Button>
            <Button variant="ghost" onClick={goHome}>
              Na početnu
            </Button>
          </>
        ) : (
          <Button onClick={goHome}>Na početnu</Button>
        )}
      </ScreenFooter>
    </Screen>
  )
}

// Naslov se slaže slovo po slovo (prototip letterUp); uz reduced motion odmah stoji
function Headline({ title, sentence, round }: { title: string; sentence: string; round: number }) {
  const reduceMotion = useReducedMotion()
  let index = 0
  return (
    <div className="pt-[30px] pb-[18px] text-center">
      <motion.p variants={riseItem} className="mb-2.5 text-[15px] text-muted">
        Kraj igre nakon {round} dana
      </motion.p>
      <h1 aria-label={title} className="text-[54px] leading-[.95] font-bold tracking-[-.045em] text-accent">
        {title.split(' ').map((word, wi) => (
          <span key={wi}>
            {wi > 0 && ' '}
            <span className="inline-block whitespace-nowrap">
              {word.split('').map((char) => {
                const i = index++
                return (
                  <motion.span
                    key={i}
                    aria-hidden="true"
                    className="inline-block"
                    initial={reduceMotion ? false : { opacity: 0, y: '40%', rotate: 6 }}
                    animate={{ opacity: 1, y: 0, rotate: 0 }}
                    transition={{ duration: 0.7, ease: EASE_SPRING, delay: i * 0.045 + 0.2 }}
                  >
                    {char}
                  </motion.span>
                )
              })}
            </span>
          </span>
        ))}
      </h1>
      <motion.p variants={riseItem} className="mt-3.5 text-base text-muted">
        {sentence}
      </motion.p>
    </div>
  )
}

type FateRowProps = { player: LobbyPlayerResponse; meId: number; emoji: string; role: RoleKey | null }

function FateRow({ player, meId, emoji, role }: FateRowProps) {
  return (
    <div className="flex items-center gap-3 border-t border-line py-2.5 first:border-t-0">
      <Avatar emoji={emoji} hue={playerHue(player.id)} size={40} dead={!player.alive} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center">
          <span className="truncate text-[15px] font-semibold">{player.nickname}</span>
          {player.id === meId && <MeTag />}
        </div>
        <div className="text-[13px] text-muted">{endFateText(player)}</div>
      </div>
      {role && <RoleChip role={role} />}
    </div>
  )
}
