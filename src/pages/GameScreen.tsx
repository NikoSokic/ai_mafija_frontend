import { useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useParams } from 'react-router'
import { ApiError, describeError, getGameState } from '../api/rest.ts'
import type { GamePhase, LobbyStatus, Winner } from '../api/types.ts'
import Button from '../components/Button.tsx'
import ConnectionToast from '../components/ConnectionToast.tsx'
import DayView from '../components/game/DayView.tsx'
import EndView from '../components/game/EndView.tsx'
import NightView from '../components/game/NightView.tsx'
import PhaseTransition from '../components/game/PhaseTransition.tsx'
import RoleReveal from '../components/game/RoleReveal.tsx'
import ThemeRoot from '../components/ThemeRoot.tsx'
import { ROLES, type RoleKey } from '../data/roles.ts'
import type { Theme } from '../lib/theme.ts'
import { useLobbySocket } from '../lib/useLobbySocket.ts'
import { useGameStore } from '../store/gameStore.ts'
import { DEFAULT_ROOM_SETTINGS, loadRoomSettings } from '../store/roomSettings.ts'
import { hasSeenRole, markRoleSeen } from '../store/seenRole.ts'
import { clearSession, loadSession, type Session } from '../store/session.ts'

type View = 'role' | 'night' | 'day' | 'end'

// Što ekran prikazuje; iz toga se računaju tema i naslovi
type Shown = { view: View; round: number; tieBreak: boolean; winner: Winner | null }

// Zadnje poznato javno stanje igre, iz GET /game-state ili iz događaja GAME_STATE_CHANGED
type Snapshot = {
  status: LobbyStatus
  phase: GamePhase | null
  round: number
  winner: Winner | null
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

const themeOf = (s: Shown): Theme =>
  s.view === 'day' || (s.view === 'end' && s.winner === 'CITIZENS_WIN') ? 'day' : 'night'

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
  const requestId = useRef(0)

  // Privatno stanje (uloga, živ/mrtav…) dolazi samo iz GET-a; zakašnjeli odgovor se odbacuje
  const refresh = useCallback(() => {
    const id = ++requestId.current
    getGameState(code, session)
      .then((state) => {
        if (id !== requestId.current) return
        useGameStore.getState().setGameState(state)
        setSnap({
          status: state.lobbyStatus,
          phase: state.phase,
          round: state.roundNumber ?? 1,
          winner: state.winner,
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
      })
    }
  }
  useEffect(() => {
    if (publicState && publicState.lobbyCode === code) refresh()
  }, [publicState, code, refresh])

  const roleName = gameState?.currentPlayer.role ?? null
  const role: RoleKey | null = roleName && roleName in ROLES ? (roleName as RoleKey) : null

  const target = useMemo<Shown | null>(() => {
    if (!snap || !snap.phase) return null
    const { phase, round, winner } = snap
    if (phase === 'FINISHED') return { view: 'end', round, tieBreak: false, winner }
    if (!seen) return { view: 'role', round, tieBreak: false, winner: null }
    const view = phase === 'NIGHT' ? 'night' : 'day'
    return { view, round, tieBreak: phase === 'TIE_BREAK', winner: null }
  }, [snap, seen])

  // Callbackovi prijelaza uvijek vide najnoviju metu, ne onu s početka prijelaza
  const targetRef = useRef(target)
  useEffect(() => {
    targetRef.current = target
  })

  // Što je na ekranu mijenja se tek kad nije u tijeku prijelaz. Promjena noć ↔ dan (i ulaz u noć
  // nakon uloge) ide kroz PhaseTransition, sve ostalo odmah.
  if (target && !transition && (!shown || !sameShown(shown, target))) {
    const changesSky = shown && shown.view !== target.view && target.view !== 'end'
    if (!changesSky || reduceMotion) {
      setShown(target)
    } else {
      const kind = target.view === 'day' ? 'day' : 'night'
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

  let content = null
  if (shown?.view === 'role') {
    // uloga dolazi iz GET-a; bez nje se kartica ne prikazuje
    if (role) content = <RoleReveal role={role} mode={mode} onReady={handleReady} />
  } else if (shown?.view === 'night') {
    content = <NightView round={shown.round} role={role} />
  } else if (shown?.view === 'day') {
    content = <DayView round={shown.round} tieBreak={shown.tieBreak} role={role} />
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
