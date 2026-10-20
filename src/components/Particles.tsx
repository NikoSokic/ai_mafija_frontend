import { useReducedMotion } from 'framer-motion'
import { useEffect, useImperativeHandle, useRef, type Ref } from 'react'
import { useTheme, type Theme } from '../lib/theme.ts'

export type ParticlesHandle = {
  /** prasak konfeta u bojama trenutne teme (kraj igre) */
  burst: () => void
}

const COUNT = 38
const RGB: Record<Theme, string> = { night: '255,150,160', day: '255,205,140' }

type Dust = { x: number; y: number; r: number; vx: number; vy: number; ph: number }
type Confetti = {
  x: number
  y: number
  vx: number
  vy: number
  s: number
  rot: number
  vr: number
  c: string
  life: number
}

// Canvas iza sadržaja: sitne čestice lebde prema gore i trepere.
// Uz reduced motion se ne prikazuje; kad tab nije vidljiv, petlja stoji.
export default function Particles({ ref }: { ref?: Ref<ParticlesHandle> }) {
  const reduceMotion = useReducedMotion()
  const theme = useTheme()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rgbRef = useRef(RGB[theme])
  const confettiRef = useRef<Confetti[]>([])

  useEffect(() => {
    rgbRef.current = RGB[theme]
  }, [theme])

  useImperativeHandle(
    ref,
    () => ({
      burst() {
        const canvas = canvasRef.current
        if (!canvas) return
        const css = getComputedStyle(canvas)
        const colors = [css.getPropertyValue('--accent').trim(), css.getPropertyValue('--window').trim(), '#ffffff']
        const w = canvas.clientWidth
        const h = canvas.clientHeight
        for (let i = 0; i < 110; i++) {
          const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.9
          const v = 5 + Math.random() * 7
          confettiRef.current.push({
            x: w / 2,
            y: h * 0.26,
            vx: Math.cos(a) * v,
            vy: Math.sin(a) * v,
            s: 5 + Math.random() * 6,
            rot: Math.random() * 6,
            vr: (Math.random() - 0.5) * 0.3,
            c: colors[i % 3],
            life: 90 + Math.random() * 60,
          })
        }
      },
    }),
    [],
  )

  useEffect(() => {
    if (reduceMotion) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    let w = 0
    let h = 0
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    const dust: Dust[] = Array.from({ length: COUNT }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.5 + Math.random() * 1.5,
      vy: -(0.05 + Math.random() * 0.16),
      vx: (Math.random() - 0.5) * 0.08,
      ph: Math.random() * 6.28,
    }))

    let raf = 0
    const frame = (t: number) => {
      ctx.clearRect(0, 0, w, h)
      for (const p of dust) {
        p.x += p.vx
        p.y += p.vy
        if (p.y < -4) {
          p.y = h + 4
          p.x = Math.random() * w
        }
        const alpha = 0.25 + 0.25 * Math.sin(t / 900 + p.ph)
        ctx.fillStyle = `rgba(${rgbRef.current},${alpha})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }

      confettiRef.current = confettiRef.current.filter((c) => c.life > 0)
      for (const c of confettiRef.current) {
        c.vy += 0.16 // gravitacija
        c.vx *= 0.99
        c.x += c.vx
        c.y += c.vy
        c.rot += c.vr
        c.life--
        ctx.save()
        ctx.globalAlpha = Math.min(1, c.life / 40)
        ctx.translate(c.x, c.y)
        ctx.rotate(c.rot)
        ctx.fillStyle = c.c
        ctx.fillRect(-c.s / 2, -c.s / 4, c.s, c.s / 2)
        ctx.restore()
      }
      raf = requestAnimationFrame(frame)
    }

    const start = () => {
      if (!raf && !document.hidden) raf = requestAnimationFrame(frame)
    }
    const stop = () => {
      cancelAnimationFrame(raf)
      raf = 0
    }
    const onVisibility = () => (document.hidden ? stop() : start())

    start()
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      stop()
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [reduceMotion])

  if (reduceMotion) return null
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-5 size-full"
    />
  )
}
