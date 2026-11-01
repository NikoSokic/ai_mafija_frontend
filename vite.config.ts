import { sentryVitePlugin } from '@sentry/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Šalje source mape Sentryju i briše ih iz builda; radi samo uz SENTRY_AUTH_TOKEN (Vercel)
    // SENTRY_ORG i SENTRY_PROJECT plugin čita iz okoline
    ...(process.env.SENTRY_AUTH_TOKEN
      ? [sentryVitePlugin({ authToken: process.env.SENTRY_AUTH_TOKEN, sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] } })]
      : []),
  ],
  // sockjs-client references Node's `global`
  define: { global: 'globalThis' },
  // 'hidden' pravi mape bez poveznice u kodu, pa ih preglednici ne traže
  build: { sourcemap: 'hidden' },
})
