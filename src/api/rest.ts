import { API_URL } from '../lib/config.ts'

export interface Role {
  id: number
  name: string
  opis: string
}

export interface CreateLobbyRequest {
  hostNickname: string
  maxPlayers: number
  roles: { roleId: number; count: number }[]
}

export interface CreateLobbyResponse {
  lobbyId: number
  code: string
  status: string
  maxPlayers: number
  hostPlayerId: number
  hostNickname: string
  playerToken: string
}

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

export const getRoles = () => request<Role[]>('/api/test/roles')

export const createLobby = (body: CreateLobbyRequest) =>
  request<CreateLobbyResponse>('/api/lobbies', {
    method: 'POST',
    body: JSON.stringify(body),
  })
