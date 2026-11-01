import { useEffect, useId, useState } from 'react'
import { useNavigate } from 'react-router'
import { ApiError, describeError, getReclaimStatus, requestReclaim } from '../api/rest.ts'
import { cx } from '../lib/cx.ts'
import { saveSession } from '../store/session.ts'
import Button from './Button.tsx'
import CodeInput from './CodeInput.tsx'
import { useErrorToast } from './ErrorToast.tsx'
import Sheet from './Sheet.tsx'
import { Spinner } from './Toast.tsx'

const CODE_LENGTH = 6
const POLL_MS = 2000
const emptyCode = () => Array<string>(CODE_LENGTH).fill('')

type ReclaimSheetProps = {
  open: boolean
  onClose: () => void
  /** nadimak iz profila, ako je spremljen na ovom uređaju */
  nickname: string
}

// "Vrati se u igru" na Početnoj: novi ili ispražnjeni mobitel nema token, pa igrač upiše kod sobe i
// nadimak, a domaćin potvrdi da je to on. Sadržaj se montira pri svakom otvaranju, pa kreće prazan.
export default function ReclaimSheet({ open, onClose, nickname }: ReclaimSheetProps) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Vrati se u igru"
      subtitle="Upiši kod sobe i nadimak s kojim si igrao. Domaćin mora potvrditi da si to ti."
    >
      <ReclaimFlow nickname={nickname} onClose={onClose} />
    </Sheet>
  )
}

type Waiting = { code: string; requestId: number; secret: string }

function ReclaimFlow({ nickname, onClose }: { nickname: string; onClose: () => void }) {
  const navigate = useNavigate()
  const [chars, setChars] = useState(emptyCode)
  const [nick, setNick] = useState(nickname)
  const [error, setError] = useState<string | null>(null)
  const [shake, setShake] = useState(0)
  const [sending, setSending] = useState(false)
  const [waiting, setWaiting] = useState<Waiting | null>(null)
  const errorId = useId()
  const nickId = useId()
  const { toast, show } = useErrorToast()

  function fail(message: string) {
    setError(message)
    setShake((n) => n + 1)
  }

  async function submit() {
    if (sending) return
    const code = chars.join('')
    if (code.length < CODE_LENGTH) return fail('Upiši svih šest znakova.')
    if (nick.trim() === '') return fail('Upiši nadimak s kojim si igrao.')
    setSending(true)
    setError(null)
    try {
      const res = await requestReclaim(code, nick.trim())
      setWaiting({ code, requestId: res.requestId, secret: res.claimSecret })
    } catch (e) {
      const message =
        e instanceof ApiError && e.code === 'PLAYER_NOT_FOUND'
          ? 'U toj sobi nema igrača s tim nadimkom.'
          : describeError(e, code)
      fail(message)
      show('Zahtjev nije poslan', message)
    }
    setSending(false)
  }

  // Domaćin je odlučio ili je zahtjev istekao: natrag na obrazac s porukom
  function backToForm(message: string) {
    setWaiting(null)
    fail(message)
  }

  if (waiting) {
    return (
      <>
        <WaitingForHost
          waiting={waiting}
          onApproved={(session) => {
            saveSession(session)
            navigate(`/soba/${session.lobbyCode}`)
          }}
          onFailed={backToForm}
        />
        {toast}
      </>
    )
  }

  return (
    <>
      <CodeInput
        value={chars}
        onChange={(next) => {
          setChars(next)
          setError(null)
        }}
        onSubmit={submit}
        error={error !== null}
        shake={shake}
        aria-describedby={error ? errorId : undefined}
      />
      <label htmlFor={nickId} className="mt-3 mb-2 block text-sm text-muted">
        Nadimak u toj sobi
      </label>
      <input
        id={nickId}
        value={nick}
        maxLength={16}
        autoComplete="nickname"
        onChange={(e) => {
          setNick(e.target.value)
          setError(null)
        }}
        onKeyDown={(e) => e.key === 'Enter' && void submit()}
        className={cx(
          'h-14 w-full rounded-ctrl border bg-bg px-4 text-lg font-medium',
          '[transition:border-color_.2s,box-shadow_.2s] focus:border-accent focus:shadow-[0_0_0_4px_var(--accent-soft)]',
          error ? 'border-accent' : 'border-line',
        )}
      />
      <p id={errorId} role="alert" className="mt-2 mb-3 min-h-5 text-center text-sm leading-[1.45] text-accent">
        {error}
      </p>
      <div className="flex flex-col gap-2.5">
        <Button disabled={sending} onClick={submit}>
          {sending ? 'Šaljem zahtjev…' : 'Pošalji zahtjev domaćinu'}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Odustani
        </Button>
      </div>
      {toast}
    </>
  )
}

type WaitingProps = {
  waiting: Waiting
  onApproved: (session: { playerId: number; playerToken: string; lobbyCode: string }) => void
  onFailed: (message: string) => void
}

// Pita za ishod dok domaćin ne odluči (zahtjev vrijedi 2 min). Novi token stiže jednom, uz APPROVED.
function WaitingForHost({ waiting, onApproved, onFailed }: WaitingProps) {
  const { code, requestId, secret } = waiting

  useEffect(() => {
    let active = true
    let timer: number | undefined

    const poll = () => {
      getReclaimStatus(code, requestId, secret)
        .then((res) => {
          if (!active) return
          if (res.status === 'APPROVED' && res.playerId !== null && res.playerToken && res.lobbyCode) {
            return onApproved({ playerId: res.playerId, playerToken: res.playerToken, lobbyCode: res.lobbyCode })
          }
          if (res.status === 'DENIED') return onFailed('Domaćin je odbio zahtjev.')
          if (res.status === 'EXPIRED') return onFailed('Domaćin nije odgovorio na vrijeme. Pošalji zahtjev ponovno.')
          // CLAIMED: odgovor s tokenom se izgubio, pa treba novo odobrenje
          if (res.status === 'CLAIMED') return onFailed('Zahtjev je već iskorišten. Pošalji ga ponovno.')
          timer = window.setTimeout(poll, POLL_MS)
        })
        .catch((e: unknown) => {
          if (!active) return
          if (e instanceof ApiError && e.status >= 400 && e.status < 500) {
            return onFailed(describeError(e, code))
          }
          // bez veze se samo pokuša ponovno
          timer = window.setTimeout(poll, POLL_MS)
        })
    }

    poll()
    return () => {
      active = false
      window.clearTimeout(timer)
    }
    // zahtjev se ne mijenja dok traje čekanje; callbackovi se ne smiju ponovno pokretati
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, requestId, secret])

  return (
    <div role="status" className="flex flex-col items-center gap-3.5 py-6 text-center">
      <Spinner />
      <p className="animate-breathe text-[17px] font-semibold">Čekam domaćina…</p>
      <p className="max-w-[30ch] text-[13px] leading-[1.45] text-muted">
        Domaćinu se prikazalo pitanje je li to stvarno ti. Ostavi ovaj ekran otvoren.
      </p>
    </div>
  )
}
