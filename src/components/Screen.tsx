import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { cx } from '../lib/cx.ts'
import { riseItem, riseList } from '../lib/motion.ts'

// Okvir ekrana iz prototipa (.screen / .top / .body / .cta): zaglavlje, sadržaj koji se skrola
// i fiksno podnožje. Djeca s varijantom riseItem ulaze jedno za drugim (spec 8).

type ScreenProps = { children: ReactNode; className?: string }

export function Screen({ children, className = '' }: ScreenProps) {
  return (
    <motion.div
      variants={riseList}
      initial="hidden"
      animate="show"
      className={cx('relative mx-auto flex h-dvh w-full max-w-[420px] flex-col overflow-hidden', className)}
    >
      {children}
    </motion.div>
  )
}

export function ScreenTop({ children }: { children: ReactNode }) {
  return (
    <div className="relative z-[3] flex h-[calc(60px+env(safe-area-inset-top))] shrink-0 items-center gap-1.5 pt-[env(safe-area-inset-top)] pr-2.5 pl-2">{children}</div>
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
        'relative z-[2] flex-1 overflow-x-hidden overflow-y-auto px-5 pt-1',
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        withSky ? 'pb-[140px]' : 'pb-6',
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
        className,
      )}
    >
      {children}
    </motion.footer>
  )
}
