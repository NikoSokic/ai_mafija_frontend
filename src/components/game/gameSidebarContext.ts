import { createContext, type ReactNode } from 'react'

// GameScreen kroz ovaj kontekst daje bočnu ploču samo na desktopu; na mobitelu je null (GameLayout.tsx)
export const GameSidebarContext = createContext<ReactNode>(null)

// Bočna ploča (320 px) + razmak do sadržaja i desni rub; podnožje toliko odmakne desno,
// pa je gumb centriran ispod kartice, a ne ispod cijelog ekrana
export const GAME_FOOTER = 'lg:pr-[400px]'
