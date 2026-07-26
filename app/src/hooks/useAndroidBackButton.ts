import { useEffect, useRef } from "react"
import { App } from "@capacitor/app"
import { Capacitor } from "@capacitor/core"
import { useLocation, useNavigate } from "react-router-dom"
import { toast } from "sonner"

/**
 * Maps the Android hardware back button to in-app router history:
 *  - not on Home → go back one screen (or Home if there's nothing to pop)
 *  - on Home → let Android background/close the app
 *
 * Registering any `backButton` listener replaces Capacitor's default (which could
 * drop the user straight out of the app from a reader), so we handle both cases here.
 * No-op on the web, where the browser/OS owns the back gesture.
 */
export function useAndroidBackButton() {
  const navigate = useNavigate()
  const location = useLocation()

  // Kept in a ref so the single listener always sees the current route without
  // re-subscribing on every navigation.
  const atHome = useRef(location.pathname === "/")
  atHome.current = location.pathname === "/"

  // Timestamp of the last "back at Home" press, driving the double-tap-to-exit guard.
  const lastBackAtHome = useRef(0)

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let cancelled = false
    let remove: (() => void) | undefined

    void App.addListener("backButton", () => {
      if (atHome.current) {
        // Double-back-to-exit — a lone stray press shouldn't hard-kill the app.
        const now = Date.now()
        if (now - lastBackAtHome.current < 2000) {
          void App.exitApp()
        } else {
          lastBackAtHome.current = now
          toast("Press back again to exit") // the toast is the feedback; no buzz needed
        }
        return
      }
      // React Router tracks its stack position in history.state.idx; 0 = nothing to pop
      // (e.g. cold-started directly into a sub-route), so fall back to Home.
      const idx = (window.history.state?.idx as number | undefined) ?? 0
      if (idx > 0) navigate(-1)
      else navigate("/", { replace: true })
    }).then((handle) => {
      if (cancelled) void handle.remove()
      else remove = () => void handle.remove()
    })

    return () => {
      cancelled = true
      remove?.()
    }
  }, [navigate])
}
