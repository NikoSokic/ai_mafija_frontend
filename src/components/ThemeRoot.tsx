import type { ReactNode } from 'react'
import { ThemeContext, type Theme } from '../lib/theme.ts'

type ThemeRootProps = {
  theme: Theme
  children: ReactNode
  className?: string
}

// Postavlja data-theme (boje iz index.css) i pozadinu s blagim sjajem neba gore desno.
// Temu daje i kroz ThemeContext, za overlaye koji se renderiraju u portalu.
export default function ThemeRoot({ theme, children, className = '' }: ThemeRootProps) {
  return (
    <ThemeContext value={theme}>
      <div
        data-theme={theme}
        className={`relative isolate min-h-dvh bg-bg text-text transition-colors duration-700 ease-out-soft ${className}`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(130%_55%_at_70%_-8%,var(--sky-top),transparent_62%)]"
        />
        {children}
      </div>
    </ThemeContext>
  )
}
