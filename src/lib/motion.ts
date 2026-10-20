import type { Variants } from 'framer-motion'

export const EASE_OUT: [number, number, number, number] = [0.2, 0.8, 0.2, 1]

// Ulaz ekrana (spec 8): elementi se dižu jedan za drugim s razmakom 70 ms.
// Varijante se pokreću samo pri mountu, pa re-render ne ponavlja animaciju.
export const riseList: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}

export const riseItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } },
}
