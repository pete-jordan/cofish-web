// src/App.tsx
import React, { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { SignInPage } from "./pages/SignInPage";
import { HomePage } from "./pages/HomePage";
import { PointsHistoryPage } from "./pages/PointsHistoryPage";
import { TargetZonesPage } from "./pages/TargetZonesPage";
import { VideoTestPage } from "./pages/VideoTestPage";
import { PostCatchPage } from "./pages/PostCatchPage";
import { seedDummyCatches } from "./utils/seedCatches";


const App: React.FC = () => {
  // Expose seed function to browser console for testing
  useEffect(() => {
    (window as any).seedDummyCatches = seedDummyCatches;
    console.log(
      "%c✅ seedDummyCatches available in console!",
      "color: green; font-weight: bold;"
    );
    console.log(
      "Usage: await seedDummyCatches({ email: 'petejordan63@gmail.com', centerLat: 41.1720, centerLng: -71.5778, count: 30, radiusMiles: 15 })"
    );
  }, []);
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <Routes>
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/history" element={<PointsHistoryPage />} />
        <Route path="/targetzones" element={<TargetZonesPage />} />
        <Route path="/video-test" element={<VideoTestPage />} />
        <Route path="/post-catch" element={<PostCatchPage />} />

        <Route path="*" element={<Navigate to="/signin" replace />} />
      </Routes>
    </div>
  );
};

export default App;
