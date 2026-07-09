import { lazy, Suspense } from "react"
import { MotionConfig } from "motion/react"
import { HashRouter, Routes, Route } from "react-router-dom"
import Home from "@/pages/Home"
import { useAndroidBackButton } from "@/hooks/useAndroidBackButton"

// Code-split the reader so the home screen stays lean (Radix Select/Dialog/Switch,
// the router, and reader logic load only when a surah is opened).
const Reader = lazy(() => import("@/pages/Reader"))
const Downloads = lazy(() => import("@/pages/Downloads"))
const About = lazy(() => import("@/pages/About"))
const DuaReader = lazy(() => import("@/pages/DuaReader"))

// Inside the router so it can drive navigation (Android hardware back → history).
function AppRoutes() {
  useAndroidBackButton()
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route
        path="/surah/:id"
        element={
          <Suspense fallback={<div className="min-h-screen bg-teal-deep" aria-busy="true" />}>
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
      <Route
        path="/about"
        element={
          <Suspense fallback={<div className="min-h-screen bg-teal-deep" aria-busy="true" />}>
            <About />
          </Suspense>
        }
      />
      <Route
        path="/duas/:categoryId/:topicId"
        element={
          <Suspense fallback={<div className="min-h-screen bg-ground" aria-busy="true" />}>
            <DuaReader />
          </Suspense>
        }
      />
    </Routes>
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
