import { Capacitor } from "@capacitor/core"
import { Haptics, ImpactStyle } from "@capacitor/haptics"

/**
 * Haptic feedback that is a no-op on the web and fires the native vibration motor inside the
 * Capacitor app.
 *
 * Deliberately ONE light tap and nothing else. Haptics here confirm only what you can't
 * otherwise perceive — a transport state change, a gesture crossing its threshold, a
 * destructive commit. Never navigation, and never a button that already has press-scale plus a
 * visible result: a buzz on every tap stops meaning anything and just reads as noise.
 *
 * The medium `select()` and the `success()` notification buzz were removed on purpose.
 * Android implements NotificationType.Success as a *two-pulse pattern*
 * (timings {0,35,65,21} / amplitudes {0,250,0,180}), so every "success" was felt as a double
 * vibration. Keeping it out of this module means that can't come back by accident.
 *
 * Usage:  const haptics = useHaptics(); haptics.tap()
 */
export function useHaptics() {
  const isNative = Capacitor.isNativePlatform()

  return {
    /** The only haptic in the app — a single light tap. */
    tap: async () => {
      if (!isNative) return
      try {
        await Haptics.impact({ style: ImpactStyle.Light })
      } catch {
        /* haptics unavailable — ignore */
      }
    },
  }
}
