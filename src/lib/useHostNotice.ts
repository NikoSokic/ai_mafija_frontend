import { useEffect, useRef } from 'react'

// Obavijest kad ovaj igrač postane domaćin (HOST_CHANGED). `becameHost` je brojač iz gameStorea;
// vrijednost koja je već bila na ekranu pri otvaranju ne prikazuje se ponovno.
export function useHostNotice(becameHost: number, show: (title: string, text: string) => void) {
  const seen = useRef(becameHost)
  useEffect(() => {
    if (becameHost === seen.current) return
    seen.current = becameHost
    show('Sad si ti domaćin.', '')
  }, [becameHost, show])
}
