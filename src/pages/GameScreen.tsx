import { AnimatePresence, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useParams } from 'react-router'
import { ApiError, describeError, getGameState } from '../api/rest.ts'
import type { GameStateResponse, PublicGameStateResponse, ResolveVoteResponse, Winner } from '../api/types.ts'
import Button from '../components/Button.tsx'
import ConnectionToast from '../components/ConnectionToast.tsx'
import DayView from '../components/game/DayView.tsx'
import EliminationOverlay from '../components/game/EliminationOverlay.tsx'
import EndView from '../components/game/EndView.tsx'
import NightView from '../components/game/NightView.tsx'
import PhaseTransition from '../components/game/PhaseTransition.tsx'
import RoleReveal from '../components/game/RoleReveal.tsx'
import VoteView from '../components/game/VoteView.tsx'
import { Icon } from '../components/icons.tsx'
import ThemeRoot from '../components/ThemeRoot.tsx'
import Toast from '../components/Toast.tsx'
import { DEFAULT_EMOJI } from '../data/emojis.ts'
import { ROLES, type RoleKey } from '../data/roles.ts'
import { playerEmoji } from '../lib/playerLook.ts'
import type { Theme } from '../lib/theme.ts'
import { useLobbySocket } from '../lib/useLobbySocket.ts'
import { useGameStore } from '../store/gameStore.ts'
import { loadProfile } from '../store/profile.ts'
import { DEFAULT_ROOM_SETTINGS, loadRoomSettings } from '../store/roomSettings.ts'
import { hasSeenRole, markRoleSeen } from '../store/seenRole.ts'
import { clearSession, loadSession, type Session } from '../store/session.ts'

type View = 'role' | 'night' | 'day' | 'vote' | 'end'

// Što ekran prikazuje; iz toga se računaju tema i naslovi
type Shown = { view: View; round: number; tieBreak: boolean; winner: Winner | null }

// Ishod glasanja koji igrači vide prije noći: izbacivanje (overlay) ili "nitko ne odlazi" (toast).
// Izjednačenje nema ishod – odmah se glasa ponovno.
type Outcome = { kind: 'eliminated'; playerId: number } | { kind: 'none'; title: string; text: string }

// tekst ostaje i nakon zatvaranja, da toast ne ostane prazan dok izlazi
type ToastState = { open: boolean; title: string; text: string }

export default function GameScreenPage() {
  const code = (useParams().code ?? '').toUpperCase()
  const [session] = useState(() => {
    const s = loadSession()
    return s?.lobbyCode === code ? s : null
  })
  // Bez sesije za ovu sobu lobby prikaže ulazak ili "Igra u toj sobi je već počela."
  if (!session) return <Navigate to={`/soba/${code}`} replace />
  return <GameScreen key={code} code={code} session={session} />
}

// Dan i glasanje imaju isto nebo, pa između njih nema prijelaza
const daylight = (view: View) => view === 'day' || view === 'vote'

const themeOf = (s: Shown): Theme =>
  daylight(s.view) || (s.view === 'end' && s.winner === 'CITIZENS_WIN') ? 'day' : 'night'

const sameShown = (a: Shown, b: Shown) =>
  a.view === b.view && a.round === b.round && a.tieBreak === b.tieBreak && a.winner === b.winner

// GET /game-state nosi i sve javno, pa se svodi na isti oblik kao stanje iz događaja
function publicOf(state: GameStateResponse): PublicGameStateResponse {
  const { voting } = state
  return {
    lobbyCode: state.lobbyCode,
    lobbyStatus: state.lobbyStatus,
    phase: state.phase,
    roundNumber: state.roundNumber,
    players: state.players,
    gameFinished: state.gameFinished,
    winner: state.winner,
    votingOpen: voting.votingOpen,
    tiedPlayerIds: voting.tiedPlayerIds,
    phaseEndsAt: state.phaseEndsAt,
    serverTime: state.serverTime,
    silencedPlayerIds: state.silencedPlayerIds,
    nightKilledPlayerIds: state.nightKilledPlayerIds,
    voting: voting.votingOpen
      ? { eligibleVoterIds: voting.eligibleVoterIds, votes: voting.votes, tiedPlayerIds: voting.tiedPlayerIds }
      : null,
  }
}

function outcomeOf(r: ResolveVoteResponse): Outcome | null {
  if (r.eliminatedPlayerId !== null) return { kind: 'eliminated', playerId: r.eliminatedPlayerId }
  if (r.result !== 'NO_ELIMINATION') return null
  // ponovno glasanje nema suzdržanih (abstainCount null)
  if (r.abstainCount === null) return { kind: 'none', title: 'Opet izjednačeno', text: 'Danas nitko ne odlazi.' }
  if (r.tiedPlayerIds.length) {
    return { kind: 'none', title: 'Izjednačeno', text: 'Nema tko glasati ponovno, pa danas nitko ne odlazi.' }
  }
  if (!r.voteCounts.length) {
    return { kind: 'none', title: 'Danas nitko ne odlazi', text: 'Nitko nije glasao ni za jednog igrača.' }
  }
  return { kind: 'none', title: 'Danas nitko ne odlazi', text: 'Suzdržanih je bilo barem koliko i glasova za vodećeg.' }
}

