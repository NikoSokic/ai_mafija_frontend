import { motion, useAnimationControls } from 'framer-motion'
import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from 'react'
import { cx } from '../lib/cx.ts'

// Kod sobe ima samo A–Z i 0–9
const clean = (text: string) => text.replace(/[^a-z0-9]/gi, '').toUpperCase()

type CodeInputProps = {
  /** jedan znak po polju, '' za prazno; broj polja = duljina niza */
  value: string[]
  onChange: (value: string[]) => void
  /** Enter u bilo kojem polju */
  onSubmit: () => void
  error?: boolean
  /** svako povećanje broja zatrese polja (greška) */
  shake?: number
  'aria-describedby'?: string
}

// Upis koda sobe u 6 polja (spec 4): velika slova, prelazak na sljedeće polje,
// Backspace na prethodno, lijepljenje cijelog koda
export default function CodeInput({
  value,
  onChange,
  onSubmit,
  error = false,
  shake = 0,
  'aria-describedby': describedBy,
}: CodeInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const controls = useAnimationControls()

  // uz reduced motion MotionConfig preskoči pomak, pa ostaju samo crveni rubovi
  useEffect(() => {
    if (shake > 0) void controls.start({ x: [0, -8, 8, -8, 8, 0], transition: { duration: 0.45 } })
  }, [shake, controls])

  // Sheet pri otvaranju fokusira sebe, pa prvo polje dobiva fokus kad sheet uđe
  useEffect(() => {
    const t = window.setTimeout(() => refs.current[0]?.focus(), 350)
    return () => clearTimeout(t)
  }, [])

  const focus = (i: number) => refs.current[Math.max(0, Math.min(value.length - 1, i))]?.focus()

  // Cijeli kod (lijepljenje, automatsko popunjavanje) ide od prvog polja
  function fill(text: string) {
    const chars = clean(text).slice(0, value.length).split('')
    onChange(value.map((_, k) => chars[k] ?? ''))
    focus(chars.length)
  }

  function change(i: number, raw: string) {
    const chars = clean(raw)
    if (chars.length > 2) return fill(chars)
    const old = value[i]
    // u puno polje dopiše se drugi znak – ostaje onaj novi
    const next = chars.length === 2 && old ? (chars.startsWith(old) ? chars[1] : chars[0]) : chars
    onChange(value.map((c, k) => (k === i ? next : c)))
    if (next) focus(i + 1)
  }

  function keyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      onSubmit()
    } else if (e.key === 'Backspace' && !value[i] && i > 0) {
      e.preventDefault()
      onChange(value.map((c, k) => (k === i - 1 ? '' : c)))
      focus(i - 1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      focus(i - 1)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      focus(i + 1)
    }
  }

  function paste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    fill(e.clipboardData.getData('text'))
  }

  return (
    <motion.div animate={controls} className="mt-1.5 mb-2.5 flex justify-center gap-2">
      {value.map((char, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          value={char}
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          aria-label={`Znak ${i + 1}`}
          aria-invalid={error}
          aria-describedby={describedBy}
          onFocus={(e) => e.target.select()}
          onChange={(e) => change(i, e.target.value)}
          onKeyDown={(e) => keyDown(i, e)}
          onPaste={paste}
          className={cx(
            'h-15 w-[46px] min-w-0 rounded-[14px] border bg-bg text-center text-[28px] font-bold uppercase caret-accent',
            '[transition:border-color_.2s,box-shadow_.2s] focus:border-accent focus:shadow-[0_0_0_4px_var(--accent-soft)]',
            error ? 'border-accent' : 'border-line',
          )}
        />
      ))}
    </motion.div>
  )
}
