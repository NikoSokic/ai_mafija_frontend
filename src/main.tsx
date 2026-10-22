import { MotionConfig } from 'framer-motion'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* framer-motion poštuje prefers-reduced-motion (bez pomaka, ostaje samo prozirnost) */}
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </MotionConfig>
  </StrictMode>,
)

// Tipkovnica na mobitelu ne smije prekriti polje koje se upisuje (CodeInput, nadimak)
document.addEventListener('focusin', (e) => {
  const el = e.target
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return
  window.setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'auto' }), 300)
})
