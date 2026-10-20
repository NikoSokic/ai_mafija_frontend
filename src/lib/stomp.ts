import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { WS_URL } from './config.ts'

export function createStompClient(): Client {
  return new Client({
    webSocketFactory: () => new SockJS(WS_URL),
    reconnectDelay: 5000,
  })
}
