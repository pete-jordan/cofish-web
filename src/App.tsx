// src/App.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { SignInPage } from "./pages/SignInPage";
import { HomePage } from "./pages/HomePage";
import { PointsHistoryPage } from "./pages/PointsHistoryPage";
import { TargetZonesPage } from "./pages/TargetZonesPage";
import { VideoTestPage } from "./pages/VideoTestPage";
import { PostCatchPage } from "./pages/PostCatchPage";


const App: React.FC = () => {
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
