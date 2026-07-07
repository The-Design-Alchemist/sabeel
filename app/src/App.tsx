import { lazy, Suspense } from "react"
import { MotionConfig } from "motion/react"
import { HashRouter, Routes, Route } from "react-router-dom"
import Home from "@/pages/Home"

// Code-split the reader so the home screen stays lean (Radix Select/Dialog/Switch,
// the router, and reader logic load only when a surah is opened).
const Reader = lazy(() => import("@/pages/Reader"))
const Downloads = lazy(() => import("@/pages/Downloads"))

export default function App() {
  // reducedMotion="user" makes every animation honor the OS "reduce motion" setting.
  // HashRouter works on GitHub Pages and inside the Capacitor WebView without server
  // rewrites (deep links never 404).
  return (
    <MotionConfig reducedMotion="user">
      <HashRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/surah/:id"
            element={
              <Suspense
                fallback={<div className="min-h-screen bg-teal-deep" aria-busy="true" />}
              >
                <Reader />
              </Suspense>
            }
          />
          <Route
            path="/downloads"
            element={
              <Suspense fallback={<div className="min-h-screen bg-ground" aria-busy="true" />}>
                <Downloads />
              </Suspense>
            }
          />
        </Routes>
      </HashRouter>
    </MotionConfig>
  )
}
