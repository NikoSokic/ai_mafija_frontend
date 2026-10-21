import { useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useParams } from 'react-router'
import { ApiError, describeError, getGameState, reconnect } from '../api/rest.ts'
import type { GamePhase, LobbyPlayerResponse, LobbyStatus, Winner } from '../api/types.ts'
import Button from '../components/Button.tsx'
import ConnectionToast from '../components/ConnectionToast.tsx'
import DayView from '../components/game/DayView.tsx'
import EndView from '../components/game/EndView.tsx'
import NightView from '../components/game/NightView.tsx'
import PhaseTransition from '../components/game/PhaseTransition.tsx'
import RoleReveal from '../components/game/RoleReveal.tsx'
import VoteView from '../components/game/VoteView.tsx'
import ThemeRoot from '../components/ThemeRoot.tsx'
import { ROLES, type RoleKey } from '../data/roles.ts'
import type { Theme } from '../lib/theme.ts'
import { useLobbySocket } from '../lib/useLobbySocket.ts'
import { useGameStore } from '../store/gameStore.ts'
import { saveFate } from '../store/notes.ts'
import { loadReports, saveReports } from '../store/reports.ts'
import { DEFAULT_ROOM_SETTINGS, loadRoomSettings } from '../store/roomSettings.ts'
import { hasSeenRole, markRoleSeen } from '../store/seenRole.ts'
import { clearSession, loadSession, type Session } from '../store/session.ts'

type View = 'role' | 'night' | 'day' | 'vote' | 'end'

// Što ekran prikazuje; iz toga se računaju tema i naslovi
type Shown = { view: View; round: number; tieBreak: boolean; winner: Winner | null }

// Zadnje poznato javno stanje igre, iz GET /game-state ili iz događaja GAME_STATE_CHANGED
type Snapshot = {
  status: LobbyStatus
  phase: GamePhase | null
  round: number
  winner: Winner | null
  players: LobbyPlayerResponse[]
}

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

const aliveIds = (players: LobbyPlayerResponse[]) => players.filter((p) => p.alive).map((p) => p.id)

const sameShown = (a: Shown, b: Shown) =>
  a.view === b.view && a.round === b.round && a.tieBreak === b.tieBreak && a.winner === b.winner

