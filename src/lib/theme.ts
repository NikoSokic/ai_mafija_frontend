import { createContext, useContext } from 'react'

export type Theme = 'night' | 'day'

// Tema najbližeg ThemeRoota – trebaju je overlayi u portalu (Sheet, Toast) i Particles
export const ThemeContext = createContext<Theme>('night')

export function useTheme() {
  return useContext(ThemeContext)
}
