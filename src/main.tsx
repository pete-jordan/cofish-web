import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "leaflet/dist/leaflet.css";


import "./index.css";

import { seedDemoCatchesAroundBlockIsland } from "./api/authApi";

if (import.meta.env.DEV) {
  (window as any).seedDemoCatchesAroundBlockIsland =
    seedDemoCatchesAroundBlockIsland;
}


ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

