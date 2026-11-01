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

    // iPhone vraća stranicu iz bfcachea bez visibilitychange; tada se stanje također treba dohvatiti
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) onVisibility()
    }

    acquire()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pageshow', onPageShow)
    window.addEventListener('online', onWake)
    return () => {
      active = false
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pageshow', onPageShow)
      window.removeEventListener('online', onWake)
      void lock?.release()
    }
  }, [onWake])
}