// GameScreen je jedini koji zna za fazu (spec 11): prema njoj bira podekran
// i pokreće PhaseTransition kad se promijeni noć ↔ dan.
function GameScreen({ code, session }: { code: string; session: Session }) {
  useLobbySocket(code)
  const reduceMotion = useReducedMotion()
  const lobbyError = useGameStore((s) => s.lobbyError)
  const connection = useGameStore((s) => s.connection)
  const publicState = useGameStore((s) => s.publicState)
  const gameState = useGameStore((s) => s.gameState)
  const voteResult = useGameStore((s) => s.voteResult)
  const [myEmoji] = useState(() => loadProfile()?.emoji || DEFAULT_EMOJI)
  // zadnje poznato javno stanje igre, iz GET /game-state ili iz događaja GAME_STATE_CHANGED
  const [snap, setSnap] = useState<PublicGameStateResponse | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [seen, setSeen] = useState(() => hasSeenRole(code))
  const [shown, setShown] = useState<Shown | null>(null)
  const [transition, setTransition] = useState<{ kind: 'night' | 'day'; title: string } | null>(null)
  // noć ostaje na ekranu dok igrač gleda rezultat istrage / usporedbe
  const [holdNight, setHoldNight] = useState(false)
  // glasanje ostaje na ekranu dok traje ishod (overlay izbacivanja ili toast)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [toast, setToast] = useState<ToastState>({ open: false, title: '', text: '' })
  const requestId = useRef(0)

  // Privatno stanje (uloga, potez…) dolazi samo iz GET-a; zakašnjeli odgovor se odbacuje
  const refresh = useCallback(() => {
    const id = ++requestId.current
    getGameState(code, session)
      .then((state) => {
        if (id !== requestId.current) return
        useGameStore.getState().setGameState(state)
        setSnap(publicOf(state))
        setLoadError(null)
      })
      .catch((e: unknown) => {
        if (id !== requestId.current) return
        if (e instanceof ApiError && e.status === 401) clearSession()
        setLoadError(describeError(e, code))
      })
  }, [code, session])

  // pri ulasku i nakon svakog (ponovnog) spajanja, jer su se događaji mogli propustiti
  useEffect(() => {
    if (connection === 'connected') refresh()
  }, [connection, refresh])
  useEffect(() => {
    refresh()
  }, [refresh])

  // GAME_STATE_CHANGED: javni dio odmah iz događaja (prilagodba tijekom rendera), privatni ponovnim GET-om
  const [prevPublic, setPrevPublic] = useState(publicState)
  if (publicState !== prevPublic) {
    setPrevPublic(publicState)
    if (publicState && publicState.lobbyCode === code) setSnap(publicState)
  }
  useEffect(() => {
    if (publicState && publicState.lobbyCode === code) refresh()
  }, [publicState, code, refresh])

  // VOTE_RESOLVED (ili odgovor na zadnji glas): ishod se pokaže samo igraču koji gleda dan.
  // Lokalna varijabla jer setOutcome vrijedi tek u idućem renderu, a o njoj ovisi i zadržavanje ekrana.
  let currentOutcome = outcome
  const [prevVoteResult, setPrevVoteResult] = useState(voteResult)
  if (voteResult !== prevVoteResult) {
    setPrevVoteResult(voteResult)
    const next = voteResult && shown && daylight(shown.view) ? outcomeOf(voteResult) : null
    if (next) {
      currentOutcome = next
      setOutcome(next)
      if (next.kind === 'none') setToast({ open: true, title: next.title, text: next.text })
    }
  }

  // Mjesto za naratora (spec 7): kad se pojavi novi dan, ovdje će se otvoriti NarratorSheet
  // s jutarnjim vijestima iz izvještaja noći. Timer rasprave tada treba stajati dok traje naracija.
  const onPhaseIntro = useCallback(() => {
    // narator još ne postoji
  }, [])

  const roleName = gameState?.currentPlayer.role ?? null
  const role: RoleKey | null = roleName && roleName in ROLES ? (roleName as RoleKey) : null

  const target = useMemo<Shown | null>(() => {
    if (!snap || !snap.phase) return null
    const { phase, winner } = snap
    const round = snap.roundNumber ?? 1
    if (phase === 'FINISHED') return { view: 'end', round, tieBreak: false, winner }
    if (!seen) return { view: 'role', round, tieBreak: false, winner: null }
    if (phase === 'NIGHT') return { view: 'night', round, tieBreak: false, winner: null }
    if (phase === 'DAY') return { view: 'day', round, tieBreak: false, winner: null }
    // izjednačenje nema raspravu, odmah se glasa ponovno (spec 6.8)
    return { view: 'vote', round, tieBreak: phase === 'TIE_BREAK', winner: null }
  }, [snap, seen])

  // Callbackovi prijelaza uvijek vide najnoviju metu, ne onu s početka prijelaza
  const targetRef = useRef(target)
  useEffect(() => {
    targetRef.current = target
  })

  // Što je na ekranu mijenja se tek kad nije u tijeku prijelaz i ekran ne čeka igrača (rezultat
  // istrage noću, ishod glasanja danju). Promjena noć ↔ dan (i ulaz u noć nakon uloge) ide kroz
  // PhaseTransition, sve ostalo (npr. dan → glasanje) odmah.
  const waitForNight = holdNight && shown?.view === 'night'
  const waitForVote = currentOutcome !== null && !!shown && daylight(shown.view)
  if (target && !transition && !waitForNight && !waitForVote && (!shown || !sameShown(shown, target))) {
    const changesSky =
      shown &&
      target.view !== 'end' &&
      shown.view !== target.view &&
      !(daylight(shown.view) && daylight(target.view))
    if (!changesSky || reduceMotion) {
      setShown(target)
    } else {
      const kind = daylight(target.view) ? 'day' : 'night'
      setTransition({ kind, title: `${kind === 'day' ? 'Dan' : 'Noć'} ${target.round}` })
    }
  }

  function handleReady() {
    markRoleSeen(code)
    setSeen(true)
  }

  // Igra još nije počela ili soba ne postoji – to pokazuje lobby
  if (snap?.lobbyStatus === 'WAITING' || lobbyError) return <Navigate to={`/soba/${code}`} replace />

  const theme: Theme = shown ? themeOf(shown) : 'night'
  const mode = loadRoomSettings(code)?.mode ?? DEFAULT_ROOM_SETTINGS.mode
  const isHost = snap?.players.some((p) => p.id === session.playerId && p.host) ?? false
  const eliminated =
    currentOutcome?.kind === 'eliminated' ? snap?.players.find((p) => p.id === currentOutcome.playerId) : undefined

  let content = null
  if (shown?.view === 'role') {
    // uloga dolazi iz GET-a; bez nje se kartica ne prikazuje
    if (role) content = <RoleReveal role={role} mode={mode} onReady={handleReady} />
  } else if (shown?.view === 'night') {
    if (gameState) {
      content = (
        <NightView
          key={shown.round}
          code={code}
          round={shown.round}
          role={role}
          mode={mode}
          session={session}
          state={gameState}
          isHost={isHost}
          onRefresh={refresh}
          onHoldChange={setHoldNight}
        />
      )
    }
  } else if (shown?.view === 'day') {
    if (snap) {
      content = (
        <DayView
          key={shown.round}
          code={code}
          round={shown.round}
          role={role}
          mode={mode}
          session={session}
          game={snap}
          isHost={isHost}
          onPhaseIntro={onPhaseIntro}
        />
      )
    }
  } else if (shown?.view === 'vote') {
    if (snap) {
      content = (
        <VoteView
          key={`${shown.round}-${shown.tieBreak}`}
          code={code}
          round={shown.round}
          role={role}
          session={session}
          game={snap}
          tieBreak={shown.tieBreak}
          isHost={isHost}
          eliminatingId={eliminated?.id ?? null}
        />
      )
    }
  } else if (shown?.view === 'end') {
    if (snap) {
      content = (
        <EndView
          code={code}
          session={session}
          players={snap.players}
          winner={shown.winner}
          round={shown.round}
          myRole={role}
          isHost={isHost}
        />
      )
    }
  }

  return (
    <ThemeRoot theme={theme}>
      {content}
      {!content && loadError && (
        <main className="mx-auto flex min-h-dvh max-w-[420px] flex-col items-center justify-center gap-4 p-5 text-center">
          <p className="text-muted">{loadError}</p>
          <Button variant="secondary" onClick={refresh}>
            Pokušaj ponovno
          </Button>
        </main>
      )}
      <AnimatePresence>
        {eliminated && (
          <EliminationOverlay
            key={eliminated.id}
            playerId={eliminated.id}
            nickname={eliminated.nickname}
            emoji={eliminated.id === session.playerId ? myEmoji : playerEmoji(eliminated.id)}
            isMe={eliminated.id === session.playerId}
            onNext={() => setOutcome(null)}
          />
        )}
      </AnimatePresence>
      <Toast
        open={toast.open}
        onClose={() => {
          setToast((t) => ({ ...t, open: false }))
          setOutcome(null)
        }}
        duration={3500}
        leading={
          <span className="text-accent">
            <Icon name="vote" size={22} />
          </span>
        }
        title={toast.title}
        text={toast.text}
      />
      {transition && (
        <PhaseTransition
          kind={transition.kind}
          title={transition.title}
          subtitle={transition.kind === 'day' ? 'Sunce izlazi' : 'Grad tone u san'}
          onSwap={() => {
            if (targetRef.current) setShown(targetRef.current)
          }}
          onDone={() => setTransition(null)}
        />
      )}
      <ConnectionToast />
    </ThemeRoot>
  )
}
