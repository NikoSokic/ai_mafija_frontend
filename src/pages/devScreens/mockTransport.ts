import { setDevFetch } from '../../api/rest.ts'
import type {
  ActionResponse,
  HeartbeatResponse,
  PlayerReadyResponse,
  ReconnectResponse,
  VoteResponse,
} from '../../api/types.ts'
import { setDevSubscribe } from '../../lib/stomp.ts'
import { CODE, publicLobbies, ROLES_LIST, type Scenario } from './fixtures.ts'

// Lažni backend za /dev/screens: REST odgovara iz scenarija, STOMP je odmah spojen i ne šalje događaje.
// Ide kroz pravi rest.ts, gameStore i useLobbySocket, pa ekran dobije podatke istim putem kao u igri.

const json = (body: unknown, status = 200) =>
  Promise.resolve(
    new Response(body === undefined ? '' : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )

export function installMockTransport(scenario: Scenario, now: number) {
  const fake: typeof fetch = (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
    const method = (init?.method ?? 'GET').toUpperCase()
    const path = url.pathname
    const lobbyPath = `/api/lobbies/${CODE}`

    if (path === '/api/health') return scenario.healthDown ? json({ status: 'DOWN' }, 503) : json({ status: 'UP' })
    if (path === '/api/roles') return json(ROLES_LIST)
    if (path === '/api/lobbies' && url.searchParams.get('public') === 'true') return json(scenario.rooms ?? publicLobbies(now))
    if (path === lobbyPath && method === 'GET') return scenario.lobby ? json(scenario.lobby) : json({ code: 'LOBBY_NOT_FOUND' }, 404)
    if (path === `${lobbyPath}/game-state`) return scenario.game ? json(scenario.game) : json({ code: 'GAME_NOT_STARTED' }, 409)
    if (path === '/api/players/heartbeat') {
      const res: HeartbeatResponse = { hostPlayerId: 1, awayPlayerIds: scenario.away ?? [], reclaimRequests: [] }
      return json(res)
    }
    if (path === '/api/players/reconnect') {
      const me = scenario.me ?? 0
      const player = scenario.lobby?.players.find((p) => p.id === me)
      const res: ReconnectResponse = {
        valid: !!player,
        playerId: me,
        nickname: player?.nickname ?? '',
        alive: player?.alive ?? false,
        host: player?.host ?? false,
        lobbyId: 1,
        lobbyCode: CODE,
        lobbyStatus: scenario.lobby?.status ?? 'WAITING',
        roleName: scenario.game?.currentPlayer.role ?? null,
        phase: scenario.game?.phase ?? null,
        roundNumber: scenario.game?.roundNumber ?? null,
        currentTurnRole: scenario.game?.currentTurnRole ?? null,
        canAct: scenario.game?.currentPlayer.canAct ?? false,
        hasActed: scenario.game?.currentPlayer.hasActed ?? false,
        availableActions: scenario.game?.currentPlayer.availableActions ?? [],
      }
      return json(res)
    }
    // Potezi, glasovi i naredbe domaćina: prihvaćeni, ali stanje igre se ne mijenja.
    // Zapis u konzoli pokazuje što je ekran poslao.
    if (method === 'POST') {
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {}
      console.info(`[dev] POST ${path}`, body)
      if (path === '/api/actions') {
        const res: ActionResponse = {
          actionId: 1,
          actionType: body.actionType as ActionResponse['actionType'],
          playerId: Number(body.playerId),
          targetPlayerId: Number(body.targetPlayerId),
          message: '',
          investigationResult: body.actionType === 'INVESTIGATE' ? 'NOT_MAFIA' : null,
          journalistResult: body.actionType === 'COMPARE' ? 'ISTI_TIM' : null,
          nightResolved: false,
          resolveResult: null,
        }
        return json(res)
      }
      if (path === '/api/votes') {
        const res: VoteResponse = {
          voteId: 1,
          voterPlayerId: Number(body.voterPlayerId),
          targetPlayerId: body.targetPlayerId === null ? null : Number(body.targetPlayerId),
          message: '',
          votingResolved: false,
          resolveResult: null,
        }
        return json(res)
      }
      if (path === `${lobbyPath}/ready`) {
        const res: PlayerReadyResponse = { playerId: Number(body.playerId), readyCount: 3, readyTotal: 8 }
        return json(res)
      }
      return json(undefined)
    }
    return json({ code: 'NOT_FOUND', message: `dev: nema lažnog odgovora za ${path}` }, 404)
  }

  setDevFetch(fake)
  setDevSubscribe((_code, listener) => {
    listener.onStatus('connected')
    return () => {}
  })
}
