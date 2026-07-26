import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import './index.css'
import App from './App.tsx'
import { initNative } from '@/lib/native'
import { initDownloads } from '@/lib/downloads'
import { installGlobalErrorHandlers } from '@/lib/errorLog'

// Record async throws / rejected promises that never reach the React error boundary.
installGlobalErrorHandlers()

// On native, the WebView can restore the last hash across cold starts, dropping the
// user on an inner screen (e.g. /downloads). Force a clean Home landing on cold start;
// this module only runs on a fresh launch, so a background→resume keeps the user's place.
if (Capacitor.isNativePlatform() && location.hash && location.hash !== '#/') {
  location.hash = '#/'
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Native device setup (status bar, splash) — no-op on the web.
void initNative()
// Resolve the on-device audio download directory (no-op on the web).
void initDownloads()
