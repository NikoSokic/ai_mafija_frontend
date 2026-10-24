import { useEffect, useState } from 'react'
import { retryConnections } from '../lib/stomp.ts'
import { useGameStore } from '../store/gameStore.ts'
import { Icon } from './icons.tsx'
import Toast, { Spinner } from './Toast.tsx'

// Prekid veze s poslužiteljem i povratak (spec 6.10), stanje veze je u gameStoreu
export default function ConnectionToast() {
  const connection = useGameStore((s) => s.connection)
  const [toast, setToast] = useState<'off' | 'lost' | 'back'>('off')
  const [prev, setPrev] = useState<typeof connection>('connecting')
  if (connection !== prev) {
    setPrev(connection)
    if (connection === 'disconnected') setToast('lost')
    else if (connection === 'connected' && toast === 'lost') setToast('back')
  }

  // Render server koji spava može se buditi do ~50 s; nakon 90 s nudi se ručno ponavljanje
  const [gaveUp, setGaveUp] = useState(false)
  useEffect(() => {
    if (toast !== 'lost') return
    const t = window.setTimeout(() => setGaveUp(true), 90_000)
    return () => {
      clearTimeout(t)
      setGaveUp(false)
    }
  }, [toast])

  const back = toast === 'back'
  return (
    <Toast
      open={toast !== 'off'}
      onClose={() => setToast('off')}
      duration={back ? 2000 : undefined}
      leading={
        back ? (
          <span className="text-role-doktor">
            <Icon name="check" size={22} strokeWidth={2.2} />
          </span>
        ) : (
          <Spinner />
        )
      }
      action={!back && gaveUp ? { label: 'Pokušaj ponovno', onClick: retryConnections } : undefined}
      title={back ? 'Ponovno si u igri' : 'Veza je prekinuta'}
      text={
        back ? 'Ništa nisi propustio.' : gaveUp ? 'Server se ne javlja.' : 'Budim server i spajam te ponovno…'
      }
    />
  )
}
