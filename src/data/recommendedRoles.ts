import { ROLE_KEYS, type RoleKey } from './roles.ts'

export type RoleCounts = Record<RoleKey, number>

// Preporučeni raspored uloga za 4–20 igrača:
// - tim mafije je trećina igrača zaokružena nadolje (barem 1)
// - Dama od 6 igrača, ostatak tima mafije su Mafija
// - Doktor i Policajac uvijek, Novinar od 7, drugi Policajac od 12, drugi Doktor od 14
// - svi ostali su Građani
export function recommendedCounts(players: number, available: readonly RoleKey[] = ROLE_KEYS): RoleCounts {
  const mafiaTeam = Math.max(1, Math.floor(players / 3))
  const dama = players >= 6 ? 1 : 0
  const counts: RoleCounts = {
    Mafia: mafiaTeam - dama,
    Dama: dama,
    Doktor: players >= 14 ? 2 : 1,
    Policajac: players >= 12 ? 2 : 1,
    Novinar: players >= 7 ? 1 : 0,
    Građanin: 0,
  }
  // Uloge koje backend nije vratio postaju Građani, da zbroj ostane jednak broju igrača
  for (const key of ROLE_KEYS) {
    if (!available.includes(key)) counts[key] = 0
  }
  counts.Građanin = players - ROLE_KEYS.reduce((sum, key) => sum + counts[key], 0)
  return counts
}

export function sameCounts(a: RoleCounts, b: RoleCounts) {
  return ROLE_KEYS.every((key) => a[key] === b[key])
}
