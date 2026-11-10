import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { cx } from '../lib/cx.ts'
import { riseItem, riseList } from '../lib/motion.ts'
import FullscreenButton from './FullscreenButton.tsx'

// Okvir ekrana iz prototipa (.screen / .top / .body / .cta): zaglavlje, sadržaj koji se skrola
// i fiksno podnožje. Djeca s varijantom riseItem ulaze jedno za drugim (spec 8).
// Na desktopu (lg:) je okvir širi (do 1280 px) s većim razmacima; mobitel ostaje do 420 px.
// overflow-visible na desktopu: grad i tlo ispod njega izlaze iz okvira preko cijele širine prozora.

type ScreenProps = { children: ReactNode; className?: string }

export function Screen({ children, className = '' }: ScreenProps) {
  return (
    <motion.div
      variants={riseList}
      initial="hidden"
      animate="show"
      className={cx('relative mx-auto flex h-dvh w-full max-w-[420px] flex-col overflow-hidden lg:max-w-[1280px] lg:overflow-visible', className)}
    >
      {children}
    </motion.div>
  )
}

export function ScreenTop({ children }: { children: ReactNode }) {
  return (
    <div className="relative z-[3] flex h-[calc(60px+env(safe-area-inset-top))] shrink-0 items-center gap-1.5 pt-[env(safe-area-inset-top)] pr-2.5 pl-2 lg:h-[76px] lg:gap-3 lg:px-8">
      {children}
      <FullscreenButton />
    </div>
  )
}

type ScreenBodyProps = {
  children: ReactNode
  /** grad je ispod sadržaja – sadržaj se skrola iza njega (spec 5) */
  withSky?: boolean
}

export function ScreenBody({ children, withSky = false }: ScreenBodyProps) {
  return (
    <div
      className={cx(
        'relative z-[2] flex-1 overflow-x-hidden overflow-y-auto px-5 pt-1 lg:px-10 lg:pt-4',
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        withSky ? 'pb-[140px] lg:pb-[clamp(180px,26vh,280px)]' : 'pb-6 lg:pb-10',
      )}
    >
      {children}
    </div>
  )
}

type ScreenFooterProps = {
  children: ReactNode
  /** podnožje ulazi zajedno s ostalim elementima ekrana */
  rise?: boolean
  className?: string
}

export function ScreenFooter({ children, rise = false, className = '' }: ScreenFooterProps) {
  return (
    <motion.footer
      variants={rise ? riseItem : undefined}
      className={cx(
        'relative z-[3] flex shrink-0 flex-col gap-2.5 px-5 pt-3 pb-[calc(18px+env(safe-area-inset-bottom))]',
        'lg:gap-3 lg:px-10 lg:pt-4 lg:pb-8',
        // desktop: "tlo" ispod grada (bg-sky) ide preko cijele širine prozora, kao i grad – sjena iste boje,
        // odrezana na visinu podnožja. Bez novog elementa, pa se mobitel ne mijenja.
        'lg:[&.bg-sky]:shadow-[0_0_0_100vmax_var(--sky)] lg:[&.bg-sky]:[clip-path:inset(0_-100vmax)]',
        className,
      )}
    >
      {children}
    </motion.footer>
  )
}
