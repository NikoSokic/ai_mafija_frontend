import { API_URL } from '../lib/config.ts'
import type {
  CreateLobbyRequest,
  CreateLobbyResponse,
  GameStateResponse,
  HostActionRequest,
  JoinLobbyRequest,
  JoinLobbyResponse,
  LobbyDetailsResponse,
  PlayerAuth,
  PlayerRoleRequest,
  PlayerRoleResponse,
  ReconnectRequest,
  ReconnectResponse,
  Role,
} from './types.ts'

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
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
    // Backend vraća grešku kao JSON s poljem `message` ili kao običan tekst
    let message = text
    try {
      message = JSON.parse(text).message ?? text
    } catch {
      // nije JSON
    }
    throw new ApiError(message || `Greška ${res.status}`, res.status)
  }
  return (text ? JSON.parse(text) : undefined) as T
}

const post = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) })

const lobbyPath = (code: string) => `/api/lobbies/${encodeURIComponent(code)}`

// Poruke backenda (spec 6.4) prevedene za igrače. Backend nema kodove grešaka, pa se uspoređuje tekst.
const BACKEND_MESSAGES: Record<string, (code: string) => string> = {
  'Lobby ne postoji.': (code) => `Soba ${code} ne postoji. Provjeri kod s domaćinom.`,
  'Igrač s tim nicknameom već postoji u lobbyju.': () => 'Netko u sobi već koristi taj nadimak.',
  'Lobby je popunjen.': () => 'Soba je puna.',
  'Igra je već započela ili završena.': () => 'Igra u toj sobi je već počela.',
  'Igra je već započela ili lobby nije u WAITING stanju.': () => 'Igra u toj sobi je već počela.',
  'Lobby nije pun.': () => 'Soba još nije puna.',
  'Nickname je obavezan.': () => 'Prvo upiši nadimak.',
}

// Greška za prikaz u sučelju. Sirova poruka backenda nije za igrače, pa ide samo u konzolu.
// `code` je kod sobe za poruke poput "Soba K7M2QZ ne postoji".
export function describeError(e: unknown, code = ''): string {
  console.error(e)
  if (!(e instanceof ApiError)) return 'Nešto nije u redu. Pokušaj ponovno.'
  if (e.status === 0) return 'Ne mogu se spojiti na poslužitelj. Provjeri vezu i pokušaj ponovno.'
  const known = BACKEND_MESSAGES[e.message]
  if (known) return known(code)
  if (e.status === 400) return 'Postavke sobe nisu ispravne. Provjeri broj igrača i uloge.'
  if (e.status === 401) return 'Tvoja prijava u sobu više ne vrijedi. Uđi ponovno.'
  if (e.status === 403) return 'Samo domaćin može pokrenuti igru.'
  if (e.status >= 500) return 'Nešto je pošlo po zlu na poslužitelju. Pokušaj ponovno za trenutak.'
  return 'Nešto nije u redu. Pokušaj ponovno.'
}

export const getRoles = () => request<Role[]>('/api/test/roles')

export const createLobby = (body: CreateLobbyRequest) =>
  request<CreateLobbyResponse>('/api/lobbies', post(body))

export const getLobby = (code: string) => request<LobbyDetailsResponse>(lobbyPath(code))

export const joinLobby = (code: string, nickname: string) =>
  request<JoinLobbyResponse>(`${lobbyPath(code)}/join`, post({ nickname } satisfies JoinLobbyRequest))

// Samo domaćin; backend traži punu sobu
export const startLobby = (code: string, { playerId, playerToken }: PlayerAuth) =>
  request<void>(`${lobbyPath(code)}/start`, post({ playerId, playerToken } satisfies HostActionRequest))

export const getGameState = (code: string, { playerId, playerToken }: PlayerAuth) =>
  request<GameStateResponse>(`${lobbyPath(code)}/game-state`, {
    headers: { 'X-Player-Id': String(playerId), 'X-Player-Token': playerToken },
  })

export const getPlayerRole = ({ playerId, playerToken }: PlayerAuth) =>
  request<PlayerRoleResponse>('/api/players/role', post({ playerId, playerToken } satisfies PlayerRoleRequest))

export const reconnect = ({ playerId, playerToken }: PlayerAuth) =>
  request<ReconnectResponse>('/api/players/reconnect', post({ playerId, playerToken } satisfies ReconnectRequest))
