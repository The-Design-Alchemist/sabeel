import { useEffect, useState } from "react"
import { Capacitor } from "@capacitor/core"
import { Network } from "@capacitor/network"

/**
 * Reactive online/offline status.
 *
 * On native we use @capacitor/network (backed by Android's ConnectivityManager):
 * `navigator.onLine` is unreliable in the Capacitor WebView — it stays `true` even
 * with WiFi off + airplane mode, at both launch and on live transitions, so the
 * `online`/`offline` events never fire and reading-mode never kicks in. On the web
 * build we keep the navigator.onLine + events path.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  )

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // addListener resolves to a handle asynchronously; guard against unmount-before-register.
      let unmounted = false
      let remove: (() => void) | undefined
      void Network.getStatus().then((s) => setOnline(s.connected))
      void Network.addListener("networkStatusChange", (s) => setOnline(s.connected)).then(
        (handle) => {
          if (unmounted) handle.remove()
          else remove = () => handle.remove()
        },
      )
      return () => {
        unmounted = true
        remove?.()
      }
    }

    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener("online", up)
    window.addEventListener("offline", down)
    return () => {
      window.removeEventListener("online", up)
      window.removeEventListener("offline", down)
    }
  }, [])

  return online
}
