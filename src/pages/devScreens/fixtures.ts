import type {
  AvailableActionResponse,
  EliminatedHow,
  GamePhase,
  GameStateResponse,
  LobbyDetailsResponse,
  LobbyMode,
  LobbyPlayerResponse,
  MafiaRunoffResponse,
  PublicLobbyResponse,
  Role,
  TeamTargetResponse,
  VoteEntryResponse,
  Winner,
} from '../../api/types.ts'
import type { RoleKey } from '../../data/roles.ts'
import type { Profile } from '../../store/profile.ts'

// Izmišljeni podaci za /dev/screens, u istom obliku kao odgovori backenda (api/types.ts).
// Vremena se računaju od `now`, pa uz fiksni sat (scripts/mobile-snapshots.mjs) svaki snimak izgleda isto.

export const SCREENS = [
  'home',
  'home-resume',
  'home-waking',
  'create',
  'rooms',
  'rooms-empty',
  'rooms-many',
  'lobby-host',
  'lobby-guest',
  'lobby-full',
  'lobby-host-away',
  'lobby-kicked',
  'role-live',
  'role-online',
  'night-my-turn',
  'night-sleep',
  'night-mafia',
  'night-mafia-runoff',
  'night-sent',
  'night-spectator',
  'day',
  'day-silenced',
  'day-online',
  'vote',
  'vote-tie',
  'end-mafia',
  'end-citizens',
  'end-guest',
  'spectator',
  'narrator',
] as const

export type ScreenName = (typeof SCREENS)[number]

export const isScreen = (name: string | null): name is ScreenName =>
  name !== null && (SCREENS as readonly string[]).includes(name)

export const CODE = 'DEMO42'

// Testni igrači iz prototipa; id je redoslijed ulaska (o njemu ovise prozori u gradu)
const PEOPLE: { id: number; nickname: string; emoji: string; role: RoleKey }[] = [
  { id: 1, nickname: 'Niko', emoji: '😎', role: 'Doktor' },
  { id: 2, nickname: 'Ana', emoji: '🦊', role: 'Mafia' },
  { id: 3, nickname: 'Marko', emoji: '🐺', role: 'Građanin' },
  { id: 4, nickname: 'Lea', emoji: '🐱', role: 'Mafia' },
  { id: 5, nickname: 'Ivan', emoji: '🐻', role: 'Policajac' },
  { id: 6, nickname: 'Petra', emoji: '🌸', role: 'Dama' },
  { id: 7, nickname: 'Luka', emoji: '🐸', role: 'Novinar' },
  { id: 8, nickname: 'Mia', emoji: '🦄', role: 'Građanin' },
]
const HOST_ID = 1
const roleOf = (id: number) => PEOPLE.find((p) => p.id === id)!.role
const MAFIA_TEAM: RoleKey[] = ['Mafia', 'Dama']

export const ROLES_LIST: Role[] = [
  { id: 1, name: 'Mafia', opis: 'Svake noći s timom uklanja jednog igrača.' },
  { id: 2, name: 'Dama', opis: 'Utišava igrača za idući dan.' },
  { id: 3, name: 'Doktor', opis: 'Svake noći štiti jednog igrača.' },
  { id: 4, name: 'Policajac', opis: 'Svake noći istražuje jednog igrača.' },
  { id: 5, name: 'Novinar', opis: 'Uspoređuje dva igrača.' },
  { id: 6, name: 'Građanin', opis: 'Nema noćnu akciju.' },
]

const COMPOSITION: Record<RoleKey, number> = { Mafia: 2, Dama: 1, Doktor: 1, Policajac: 1, Novinar: 1, Građanin: 2 }

const iso = (ms: number) => new Date(ms).toISOString()

type Death = { id: number; how: EliminatedHow; round: number }

