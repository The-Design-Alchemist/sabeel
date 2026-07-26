import { Component, type ErrorInfo, type ReactNode } from "react"
import { logError } from "@/lib/errorLog"

/**
 * Catches render errors anywhere below it.
 *
 * Without this, a single throw inside a route leaves the user staring at a permanently blank
 * screen — and inside a WebView there is no address bar, no reload button, and no way back.
 * A branded fallback with a working Reload turns a dead app into a two-second recovery.
 *
 * The error is also written to the on-device log so the About screen can offer to mail it;
 * Play's Android vitals never sees JS errors, so this is our only visibility into them.
 */
type Props = { children: ReactNode }
type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logError(`${error.name}: ${error.message}`, info.componentStack ?? undefined)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-5 bg-ground px-8 text-center">
        <span
          aria-hidden="true"
          className="flex size-16 items-center justify-center rounded-3xl bg-teal-deep/10 text-3xl"
        >
          🤍
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="text-[22px] font-semibold text-ink">Something went wrong</h1>
          <p className="max-w-[19rem] text-[15px] leading-relaxed text-muted-foreground">
            Sorry — Sabeel hit an unexpected error. Reloading usually fixes it, and your saved
            surahs and progress are untouched.
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-1 rounded-full bg-teal-deep px-7 py-3.5 text-[15px] font-semibold text-white outline-none transition-colors hover:bg-teal-deep-hover focus-visible:ring-2 focus-visible:ring-teal-deep/40"
        >
          Reload Sabeel
        </button>
        <p className="max-w-[19rem] text-[12px] leading-relaxed text-muted-foreground/80">
          If it keeps happening, open About &rsaquo; Report a problem — it&rsquo;ll attach the
          details for you.
        </p>
      </div>
    )
  }
}
