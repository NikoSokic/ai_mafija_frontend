import { cx } from '../lib/cx.ts'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost'
export type ButtonSize = 'lg' | 'sm' | 'xs'

// .btn iz prototipa. Tailwind v4 scale-* koristi CSS svojstvo `scale`, pa se ono i animira.
const base = [
  'relative isolate flex cursor-pointer items-center justify-center gap-2.5 overflow-hidden font-semibold select-none',
  '[-webkit-tap-highlight-color:transparent]',
  '[transition:scale_.14s_cubic-bezier(.2,.8,.2,1),background-color_.25s,opacity_.25s,box-shadow_.25s]',
  'active:scale-[.97] disabled:pointer-events-none disabled:opacity-38 disabled:shadow-none',
].join(' ')

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-ink shadow-[0_12px_32px_-12px_var(--glow)]',
  secondary: 'bg-surface-2 text-text',
  ghost: 'border border-line text-text',
}

const sizes: Record<ButtonSize, string> = {
  lg: 'h-14 w-full rounded-ctrl text-[17px]',
  // .btn-sm – npr. "Uđi" / "Puna" na kartici javne sobe
  sm: 'h-10 w-auto rounded-xl px-4 text-[15px]',
  // "+30 s" i "Preskoči" uz timer rasprave
  xs: 'h-[34px] w-auto rounded-[10px] px-3 text-[13px]',
}

export function buttonClasses(variant: ButtonVariant, size: ButtonSize = 'lg') {
  return cx(base, variants[variant], sizes[size])
}