function playersOf(count: number, dead: Death[], revealRoles: boolean): LobbyPlayerResponse[] {
  return PEOPLE.slice(0, count).map((p) => {
    const death = dead.find((d) => d.id === p.id)
    return {
      id: p.id,
      nickname: p.nickname,
      alive: !death,
      host: p.id === HOST_ID,
      eliminatedHow: death?.how ?? null,
      eliminatedRound: death?.round ?? null,
      roleName: revealRoles ? p.role : null,
      avatarEmoji: p.emoji,
    }
  })
}

function lobbyOf(opts: { status: LobbyDetailsResponse['status']; mode: LobbyMode; count: number; dead?: Death[] }) {
  const details: LobbyDetailsResponse = {
    id: 1,
    code: CODE,
    status: opts.status,
    maxPlayers: 8,
    phase: null,
    roundNumber: null,
    players: playersOf(opts.count, opts.dead ?? [], false),
    roles: ROLES_LIST.map((r) => ({ roleId: r.id, roleName: r.name, count: COMPOSITION[r.name as RoleKey] })),
    hostPlayerId: HOST_ID,
    mode: opts.mode,
    isPublic: false,
    voiceEnabled: true,
  }
  return details
}

type GameOpts = {
  me: number
  phase: GamePhase
  round: number
  dead?: Death[]
  turn?: string | null
  actions?: AvailableActionResponse[]
  hasActed?: boolean
  teamTargets?: TeamTargetResponse[]
  mafiaRunoff?: MafiaRunoffResponse | null
  readyPlayerIds?: number[] | null
  silenced?: number[]
  nightKilled?: number[]
  votes?: VoteEntryResponse[]
  tied?: number[]
  winner?: Winner | null
}

function gameOf(o: GameOpts, now: number): GameStateResponse {
  const dead = o.dead ?? []
  const finished = o.phase === 'FINISHED'
  const players = playersOf(PEOPLE.length, dead, finished)
  const alive = players.filter((p) => p.alive).map((p) => p.id)
  const myRole = roleOf(o.me)
  const meDead = dead.find((d) => d.id === o.me)
  const onMafiaTeam = MAFIA_TEAM.includes(myRole)
  const voting = o.phase === 'VOTING' || o.phase === 'TIE_BREAK'
  const tied = o.tied ?? []
  const silenced = o.silenced ?? []
  const voters = alive.filter((id) => !silenced.includes(id) && !tied.includes(id))
  const canAct = (o.actions?.length ?? 0) > 0
  const daylight = o.phase === 'DAY' || voting

  return {
    lobbyCode: CODE,
    lobbyStatus: finished ? 'FINISHED' : 'IN_PROGRESS',
    phase: o.phase,
    roundNumber: o.round,
    players,
    currentPlayer: {
      playerId: o.me,
      nickname: PEOPLE.find((p) => p.id === o.me)!.nickname,
      alive: !meDead,
      role: myRole,
      canAct,
      hasActed: o.hasActed ?? false,
      availableActions: o.actions ?? [],
      actionEndsAt: canAct ? iso(now + (o.mafiaRunoff ? 8_000 : 11_000)) : null,
      actionStartedAt: canAct ? iso(now - 2_000) : null,
      mafiaRunoff: o.mafiaRunoff ?? null,
      teammates: onMafiaTeam
        ? PEOPLE.filter((p) => p.id !== o.me && MAFIA_TEAM.includes(p.role)).map((p) => ({
            playerId: p.id,
            nickname: p.nickname,
            roleName: p.role,
            alive: !dead.some((d) => d.id === p.id),
          }))
        : [],
      teamTargets: o.teamTargets ?? [],
      eliminatedHow: meDead?.how ?? null,
      eliminatedRound: meDead?.round ?? null,
    },
    gameFinished: finished,
    winner: o.winner ?? null,
    voting: {
      votingOpen: voting,
      canVote: voting && voters.includes(o.me),
      hasVoted: (o.votes ?? []).some((v) => v.voterPlayerId === o.me),
      canAbstain: o.phase === 'VOTING',
      eligibleTargetPlayerIds: voting ? (tied.length ? tied : alive.filter((id) => id !== o.me)) : [],
      tiedPlayerIds: tied,
      eligibleVoterIds: voting ? voters : [],
      votes: o.votes ?? [],
    },
    phaseEndsAt:
      o.phase === 'DAY' ? iso(now + 75_000) : voting ? iso(now + 40_000) : o.turn ? iso(now + 13_000) : null,
    serverTime: iso(now),
    silencedPlayerIds: silenced,
    nightKilledPlayerIds: o.nightKilled ?? [],
    currentTurnRole: o.turn ?? null,
    lastNight: daylight ? { roundNumber: o.round, killedPlayerIds: o.nightKilled ?? [], silencedPlayerIds: silenced } : null,
    readyPlayerIds: o.readyPlayerIds ?? null,
  }
}

