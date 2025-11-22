// src/App.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { SignInPage } from "./pages/SignInPage";
import { HomePage } from "./pages/HomePage";
import { PointsHistoryPage } from "./pages/PointsHistoryPage";

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <Routes>
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/home" element={<HomePage />} />
          <Route path="/history" element={<PointsHistoryPage />} />
        <Route path="*" element={<Navigate to="/signin" replace />} />
      </Routes>
    </div>
  );
};

export default App;
