const apiUrl = import.meta.env.VITE_API_URL

if (!apiUrl) {
  throw new Error('VITE_API_URL nije postavljen – kopiraj .env.example u .env')
}

export const API_URL = apiUrl.replace(/\/+$/, '')
export const WS_URL = `${API_URL}/ws`