// Druga runda: prve noći je stradala Mia, glasanjem je otišao Luka, a druge noći Ivan
const ROUND2_DEAD: Death[] = [
  { id: 8, how: 'NIGHT', round: 1 },
  { id: 7, how: 'VOTE', round: 1 },
  { id: 5, how: 'NIGHT', round: 2 },
]

const town = (exclude: number[] = []) =>
  PEOPLE.filter((p) => !MAFIA_TEAM.includes(p.role) && !exclude.includes(p.id)).map((p) => p.id)

export type Scenario = {
  page: 'home' | 'create' | 'rooms' | 'lobby' | 'game'
  /** sesija ovog uređaja (lobby i igra) */
  me?: number
  lobby?: LobbyDetailsResponse
  game?: GameStateResponse
  profile?: Profile
  /** naracija koja ostaje nepročitana; sve ostale se označe kao pročitane */
  narration?: string
  /** javne sobe; bez ovoga publicLobbies() */
  rooms?: PublicLobbyResponse[]
  /** /api/health ne odgovara – Početna ostaje na "Budim server…" */
  healthDown?: boolean
  /** igrači koje heartbeat javlja kao "Nije tu" */
  away?: number[]
}

export function scenarioOf(name: ScreenName, now: number): Scenario {
  const game = (o: GameOpts, mode: LobbyMode = 'LIVE'): Scenario => ({
    page: 'game',
    me: o.me,
    lobby: lobbyOf({ status: o.phase === 'FINISHED' ? 'FINISHED' : 'IN_PROGRESS', mode, count: 8 }),
    game: gameOf(o, now),
  })

  switch (name) {
    case 'home':
      return { page: 'home' }
    case 'home-resume':
      // spremljena sesija na Početnoj: kartica "Nastavi igru" (na /dev/screens se ne preusmjerava u sobu)
      return { page: 'home', me: 3, lobby: lobbyOf({ status: 'IN_PROGRESS', mode: 'LIVE', count: 8 }), profile: { nickname: 'Marko', emoji: '🐺' } }
    case 'home-waking':
      return { page: 'home', healthDown: true }
    case 'create':
      return { page: 'create', profile: { nickname: 'Niko', emoji: '😎' } }
    case 'rooms':
      return { page: 'rooms' }
    case 'rooms-empty':
      return { page: 'rooms', rooms: [] }
    case 'rooms-many':
      return { page: 'rooms', rooms: manyLobbies(now) }
    case 'lobby-host':
      return { page: 'lobby', me: 1, lobby: lobbyOf({ status: 'WAITING', mode: 'LIVE', count: 6 }) }
    case 'lobby-guest':
      return { page: 'lobby', me: 3, lobby: lobbyOf({ status: 'WAITING', mode: 'LIVE', count: 6 }) }
    case 'lobby-full':
      return { page: 'lobby', me: 1, lobby: lobbyOf({ status: 'WAITING', mode: 'LIVE', count: 8 }) }
    case 'lobby-host-away':
      return { page: 'lobby', me: 3, lobby: lobbyOf({ status: 'WAITING', mode: 'LIVE', count: 6 }), away: [HOST_ID] }
    case 'lobby-kicked':
      // spremljena sesija za Luku, kojeg u sobi više nema (izbacio ga je domaćin): reconnect kaže
      // da ne vrijedi, pa se prikaže ulazak u sobu. Bez toasta, da snimka uvijek bude ista.
      return {
        page: 'lobby',
        me: 7,
        lobby: lobbyOf({ status: 'WAITING', mode: 'LIVE', count: 6 }),
        profile: { nickname: 'Luka', emoji: '🐸' },
      }
    case 'role-live':
      return game({ me: 2, phase: 'NIGHT', round: 1, readyPlayerIds: [4, 6] })
    case 'role-online':
      return game({ me: 2, phase: 'NIGHT', round: 1, readyPlayerIds: [4, 6] }, 'ONLINE')
    case 'night-my-turn':
      return game({
        me: 1,
        phase: 'NIGHT',
        round: 1,
        turn: 'Doktor',
        actions: [{ type: 'SAVE', targetPlayerIds: PEOPLE.map((p) => p.id), requiresSecondTarget: false }],
      })
    case 'night-sleep':
      return game({ me: 3, phase: 'NIGHT', round: 1, turn: 'MAFIA' })
    case 'night-mafia':
      return game({
        me: 2,
        phase: 'NIGHT',
        round: 1,
        turn: 'MAFIA',
        actions: [{ type: 'KILL', targetPlayerIds: town(), requiresSecondTarget: false }],
        teamTargets: [{ playerId: 4, targetPlayerId: 5 }],
      })
    case 'night-mafia-runoff':
      return game({
        me: 2,
        phase: 'NIGHT',
        round: 1,
        turn: 'MAFIA',
        actions: [{ type: 'KILL', targetPlayerIds: [5, 7], requiresSecondTarget: false }],
        hasActed: true,
        teamTargets: [
          { playerId: 2, targetPlayerId: 7 },
          { playerId: 4, targetPlayerId: 5 },
        ],
        mafiaRunoff: { active: true, candidatePlayerIds: [5, 7], endsAt: iso(now + 8_000) },
      })
    case 'night-sent':
      // Doktor je već odigrao; red je prešao na Policajca
      return game({ me: 1, phase: 'NIGHT', round: 1, turn: 'Policajac', hasActed: true })
    case 'night-spectator':
      // druga noć: Mia je stradala prve noći i promatra, Luka je izbačen glasanjem
      return game({ me: 8, phase: 'NIGHT', round: 2, turn: 'MAFIA', dead: ROUND2_DEAD.slice(0, 2) })
    case 'day':
      return game({ me: 1, phase: 'DAY', round: 2, dead: ROUND2_DEAD, nightKilled: [5] })
    case 'day-silenced':
      return game({ me: 3, phase: 'DAY', round: 2, dead: ROUND2_DEAD, nightKilled: [5], silenced: [3] })
    case 'day-online':
      // gost u načinu online: umjesto domaćinovih gumba tekst, i uputa za glasovni poziv
      return game({ me: 3, phase: 'DAY', round: 2, dead: ROUND2_DEAD, nightKilled: [5] }, 'ONLINE')
    case 'vote':
      return game({
        me: 1,
        phase: 'VOTING',
        round: 2,
        dead: ROUND2_DEAD,
        nightKilled: [5],
        votes: [
          { voterPlayerId: 2, targetPlayerId: 3 },
          { voterPlayerId: 4, targetPlayerId: 3 },
          { voterPlayerId: 6, targetPlayerId: null },
        ],
      })
    case 'vote-tie':
      return game({
        me: 1,
        phase: 'TIE_BREAK',
        round: 2,
        dead: ROUND2_DEAD,
        nightKilled: [5],
        tied: [2, 3],
        votes: [{ voterPlayerId: 4, targetPlayerId: 3 }],
      })
    case 'end-mafia':
      return game({
        me: 1,
        phase: 'FINISHED',
        round: 3,
        winner: 'MAFIA_WIN',
        dead: [...ROUND2_DEAD, { id: 3, how: 'VOTE', round: 2 }, { id: 1, how: 'NIGHT', round: 3 }],
      })
    case 'end-citizens':
      return game({
        me: 1,
        phase: 'FINISHED',
        round: 3,
        winner: 'CITIZENS_WIN',
        dead: [...ROUND2_DEAD, { id: 2, how: 'VOTE', round: 2 }, { id: 4, how: 'VOTE', round: 3 }, { id: 6, how: 'NIGHT', round: 3 }],
      })
    case 'end-guest':
      // gost na kraju igre: "Čekamo domaćina…" i "Na početnu"
      return game({
        me: 6,
        phase: 'FINISHED',
        round: 3,
        winner: 'CITIZENS_WIN',
        dead: [...ROUND2_DEAD, { id: 2, how: 'VOTE', round: 2 }, { id: 4, how: 'VOTE', round: 3 }, { id: 3, how: 'NIGHT', round: 3 }],
      })
    case 'spectator':
      return game({ me: 8, phase: 'DAY', round: 2, dead: ROUND2_DEAD, nightKilled: [5] })
    case 'narrator':
      // Gost u načinu uživo ne govori (glas ide s domaćinova mobitela), pa sheet ostaje otvoren za čitanje.
      // Domaćinu bi govor u pregledniku bez zvuka odmah završio i narator bi otišao dalje.
      return { ...game({ me: 3, phase: 'DAY', round: 2, dead: ROUND2_DEAD, nightKilled: [5] }), narration: 'morning-2' }
  }
}

