import { motion } from 'framer-motion'
import { cx } from '../lib/cx.ts'

const EASE_SPRING: [number, number, number, number] = [0.34, 1.56, 0.64, 1]

type CodeTilesProps = { code: string; className?: string }

// Kod sobe kao 6 pločica; pri ulasku se "preklope" prema gledatelju jedna za drugom (spec 8)
export default function CodeTiles({ code, className = '' }: CodeTilesProps) {
  return (
    <div className={cx('flex justify-center gap-2', className)}>
      {/* čitač ekrana čita znak po znak, a ne kao riječ */}
      <span className="sr-only">{code.split('').join(' ')}</span>
      {code.split('').map((char, i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          initial={{ opacity: 0, y: 18, rotateX: 70 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.55, ease: EASE_SPRING, delay: 0.12 + i * 0.065 }}
          className="grid h-[62px] w-[46px] place-items-center rounded-[14px] border border-line bg-surface text-[30px] font-bold tracking-[-.02em]"
        >
          {char}
        </motion.span>
      ))}
    </div>
  )
}
