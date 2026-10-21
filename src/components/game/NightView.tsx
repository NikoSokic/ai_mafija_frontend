import { motion } from 'framer-motion'
import type { RoleKey } from '../../data/roles.ts'
import { riseItem } from '../../lib/motion.ts'
import { Screen, ScreenBody } from '../Screen.tsx'
import PhaseHeader from './PhaseHeader.tsx'

// Privremeni prikaz noći – akcije, spavanje i promatrač dolaze u idućem koraku
export default function NightView({ round, role }: { round: number; role: RoleKey | null }) {
  return (
    <Screen>
      <PhaseHeader icon="moon" title={`Noć ${round}`} role={role} />
      <ScreenBody>
        <motion.h1 variants={riseItem} className="text-[30px] font-bold tracking-[-.03em]">
          Noć {round}
        </motion.h1>
      </ScreenBody>
    </Screen>
  )
}