/** svi ključevi naracija koje GameScreen može tražiti u ovim scenarijima (lib/narration.ts) */
export function narrationKeys(): string[] {
  const keys = ['start', 'end']
  for (const round of [1, 2, 3]) {
    keys.push(`night-${round}`, `morning-${round}`, `tie-${round}`, `farewell-${round}`)
    for (const turn of ['MAFIA', 'DAMA', 'Doktor', 'Policajac', 'Novinar']) keys.push(`turn-${round}-${turn}`)
  }
  return keys
}

export function publicLobbies(now: number): PublicLobbyResponse[] {
  return [
    { code: 'K7M2QZ', hostNickname: 'Ana', hostAvatarEmoji: '🦊', playerCount: 5, maxPlayers: 8, mode: 'LIVE', createdAt: iso(now - 60_000) },
    { code: 'P4X9LT', hostNickname: 'Marko', hostAvatarEmoji: '🐺', playerCount: 3, maxPlayers: 10, mode: 'ONLINE', createdAt: iso(now - 4 * 60_000) },
    { code: 'B2R8NW', hostNickname: 'Lea', hostAvatarEmoji: '🐱', playerCount: 8, maxPlayers: 8, mode: 'LIVE', createdAt: iso(now - 9 * 60_000) },
  ]
}

/** puno javnih soba (mreža s 3 stupca na desktopu), dvije su pune */
function manyLobbies(now: number): PublicLobbyResponse[] {
  const extra: PublicLobbyResponse[] = [
    { code: 'H3J5KD', hostNickname: 'Petra', hostAvatarEmoji: '🌸', playerCount: 2, maxPlayers: 6, mode: 'ONLINE', createdAt: iso(now - 11 * 60_000) },
    { code: 'W8Q2MS', hostNickname: 'Luka', hostAvatarEmoji: '🐸', playerCount: 12, maxPlayers: 12, mode: 'ONLINE', createdAt: iso(now - 14 * 60_000) },
    { code: 'T6Z4RA', hostNickname: 'Mia', hostAvatarEmoji: '🦄', playerCount: 7, maxPlayers: 16, mode: 'LIVE', createdAt: iso(now - 20 * 60_000) },
    { code: 'N9C1VE', hostNickname: 'Ivan', hostAvatarEmoji: '🐻', playerCount: 1, maxPlayers: 20, mode: 'LIVE', createdAt: iso(now - 25 * 60_000) },
  ]
  return [...publicLobbies(now), ...extra]
}
