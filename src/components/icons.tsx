import type { ReactNode } from 'react'

// Ručno nacrtane ikone iz prototipa (viewBox 24, stroke currentColor)
const ICONS = {
  hat: (
    <>
      <path d="M3 15.5c0 1.6 4 2.9 9 2.9s9-1.3 9-2.9" />
      <path d="M5.6 15.2 7.1 8c.3-1.4 1.7-2.2 3-1.7l1.9.6 1.9-.6c1.3-.5 2.7.3 3 1.7l1.5 7.2" />
      <path d="M6.4 12.2c3.6 1.1 7.6 1.1 11.2 0" />
    </>
  ),
  mask: (
    <>
      <path d="M2.5 9.5C2.5 8.1 3.6 7 5 7c2 0 3.5 1.2 7 1.2S17 7 19 7c1.4 0 2.5 1.1 2.5 2.5 0 4.2-2.6 7.5-5.6 7.5-1.9 0-2.9-1.6-3.9-1.6s-2 1.6-3.9 1.6c-3 0-5.6-3.3-5.6-7.5Z" />
      <path d="M6.5 11.5c.9-.8 2.3-.8 3.2 0M14.3 11.5c.9-.8 2.3-.8 3.2 0" />
    </>
  ),
  cross: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <path d="M12 8.5v7M8.5 12h7" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </>
  ),
  news: (
    <>
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
      <path d="M18 14h-8M15 18h-5M10 6h8v4h-8V6Z" />
    </>
  ),
  house: <path d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1Z" />,
  moon: <path d="M20.5 14.2A8.5 8.5 0 1 1 9.8 3.5a6.8 6.8 0 0 0 10.7 10.7Z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16.5v-5M12 8h.01" />
    </>
  ),
  back: <path d="M15 18.5 8.5 12 15 5.5" />,
  copy: (
    <>
      <rect x="8.5" y="8.5" width="12" height="12" rx="2.5" />
      <path d="M15.5 8.5V6A2.5 2.5 0 0 0 13 3.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5" />
    </>
  ),
  check: <path d="M20 6.5 9.5 17 4 11.5" />,
  share: (
    <>
      <path d="M12 15V3.5M7.5 8 12 3.5 16.5 8" />
      <path d="M5 12.5v6A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5v-6" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11.5A8 8 0 0 0 6 6.6L4 8.5" />
      <path d="M4 4v4.5h4.5" />
      <path d="M4 12.5a8 8 0 0 0 14 4.9l2-1.9" />
      <path d="M20 20v-4.5h-4.5" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </>
  ),
  users: (
    <>
      <path d="M16 20.5v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1.5" />
      <circle cx="9.5" cy="7.5" r="3.5" />
      <path d="M21 20.5v-1.5a4 4 0 0 0-3-3.9M15.5 4.1a3.5 3.5 0 0 1 0 6.8" />
    </>
  ),
  crown: <path d="M3.5 8.5 7.5 12 12 5.5l4.5 6.5 4-3.5-1.8 9.5H5.3Z" />,
  skull: (
    <>
      <path d="M12 3a7.5 7.5 0 0 0-4.5 13.5V19a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-2.5A7.5 7.5 0 0 0 12 3Z" />
      <circle cx="9.2" cy="11.5" r="1.3" />
      <circle cx="14.8" cy="11.5" r="1.3" />
      <path d="M10.5 20v-2M13.5 20v-2" />
    </>
  ),
  mute: (
    <>
      <path d="M11 5 6.5 9H3v6h3.5L11 19Z" />
      <path d="m16 9.5 5 5M21 9.5l-5 5" />
    </>
  ),
  volume: (
    <>
      <path d="M11 5 6.5 9H3v6h3.5L11 19Z" />
      <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  replay: (
    <>
      <path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.5" />
      <path d="M4 4v4.5h4.5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  edit: <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7.5 18.5l-4 1 1-4Z" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  chat: <path d="M20.5 12a8.5 8.5 0 0 1-12.4 7.5L3.5 20.5l1-4.6A8.5 8.5 0 1 1 20.5 12Z" />,
  phone: (
    <>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
      <path d="M11 18.5h2" />
    </>
  ),
  ghost: (
    <>
      <path d="M5 20.5V11a7 7 0 0 1 14 0v9.5l-2.3-1.6-2.4 1.6-2.3-1.6-2.3 1.6-2.4-1.6Z" />
      <path d="M9.5 10.5v1.5M14.5 10.5v1.5" />
    </>
  ),
  wifioff: (
    <>
      <path d="M3 3l18 18" />
      <path d="M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5.2-2.8M19 13a10 10 0 0 0-2.2-1.6M2 8.8a15 15 0 0 1 4.7-2.9M22 8.8A15 15 0 0 0 10.7 5" />
      <path d="M12 20h.01" />
    </>
  ),
  shield: <path d="M12 21s7.5-3.5 7.5-9.5V5.5L12 3 4.5 5.5v6C4.5 17.5 12 21 12 21Z" />,
  vote: (
    <>
      <path d="M9 12.5 11 14.5 15.5 10" />
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
    </>
  ),
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof ICONS

type IconProps = {
  name: IconName
  size?: number
  strokeWidth?: number
  className?: string
}

export function Icon({ name, size = 20, strokeWidth = 1.8, className = '' }: IconProps) {
  return (
    <svg
      className={`block shrink-0 ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  )
}
