import { motion } from 'framer-motion'
import type { Winner } from '../../api/types.ts'
import { riseItem } from '../../lib/motion.ts'
import { Screen, ScreenBody } from '../Screen.tsx'

// Privremeni prikaz kraja – popis igrača i Igraj ponovno dolaze u idućem koraku
export default function EndView({ winner }: { winner: Winner | null }) {
  const title =
    winner === 'MAFIA_WIN' ? 'Mafija pobjeđuje' : winner === 'CITIZENS_WIN' ? 'Građani pobjeđuju' : 'Kraj igre'
  return (
    <Screen>
      <ScreenBody>
        <motion.h1 variants={riseItem} className="pt-16 text-[54px] leading-none font-bold tracking-[-.045em]">
          {title}
        </motion.h1>
      </ScreenBody>
    </Screen>
  )
}
