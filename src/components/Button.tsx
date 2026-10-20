import { useReducedMotion } from 'framer-motion'
import { useRef, useState, type ComponentProps, type MouseEvent } from 'react'
import { cx } from '../lib/cx.ts'
import { buttonClasses, type ButtonSize, type ButtonVariant } from './buttonStyles.ts'

type ButtonProps = ComponentProps<'button'> & {
  variant?: ButtonVariant
  size?: ButtonSize
}

type Ripple = { id: number; x: number; y: number; d: number }

export default function Button({
  variant = 'primary',
  size = 'lg',
  type = 'button',
  className = '',
  onClick,
  children,
  ...rest
}: ButtonProps) {
  const reduceMotion = useReducedMotion()
  const [ripples, setRipples] = useState<Ripple[]>([])
  const nextId = useRef(0)

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    if (!reduceMotion) {
      const r = e.currentTarget.getBoundingClientRect()
      const d = Math.max(r.width, r.height)
      // klik s tipkovnice nema koordinate – tada ripple kreće iz sredine
      const x = (e.clientX || r.left + r.width / 2) - r.left - d / 2
      const y = (e.clientY || r.top + r.height / 2) - r.top - d / 2
      setRipples((list) => [...list, { id: nextId.current++, x, y, d }])
    }
    onClick?.(e)
  }

  return (
    <button
      type={type}
      className={cx(buttonClasses(variant, size), className)}
      onClick={handleClick}
      {...rest}
    >
      {children}
      {ripples.map((r) => (
        <span
          key={r.id}
          aria-hidden="true"
          className="pointer-events-none absolute animate-ripple rounded-full bg-current opacity-18"
          style={{ left: r.x, top: r.y, width: r.d, height: r.d }}
          onAnimationEnd={() => setRipples((list) => list.filter((x) => x.id !== r.id))}
        />
      ))}
    </button>
  )
}
