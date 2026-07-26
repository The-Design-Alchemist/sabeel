import logo from "@/assets/sabeel-full-logo.png"

/**
 * The app cover as a PNG data-URI, for lock-screen / notification media artwork.
 *
 * The native media-session loader fetches the artwork URL over HTTP and can't reach the
 * WebView's bundled assets — so we composite the logo onto a teal-deep square in a canvas
 * and hand over a self-contained data-URI instead. Computed once, then cached.
 *
 * NOTE: verify on-device that @capgo/capacitor-media-session accepts data-URI artwork on
 * both iOS and Android; if a platform needs a resolvable file URL, fall back to a bundled PNG.
 */
let cached: Promise<string> | null = null

export function getArtworkDataUri(): Promise<string> {
  if (cached) return cached
  cached = new Promise<string>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      try {
        const size = 512
        const canvas = document.createElement("canvas")
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext("2d")
        if (!ctx) return reject(new Error("no 2d context"))
        ctx.fillStyle = "#042a2b"
        ctx.fillRect(0, 0, size, size)
        // Contain the wordmark centered at ~64% of the square.
        const scale = Math.min((size * 0.64) / img.width, (size * 0.64) / img.height)
        const w = img.width * scale
        const h = img.height * scale
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
        resolve(canvas.toDataURL("image/png"))
      } catch (e) {
        reject(e as Error)
      }
    }
    img.onerror = () => reject(new Error("logo load failed"))
    img.src = logo
  })
  return cached
}
