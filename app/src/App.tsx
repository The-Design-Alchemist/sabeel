import { lazy, Suspense, type ReactNode } from "react"
import { AnimatePresence, MotionConfig, motion } from "motion/react"
import { HashRouter, Routes, Route, useLocation } from "react-router-dom"
import Home from "@/pages/Home"
import { useAndroidBackButton } from "@/hooks/useAndroidBackButton"

// Code-split the reader so the home screen stays lean (Radix Select/Dialog/Switch,
// the router, and reader logic load only when a surah is opened).
const Reader = lazy(() => import("@/pages/Reader"))
const Downloads = lazy(() => import("@/pages/Downloads"))
const About = lazy(() => import("@/pages/About"))
const DuaReader = lazy(() => import("@/pages/DuaReader"))

// Cross-page transition — opacity only (a transform here would make `position: fixed`
// children, like the Bismillah CTA, resolve against this wrapper instead of the viewport).
function Page({ children }: { children: ReactNode }) {
  return (
    <motion.div
      className="h-dvh"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.22, ease: [0.23, 1, 0.32, 1] } }}
      exit={{ opacity: 0, transition: { duration: 0.14 } }}
    >
      {children}
    </motion.div>
  )
}

const readerFallback = <div className="min-h-screen bg-teal-deep" aria-busy="true" />
const groundFallback = <div className="min-h-screen bg-ground" aria-busy="true" />

// Inside the router so it can drive navigation (Android hardware back → history).
function AppRoutes() {
  useAndroidBackButton()
  // AnimatePresence keyed on the path crossfades pages; `mode="wait"` avoids stacking two
  // full-height screens (which would double the page height mid-transition).
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Page><Home /></Page>} />
        <Route
          path="/surah/:id"
          element={
            <Page>
              <Suspense fallback={readerFallback}>
                <Reader />
              </Suspense>
            </Page>
          }
        />
        <Route
          path="/downloads"
          element={
            <Page>
              <Suspense fallback={groundFallback}>
                <Downloads />
              </Suspense>
            </Page>
          }
        />
        <Route
          path="/about"
          element={
            <Page>
              <Suspense fallback={readerFallback}>
                <About />
              </Suspense>
            </Page>
          }
        />
        <Route
          path="/duas/:categoryId/:topicId"
          element={
            <Page>
              <Suspense fallback={groundFallback}>
                <DuaReader />
              </Suspense>
            </Page>
          }
        />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  // reducedMotion="user" makes every animation honor the OS "reduce motion" setting.
  // HashRouter works on GitHub Pages and inside the Capacitor WebView without server
  // rewrites (deep links never 404).
  return (
    <MotionConfig reducedMotion="user">
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </MotionConfig>
  )
}
