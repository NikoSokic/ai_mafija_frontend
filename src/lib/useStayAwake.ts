import { useEffect } from 'react'

// Ekran ostaje upaljen dok traje igra, a povratkom u aplikaciju stanje se odmah dohvaća,
// jer su se događaji mogli propustiti dok je mobitel spavao. Preglednik sam otpusti
// zaključavanje kad se tab sakrije, pa se pri povratku traži ponovno.
export function useStayAwake(onWake: () => void) {
  useEffect(() => {
    let active = true
    let lock: WakeLockSentinel | null = null

    const acquire = () => {
      if (!('wakeLock' in navigator)) return
      navigator.wakeLock
        .request('screen')
        .then((next) => {
          if (!active) {
            void next.release()
            return
          }
          void lock?.release()
          lock = next
        })
        .catch(() => {
          // nema dopuštenja ili štednja baterije: ekran se gasi kao i inače
        })
    }

    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return
      acquire()
      onWake()
    }

    acquire()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      active = false
      document.removeEventListener('visibilitychange', onVisibility)
      void lock?.release()
    }
  }, [onWake])
}
