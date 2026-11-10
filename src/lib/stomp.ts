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

type Subscribe = (code: string, listener: LobbyListener) => () => void

// /dev/screens: izmišljena veza bez poslužitelja. Postavlja se samo u dev načinu.
let devSubscribe: Subscribe | null = null

export function setDevSubscribe(impl: Subscribe | null) {
  if (import.meta.env.DEV) devSubscribe = impl
}

export function subscribeToLobby(code: string, listener: LobbyListener): () => void {
  if (devSubscribe) return devSubscribe(code, listener)
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
      // Na mobitelu veza često ostane "otvorena" iako ništa ne prolazi (zaključan ekran, promjena mreže).
      // Heartbeat to otkrije za ~10 s, a odbacivanje utičnice čini da ponovno spajanje krene odmah.
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      discardWebsocketOnCommFailure: true,
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

// Povratak u aplikaciju, povratak mreže i povratak iz bfcachea (iPhone): ne čeka se 5 s do sljedećeg
// automatskog pokušaja, nego se nespojene veze odmah pokušaju ponovno spojiti
if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') retryConnections()
  })
  window.addEventListener('online', retryConnections)
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) retryConnections()
  })
}
