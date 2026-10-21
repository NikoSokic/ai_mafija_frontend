import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { riseItem } from '../lib/motion.ts'

type SectionProps = { title?: string; aside?: string; children: ReactNode }

// Odjeljak ekrana (prototip .section): naslov, broj s desne strane i sadržaj
export default function Section({ title, aside, children }: SectionProps) {
  return (
    <motion.section variants={riseItem} className="mt-[26px] first:mt-2">
      {title && (
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h3 className="text-[15px] font-semibold">{title}</h3>
          {aside && <span className="text-sm text-muted tabular-nums">{aside}</span>}
        </div>
      )}
      {children}
    </motion.section>
  )
}
