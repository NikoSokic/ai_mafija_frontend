import type { RoleCounts } from '../data/recommendedRoles.ts'

const KEY = 'aimafija.room'

// Postavke sobe koje backend još ne prima ni ne vraća (docs/backend-todo.md).
// Domaćin ih spremi pri kreiranju, a lobby ih prikazuje; gosti vide zadane vrijednosti.
export type Mode = 'live' | 'online'
export type Visibility = 'private' | 'public'

export interface RoomSettings {
  code: string
  counts: RoleCounts
  mode: Mode
  visibility: Visibility
  voice: boolean
}

export const DEFAULT_ROOM_SETTINGS: Pick<RoomSettings, 'mode' | 'visibility' | 'voice'> = {
  mode: 'live',
  visibility: 'private',
  voice: true,
}

export function saveRoomSettings(settings: RoomSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings))
  } catch {
    // nema spremanja
  }
}

/** postavke samo ako su spremljene za ovu sobu */
export function loadRoomSettings(code: string): RoomSettings | null {
  try {
    const raw = localStorage.getItem(KEY)
    const data = raw ? (JSON.parse(raw) as RoomSettings) : null
    return data?.code === code ? data : null
  } catch {
    return null
  }
}
