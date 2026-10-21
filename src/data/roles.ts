import type { IconName } from '../components/icons.tsx'

// Ključevi su točni nazivi uloga iz baze (role.name) – backend uspoređuje po imenu
export type RoleKey = 'Mafia' | 'Dama' | 'Doktor' | 'Policajac' | 'Novinar' | 'Građanin'

export type Team = 'mafia' | 'town'

export type RoleAction = 'KILL' | 'SILENCE' | 'SAVE' | 'INVESTIGATE' | 'COMPARE'

export type RoleInfo = {
  name: string
  team: Team
  color: string
  icon: IconName
  /** redoslijed buđenja noću; null = nema noćnu akciju */
  order: number | null
  action: RoleAction | null
  short: string
  long: string
}

export const ROLES: Record<RoleKey, RoleInfo> = {
  Mafia: {
    name: 'Mafija',
    team: 'mafia',
    color: 'var(--role-mafia)',
    icon: 'hat',
    order: 1,
    action: 'KILL',
    short: 'Svake noći s timom uklanja jednog igrača.',
    long: 'Svake noći s ostatkom mafije bira jednog igrača kojeg uklanja.',
  },
  Dama: {
    name: 'Dama',
    team: 'mafia',
    color: 'var(--role-dama)',
    icon: 'mask',
    order: 2,
    action: 'SILENCE',
    short: 'Utišava igrača: idući dan ne govori i ne glasa.',
    long: 'Dok je mafija živa, svake noći utiša jednog igrača: idući dan on ne govori i ne glasa. Kad mafija padne, preuzima ubijanje. Policajcu izgleda nevino dok je mafija živa.',
  },
  Doktor: {
    name: 'Doktor',
    team: 'town',
    color: 'var(--role-doktor)',
    icon: 'cross',
    order: 3,
    action: 'SAVE',
    short: 'Svake noći štiti jednog igrača.',
    long: 'Svake noći štiti jednog igrača od napada mafije. Ako dva doktora zaštite istog igrača, on umire od predoziranja.',
  },
  Policajac: {
    name: 'Policajac',
    team: 'town',
    color: 'var(--role-policajac)',
    icon: 'search',
    order: 4,
    action: 'INVESTIGATE',
    short: 'Provjerava je li igrač mafija.',
    long: 'Svake noći provjerava jednog igrača i saznaje je li mafija.',
  },
  Novinar: {
    name: 'Novinar',
    team: 'town',
    color: 'var(--role-novinar)',
    icon: 'news',
    order: 5,
    action: 'COMPARE',
    short: 'Uspoređuje dva igrača.',
    long: 'Svake noći uspoređuje dva igrača i saznaje jesu li u istom timu.',
  },
  Građanin: {
    name: 'Građanin',
    team: 'town',
    color: 'var(--role-gradanin)',
    icon: 'house',
    order: null,
    action: null,
    short: 'Nema noćnu akciju.',
    long: 'Nema noćnu akciju. Danju raspravlja, traži mafiju i glasa.',
  },
}

export const ROLE_KEYS = Object.keys(ROLES) as RoleKey[]

export function isRoleKey(name: string): name is RoleKey {
  return name in ROLES
}
