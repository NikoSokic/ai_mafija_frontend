import { motion } from 'framer-motion'
import { cx } from '../lib/cx.ts'
import { EASE_SPRING } from '../lib/motion.ts'


type CodeTilesProps = {
  code: string
  /** veće pločice (Lobby na desktopu) */
  large?: boolean
  className?: string
}

// Kod sobe kao 6 pločica; pri ulasku se "preklope" prema gledatelju jedna za drugom (spec 8)
export default function CodeTiles({ code, large = false, className = '' }: CodeTilesProps) {
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
          className={cx(
            'grid place-items-center border border-line bg-surface font-bold tracking-[-.02em]',
            large ? 'h-[76px] w-[56px] rounded-[16px] text-[38px]' : 'h-[62px] w-[46px] rounded-[14px] text-[30px]',
          )}
        >
          {char}
        </motion.span>
      ))}
    </div>
  )
}
