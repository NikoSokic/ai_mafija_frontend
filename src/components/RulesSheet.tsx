import { ROLE_KEYS, ROLES } from '../data/roles.ts'
import RoleIcon from './RoleIcon.tsx'
import Sheet from './Sheet.tsx'
import TeamTag from './TeamTag.tsx'

const INTRO = [
  'Svatko dobije tajnu ulogu. Mafija zna tko su joj suigrači, ostali ne znaju ništa.',
  'Igra se u rundama: noću uloge tajno djeluju, danju svi raspravljaju i glasaju koga izbaciti.',
  'Kad igrač ispadne, njegova uloga ostaje tajna do kraja igre. Ispali igrači samo gledaju i ne govore.',
]

const FLOW = [
  'Noć: uloge se bude jedna po jedna i tajno biraju metu.',
  'Jutro: narator otkriva tko je stradao i tko je utišan.',
  'Dan: svi raspravljaju i traže mafiju. Glasati se još ne može.',
  'Glasanje: svi glasaju u isto vrijeme, a glasovi su javni. Utišani ne glasaju.',
]

// Objašnjenja koja su igračima najnejasnija
const VOTING = [
  {
    title: 'Suzdržan',
    text: 'Glasaš za nikoga. Tko ne glasa do isteka vremena, računa se kao suzdržan. Igrač ispada samo ako ima više glasova nego što je suzdržanih. Primjer: Lea ima 3 glasa, a 2 su suzdržana, pa Lea ispada. Ako Lea ima 2 glasa, a 2 su suzdržana, nitko ne ispada.',
  },
  {
    title: 'Ponovno glasanje',
    text: 'Ako dva ili više igrača imaju najviše glasova, i to barem po 2, odmah slijedi još jedno glasanje od 60 s, bez rasprave. Glasa se samo između izjednačenih, oni sami ne glasaju i "Suzdržan" više ne postoji. Ako je opet izjednačeno ili nitko ne glasa, nitko ne ispada i počinje noć. Ako izjednačeni imaju samo po jedan glas, glasovi su se raspršili: nema ponovnog glasanja i nitko ne ispada.',
  },
]

type RulesSheetProps = { open: boolean; onClose: () => void }

// Pravila igre: cilj, tijek runde i uloge po redu buđenja
export default function RulesSheet({ open, onClose }: RulesSheetProps) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      showClose
      title="Pravila"
      subtitle="Tim mafije pobjeđuje kad ih je jednako ili više od ostalih. Građani pobjeđuju kad izbace cijeli tim mafije, uključujući Damu."
    >
      <h3 className="mt-1 mb-2.5 text-base font-semibold">Kako se igra</h3>
      <ul className="mb-[22px] grid gap-2 text-[15px] leading-[1.45]">
        {INTRO.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <h3 className="mt-1 mb-2.5 text-base font-semibold">Tijek runde</h3>
      <ol className="mt-1.5 mb-[22px] grid gap-2.5">
        {FLOW.map((step, i) => (
          <li key={i} className="flex items-start gap-3 text-[15px] leading-[1.45]">
            <span className="grid size-[26px] shrink-0 place-items-center rounded-full bg-surface-2 text-[13px] font-bold">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
      <h3 className="mt-1 mb-2.5 text-base font-semibold">Glasanje</h3>
      <div className="mb-[22px] grid gap-3">
        {VOTING.map((item) => (
          <div key={item.title}>
            <h4 className="text-[15px] font-semibold">{item.title}</h4>
            <p className="mt-[3px] text-sm leading-[1.45] text-muted">{item.text}</p>
          </div>
        ))}
      </div>
      <h3 className="mt-1 mb-2.5 text-base font-semibold">Uloge po redu buđenja</h3>
      {ROLE_KEYS.map((k) => (
        <div key={k} className="flex gap-3 border-b border-line py-3 last:border-0">
          <RoleIcon role={k} />
          <div>
            <h4 className="flex items-center gap-2 text-[15px] font-semibold">
              {ROLES[k].name}
              <TeamTag>{ROLES[k].team === 'mafia' ? 'tim mafije' : 'tim građana'}</TeamTag>
            </h4>
            <p className="mt-[3px] text-sm leading-[1.45] text-muted">{ROLES[k].long}</p>
          </div>
        </div>
      ))}
    </Sheet>
  )
}