// GameScreen je jedini koji zna za fazu (spec 11): prema njoj bira podekran
// i pokreće PhaseTransition kad se promijeni noć ↔ dan.
function GameScreen({ code, session }: { code: string; session: Session }) {
  useLobbySocket(code)
  const reduceMotion = useReducedMotion()
  const lobbyError = useGameStore((s) => s.lobbyError)
  const connection = useGameStore((s) => s.connection)
  const publicState = useGameStore((s) => s.publicState)
  const gameState = useGameStore((s) => s.gameState)
  const [snap, setSnap] = useState<Snapshot | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [seen, setSeen] = useState(() => hasSeenRole(code))
  const [shown, setShown] = useState<Shown | null>(null)
  const [transition, setTransition] = useState<{ kind: 'night' | 'day'; title: string } | null>(null)
  // noć ostaje na ekranu dok igrač gleda rezultat istrage / usporedbe
  const [holdNight, setHoldNight] = useState(false)
  // null dok se ne zna (provjera nije gotova ili nije uspjela)
  const [hostFlag, setHostFlag] = useState<boolean | null>(null)
  // runda u kojoj je igrač na ovom uređaju prešao s rasprave na glasanje
  const [voteRound, setVoteRound] = useState<number | null>(null)
  const requestId = useRef(0)

  // Tko je domaćin zna samo reconnect (docs/backend-todo.md)
  useEffect(() => {
    let active = true
    reconnect(session)
      .then((res) => {
        if (active) setHostFlag(res.host)
      })
      .catch(() => {
        // bez odgovora se pogađa iz popisa igrača
      })
    return () => {
      active = false
    }
  }, [session])

  // Privatno stanje (uloga, živ/mrtav…) dolazi samo iz GET-a; zakašnjeli odgovor se odbacuje
  const refresh = useCallback(() => {
    const id = ++requestId.current
    getGameState(code, session)
      .then((state) => {
        if (id !== requestId.current) return
        // Backend ne kaže kako je igrač ispao, pa se to zapamti kad se dogodi:
        // ako je umro dok je bila noć, ubila ga je mafija, inače je izbačen glasanjem
        const prev = useGameStore.getState().gameState
        if (prev?.lobbyCode === code && prev.currentPlayer.alive && !state.currentPlayer.alive) {
          saveFate(code, { how: prev.phase === 'NIGHT' ? 'night' : 'day', round: prev.roundNumber ?? 1 })
        }
        useGameStore.getState().setGameState(state)
        setSnap({
          status: state.lobbyStatus,
          phase: state.phase,
          round: state.roundNumber ?? 1,
          winner: state.winner,
          players: state.players,
        })
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
    if (publicState && publicState.lobbyCode === code) {
      setSnap({
        status: publicState.lobbyStatus,
        phase: publicState.phase,
        round: publicState.roundNumber ?? 1,
        winner: publicState.winner,
        players: publicState.players,
      })
    }
  }
  useEffect(() => {
    if (publicState && publicState.lobbyCode === code) refresh()
  }, [publicState, code, refresh])

  // Izvještaj noći (spec 6.7): backend ne kaže tko je stradao, pa se usporede živi igrači
  // noću i u prvom stanju dana iste runde. Računa se jednom po rundi i sprema, da preživi F5.
  const [nightAlive, setNightAlive] = useState<{ round: number; ids: number[] } | null>(null)
  const [reports, setReports] = useState(() => loadReports(code))
  const [prevSnap, setPrevSnap] = useState(snap)
  if (snap !== prevSnap) {
    setPrevSnap(snap)
    if (snap?.phase === 'NIGHT') {
      setNightAlive({ round: snap.round, ids: aliveIds(snap.players) })
    } else if (snap?.phase === 'DAY' && !reports[snap.round] && nightAlive?.round === snap.round) {
      const alive = new Set(aliveIds(snap.players))
      setReports({ ...reports, [snap.round]: { killed: nightAlive.ids.filter((id) => !alive.has(id)) } })
    }
  }
  useEffect(() => {
    if (Object.keys(reports).length) saveReports(code, reports)
  }, [code, reports])

  // Mjesto za naratora (spec 7): kad se pojavi novi dan, ovdje će se otvoriti NarratorSheet
  // s jutarnjim vijestima iz izvještaja noći. Timer rasprave tada treba stajati dok traje naracija.
  const onPhaseIntro = useCallback(() => {
    // narator još ne postoji
  }, [])

  const roleName = gameState?.currentPlayer.role ?? null
  const role: RoleKey | null = roleName && roleName in ROLES ? (roleName as RoleKey) : null

  const target = useMemo<Shown | null>(() => {
    if (!snap || !snap.phase) return null
    const { phase, round, winner } = snap
    if (phase === 'FINISHED') return { view: 'end', round, tieBreak: false, winner }
    if (!seen) return { view: 'role', round, tieBreak: false, winner: null }
    if (phase === 'NIGHT') return { view: 'night', round, tieBreak: false, winner: null }
    // izjednačenje nema raspravu, odmah se glasa ponovno (spec 6.8)
    if (phase === 'TIE_BREAK') return { view: 'vote', round, tieBreak: true, winner: null }
    return { view: voteRound === round ? 'vote' : 'day', round, tieBreak: false, winner: null }
  }, [snap, seen, voteRound])

  // Callbackovi prijelaza uvijek vide najnoviju metu, ne onu s početka prijelaza
  const targetRef = useRef(target)
  useEffect(() => {
    targetRef.current = target
  })

  // Što je na ekranu mijenja se tek kad nije u tijeku prijelaz i noć ne čeka igrača. Promjena
  // noć ↔ dan (i ulaz u noć nakon uloge) ide kroz PhaseTransition, sve ostalo (npr. dan →
  // glasanje) odmah.
  const waitForNight = holdNight && shown?.view === 'night'
  if (target && !transition && !waitForNight && (!shown || !sameShown(shown, target))) {
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
  if (snap?.status === 'WAITING' || lobbyError) return <Navigate to={`/soba/${code}`} replace />

  const theme: Theme = shown ? themeOf(shown) : 'night'
  const mode = loadRoomSettings(code)?.mode ?? DEFAULT_ROOM_SETTINGS.mode
  // Kao u lobbyju: bez odgovora reconnecta domaćin je igrač s najmanjim id-om (sprema se prvi)
  const firstId = gameState?.players.length ? Math.min(...gameState.players.map((p) => p.id)) : null
  const isHost = hostFlag ?? firstId === session.playerId
  const hostId = isHost ? session.playerId : firstId

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
    if (gameState) {
      content = (
        <DayView
          key={shown.round}
          code={code}
          round={shown.round}
          role={role}
          mode={mode}
          state={gameState}
          isHost={isHost}
          hostId={hostId}
          report={reports[shown.round] ?? null}
          onPhaseIntro={onPhaseIntro}
          onStartVote={() => setVoteRound(shown.round)}
        />
      )
    }
  } else if (shown?.view === 'vote') {
    content = <VoteView code={code} tieBreak={shown.tieBreak} role={role} />
  } else if (shown?.view === 'end') {
    content = <EndView winner={shown.winner} />
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
