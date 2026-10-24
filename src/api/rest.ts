import { API_URL } from '../lib/config.ts'
import type {
  ActionRequest,
  ActionResponse,
  ApiErrorResponse,
  CreateLobbyRequest,
  CreateLobbyResponse,
  GameStateResponse,
  HostActionRequest,
  JoinLobbyRequest,
  JoinLobbyResponse,
  LobbyDetailsResponse,
  PlayerAuth,
  PlayerReadyResponse,
  PublicLobbyResponse,
  ReconnectRequest,
  ReconnectResponse,
  ResolveNightResponse,
  ResolveVoteResponse,
  Role,
  VoteRequest,
  VoteResponse,
} from './types.ts'

export class ApiError extends Error {
  readonly status: number
  /** stabilni kod greške iz backenda (ApiErrorResponse.code); null kad ga nema */
  readonly code: string | null

  constructor(message: string, status: number, code: string | null = null) {
    super(message)
    this.status = status
    this.code = code
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    })
  } catch {
    throw new ApiError('Ne mogu se spojiti na poslužitelj.', 0)
  }

  const text = await res.text()
  if (!res.ok) {
    // Backend vraća grešku kao ApiErrorResponse, a proxy ili server koji ne radi kao običan tekst
    let message = text
    let code: string | null = null
    try {
      const body = JSON.parse(text) as Partial<ApiErrorResponse>
      message = body.message ?? text
      code = body.code ?? null
    } catch {
      // nije JSON
    }
    throw new ApiError(message || `Greška ${res.status}`, res.status, code)
  }
  return (text ? JSON.parse(text) : undefined) as T
}

