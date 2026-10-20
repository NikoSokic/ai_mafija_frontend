import { motion } from 'framer-motion'
import ThemeRoot from '../components/ThemeRoot.tsx'
import { useGameStore } from '../store/gameStore.ts'

export default function HomePage() {
  const connected = useGameStore((s) => s.connected)

  return (
    <ThemeRoot theme="night">
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 text-neutral-100">
        <motion.h1
          className="text-4xl font-bold"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          AI Mafija
        </motion.h1>
        <p className="text-sm text-neutral-400">
          WebSocket: {connected ? 'spojeno' : 'nije spojeno'}
        </p>
      </main>
    </ThemeRoot>
  )
}
