import { ROLE_KEYS, ROLES } from '../data/roles.ts'
import RoleIcon from './RoleIcon.tsx'
import Sheet from './Sheet.tsx'
import TeamTag from './TeamTag.tsx'

const FLOW = [
  'Noć: uloge se bude jedna po jedna i tajno biraju metu.',
  'Jutro: narator otkriva tko je stradao i tko je utišan.',
  'Dan: svi raspravljaju i traže mafiju.',
  'Glasanje: igrač s najviše glasova ispada ako ima više glasova nego što je suzdržanih. Utišani ne glasaju. Kod izjednačenja glasa se ponovno samo između izjednačenih.',
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
