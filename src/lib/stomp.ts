import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import type { LobbyEvent } from '../api/types.ts'
import { WS_URL } from './config.ts'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

export type LobbyListener = {
  onEvent: (event: LobbyEvent) => void
  onStatus: (status: ConnectionStatus) => void
  /** svaki uspješan spoj, i prvi i ponovni – tada treba ponovno dohvatiti stanje */
  onConnect: () => void
}

type Connection = {
  client: Client
  listeners: Set<LobbyListener>
  status: ConnectionStatus
  closeTimer?: ReturnType<typeof setTimeout>
}

// Veza se zatvara tek malo nakon zadnjeg slušatelja. StrictMode odmah ponovno montira efekt,
// a prijelaz /soba → /igra isto, pa oba preuzmu postojeću vezu umjesto da otvore novu.
const CLOSE_DELAY_MS = 1000

// Jedna SockJS/STOMP veza i jedna pretplata po kodu sobe
const connections = new Map<string, Connection>()

export function subscribeToLobby(code: string, listener: LobbyListener): () => void {
  let conn = connections.get(code)
  if (!conn) {
    conn = open(code)
    connections.set(code, conn)
  }
  clearTimeout(conn.closeTimer)
  conn.listeners.add(listener)
  listener.onStatus(conn.status)

  const current = conn
  return () => {
    current.listeners.delete(listener)
    if (current.listeners.size > 0) return
    current.closeTimer = setTimeout(() => {
      connections.delete(code)
      void current.client.deactivate()
    }, CLOSE_DELAY_MS)
  }
}

function open(code: string): Connection {
  const conn: Connection = {
    client: new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      reconnectDelay: 5000,
      // Pretplata se radi pri svakom spoju: nakon prekida stara ne postoji, pa ih nikad nema dvije
      onConnect: () => {
        conn.client.subscribe(`/topic/lobby/${code}`, (message) => {
          let event: LobbyEvent
          try {
            event = JSON.parse(message.body) as LobbyEvent
          } catch {
            return
          }
          conn.listeners.forEach((l) => l.onEvent(event))
        })
        setStatus('connected')
        conn.listeners.forEach((l) => l.onConnect())
      },
      onWebSocketClose: () => setStatus('disconnected'),
      onStompError: (frame) => console.error('STOMP greška', frame.headers.message, frame.body),
    }),
    listeners: new Set(),
    status: 'connecting',
  }

  function setStatus(status: ConnectionStatus) {
    conn.status = status
    conn.listeners.forEach((l) => l.onStatus(status))
  }

  conn.client.activate()
  return conn
}

/** Ručno ponovno spajanje svih nespojenih veza (gumb "Pokušaj ponovno") */
export function retryConnections() {
  connections.forEach((conn) => {
    if (conn.status === 'connected') return
    void conn.client.deactivate().then(() => conn.client.activate())
  })
}
