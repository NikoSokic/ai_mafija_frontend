import type { LobbyPlayerResponse } from '../../api/types.ts'

// Kako je igrač ispao, iz eliminatedHow / eliminatedRound. Neutralno, jer backend ne zna rod igrača (spec 9).
export function fateText(player: LobbyPlayerResponse | undefined) {
  const round = player?.eliminatedRound
  if (player?.eliminatedHow === 'NIGHT' && round) return `Mafija te uklonila u noći ${round}`
  if (player?.eliminatedHow === 'VOTE' && round) return `Grad te izbacio u danu ${round}`
  return 'Više nisi u igri'
}

// Sudbina na popisu kraja igre (spec 6.9). Backend ne zna rod igrača, pa je rod muški kao u ostatku sučelja.
export function endFateText(player: LobbyPlayerResponse) {
  if (player.alive) return 'Preživio'
  const round = player.eliminatedRound
  if (player.eliminatedHow === 'NIGHT' && round) return `Ubijen u noći ${round}`
  if (player.eliminatedHow === 'VOTE' && round) return `Izbačen u danu ${round}`
  if (player.eliminatedHow === 'LEFT') return 'Napustio igru'
  return 'Ispao'
}

// Stanje igrača u bočnoj ploči (desktop). Utišanost se prosljeđuje samo danju – noću bi otkrila potez Dame.
export function sidebarStatus(player: LobbyPlayerResponse, opts: { silenced: boolean; away: boolean }) {
  if (!player.alive) return endFateText(player)
  if (opts.away) return 'Nije tu'
  if (opts.silenced) return 'Utišan'
  return 'Živ'
}
