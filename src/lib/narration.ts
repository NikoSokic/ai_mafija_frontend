import type { Winner } from '../api/types.ts'
import { seededRandom } from './seededRandom.ts'

// Tekstovi naratora (spec 7, prototip: nightIntro, resolveNight, resolveVote).
// Dok backend nema AI naratora (docs/backend-todo.md), tekst se slaže ovdje. Rečenice su
// rodno neutralne i imena su samo u nominativu, jer backend ne zna rod igrača (spec 9).

export interface Narration {
  /** jedinstven u igri; po njemu se pamti da je tekst već pročitan */
  key: string
  /** podnaslov u zaglavlju, npr. "Jutarnje vijesti" */
  label: string
  text: string
}

// Hash teksta prije seededRandom: susjedni seedovi (runda 2, 3…) daju gotovo isti prvi broj,
// pa bi se varijanta rijetko mijenjala. Isti kod i runda = ista varijanta na svim uređajima.
function pickVariant(variants: string[], code: string, round: number, salt: string) {
  let hash = 5381
  for (const ch of `${code}:${round}:${salt}`) hash = (hash * 33 + ch.charCodeAt(0)) % 233280
  return variants[Math.floor(seededRandom(hash)() * variants.length)]
}

// "Ana", "Ana i Marko", "Ana, Marko i Lea"
function joinNames(names: string[]) {
  return names.length < 2 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} i ${names[names.length - 1]}`
}

export function startNarration(): Narration {
  return {
    key: 'start',
    label: 'Početak igre',
    text: 'Dobro došli u grad. Svatko od vas krije tajnu. Noć pada i svi zatvaraju oči.',
  }
}

/** uvod noći; uloge budi turnNarration */
export function nightNarration(code: string, round: number): Narration {
  const text = pickVariant(
    [
      'Grad tone u san. Ulice su prazne, a negdje u mraku netko upravo donosi odluku.',
      'Svjetla se gase jedno po jedno. Grad zatvara oči i nitko ne zna tko će ih ujutro otvoriti.',
      `Noć ${round} spušta se na grad. Vrata su zaključana, ali to ovdje nikoga ne štiti.`,
    ],
    code,
    round,
    'night',
  )
  return { key: `night-${round}`, label: 'Noć se spušta', text: `Svi zatvorite oči. ${text}` }
}

interface Turn {
  /** currentTurnRole iz backenda */
  turn: string
  name: string
  /** vokativ: "Doktore, otvori oči" */
  call: string
  /** mafija se zove u množini ("otvorite"), jer ih može biti više */
  plural: boolean
  task: string
  /** je li potez u igri; isto pravilo kao GameRulesService.turnExistsInGame */
  inGame: (roles: string[]) => boolean
}

// Potezi noći redom kao u backendu (GameRules.NIGHT_ORDER)
const TURNS: Turn[] = [
  {
    turn: 'MAFIA',
    name: 'Mafija',
    call: 'Mafijo',
    plural: true,
    task: 'Pogledajte se i odaberite koga uklanjate.',
    inGame: (roles) => roles.includes('Mafia') || roles.includes('Dama'),
  },
  {
    turn: 'DAMA',
    name: 'Dama',
    call: 'Dama',
    plural: false,
    task: 'Odaberi koga utišavaš za sutra.',
    inGame: (roles) => roles.includes('Dama'),
  },
  {
    turn: 'Doktor',
    name: 'Doktor',
    call: 'Doktore',
    plural: false,
    task: 'Odaberi koga noćas štitiš.',
    inGame: (roles) => roles.includes('Doktor'),
  },
  {
    turn: 'Policajac',
    name: 'Policajac',
    call: 'Policajče',
    plural: false,
    task: 'Odaberi koga istražuješ.',
    inGame: (roles) => roles.includes('Policajac'),
  },
  {
    turn: 'Novinar',
    name: 'Novinar',
    call: 'Novinaru',
    plural: false,
    task: 'Odaberi dva igrača koja uspoređuješ.',
    inGame: (roles) => roles.includes('Novinar'),
  },
]

const openEyes = (t: Turn) => `${t.call}, ${t.plural ? 'otvorite' : 'otvori'} oči.`
const closeEyes = (t: Turn) => `${t.call}, ${t.plural ? 'zatvorite' : 'zatvori'} oči.`

/** potezi ove igre po sastavu uloga (imena iz backenda); null kad sastav nije poznat */
function turnsInGame(roles: string[] | null) {
  return roles ? TURNS.filter((t) => t.inGame(roles)) : null
}

/**
 * Narator uspava prethodnu ulogu i budi onu na redu (currentTurnRole iz javnog stanja).
 * Prethodna se računa iz sastava, pa radi i nakon osvježavanja. null za nepoznat potez.
 */
export function turnNarration(round: number, turn: string, roles: string[] | null): Narration | null {
  const t = TURNS.find((x) => x.turn === turn)
  if (!t) return null
  const turns = turnsInGame(roles)
  const index = turns ? turns.indexOf(t) : -1
  let close = ''
  if (index > 0 && turns) close = `${closeEyes(turns[index - 1])} `
  // sastav nije poznat: ne zna se tko je bio prije, pa samo općenito
  else if (!turns && t.turn !== 'MAFIA') close = 'Zatvorite oči. '
  return { key: `turn-${round}-${turn}`, label: `Budi se: ${t.name}`, text: `${close}${openEyes(t)} ${t.task}` }
}

/** jutro iz izvještaja noći: nadimci ubijenih i utišanih; prvo se uspava zadnja uloga noći */
export function morningNarration(
  code: string,
  round: number,
  killed: string[],
  silenced: string[],
  roles: string[] | null,
): Narration {
  const k = joinNames(killed)
  const many = killed.length > 1
  let text = killed.length
    ? pickVariant(
        [
          `Sunce izlazi nad gradom, ali ne donosi mir. ${k} više ${many ? 'nisu' : 'nije'} među nama.`,
          `Jutro je stiglo, ali ne za sve. Noć je odnijela: ${k}.`,
          `Grad se budi uz tihe korake i loše vijesti. ${k} ${many ? 'su žrtve' : 'je žrtva'} ove noći.`,
        ],
        code,
        round,
        'morning',
      )
    : pickVariant(
        [
          'Sunce izlazi i svi su se probudili. Netko je noćas imao anđela čuvara.',
          'Jutro je mirno i grad je na broju. Netko je noćas bdio nad svima.',
          'Nitko nije stradao. Ovaj put je grad imao sreće, ali noć će se vratiti.',
        ],
        code,
        round,
        'morning',
      )
  if (silenced.length) {
    const s = joinNames(silenced)
    const plural = silenced.length > 1
    text += ` A ${s} danas ${plural ? 'šute' : 'šuti'}, jer se netko noćas pobrinuo da ne ${plural ? 'progovore' : 'progovori'}.`
  }
  const last = turnsInGame(roles)?.at(-1)
  if (last) text = `${closeEyes(last)} ${text}`
  return { key: `morning-${round}`, label: 'Jutarnje vijesti', text }
}

/** izjednačenje: glasa se ponovno samo između izjednačenih */
export function tieNarration(round: number, tied: string[]): Narration {
  const text = tied.length
    ? `Glasovi su podijeljeni. ${joinNames(tied)}, grad vas ne može razdvojiti. Glasajte ponovno, ali samo između njih.`
    : 'Glasovi su podijeljeni. Glasajte ponovno, ali samo između izjednačenih.'
  return { key: `tie-${round}`, label: 'Izjednačeno', text }
}

/** nakon izbacivanja, prije noći */
export function farewellNarration(round: number, nickname: string): Narration {
  return {
    key: `farewell-${round}`,
    label: 'Odluka grada',
    text: `${nickname} odlazi iz grada. Je li grad odlučio dobro, saznat ćete uskoro.`,
  }
}

export function endNarration(winner: Winner | null): Narration {
  const text =
    winner === 'MAFIA_WIN'
      ? 'Posljednja svjetla su se ugasila. Grad sada pripada mafiji, a istina je stigla prekasno.'
      : winner === 'CITIZENS_WIN'
        ? 'Sjene su se povukle. Mafija je otkrivena i grad napokon može mirno spavati.'
        : 'Igra je gotova. Grad sada zna svoju sudbinu.'
  return { key: 'end', label: 'Kraj igre', text }
}
