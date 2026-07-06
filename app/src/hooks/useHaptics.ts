import { Capacitor } from "@capacitor/core"
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics"

/**
 * Haptic feedback that is a no-op on the web and fires the native Taptic Engine /
 * vibration motor inside the Capacitor app. Call these on meaningful moments
 * (segment complete, verse change, action confirmed) — see the mobile roadmap.
 *
 * Usage:  const haptics = useHaptics(); haptics.tap()
 */
export function useHaptics() {
  const isNative = Capacitor.isNativePlatform()

  const impact = async (style: ImpactStyle) => {
    if (!isNative) return
    try {
      await Haptics.impact({ style })
    } catch {
      /* haptics unavailable — ignore */
    }
  }

  return {
    /** light tap — e.g. word/segment tap */
    tap: () => impact(ImpactStyle.Light),
    /** medium — e.g. verse change */
    select: () => impact(ImpactStyle.Medium),
    /** success buzz — e.g. finished memorizing a segment */
    success: async () => {
      if (!isNative) return
      try {
        await Haptics.notification({ type: NotificationType.Success })
      } catch {
        /* ignore */
      }
    },
  }
}
