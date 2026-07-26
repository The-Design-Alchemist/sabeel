/** Placeholder chrome shown while the reader chunk loads — a static teal header plus a
 *  pulsing outline of the verse card, so a cold open lands on the shape of the screen it's
 *  entering instead of dead-air. */
export function ReaderSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className="flex h-dvh flex-col overflow-hidden bg-teal-deep"
    >
      <div className="flex shrink-0 flex-col gap-3 px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <div className="h-8 w-28 rounded-full bg-white/15" />
          <div className="size-9 rounded-full bg-white/10" />
        </div>
        <div className="flex flex-col gap-2">
          <div className="h-5 w-40 rounded bg-white/15" />
          <div className="h-3 w-24 rounded bg-white/10" />
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center rounded-t-[40px] bg-ground">
        <VerseSkeleton />
      </div>
    </div>
  )
}

/** Just the pulsing verse block — reused inside a reader that already has its real header. */
export function VerseSkeleton() {
  return (
    <div className="flex w-full max-w-[632px] animate-pulse flex-col items-center gap-5 px-6">
      <div className="h-10 w-4/5 rounded-lg bg-black/[0.06]" />
      <div className="h-10 w-3/5 rounded-lg bg-black/[0.06]" />
      <div className="mt-3 h-4 w-2/3 rounded bg-black/[0.05]" />
      <div className="h-4 w-1/2 rounded bg-black/[0.05]" />
    </div>
  )
}
