import { EMOJIS } from '../data/emojis.ts'

// Boja kruga avatara iz id-a igrača (spec 4): isti igrač ima istu boju na svim uređajima
export function playerHue(id: number) {
  return (id * 47) % 360
}

// Backend još ne sprema emoji igrača (docs/backend-todo.md), pa tuđi avatar dobiva emoji iz id-a
export function playerEmoji(id: number) {
  return EMOJIS[id % EMOJIS.length]
}
