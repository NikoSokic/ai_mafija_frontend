import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { describeError, resolveVote, submitVote } from '../../api/rest.ts'
import type { PublicGameStateResponse, PublicVotingResponse } from '../../api/types.ts'
import { DEFAULT_EMOJI } from '../../data/emojis.ts'
import type { RoleKey } from '../../data/roles.ts'
import { cx } from '../../lib/cx.ts'
import { riseItem } from '../../lib/motion.ts'
import { playerEmoji, playerHue } from '../../lib/playerLook.ts'
import { formatSeconds } from '../../lib/time.ts'
import { useCountdown } from '../../lib/useCountdown.ts'
import { useGameStore } from '../../store/gameStore.ts'
import { loadProfile } from '../../store/profile.ts'
import type { Session } from '../../store/session.ts'
import Avatar from '../Avatar.tsx'
import Banner from '../Banner.tsx'
import Button from '../Button.tsx'
import Chip from '../Chip.tsx'
import HoldButton from '../HoldButton.tsx'
import { Icon } from '../icons.tsx'
import { Screen, ScreenBody, ScreenFooter } from '../Screen.tsx'
import Skyline from '../Skyline.tsx'
import Toast from '../Toast.tsx'
import VoteCard from '../VoteCard.tsx'
import HostConfirmSheet from './HostConfirmSheet.tsx'
import PhaseHeader from './PhaseHeader.tsx'

// Glasanje traje 60 s (docs/pravila-igre.md); rok broji server
const VOTING_S = 60
// prozor izbačenog igrača gasi se malo nakon što se otvori overlay (kao u prototipu)
const WINDOW_OFF_MS = 600

const NO_VOTING: PublicVotingResponse = { eligibleVoterIds: [], votes: [], tiedPlayerIds: [] }

/** Odabir ili poslani glas; target null = "Suzdržan" */
type Choice = { target: number | null }

// tekst ostaje i nakon zatvaranja, da toast ne ostane prazan dok izlazi
type ErrorToast = { open: boolean; title: string; text: string }

type VoteViewProps = {
  code: string
  round: number
  role: RoleKey | null
  session: Session
  /** javno stanje igre; glasovi su javni i stižu uživo */
  game: PublicGameStateResponse
  /** ponovno glasanje samo između izjednačenih */
  tieBreak: boolean
  isHost: boolean
  /** igrač koji upravo ispada – njegov prozor u gradu zatreperi i ugasi se */
  eliminatingId: number | null
}

