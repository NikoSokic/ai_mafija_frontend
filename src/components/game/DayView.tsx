import { motion } from 'framer-motion'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { GameStateResponse } from '../../api/types.ts'
import { DEFAULT_EMOJI } from '../../data/emojis.ts'
import type { RoleKey } from '../../data/roles.ts'
import { useCountdown } from '../../lib/useCountdown.ts'
import { playerEmoji, playerHue } from '../../lib/playerLook.ts'
import { loadFate } from '../../store/notes.ts'
import { loadProfile } from '../../store/profile.ts'
import type { NightReport } from '../../store/reports.ts'
import type { Mode } from '../../store/roomSettings.ts'
import Avatar from '../Avatar.tsx'
import Banner from '../Banner.tsx'
import Button from '../Button.tsx'
import { Icon, type IconName } from '../icons.tsx'
import MeTag from '../MeTag.tsx'
import { Screen, ScreenBody, ScreenFooter } from '../Screen.tsx'
import Section from '../Section.tsx'
import Skyline from '../Skyline.tsx'
import TimerRing from '../TimerRing.tsx'
import PhaseHeader from './PhaseHeader.tsx'
import { fateText, isSilenced } from './playerStatus.ts'

// Rasprava traje 2:30 (spec 6.7); timer je lokalan, backend ga nema
const DISCUSSION_S = 150

type DayViewProps = {
  code: string
  round: number
  role: RoleKey | null
  mode: Mode
  /** zadnji GET /game-state */
  state: GameStateResponse
  isHost: boolean
  /** za krunu u popisu */
  hostId: number | null
  /** što se dogodilo noćas; null kad ovaj uređaj nije pratio kraj noći */
  report: NightReport | null
  /** dan se pojavio na ekranu – mjesto za jutarnju naraciju */
  onPhaseIntro: () => void
  /** prebaci ovaj ekran na glasanje */
  onStartVote: () => void
}

