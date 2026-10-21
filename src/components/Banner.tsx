import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { riseItem } from '../lib/motion.ts'
import { Icon, type IconName } from './icons.tsx'

type BannerProps = { icon: IconName; title: string; children: ReactNode }

// Obavijest na vrhu ekrana (prototip .banner): utišan si, promatraš igru, izjednačeno…
export default function Banner({ icon, title, children }: BannerProps) {
  return (
    <motion.div
      variants={riseItem}
      className="mb-3.5 flex items-start gap-3 rounded-tile border border-accent/40 bg-accent-soft px-4 py-3.5"
    >
      <span className="mt-px animate-pulse-soft text-accent">
        <Icon name={icon} size={22} />
      </span>
      <div>
        <h4 className="text-[15px] font-semibold">{title}</h4>
        <p className="mt-0.5 text-sm leading-[1.4] text-muted">{children}</p>
      </div>
    </motion.div>
  )
}
