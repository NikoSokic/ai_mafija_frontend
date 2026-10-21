import type { GameStateResponse } from '../../api/types.ts'
import type { Fate } from '../../store/notes.ts'

// Stanje igrača na ovom uređaju koje backend ne vraća izravno (docs/backend-todo.md)

/**
 * Utišan je živ igrač kojem backend danas ne dopušta glasanje iako je glasanje otvoreno
 * (GameStateService.isSilencedDuringCurrentVoting). canVote je false i nakon glasa,
 * pa se gleda i hasVoted.
 */
export function isSilenced(state: GameStateResponse) {
  const { voting } = state
  return (
    state.phase === 'DAY' && state.currentPlayer.alive && voting.votingOpen && !voting.canVote && !voting.hasVoted
  )
}

// Neutralno, jer backend ne zna rod igrača (spec 9)
export function fateText(fate: Fate | null) {
  if (!fate) return 'Više nisi u igri'
  return fate.how === 'night' ? `Mafija te uklonila u noći ${fate.round}` : `Grad te izbacio u danu ${fate.round}`
}
