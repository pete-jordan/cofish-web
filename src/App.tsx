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
import { deleteAllData, resetUserPoints } from "./utils/deleteAllData";
import { debugCatch } from "./utils/debugCatch";


const App: React.FC = () => {
  // Expose utility functions to browser console for testing
  useEffect(() => {
    (window as any).seedDummyCatches = seedDummyCatches;
    (window as any).deleteAllData = deleteAllData;
    (window as any).resetUserPoints = resetUserPoints;
    (window as any).debugCatch = debugCatch;
    console.log(
      "%c✅ Utility functions available in console!",
      "color: green; font-weight: bold;"
    );
    console.log(
      "Usage: await seedDummyCatches({ email: 'petejordan63@gmail.com', centerLat: 41.1720, centerLng: -71.5778, count: 30, radiusMiles: 15 })"
    );
    console.log(
      "Usage: await deleteAllData() - Deletes all Catches, InfoPurchases, and KarmaEvents"
    );
    console.log(
      "Usage: await resetUserPoints() - Resets current user's points balance to 0"
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
