import { useSyncExternalStore } from 'react'

// Stariji iPadi i Safari poznaju cijeli ekran samo s prefiksom webkit
type WebkitDocument = Document & {
  webkitFullscreenEnabled?: boolean
  webkitFullscreenElement?: Element | null
  webkitExitFullscreen?: () => void
}
type WebkitElement = HTMLElement & { webkitRequestFullscreen?: () => void }

const doc = () => document as WebkitDocument
const root = () => document.documentElement as WebkitElement

/**
 * fullscreen: preglednik zna cijeli ekran (Android, iPad, računalo)
 * install: iPhone ga ne dopušta za stranice, nego igra ide na početni zaslon
 * none: već je bez adresne trake, ili preglednik to ne može (npr. preglednik unutar druge aplikacije)
 */
export type FullscreenSupport = 'fullscreen' | 'install' | 'none'

function isInstalled() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isIos() {
  // iPad se predstavlja kao Mac, ali ima dodirni ekran
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
}

export function fullscreenSupport(): FullscreenSupport {
  if (isInstalled()) return 'none'
  const canRequest = 'requestFullscreen' in root() || 'webkitRequestFullscreen' in root()
  if (canRequest && (doc().fullscreenEnabled || doc().webkitFullscreenEnabled)) return 'fullscreen'
  return isIos() ? 'install' : 'none'
}

function subscribe(onChange: () => void) {
  document.addEventListener('fullscreenchange', onChange)
  document.addEventListener('webkitfullscreenchange', onChange)
  return () => {
    document.removeEventListener('fullscreenchange', onChange)
    document.removeEventListener('webkitfullscreenchange', onChange)
  }
}

const isFullscreen = () => Boolean(doc().fullscreenElement ?? doc().webkitFullscreenElement)

/** Je li igra sada preko cijelog ekrana; igrač ga može ugasiti i sam (npr. gesta natrag na Androidu) */
export function useIsFullscreen() {
  return useSyncExternalStore(subscribe, isFullscreen)
}

/** Mora se zvati iz dodira igrača. Odbijanje preglednika nije greška: igra samo ostaje kakva jest. */
export function toggleFullscreen() {
  if (isFullscreen()) {
    if (doc().exitFullscreen) void doc().exitFullscreen().catch(() => {})
    else doc().webkitExitFullscreen?.()
  } else if (root().requestFullscreen) {
    void root().requestFullscreen().catch(() => {})
  } else {
    root().webkitRequestFullscreen?.()
  }
}
