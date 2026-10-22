import { useMemo, useState, type ReactNode } from 'react'
import { describeError, extendDiscussion, startVoting } from '../../api/rest.ts'
import type { PublicGameStateResponse } from '../../api/types.ts'
import type { RoleKey } from '../../data/roles.ts'
import { useCountdown } from '../../lib/useCountdown.ts'
import { avatarById, playerHue } from '../../lib/playerLook.ts'
import type { Mode } from '../../store/roomSettings.ts'
import { useGameStore } from '../../store/gameStore.ts'
import type { Session } from '../../store/session.ts'
import Avatar from '../Avatar.tsx'
import Banner from '../Banner.tsx'
import Button from '../Button.tsx'
import { Icon, type IconName } from '../icons.tsx'
import MeTag from '../MeTag.tsx'
import { Screen, ScreenBody, ScreenFooter } from '../Screen.tsx'
import Section from '../Section.tsx'
import Skyline from '../Skyline.tsx'
import TimerRing from '../TimerRing.tsx'
import Toast from '../Toast.tsx'
import PhaseHeader from './PhaseHeader.tsx'
import { fateText } from './playerStatus.ts'

// Rasprava traje 2:30 (docs/pravila-igre.md); rok broji server, ovo je samo puni krug prstena
const DISCUSSION_S = 150

type DayViewProps = {
  code: string
  round: number
  role: RoleKey | null
  mode: Mode
  session: Session
  /** javno stanje igre: igrači, izvještaj noći, rok rasprave */
  game: PublicGameStateResponse
  isHost: boolean
}

// tekst ostaje i nakon zatvaranja, da toast ne ostane prazan dok izlazi
type ErrorToast = { open: boolean; title: string; text: string }

// Dan (spec 6.7): izvještaj noći, rasprava s timerom i popis igrača.
// Rok rasprave je na serveru, pa "+30 s" i "Pokreni glasanje" vrijede za sve igrače.
export default function DayView({ code, round, role, mode, session, game, isHost }: DayViewProps) {
  const timer = useCountdown(game.phaseEndsAt, DISCUSSION_S)
  const [busy, setBusy] = useState<'extend' | 'vote' | null>(null)
  const [error, setError] = useState<ErrorToast>({ open: false, title: '', text: '' })

  const meId = session.playerId
  const players = useMemo(() => [...game.players].sort((a, b) => a.id - b.id), [game.players])
  const me = players.find((p) => p.id === meId)
  const alive = me?.alive ?? true
  const silenced = game.silencedPlayerIds
  const hostId = useGameStore((s) => s.lobby?.hostPlayerId)
  const alivePlayers = players.filter((p) => p.alive)
  const deadPlayers = players.filter((p) => !p.alive)

  const emojiOf = (id: number) => avatarById(players, id)
  const nicknameOf = (id: number) => players.find((p) => p.id === id)?.nickname ?? '?'

  async function extend() {
    setBusy('extend')
    try {
      await extendDiscussion(code, session)
    } catch (e) {
      setError({ open: true, title: 'Rasprava nije produžena', text: describeError(e, code) })
    }
    setBusy(null)
  }

  // Glasanje stiže svima događajem i ovaj ekran se zamijeni, pa gumb ostaje zauzet do tada
  async function startVote() {
    setBusy('vote')
    try {
      await startVoting(code, session)
    } catch (e) {
      setError({ open: true, title: 'Glasanje nije pokrenuto', text: describeError(e, code) })
      setBusy(null)
    }
  }

  // Redovi izvještaja kao u prototipu: stradali, pa utišani
  const rows: ReactNode[] = []
  if (game.nightKilledPlayerIds.length === 0) {
    rows.push(
      <ReportRow
        key="none"
        lead={<RoundIcon className="bg-role-doktor/15 text-role-doktor" icon="shield" />}
        title="Nitko nije stradao"
        text="Netko je noćas imao zaštitu."
      />,
    )
  }
  for (const id of game.nightKilledPlayerIds) {
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
  for (const id of silenced) {
    rows.push(
      <ReportRow
        key={`silenced-${id}`}
        lead={<Avatar emoji={emojiOf(id)} hue={playerHue(id)} size={44} muted />}
        title={nicknameOf(id)}
        text="Utišan do kraja dana"
        trail="mute"
      />,
    )
  }

  return (
    <Screen>
      <PhaseHeader icon="sun" title={`Dan ${round}`} role={role} code={code} />
      <ScreenBody withSky>
        {alive && silenced.includes(meId) && (
          <Banner icon="mute" title="Utišan si">
            Danas ne smiješ govoriti ni glasati.
          </Banner>
        )}
        {!alive && (
          <Banner icon="ghost" title="Promatraš igru">
            {fateText(me)}. Ne otkrivaj uloge.
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
                  <Button variant="secondary" size="xs" disabled={busy !== null} onClick={extend}>
                    +30 s
                  </Button>
                  <Button variant="secondary" size="xs" disabled={busy !== null} onClick={startVote}>
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
              const muted = silenced.includes(p.id)
              return (
                <div key={p.id} className="flex items-center gap-3 border-t border-line py-2.5 first:border-t-0">
                  <Avatar emoji={emojiOf(p.id)} hue={playerHue(p.id)} size={40} host={p.id === hostId} muted={muted} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center">
                      <span className="truncate text-[15px] font-semibold">{p.nickname}</span>
                      {p.id === meId && <MeTag />}
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
        {isHost ? (
          <Button disabled={busy !== null} onClick={startVote}>
            <Icon name="vote" size={20} />
            {busy === 'vote' ? 'Pokrećem glasanje…' : 'Pokreni glasanje'}
          </Button>
        ) : (
          <p className="pt-2 pb-1 text-center text-[13px] leading-[1.45] text-muted">
            Glasanje počinje kad domaćin odluči ili istekne vrijeme.
          </p>
        )}
      </ScreenFooter>
      <Toast
        open={error.open}
        onClose={() => setError((e) => ({ ...e, open: false }))}
        duration={4000}
        leading={
          <span className="text-accent">
            <Icon name="info" size={22} />
          </span>
        }
        title={error.title}
        text={error.text}
      />
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
