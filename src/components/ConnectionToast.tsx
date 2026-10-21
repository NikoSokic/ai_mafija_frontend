import { useState } from 'react'
import { useGameStore } from '../store/gameStore.ts'
import { Icon } from './icons.tsx'
import Toast, { Spinner } from './Toast.tsx'

// Prekid veze s poslužiteljem i povratak (spec 6.10), stanje veze je u gameStoreu
export default function ConnectionToast() {
  const connection = useGameStore((s) => s.connection)
  const [toast, setToast] = useState<'off' | 'lost' | 'back'>('off')
  const [prev, setPrev] = useState(connection)
  if (connection !== prev) {
    setPrev(connection)
    if (connection === 'disconnected') setToast('lost')
    else if (connection === 'connected' && toast === 'lost') setToast('back')
  }

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
      title={back ? 'Ponovno si u igri' : 'Veza je prekinuta'}
      text={back ? 'Ništa nisi propustio.' : 'Spajam te ponovno u igru…'}
    />
  )
}
