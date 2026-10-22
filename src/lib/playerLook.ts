import { EMOJIS } from '../data/emojis.ts'

// Boja kruga avatara iz id-a igrača (spec 4): isti igrač ima istu boju na svim uređajima
export function playerHue(id: number) {
  return (id * 47) % 360
}

// Rezerva za igrača bez avatarEmoji u backendu (npr. soba iz stare verzije): emoji iz id-a
export function playerEmoji(id: number) {
  return EMOJIS[id % EMOJIS.length]
}

type WithAvatar = { id: number; avatarEmoji: string | null }

// Avatar igrača kakav je backend spremio pri ulasku u sobu
export function avatarOf(player: WithAvatar) {
  return player.avatarEmoji || playerEmoji(player.id)
}

// Isto po id-u; igrač kojeg nema na popisu dobiva rezervni emoji
export function avatarById(players: WithAvatar[], id: number) {
  const player = players.find((p) => p.id === id)
  return player ? avatarOf(player) : playerEmoji(id)
}
