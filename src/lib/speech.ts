import { useSyncExternalStore } from 'react'

// Glas naratora (spec 7): Web Speech API na hrvatskom.
// Bez hrvatskog glasa narator ne govori, samo piše tekst.

const synth = () => (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null)

// voiceURI kao tekst, jer getVoices() može svaki put vratiti nove objekte (snapshot mora biti stabilan)
function croatianVoiceUri(): string | null {
  try {
    return synth()?.getVoices().find((v) => /^hr/i.test(v.lang))?.voiceURI ?? null
  } catch {
    return null
  }
}

// Chrome popis glasova puni naknadno i javlja to događajem voiceschanged
function subscribe(onChange: () => void) {
  const s = synth()
  if (!s) return () => {}
  s.addEventListener('voiceschanged', onChange)
  return () => s.removeEventListener('voiceschanged', onChange)
}

/** voiceURI hrvatskog glasa ili null ako ga uređaj nema */
export function useCroatianVoice() {
  return useSyncExternalStore(subscribe, croatianVoiceUri, () => null)
}

/** izgovori tekst; onEnd se zove i kad govor završi i kad ga se prekine */
export function speak(text: string, voiceUri: string, onStart: () => void, onEnd: () => void) {
  const s = synth()
  if (!s) return
  try {
    s.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'hr-HR'
    u.rate = 1.02
    const voice = s.getVoices().find((v) => v.voiceURI === voiceUri)
    if (voice) u.voice = voice
    u.onstart = onStart
    u.onend = onEnd
    u.onerror = onEnd
    s.speak(u)
  } catch {
    onEnd()
  }
}

export function cancelSpeech() {
  try {
    synth()?.cancel()
  } catch {
    // nema govora
  }
}
