import { create } from 'zustand'

interface GameState {
  connected: boolean
  setConnected: (connected: boolean) => void
}

export const useGameStore = create<GameState>((set) => ({
  connected: false,
  setConnected: (connected) => set({ connected }),
}))
