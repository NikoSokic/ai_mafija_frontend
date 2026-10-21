import type { InvestigationResult, JournalistResult } from '../api/types.ts'

// Bilješke igrača za jednu igru, samo u ovom pregledniku. Backend rezultat istrage / usporedbe
// vrati samo jednom (u odgovoru akcije), a igrač ga treba vidjeti do kraja igre (gumb oka).

export type NoteTarget = { id: number; nickname: string }

export type NightNote =
  | { round: number; type: 'INVESTIGATE'; targets: [NoteTarget]; value: InvestigationResult }
  | { round: number; type: 'COMPARE'; targets: [NoteTarget, NoteTarget]; value: JournalistResult }

/** Kako je igrač ispao; backend to ne vraća (docs/backend-todo.md), pa se zapamti kad se dogodi */
export type Fate = { how: 'night' | 'day'; round: number }

const notesKey = (code: string) => `aimafija.notes.${code}`
const fateKey = (code: string) => `aimafija.fate.${code}`

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // nema spremanja
  }
}

export function loadNotes(code: string): NightNote[] {
  const notes = read<NightNote[]>(notesKey(code))
  return Array.isArray(notes) ? notes : []
}

export function addNote(code: string, note: NightNote) {
  write(notesKey(code), [...loadNotes(code), note])
}

export function loadFate(code: string): Fate | null {
  return read<Fate>(fateKey(code))
}

export function saveFate(code: string, fate: Fate) {
  write(fateKey(code), fate)
}
