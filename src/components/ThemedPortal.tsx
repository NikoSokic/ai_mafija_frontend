import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTheme } from '../lib/theme.ts'

// Overlayi idu u <body>, iznad svega i neovisno o transformacijama roditelja.
// data-theme zadržava boje teme najbližeg ThemeRoota.
export default function ThemedPortal({ children }: { children: ReactNode }) {
  const theme = useTheme()
  return createPortal(
    <div data-theme={theme} className="font-sans text-text">
      {children}
    </div>,
    document.body,
  )
}
