import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { EASE_OUT, EASE_SPRING } from '../../lib/motion.ts'
import ThemedPortal from '../ThemedPortal.tsx'


// Trajanje iz spec 8: ekran ispod se mijenja u 1,1 s, overlay nestaje od 2,1 s
const SWAP_MS = 1100
const OUT_MS = 2100
const DONE_MS = 2700

const SKY = {
  night: 'linear-gradient(180deg,#07081a 0,#151033 55%,#2a0f24 100%)',
  day: 'linear-gradient(180deg,#4a2a12 0,#2a1c12 55%,#1B1713 100%)',
}
const ORBIT = {
  night: {
    background: 'radial-gradient(circle at 38% 34%,#fff 0,#FFB3BA 34%,#FF4D5E 100%)',
    boxShadow: '0 0 120px 20px rgba(255,77,94,.35)',
  },
  day: {
    background: 'radial-gradient(circle at 40% 38%,#FFF4D6 0,#FFCF7A 45%,#FFB547 100%)',
    boxShadow: '0 0 140px 40px rgba(255,181,71,.4)',
  },
}

type PhaseTransitionProps = {
  kind: 'night' | 'day'
  /** npr. "Noć 1" */
  title: string
  subtitle: string
  /** usred prijelaza, dok je ekran prekriven: tu se zamijeni sadržaj ispod */
  onSwap: () => void
  onDone: () => void
}

// Full-screen prijelaz noć ↔ dan (spec 8). Pozivatelj ga ne prikazuje uz prefers-reduced-motion.
export default function PhaseTransition({ kind, title, subtitle, onSwap, onDone }: PhaseTransitionProps) {
  const [out, setOut] = useState(false)
  // ref da nove funkcije iz roditelja ne pokreću odbrojavanje ispočetka
  const callbacks = useRef({ onSwap, onDone })
  useEffect(() => {
    callbacks.current = { onSwap, onDone }
  })

  useEffect(() => {
    const timers = [
      window.setTimeout(() => callbacks.current.onSwap(), SWAP_MS),
      window.setTimeout(() => setOut(true), OUT_MS),
      window.setTimeout(() => callbacks.current.onDone(), DONE_MS),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <ThemedPortal>
      <motion.div
        role="status"
        aria-label={title}
        className="fixed inset-0 z-[80] overflow-hidden"
        animate={{ opacity: out ? 0 : 1 }}
        transition={{ duration: 0.55, ease: EASE_OUT }}
      >
        <motion.div
          className="absolute inset-0"
          style={{ background: SKY[kind] }}
          initial={{ clipPath: 'circle(0% at 50% 100%)' }}
          animate={{ clipPath: 'circle(150% at 50% 100%)' }}
          transition={{ duration: 0.95, ease: EASE_OUT }}
        />
        <motion.div
          className="absolute top-[30%] left-1/2 -ml-[60px] size-[120px] rounded-full"
          style={ORBIT[kind]}
          initial={{ opacity: 0, y: 180, scale: 0.7 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1.3, delay: 0.35, ease: EASE_OUT }}
        />
        <div className="absolute inset-x-0 top-[52%] text-center text-white">
          <h2 aria-hidden="true" className="text-[64px] leading-none font-bold tracking-[-.045em]">
            {[...title].map((char, i) => (
              <motion.span
                key={i}
                className="inline-block"
                initial={{ opacity: 0, y: '40%', rotate: 6 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{ duration: 0.7, delay: i * 0.055 + 0.55, ease: EASE_SPRING }}
              >
                {char === ' ' ? ' ' : char}
              </motion.span>
            ))}
          </h2>
          <motion.p
            className="mt-3 text-[17px] text-white/85"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1, ease: EASE_OUT }}
          >
            {subtitle}
          </motion.p>
        </div>
      </motion.div>
    </ThemedPortal>
  )
}
