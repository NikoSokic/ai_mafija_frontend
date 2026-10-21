import { useId, useState } from 'react'
import { useNavigate } from 'react-router'
import { describeError, joinLobby } from '../api/rest.ts'
import { saveSession } from '../store/session.ts'
import Button from './Button.tsx'
import CodeInput from './CodeInput.tsx'
import Sheet from './Sheet.tsx'

const CODE_LENGTH = 6
const emptyCode = () => Array<string>(CODE_LENGTH).fill('')

type JoinSheetProps = {
  open: boolean
  onClose: () => void
  /** nadimak iz profila, Početna ga provjeri prije otvaranja */
  nickname: string
}

// "Uđi s kodom" na Početnoj. Sadržaj se montira pri svakom otvaranju, pa kreće prazan.
export default function JoinSheet({ open, onClose, nickname }: JoinSheetProps) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Uđi s kodom"
      subtitle="Upiši šesteroznamenkasti kod koji ti je poslao domaćin."
    >
      <JoinCodeForm nickname={nickname} />
    </Sheet>
  )
}

function JoinCodeForm({ nickname }: { nickname: string }) {
  const navigate = useNavigate()
  const [chars, setChars] = useState(emptyCode)
  const [error, setError] = useState<string | null>(null)
  const [shake, setShake] = useState(0)
  const [sending, setSending] = useState(false)
  const errorId = useId()

  function fail(message: string) {
    setError(message)
    setShake((n) => n + 1)
  }

  async function submit() {
    if (sending) return
    const code = chars.join('')
    if (code.length < CODE_LENGTH) return fail('Upiši svih šest znakova.')
    setSending(true)
    setError(null)
    try {
      const res = await joinLobby(code, nickname)
      saveSession({ playerId: res.playerId, playerToken: res.playerToken, lobbyCode: res.lobbyCode })
      navigate(`/soba/${res.lobbyCode}`)
    } catch (e) {
      fail(describeError(e, code))
      setSending(false)
    }
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
      <p id={errorId} role="alert" className="mb-3 min-h-5 text-center text-sm leading-[1.45] text-accent">
        {error}
      </p>
      <Button disabled={sending} onClick={submit}>
        {sending ? 'Ulazim u sobu…' : 'Uđi u sobu'}
      </Button>
    </>
  )
}
