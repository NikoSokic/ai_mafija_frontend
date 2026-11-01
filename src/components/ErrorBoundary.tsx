import { Component, type ErrorInfo, type ReactNode } from 'react'
import { reportError } from '../lib/sentry.ts'
import { cancelSpeech } from '../lib/speech.ts'
import { skipNextResume } from '../store/resume.ts'
import { loadSession } from '../store/session.ts'
import Button from './Button.tsx'
import ThemeRoot from './ThemeRoot.tsx'

type ErrorBoundaryProps = { children: ReactNode }
type ErrorBoundaryState = { failed: boolean }

// Greška u renderiranju inače ostavlja bijeli ekran. Hvata samo greške pri renderiranju;
// greške u handlerima i zahtjevima već idu kroz toastove.
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack)
    reportError(error, info.componentStack)
    // narator ne smije dalje pričati preko ekrana s greškom
    cancelSpeech()
  }

  render() {
    return this.state.failed ? <Fallback /> : this.props.children
  }
}

// Bez routera, jer je i on mogao pući: povratak je puno učitavanje stranice
function Fallback() {
  const session = loadSession()

  function goHome() {
    // bez ovoga bi automatski povratak igrača odmah vratio u igru koja puca
    skipNextResume()
    window.location.assign('/')
  }

  return (
    <ThemeRoot theme="night">
      <main
        role="alert"
        className="mx-auto flex min-h-dvh max-w-[420px] flex-col items-center justify-center gap-4 p-5 text-center"
      >
        <h1 className="text-[26px] font-bold tracking-[-.025em]">Nešto je pošlo po zlu</h1>
        <p className="max-w-[30ch] text-base leading-[1.5] text-muted">
          {session
            ? `Ništa nije izgubljeno, ostaješ u sobi ${session.lobbyCode}. Pokušaj se vratiti u igru.`
            : 'Aplikacija je naišla na grešku. Počni ispočetka s Početne.'}
        </p>
        <div className="mt-2 flex w-full flex-col gap-2.5">
          {session && <Button onClick={() => window.location.reload()}>Vrati se u igru</Button>}
          <Button variant={session ? 'ghost' : 'primary'} onClick={goHome}>
            Na početnu
          </Button>
        </div>
      </main>
    </ThemeRoot>
  )
}