// Buđenje servera: nikad ne baca, samo kaže je li odgovorio
export async function getHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/health`, { signal: AbortSignal.timeout(8000) })
    return res.ok
  } catch {
    return false
  }
}

const post = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) })

const lobbyPath = (code: string) => `/api/lobbies/${encodeURIComponent(code)}`

// Greške backenda (ErrorCode.java) prevedene za igrače (spec 6.4). Kod se ne mijenja, tekst poruke smije.
const ERROR_MESSAGES: Record<string, (code: string) => string> = {
  LOBBY_NOT_FOUND: (code) => `Soba ${code} ne postoji. Provjeri kod s domaćinom.`,
  NICKNAME_TAKEN: () => 'Netko u sobi već koristi taj nadimak.',
  LOBBY_FULL: () => 'Soba je puna.',
  GAME_ALREADY_STARTED: () => 'Igra u toj sobi je već počela.',
  LOBBY_NOT_FULL: () => 'Soba još nije puna.',
  INVALID_ROLE_CONFIG: () => 'Postavke sobe nisu ispravne. Provjeri broj igrača i uloge.',
  NOT_HOST: () => 'Samo domaćin to može.',
  GAME_FINISHED: () => 'Igra je završena.',
  WRONG_PHASE: () => 'Ta faza igre je već završila.',
  DEAD_PLAYER: () => 'Više nisi u igri.',
  GAME_IN_PROGRESS: () => 'Igra je u tijeku pa sobu ne možeš napustiti.',
  GAME_NOT_STARTED: () => 'Igra još nije počela.',
  NOT_IN_LOBBY: () => 'Nisi igrač u ovoj sobi.',
  PLAYER_NOT_FOUND: () => 'Taj igrač više nije u sobi.',
  INVALID_TOKEN: () => 'Tvoja prijava u sobu više ne vrijedi. Uđi ponovno.',
  TOKEN_REQUIRED: () => 'Tvoja prijava u sobu više ne vrijedi. Uđi ponovno.',
  VALIDATION_ERROR: () => 'Provjeri unesene podatke i pokušaj ponovno.',
  ROLE_NOT_FOUND: () => 'Odabrana uloga ne postoji. Osvježi stranicu i pokušaj ponovno.',
  ROLE_NOT_ASSIGNED: () => 'Uloge još nisu podijeljene.',
  INVALID_ACTION: () => 'Taj potez sada nije moguć. Odaberi drugi.',
  CANNOT_VOTE: () => 'Sada ne možeš glasati.',
  // noć (spec 6.6)
  NOT_YOUR_TURN: () => 'Još nije tvoj red. Pričekaj da te narator probudi.',
  ALREADY_ACTED: () => 'Već si odigrao potez ove noći.',
  INVALID_TARGET: () => 'Tog igrača sada ne možeš odabrati. Odaberi nekog drugog.',
  // glasanje (spec 6.8)
  ALREADY_VOTED: () => 'Tvoj glas je već zabilježen.',
  SILENCED: () => 'Utišan si, pa danas ne glasaš.',
  TIED_PLAYER_CANNOT_VOTE: () => 'Ti si u izjednačenju pa ovaj put ne glasaš.',
  CANNOT_VOTE_SELF: () => 'Ne možeš glasati za sebe.',
  ABSTAIN_NOT_ALLOWED: () => 'U ponovnom glasanju odaberi jednog od izjednačenih igrača.',
}

// Greška za prikaz u sučelju. Sirova poruka backenda nije za igrače, pa ide samo u konzolu.
// `code` je kod sobe za poruke poput "Soba K7M2QZ ne postoji".
export function describeError(e: unknown, code = ''): string {
  console.error(e)
  if (!(e instanceof ApiError)) return 'Nešto nije u redu. Pokušaj ponovno.'
  if (e.status === 0) return 'Ne mogu se spojiti na poslužitelj. Provjeri vezu i pokušaj ponovno.'
  const known = e.code ? ERROR_MESSAGES[e.code] : undefined
  if (known) return known(code)
  if (e.status === 400) return 'Postavke sobe nisu ispravne. Provjeri broj igrača i uloge.'
  if (e.status === 401) return 'Tvoja prijava u sobu više ne vrijedi. Uđi ponovno.'
  if (e.status === 403) return 'To sada ne možeš napraviti.'
  if (e.status >= 500) return 'Nešto je pošlo po zlu na poslužitelju. Pokušaj ponovno za trenutak.'
  return 'Nešto nije u redu. Pokušaj ponovno.'
}

export const getRoles = () => request<Role[]>('/api/roles')

export const createLobby = (body: CreateLobbyRequest) =>
  request<CreateLobbyResponse>('/api/lobbies', post(body))

export const getLobby = (code: string) => request<LobbyDetailsResponse>(lobbyPath(code))

export const getPublicLobbies = () => request<PublicLobbyResponse[]>('/api/lobbies?public=true')

export const joinLobby = (code: string, nickname: string, avatarEmoji: string) =>
  request<JoinLobbyResponse>(
    `${lobbyPath(code)}/join`,
    post({ nickname, avatarEmoji } satisfies JoinLobbyRequest),
  )

// Samo u čekaonici; usred igre backend vraća GAME_IN_PROGRESS pa klijent izlazi samo lokalno
export const leaveLobby = (code: string, { playerId, playerToken }: PlayerAuth) =>
  request<void>(`${lobbyPath(code)}/leave`, post({ playerId, playerToken } satisfies HostActionRequest))

// Samo domaćin; backend traži punu sobu
export const startLobby = (code: string, { playerId, playerToken }: PlayerAuth) =>
  request<void>(`${lobbyPath(code)}/start`, post({ playerId, playerToken } satisfies HostActionRequest))

// Uvod prve noći: igrač je pogledao ulogu. Ponovni poziv nije greška.
export const markReady = (code: string, { playerId, playerToken }: PlayerAuth) =>
  request<PlayerReadyResponse>(`${lobbyPath(code)}/ready`, post({ playerId, playerToken } satisfies PlayerAuth))

// Samo domaćin, samo u uvodu prve noći: prvi potez počinje odmah, i kad nisu svi spremni
export const beginNight = (code: string, { playerId, playerToken }: PlayerAuth) =>
  request<void>(`${lobbyPath(code)}/begin-night`, post({ playerId, playerToken } satisfies HostActionRequest))

// Samo domaćin, samo kad je igra završena: soba se vraća u čekaonicu s istim postavkama
export const rematchLobby = (code: string, { playerId, playerToken }: PlayerAuth) =>
  request<void>(`${lobbyPath(code)}/rematch`, post({ playerId, playerToken } satisfies HostActionRequest))

export const getGameState =(code: string, { playerId, playerToken }: PlayerAuth) =>
  request<GameStateResponse>(`${lobbyPath(code)}/game-state`, {
    headers: { 'X-Player-Id': String(playerId), 'X-Player-Token': playerToken },
  })

export const reconnect = ({ playerId, playerToken }: PlayerAuth) =>
  request<ReconnectResponse>('/api/players/reconnect', post({ playerId, playerToken } satisfies ReconnectRequest))

// Noćna akcija; za INVESTIGATE / COMPARE odgovor nosi rezultat
export const submitAction = (body: ActionRequest) => request<ActionResponse>('/api/actions', post(body))

// Samo domaćin: obradi noć odmah, i kad neke uloge još nisu odigrale (noć je zapela)
export const resolveNight = (code: string, { playerId, playerToken }: PlayerAuth) =>
  request<ResolveNightResponse>(
    `/api/actions/resolve-night/${encodeURIComponent(code)}`,
    post({ playerId, playerToken } satisfies HostActionRequest),
  )

// Samo domaćin, samo za vrijeme rasprave: +30 s svima
export const extendDiscussion = (code: string, { playerId, playerToken }: PlayerAuth) =>
  request<void>(`${lobbyPath(code)}/discussion/extend`, post({ playerId, playerToken } satisfies HostActionRequest))

// Samo domaćin: glasanje počinje odmah, svima
export const startVoting = (code: string, { playerId, playerToken }: PlayerAuth) =>
  request<void>(`${lobbyPath(code)}/voting/start`, post({ playerId, playerToken } satisfies HostActionRequest))

// Glas je konačan; targetPlayerId null = "Suzdržan". Zadnji potreban glas odmah obradi glasanje.
export const submitVote = ({ playerId, playerToken }: PlayerAuth, targetPlayerId: number | null) =>
  request<VoteResponse>(
    '/api/votes',
    post({ voterPlayerId: playerId, targetPlayerId, playerToken } satisfies VoteRequest),
  )

// Samo domaćin: završi glasanje prije roka; tko nije glasao, računa se kao suzdržan
export const resolveVote = (code: string, { playerId, playerToken }: PlayerAuth) =>
  request<ResolveVoteResponse>(
    `/api/votes/resolve/${encodeURIComponent(code)}`,
    post({ playerId, playerToken } satisfies HostActionRequest),
  )
