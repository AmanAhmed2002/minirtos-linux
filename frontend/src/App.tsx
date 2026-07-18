import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import { MiniRtosDataProvider } from "./context/MiniRtosDataContext";
import { AppNav } from "./components/AppNav";
import { HomePage } from "./pages/HomePage";
import { LearnPage } from "./pages/LearnPage";
import { LessonDetailPage } from "./pages/LessonDetailPage";
import { GlossaryPage } from "./pages/GlossaryPage";
import { SimulatorPage } from "./pages/SimulatorPage";
import { RunsPage } from "./pages/RunsPage";
import { AnalysisPage } from "./pages/AnalysisPage";
import { LookerPage } from "./pages/LookerPage";

/**
 * Layout + routes. Exported separately from the default <App> so tests can
 * mount it inside a MemoryRouter with a chosen initial route.
 */
export function AppRoutes() {
  return (
    <MiniRtosDataProvider>
      <div className="app-shell">
        <AppNav />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/learn" element={<LearnPage />} />
            <Route path="/learn/:lessonId" element={<LessonDetailPage />} />
            <Route path="/simulator" element={<SimulatorPage />} />
            <Route path="/runs" element={<RunsPage />} />
            <Route path="/analysis" element={<AnalysisPage />} />
            <Route path="/looker" element={<LookerPage />} />
            <Route path="/glossary" element={<GlossaryPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <footer className="app-footer">
          <p>
            MiniRTOS Playground — a guided way to learn embedded systems and
            RTOS scheduling by running real simulations.
          </p>
        </footer>
      </div>
    </MiniRtosDataProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
