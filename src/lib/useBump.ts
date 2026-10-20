import { useState } from 'react'

// Broji promjene vrijednosti (0 pri prvom prikazu). Koristi se kao `key` elementa s animacijom
// "poskoka": novi key ponovno pokreće animaciju, a pri ulasku na ekran broj ne poskoči.
export function useBump(value: unknown) {
  const [prev, setPrev] = useState(value)
  const [count, setCount] = useState(0)
  if (value !== prev) {
    setPrev(value)
    setCount(count + 1)
  }
  return count
}
