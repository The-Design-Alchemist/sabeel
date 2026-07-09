import { Capacitor } from "@capacitor/core"

/**
 * Native-only device setup: tint the status bar to match the teal header and hide
 * the splash once the web layer is ready. No-op on the web (plugins are dynamically
 * imported so they never load in a browser).
 */
export async function initNative(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar")
    await StatusBar.setStyle({ style: Style.Dark }) // light content over the dark teal header
    if (Capacitor.getPlatform() === "android") {
      await StatusBar.setBackgroundColor({ color: "#042A2B" })
    }
  } catch {
    /* status bar unavailable — ignore */
  }
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen")
    await SplashScreen.hide()
  } catch {
    /* no splash — ignore */
  }
}

/**
 * Re-tint the status bar for a screen whose header isn't the dark teal. `lightContent`
 * true = white icons (over a dark header, the default); false = dark icons (over a light
 * header, e.g. the dua reader). Restore the default on unmount.
 */
export async function setStatusBar(bg: string, lightContent = true): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar")
    await StatusBar.setStyle({ style: lightContent ? Style.Dark : Style.Light })
    if (Capacitor.getPlatform() === "android") {
      await StatusBar.setBackgroundColor({ color: bg })
    }
  } catch {
    /* status bar unavailable — ignore */
  }
}
