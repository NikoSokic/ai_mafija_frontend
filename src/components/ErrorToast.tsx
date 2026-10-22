import { useCallback, useMemo, useState } from 'react'
import { Icon } from './icons.tsx'
import Toast from './Toast.tsx'

type ErrorState = { open: boolean; title: string; text: string }

// Toast za grešku REST poziva: show(naslov, describeError(e, code))
export function useErrorToast() {
  const [error, setError] = useState<ErrorState>({ open: false, title: '', text: '' })
  const show = useCallback((title: string, text: string) => setError({ open: true, title, text }), [])
  const toast = useMemo(
    () => (
      <Toast
        open={error.open}
        onClose={() => setError((e) => ({ ...e, open: false }))}
        duration={4000}
        leading={
          <span className="text-accent">
            <Icon name="info" size={22} />
          </span>
        }
        title={error.title}
        text={error.text}
      />
    ),
    [error],
  )
  return { toast, show }
}
