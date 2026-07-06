import type { CapacitorConfig } from '@capacitor/cli'

// Wraps the Vite build (webDir: 'dist') as native iOS/Android apps.
// Run `npm run build` then `npx cap add ios` / `npx cap add android` (needs Xcode /
// Android Studio) and `npx cap sync` to generate the native projects.
const config: CapacitorConfig = {
  appId: 'in.sabeel.app',
  appName: 'Sabeel',
  webDir: 'dist',
  backgroundColor: '#042A2B',
}

export default config
