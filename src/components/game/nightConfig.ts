import type { ActionType } from '../../api/types.ts'
import type { RoleKey } from '../../data/roles.ts'

// Tekstovi noćne akcije iz prototipa (nightCfg): pitanje, objašnjenje i riječ ispred odabranih meta
export type NightText = { question: string; hint: string; verb: string }

const TEXTS: Record<ActionType, NightText> = {
  KILL: {
    question: 'Koga mafija uklanja večeras?',
    // GameRulesService.mafiaKillTarget: većina živih mafijaša, kod izjednačenja nitko
    hint: 'Strada onaj koga odabere većina mafije. Ako se ne složite, nitko ne strada.',
    verb: 'Meta:',
  },
  SILENCE: {
    question: 'Koga utišavaš za sutra?',
    hint: 'Utišani igrač tijekom dana ne smije govoriti ni glasati.',
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

// Dama dobije KILL kad mafija padne
const DAMA_KILL: NightText = {
  question: 'Mafije više nema. Koga uklanjaš?',
  hint: 'Preuzela si ulogu mafije i noćas biraš žrtvu.',
  verb: 'Meta:',
}

export function nightText(action: ActionType, role: RoleKey | null): NightText {
  return role === 'Dama' && action === 'KILL' ? DAMA_KILL : TEXTS[action]
}
