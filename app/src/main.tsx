import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initNative } from '@/lib/native'
import { initDownloads } from '@/lib/downloads'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Native device setup (status bar, splash) — no-op on the web.
void initNative()
// Resolve the on-device audio download directory (no-op on the web).
void initDownloads()