// Dan (spec 6.7): izvještaj noći, rasprava s timerom i popis igrača.
// DayView se montira iznova svaki dan, pa timer kreće od početka.
export default function DayView({
  code,
  round,
  role,
  mode,
  state,
  isHost,
  hostId,
  report,
  onPhaseIntro,
  onStartVote,
}: DayViewProps) {
  const [myEmoji] = useState(() => loadProfile()?.emoji || DEFAULT_EMOJI)
  const timer = useCountdown(DISCUSSION_S)

  useEffect(() => {
    onPhaseIntro()
  }, [onPhaseIntro])

  const me = state.currentPlayer
  const silenced = isSilenced(state)
  // timer osvježava ekran svake sekunde, pa se localStorage čita samo kad se promijeni živ/mrtav
  const fate = useMemo(() => (me.alive ? null : loadFate(code)), [code, me.alive])
  const players = useMemo(() => [...state.players].sort((a, b) => a.id - b.id), [state.players])
  const alivePlayers = players.filter((p) => p.alive)
  const deadPlayers = players.filter((p) => !p.alive)

  const emojiOf = (id: number) => (id === me.playerId ? myEmoji : playerEmoji(id))
  const nicknameOf = (id: number) => players.find((p) => p.id === id)?.nickname ?? '?'

  // Redovi izvještaja kao u prototipu. Tko je utišan zna samo utišani igrač (docs/backend-todo.md).
  const rows: ReactNode[] = []
  if (!report) {
    rows.push(
      <ReportRow
        key="unknown"
        lead={<RoundIcon className="bg-surface-2 text-muted" icon="info" />}
        title="Nema izvještaja"
        text="Ovaj uređaj nije pratio kraj noći."
      />,
    )
  } else if (report.killed.length === 0) {
    rows.push(
      <ReportRow
        key="none"
        lead={<RoundIcon className="bg-role-doktor/15 text-role-doktor" icon="shield" />}
        title="Nitko nije stradao"
        text="Netko je noćas imao zaštitu."
      />,
    )
  }
  for (const id of report?.killed ?? []) {
    rows.push(
      <ReportRow
        key={`killed-${id}`}
        lead={<Avatar emoji={emojiOf(id)} hue={playerHue(id)} size={44} dead />}
        title={nicknameOf(id)}
        text="Ubijen noćas"
        trail="skull"
      />,
    )
  }
  if (silenced) {
    rows.push(
      <ReportRow
        key="silenced"
        lead={<Avatar emoji={myEmoji} hue={playerHue(me.playerId)} size={44} muted />}
        title={me.nickname}
        text="Utišan do kraja dana"
        trail="mute"
      />,
    )
  }

  return (
    <Screen>
      <PhaseHeader icon="sun" title={`Dan ${round}`} role={role} code={code} />
      <ScreenBody withSky>
        {silenced && (
          <Banner icon="mute" title="Utišan si">
            Danas ne smiješ govoriti ni glasati.
          </Banner>
        )}
        {!me.alive && (
          <Banner icon="ghost" title="Promatraš igru">
            {fateText(fate)}. Ne otkrivaj uloge.
          </Banner>
        )}

        <Section title="Što se dogodilo noćas">
          <div className="rounded-card border border-line bg-surface px-4 py-1.5">{rows}</div>
        </Section>

        <Section>
          <div className="flex items-center gap-4 rounded-card border border-line bg-surface px-4 py-3.5">
            <TimerRing left={timer.left} total={timer.total} />
            <div className="min-w-0 flex-1">
              <h4 className="text-base font-semibold">Rasprava</h4>
              <p className="text-[13px] leading-[1.45] text-muted">Tko se ponašao sumnjivo?</p>
              {isHost && (
                <div className="mt-2 flex gap-1.5">
                  <Button variant="secondary" size="xs" onClick={() => timer.add(30)}>
                    +30 s
                  </Button>
                  <Button variant="secondary" size="xs" onClick={onStartVote}>
                    Preskoči
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Section>

        <Section title="U igri" aside={`${alivePlayers.length} od ${players.length}`}>
          <div>
            {alivePlayers.map((p) => {
              const isMe = p.id === me.playerId
              const muted = isMe && silenced
              return (
                <div key={p.id} className="flex items-center gap-3 border-t border-line py-2.5 first:border-t-0">
                  <Avatar emoji={emojiOf(p.id)} hue={playerHue(p.id)} size={40} host={p.id === hostId} muted={muted} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center">
                      <span className="truncate text-[15px] font-semibold">{p.nickname}</span>
                      {isMe && <MeTag />}
                    </div>
                    {muted && <div className="text-[13px] text-muted">Utišan</div>}
                  </div>
                </div>
              )
            })}
          </div>
          {deadPlayers.length > 0 && (
            <p className="mt-2.5 text-[13px] leading-[1.45] text-muted">
              Ispali: {deadPlayers.map((p) => p.nickname).join(', ')}
            </p>
          )}
        </Section>

        {mode === 'online' && (
          // mjesto za tekstualni chat (spec 6.7) – ne radi se sada
          <Section>
            <div className="flex h-12 items-center gap-2.5 rounded-[14px] border border-line bg-surface px-3.5 text-sm text-muted">
              <Icon name="chat" size={18} />
              Chat stiže uskoro
            </div>
          </Section>
        )}
      </ScreenBody>
      <Skyline players={players} stateOf={(p) => (p.alive ? 'on' : 'off')} />
      <ScreenFooter rise className="bg-sky">
        {/* Backend otvara glasanje odmah na početku dana, pa ovo mijenja samo ekran na ovom
            uređaju; domaćin ga ne može pokrenuti svima (docs/backend-todo.md) */}
        {isHost ? (
          <Button onClick={onStartVote}>
            <Icon name="vote" size={20} />
            Pokreni glasanje
          </Button>
        ) : (
          <>
            <p className="pt-2 pb-1 text-center text-[13px] leading-[1.45] text-muted">
              Glasanje počinje kad domaćin odluči ili istekne vrijeme.
            </p>
            {timer.left === 0 && (
              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
                <Button onClick={onStartVote}>
                  <Icon name="vote" size={20} />
                  Glasaj
                </Button>
              </motion.div>
            )}
          </>
        )}
      </ScreenFooter>
    </Screen>
  )
}

type ReportRowProps = {
  lead: ReactNode
  title: string
  text: string
  /** ikona na kraju reda */
  trail?: IconName
}

function ReportRow({ lead, title, text, trail }: ReportRowProps) {
  return (
    <div className="flex items-center gap-3.5 border-t border-line py-3 first:border-t-0">
      {lead}
      <div className="min-w-0 flex-1">
        <h4 className="truncate text-base font-semibold">{title}</h4>
        <p className="mt-0.5 text-[13px] text-muted">{text}</p>
      </div>
      {trail && <Icon name={trail} size={20} />}
    </div>
  )
}

// Ikona u zaobljenom kvadratu od 44 px (prototip .ricon)
function RoundIcon({ icon, className }: { icon: IconName; className: string }) {
  return (
    <span className={`grid size-11 shrink-0 place-items-center rounded-[14px] ${className}`}>
      <Icon name={icon} size={22} />
    </span>
  )
}
