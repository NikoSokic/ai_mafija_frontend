import type { ActionType } from '../../api/types.ts'
import type { RoleKey } from '../../data/roles.ts'

// Tekstovi noćne akcije iz prototipa (nightCfg): pitanje, objašnjenje i riječ ispred odabranih meta
export type NightText = { question: string; hint: string; verb: string }

// Bez dogovora slijedi drugi krug, a kad nitko ne odabere, strada nasumični živi igrač (ActionService.settleMafiaTurn)
const KILL_TEAM_HINT = 'Dogovorite se oko mete. Ako nitko ne odabere, strada netko nasumično – možda i netko od vas.'
const KILL_SOLO_HINT = 'Ako ne odabereš, strada netko nasumično – možda i ti.'

const TEXTS: Record<ActionType, NightText> = {
  KILL: {
    question: 'Koga mafija uklanja večeras?',
    hint: KILL_TEAM_HINT,
    verb: 'Meta:',
  },
  SILENCE: {
    question: 'Koga utišavaš za sutra?',
    hint: 'Utišani igrač tijekom dana ne smije govoriti ni glasati. Možeš utišati i sebe.',
    verb: 'Utišavaš:',
  },
  SAVE: {
    question: 'Koga štitiš noćas?',
    hint: 'Možeš zaštititi i sebe. Ako mafija napadne baš tog igrača, preživjet će.',
    verb: 'Štitiš:',
  },
  INVESTIGATE: {
    question: 'Koga istražuješ?',
    hint: 'Odmah ćeš saznati je li taj igrač mafija.',
    verb: 'Istražuješ:',
  },
  COMPARE: {
    question: 'Koja dva igrača uspoređuješ?',
    hint: 'Saznat ćeš jesu li u istom timu, ali ne i u kojem.',
    verb: 'Uspoređuješ:',
  },
}

/** `withPartners`: u potezu mafije bira još netko živ, pa se tekst obraća timu */
export function nightText(action: ActionType, role: RoleKey | null, withPartners = false): NightText {
  if (action !== 'KILL') return TEXTS[action]
  const hint = withPartners ? KILL_TEAM_HINT : KILL_SOLO_HINT
  // Dama dobije KILL kad mafija padne
  if (role === 'Dama') {
    return { question: 'Mafije više nema. Koga uklanjaš?', hint: `Preuzela si ulogu mafije. ${hint}`, verb: 'Meta:' }
  }
  return { ...TEXTS.KILL, hint }
}