// "Lea, Ivo i Ana"
function joinNames(names: string[]) {
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} i ${names[names.length - 1]}`
}

// Glasanje (spec 6.8): glasovi uživo, odabir pa HoldButton. Glas je konačan.
// Kad je glasanje obrađeno, igra odmah ide dalje, a ovaj ekran ostaje ispod overlaya izbacivanja:
// zato prikazuje zadnje stanje dok je glasanje bilo otvoreno, a samo grad prati svježe stanje.
export default function VoteView({ code, round, role, session, game, tieBreak, isHost, eliminatingId }: VoteViewProps) {
  const [myEmoji] = useState(() => loadProfile()?.emoji || DEFAULT_EMOJI)
  const [shownGame, setShownGame] = useState(game)
  if (game.voting && game !== shownGame) setShownGame(game)
  const closed = game.voting === null
  const voting = shownGame.voting ?? NO_VOTING
  const timer = useCountdown(shownGame.phaseEndsAt, VOTING_S)

  const [choice, setChoice] = useState<Choice | null>(null)
  // glas je spremljen, a javno stanje s njim još nije stiglo
  const [sent, setSent] = useState<Choice | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<ErrorToast>({ open: false, title: '', text: '' })
  const [endOpen, setEndOpen] = useState(false)
  const [ending, setEnding] = useState(false)
  const [dimmedId, setDimmedId] = useState<number | null>(null)

  useEffect(() => {
    if (eliminatingId === null) return
    const t = window.setTimeout(() => setDimmedId(eliminatingId), WINDOW_OFF_MS)
    return () => clearTimeout(t)
  }, [eliminatingId])

  const meId = session.playerId
  const players = useMemo(() => [...shownGame.players].sort((a, b) => a.id - b.id), [shownGame.players])
  const livePlayers = useMemo(() => [...game.players].sort((a, b) => a.id - b.id), [game.players])
  const me = players.find((p) => p.id === meId)
  const hostId = players.find((p) => p.host)?.id
  const silenced = shownGame.silencedPlayerIds
  const tied = voting.tiedPlayerIds

  const emojiOf = (id: number) => (id === meId ? myEmoji : playerEmoji(id))
  const nicknameOf = (id: number) => players.find((p) => p.id === id)?.nickname ?? '?'
  const choiceName = (c: Choice) => (c.target === null ? 'Suzdržan' : nicknameOf(c.target))

  // Kartice: svi živi (u ponovnom glasanju samo izjednačeni), i ti – drugi vide glasove protiv tebe
  const candidates = players.filter((p) => p.alive && (!tieBreak || tied.includes(p.id)))
  const voterIds = voting.eligibleVoterIds
  // broje se samo glasovi onih koji smiju glasati, kao na backendu (npr. bez igrača koji je otišao)
  const votes = voting.votes.filter((v) => voterIds.includes(v.voterPlayerId))
  const votedIds = new Set(votes.map((v) => v.voterPlayerId))
  const mine = votes.find((v) => v.voterPlayerId === meId)
  const myVote: Choice | null = mine ? { target: mine.targetPlayerId } : sent
  const canVote = !closed && voterIds.includes(meId) && myVote === null
  const shownChoice = myVote ?? choice

  const countOf = (target: number | null) => votes.filter((v) => v.targetPlayerId === target).length
  const top = Math.max(0, ...candidates.map((p) => countOf(p.id)), tieBreak ? 0 : countOf(null))
  const votersFor = (target: number | null) =>
    votes
      .filter((v) => v.targetPlayerId === target)
      .map((v) => ({ id: v.voterPlayerId, emoji: emojiOf(v.voterPlayerId) }))

  function toggle(target: number | null) {
    if (!canVote) return
    setChoice(choice?.target === target ? null : { target })
  }

  async function confirm() {
    if (!canVote || !choice || sending) return
    setSending(true)
    try {
      const response = await submitVote(session, choice.target)
      setSent(choice)
      // zadnji glas je odmah obradio glasanje; isti ishod stiže svima i događajem VOTE_RESOLVED
      if (response.resolveResult) useGameStore.getState().voteResolved(response.resolveResult)
    } catch (e) {
      setError({ open: true, title: 'Glas nije poslan', text: describeError(e, code) })
    }
    setSending(false)
  }

  async function endVoting() {
    setEnding(true)
    try {
      useGameStore.getState().voteResolved(await resolveVote(code, session))
    } catch (e) {
      setError({ open: true, title: 'Glasanje nije završeno', text: describeError(e, code) })
    }
    setEnding(false)
    setEndOpen(false)
  }

  const title = tieBreak ? 'Ponovno glasanje' : 'Glasanje'
  const alive = me?.alive ?? false

  return (
    <Screen>
      <PhaseHeader
        icon="vote"
        title={title}
        role={role}
        code={code}
        aside={<Chip className="mr-1.5">Dan {round}</Chip>}
      />
      <ScreenBody withSky>
        {tieBreak && (
          <Banner icon="vote" title="Izjednačeno">
            {joinNames(tied.map(nicknameOf))} imaju isti broj glasova. Glasaj ponovno samo između njih.
            {tied.includes(meId) && ' Ti si u izjednačenju pa ovaj put ne glasaš.'}
          </Banner>
        )}
        {!alive && (
          <Banner icon="ghost" title="Promatraš glasanje">
            Ispali igrači ne glasaju.
          </Banner>
        )}
        {alive && silenced.includes(meId) && (
          <Banner icon="mute" title="Utišan si">
            Danas ne smiješ glasati.
          </Banner>
        )}

        <motion.div variants={riseItem} className="mb-3 flex items-center justify-between gap-3 text-sm text-muted">
          <span className="tabular-nums">
            Glasalo {votes.length} od {voterIds.length} · {formatSeconds(timer.left)}
          </span>
          <span aria-hidden="true" className="flex gap-[5px]">
            {voterIds.map((id) => (
              <i
                key={id}
                className={cx(
                  'size-[7px] rounded-full [transition:background-color_.3s]',
                  votedIds.has(id) ? 'bg-accent' : 'bg-line',
                )}
              />
            ))}
          </span>
        </motion.div>

        <motion.div variants={riseItem} className="grid grid-cols-2 gap-2.5">
          {candidates.map((p) => {
            const isMe = p.id === meId
            const selected = shownChoice?.target === p.id
            const count = countOf(p.id)
            return (
              <VoteCard
                key={p.id}
                name={isMe ? 'Ti' : p.nickname}
                face={
                  <Avatar
                    emoji={emojiOf(p.id)}
                    hue={playerHue(p.id)}
                    size={56}
                    host={p.id === hostId}
                    muted={silenced.includes(p.id)}
                    selected={selected}
                  />
                }
                count={count}
                leading={count > 0 && count === top}
                share={voterIds.length ? count / voterIds.length : 0}
                voters={votersFor(p.id)}
                selected={selected}
                disabled={!canVote || isMe}
                onSelect={() => toggle(p.id)}
              />
            )
          })}
          {!tieBreak && (
            <VoteCard
              name="Suzdržan"
              face={<AbstainFace selected={shownChoice !== null && shownChoice.target === null} />}
              count={countOf(null)}
              leading={countOf(null) > 0 && countOf(null) === top}
              share={voterIds.length ? countOf(null) / voterIds.length : 0}
              voters={votersFor(null)}
              selected={shownChoice !== null && shownChoice.target === null}
              disabled={!canVote}
              onSelect={() => toggle(null)}
            />
          )}
        </motion.div>
      </ScreenBody>
      <Skyline
        players={livePlayers}
        stateOf={(p) => ((p.id === eliminatingId && dimmedId !== eliminatingId) || p.alive ? 'on' : 'off')}
      />
      <ScreenFooter rise className="bg-sky">
        {canVote ? (
          <>
            <div aria-live="polite" className="mb-0.5 flex min-h-6 items-center gap-2.5 text-[15px] text-muted">
              {choice ? (
                <span>
                  Tvoj glas: <b className="font-semibold text-text">{choiceName(choice)}</b>
                </span>
              ) : (
                'Dodirni igrača kojeg želiš izbaciti'
              )}
            </div>
            <HoldButton disabled={!choice || sending} onConfirm={confirm}>
              {sending ? 'Šaljem…' : 'Drži za glasanje'}
            </HoldButton>
          </>
        ) : (
          <div aria-live="polite" className="flex min-h-6 items-center justify-center text-[15px] text-muted">
            {myVote ? 'Tvoj glas je zabilježen. Čekamo ostale.' : 'Čekamo glasove ostalih.'}
          </div>
        )}
        {isHost && !closed && (
          // osigurač ako netko ne glasa (npr. prekid veze) – samo domaćin, uz potvrdu
          <Button variant="ghost" size="sm" className="self-center" onClick={() => setEndOpen(true)}>
            Završi glasanje
          </Button>
        )}
      </ScreenFooter>
      <HostConfirmSheet
        open={endOpen && !closed}
        title="Završiti glasanje?"
        subtitle={
          tieBreak
            ? 'Tko još nije glasao, ostaje bez glasa. Koristi ovo ako netko ne može glasati, npr. zbog prekida veze.'
            : 'Tko još nije glasao, računa se kao suzdržan. Koristi ovo ako netko ne može glasati, npr. zbog prekida veze.'
        }
        confirmLabel="Završi glasanje"
        sendingLabel="Završavam glasanje…"
        sending={ending}
        onClose={() => setEndOpen(false)}
        onConfirm={endVoting}
      />
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

// Krug umjesto avatara na kartici "Suzdržan"; odabran ima isti prsten kao Avatar
function AbstainFace({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'grid size-14 place-items-center rounded-full bg-surface-2 text-muted',
        '[transition:box-shadow_.25s,scale_.25s_cubic-bezier(.34,1.56,.64,1)]',
        selected && 'scale-[1.04] shadow-[0_0_0_3px_var(--bg),0_0_0_5.5px_var(--accent)]',
      )}
    >
      <Icon name="minus" size={26} />
    </span>
  )
}
