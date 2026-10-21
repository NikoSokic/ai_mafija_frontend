// Sekunde kao "2:30" – timer rasprave i preostalo vrijeme glasanja
export const formatSeconds = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
