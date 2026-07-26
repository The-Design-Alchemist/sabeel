/**
 * A tiny on-device error log.
 *
 * Play Console's Android vitals only sees *native* crashes — it is completely blind to JS errors
 * inside the WebView, which is where all of Sabeel's logic lives. Without something like this, a
 * user hitting a broken screen has no way to tell us what happened and we have no way to find out.
 *
 * So: keep the last few errors in localStorage, and let the About screen offer to mail them.
 * Nothing is transmitted anywhere on its own — the user has to press the button, and the mail
 * client shows them exactly what they're sending. That keeps the privacy policy honest.
 */

const KEY = "sabeel_error_log"
const MAX = 5 // newest first; enough to spot a pattern, small enough to paste in an email

export type LoggedError = {
  at: string // ISO timestamp
  msg: string
  where?: string // component stack / source location, trimmed
}

export function readErrorLog(): LoggedError[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as LoggedError[]) : []
  } catch {
    return []
  }
}

/** Record an error, newest first, capped at MAX. Never throws — it's called from error handlers. */
export function logError(msg: string, where?: string): void {
  try {
    const entry: LoggedError = {
      at: new Date().toISOString(),
      msg: String(msg).slice(0, 500),
      ...(where ? { where: where.trim().slice(0, 800) } : {}),
    }
    localStorage.setItem(KEY, JSON.stringify([entry, ...readErrorLog()].slice(0, MAX)))
  } catch {
    /* storage full or unavailable — a lost error report is not worth another error */
  }
}

export function clearErrorLog(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

/** Plain-text rendering of the log for the body of a support email. */
export function formatErrorLog(): string {
  const errors = readErrorLog()
  if (!errors.length) return "No errors recorded."
  return errors
    .map((e, i) => `${i + 1}. ${e.at}\n   ${e.msg}${e.where ? `\n   ${e.where}` : ""}`)
    .join("\n\n")
}

/**
 * Catch errors that never reach a React boundary — async throws, rejected promises, and errors
 * raised outside the render tree. Call once at startup.
 */
export function installGlobalErrorHandlers(): void {
  window.addEventListener("error", (e) => {
    const where = e.filename ? `${e.filename}:${e.lineno}:${e.colno}` : undefined
    logError(e.message || "Unknown error", where)
  })
  window.addEventListener("unhandledrejection", (e) => {
    const r = e.reason as unknown
    logError(r instanceof Error ? `${r.name}: ${r.message}` : `Unhandled rejection: ${String(r)}`)
  })
}
