// src/pages/TargetZonesPage.tsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { purchaseTargetZone, getNearbyCatches } from "../api/authApi";
import {
  MapContainer,
  TileLayer,
  Circle,
  Rectangle,
  useMapEvents,
  useMap,
} from "react-leaflet";

type ActivityBucket = "NONE" | "SOME" | "GOOD" | "HIGH";

const CENTER_STORAGE_KEY = "cofish_targetzones_center";
const PREVIEW_STORAGE_PREFIX = "cofish_targetzones_previews_";
const MAX_PREVIEWS = 3;

// Helper to get YYYY-MM-DD for preview tracking
function getTodayKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${PREVIEW_STORAGE_PREFIX}${yyyy}-${mm}-${dd}`;
}

// Watches panning/dragging to keep our center in sync
const MapCenterWatcher: React.FC<{
  onCenterChange: (lat: number, lng: number) => void;
}> = ({ onCenterChange }) => {
  useMapEvents({
    moveend: (e) => {
      const center = e.target.getCenter();
      onCenterChange(center.lat, center.lng);
    },
  });
  return null;
};

type ObfuscatedCircle = {
  id: string;
  lat: number;
  lng: number;
};

// Uses useMap to zoom/fit to the TargetZone square when trigger changes
const PreviewZoomController: React.FC<{
  trigger: number;
  centerLat: number;
  centerLng: number;
}> = ({ trigger, centerLat, centerLng }) => {
  const map = useMap();

  useEffect(() => {
    if (!trigger) return;

    const halfSideMiles = 7.5;
    const milesToDegLat = (m: number) => m / 69;
    const milesToDegLng = (m: number, lat: number) =>
      m / (69 * Math.cos((lat * Math.PI) / 180));

    const latDelta = milesToDegLat(halfSideMiles);
    const lngDelta = milesToDegLng(halfSideMiles, centerLat);

    const bounds: [number, number][] = [
      [centerLat - latDelta, centerLng - lngDelta],
      [centerLat + latDelta, centerLng + lngDelta],
    ];

    // Ensure map knows its size, then fit to the TargetZone square
    map.invalidateSize();
    map.fitBounds(bounds as any, {
      padding: [20, 20],
      animate: true,
      maxZoom: 11,
    });
  }, [trigger, centerLat, centerLng, map]);

  return null;
};

export const TargetZonesPage: React.FC = () => {
  const navigate = useNavigate();

  // --- Map center (remembered from localStorage if available) ---
  const [centerLat, setCenterLat] = useState(41.0);
  const [centerLng, setCenterLng] = useState(-71.0);

  // --- Previews (limit 3 per day, persisted) ---
  const [previewsUsed, setPreviewsUsed] = useState(0);

  // --- Activity results ---
  const [activityBucket, setActivityBucket] = useState<ActivityBucket | null>(
    null
  );
  const [activityLoading, setActivityLoading] = useState(false);

  // --- Purchased state ---
  const [unlocked, setUnlocked] = useState(false);
  const [precisionUnlocked, setPrecisionUnlocked] = useState(false);

  // --- Obfuscated catch circles for overlay AFTER purchase ---
  const [obfuscatedCircles, setObfuscatedCircles] =
    useState<ObfuscatedCircle[]>([]);

  // --- Two-step preview confirm flag + zoom trigger ---
  const [showPreviewConfirm, setShowPreviewConfirm] = useState(false);
  const [previewZoomTrigger, setPreviewZoomTrigger] = useState(0);

  // Load center + previews from localStorage on mount
  useEffect(() => {
    // Center
    try {
      const stored = localStorage.getItem(CENTER_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (
          typeof parsed.lat === "number" &&
          typeof parsed.lng === "number"
        ) {
          setCenterLat(parsed.lat);
          setCenterLng(parsed.lng);
        }
      }
    } catch {
      // ignore
    }

    // Previews
    try {
      const todayKey = getTodayKey();
      const storedPreviews = localStorage.getItem(todayKey);
      if (storedPreviews) {
        const num = parseInt(storedPreviews, 10);
        if (!Number.isNaN(num)) setPreviewsUsed(num);
      }
    } catch {
      // ignore
    }
  }, []);

  // Persist center whenever it changes
  const handleCenterChange = (lat: number, lng: number) => {
    setCenterLat(lat);
    setCenterLng(lng);
    try {
      localStorage.setItem(
        CENTER_STORAGE_KEY,
        JSON.stringify({ lat, lng })
      );
    } catch {
      // ignore
    }
  };

  // ---- Activity bucketing (based on real data) ----
  const displayBucket = (b: ActivityBucket | null) => {
    if (!b) return "";
    if (b === "NONE") return "No recent reports";
    if (b === "SOME") return "Some recent activity (1–3)";
    if (b === "GOOD") return "Good activity (4–10)";
    return "High activity (10+)";
  };

  const previewsLeft = MAX_PREVIEWS - previewsUsed;

  // Step 1: user taps "Preview Activity", we trigger zoom & show confirm
  const onRequestPreview = () => {
    if (previewsUsed >= MAX_PREVIEWS) return;

    // Bump trigger so PreviewZoomController runs its effect
    setPreviewZoomTrigger((prev) => prev + 1);
    setShowPreviewConfirm(true);
  };

  // Step 2: after confirmation we actually call backend & burn a preview
  const previewActivity = async () => {
    if (previewsUsed >= MAX_PREVIEWS) return;

    setActivityLoading(true);
    try {
      // Use a radius that roughly matches your 15x15 mi window ⇒ ~7.5 mi
      const radiusMiles = 7.5;
      const hoursBack = 24 * 7; // last 7 days

      const catches: any[] = await getNearbyCatches({
        centerLat,
        centerLng,
        radiusMiles,
        hoursBack,
      });

      const count = catches.length;
      let bucket: ActivityBucket;
      if (count === 0) bucket = "NONE";
      else if (count <= 3) bucket = "SOME";
      else if (count <= 10) bucket = "GOOD";
      else bucket = "HIGH";

      setActivityBucket(bucket);
    } catch (e) {
      console.error("previewActivity error:", e);
      setActivityBucket("NONE");
    } finally {
      setPreviewsUsed((prev) => {
        const next = prev + 1;
        try {
          const todayKey = getTodayKey();
          localStorage.setItem(todayKey, String(next));
        } catch {
          // ignore
        }
        return next;
      });
      setActivityLoading(false);
      setShowPreviewConfirm(false);
    }
  };

  // ---------- Jitter helper to obfuscate each catch ----------
  function jitterAroundCatch(
    lat: number,
    lng: number,
    jitterRadiusMiles: number
  ): { lat: number; lng: number } {
    // Random distance [0, R), random angle [0, 2π)
    const dMiles = Math.random() * jitterRadiusMiles;
    const theta = Math.random() * 2 * Math.PI;

    const deltaMilesLat = dMiles * Math.cos(theta);
    const deltaMilesLng = dMiles * Math.sin(theta);

    const milesToDegLat = (m: number) => m / 69;
    const milesToDegLng = (m: number, baseLat: number) =>
      m / (69 * Math.cos((baseLat * Math.PI) / 180));

    const jitterLat = lat + milesToDegLat(deltaMilesLat);
    const jitterLng = lng + milesToDegLng(deltaMilesLng, lat);

    return { lat: jitterLat, lng: jitterLng };
  }

  async function loadOverlayCatches() {
    try {
      const radiusMiles = 7.5;
      const hoursBack = 24 * 7;

      const catches: any[] = await getNearbyCatches({
        centerLat,
        centerLng,
        radiusMiles,
        hoursBack,
      });

      // Standard vs Precision: 2mi vs 1mi obfuscation circles
      const obfuscationRadiusMiles = precisionUnlocked ? 1 : 2;
      // Keep jitter inside the circle so true catch is guaranteed inside:
      const jitterRadiusMiles = obfuscationRadiusMiles * 0.7;

      const circles: ObfuscatedCircle[] = catches.map((c) => {
        const jittered = jitterAroundCatch(c.lat, c.lng, jitterRadiusMiles);
        return {
          id: c.id,
          lat: jittered.lat,
          lng: jittered.lng,
        };
      });

      setObfuscatedCircles(circles);
    } catch (e) {
      console.error("loadOverlayCatches error:", e);
      setObfuscatedCircles([]);
    }
  }

  // ------------------------------------------------------------
  // Purchase Standard (100 pts) – uses baseCostPoints
  // ------------------------------------------------------------
  const onPurchaseStandard = async () => {
    try {
      await purchaseTargetZone({
        centerLat,
        centerLng,
        radiusMiles: 2,
        baseCostPoints: 100,
      });
      setUnlocked(true);
      await loadOverlayCatches();
    } catch (e) {
      console.error("Purchase error:", e);
      alert("Purchase failed. Check console.");
    }
  };

  // ------------------------------------------------------------
  // Upgrade Precision (additional 200 pts) – also uses baseCostPoints
  // ------------------------------------------------------------
  const onUpgradePrecision = async () => {
    try {
      await purchaseTargetZone({
        centerLat,
        centerLng,
        radiusMiles: 1,
        baseCostPoints: 200,
      });
      setPrecisionUnlocked(true);
      await loadOverlayCatches();
    } catch (e) {
      console.error("Upgrade error:", e);
      alert("Upgrade failed.");
    }
  };

  // Leaflet distances: radius is in meters
  const twoMileRadiusMeters = 2 * 1609.34;
  const oneMileRadiusMeters = 1 * 1609.34;

  // Obfuscation radius: 2mi in Standard, 1mi in Precision
  const obfuscationRadiusMiles = precisionUnlocked ? 1 : 2;
  const obfuscationRadiusMeters = obfuscationRadiusMiles * 1609.34;

  // TargetZone frame: ~15x15mi ⇒ half-side = 7.5mi
  const halfSideMiles = 7.5;
  const milesToDegLat = (m: number) => m / 69;
  const milesToDegLng = (m: number, lat: number) =>
    m / (69 * Math.cos((lat * Math.PI) / 180));

  const latDelta = milesToDegLat(halfSideMiles);
  const lngDelta = milesToDegLng(halfSideMiles, centerLat);
  const zoneBounds: [number, number][] = [
    [centerLat - latDelta, centerLng - lngDelta],
    [centerLat + latDelta, centerLng + lngDelta],
  ];

  const previewsExhausted = previewsUsed >= MAX_PREVIEWS;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 px-4 py-4">
      {/* Header */}
      <header className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate("/home")}
          className="text-sm text-slate-400 hover:text-slate-200"
        >
          ← Home
        </button>
        <div className="text-center flex-1">
          <div className="text-xs text-slate-400 uppercase tracking-wide">
            Target Zones
          </div>
        </div>
        <div className="w-12" />
      </header>

      {/* Map Container */}
      <div className="rounded-xl overflow-hidden border border-sky-700 mb-3">
        <MapContainer
          center={[centerLat, centerLng]}
          zoom={11} // canonical zoom for this page
          minZoom={8}
          maxZoom={15}
          className="h-72 w-full bg-sky-900"
          scrollWheelZoom={true}
          doubleClickZoom={true}
        >
          {/* Base map (OSM for now, later can swap to nautical tiles) */}
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          {/* Watch center changes */}
          <MapCenterWatcher onCenterChange={handleCenterChange} />

          {/* Zoom-to-box controller for preview */}
          <PreviewZoomController
            trigger={previewZoomTrigger}
            centerLat={centerLat}
            centerLng={centerLng}
          />

          {/* TargetZone square frame (approx 15x15mi) */}
          <Rectangle
            bounds={zoneBounds as any}
            pathOptions={{
              color: "#0ea5e9",
              fillColor: "#0ea5e9",
              fillOpacity: 0.03,
              weight: 1.5,
            }}
          />

          {/* Purchased area circles (center window) */}
          {unlocked && (
            <Circle
              center={[centerLat, centerLng]}
              radius={twoMileRadiusMeters}
              pathOptions={{
                color: "#38bdf8",
                fillColor: "#38bdf8",
                fillOpacity: 0.08,
                weight: 1,
              }}
            />
          )}

          {precisionUnlocked && (
            <Circle
              center={[centerLat, centerLng]}
              radius={oneMileRadiusMeters}
              pathOptions={{
                color: "#a855f7",
                fillColor: "#a855f7",
                fillOpacity: 0.16,
                weight: 1.2,
              }}
            />
          )}

          {/* Obfuscated circles for each catch (only after purchase) */}
          {unlocked &&
            obfuscatedCircles.map((c) => (
              <Circle
                key={c.id}
                center={[c.lat, c.lng]}
                radius={obfuscationRadiusMeters}
                pathOptions={{
                  color: "#ef4444",
                  fillColor: "#ef4444",
                  // Precision: ~50% more opaque to preserve perceived density
                  fillOpacity: precisionUnlocked ? 0.42 : 0.28,
                  weight: 0, // no outline
                }}
              />
            ))}
        </MapContainer>
      </div>

      {/* Coordinate display for debugging (can remove later) */}
      <div className="text-xs text-slate-500 mb-3">
        Center: {centerLat.toFixed(4)}, {centerLng.toFixed(4)}
      </div>

      {/* Activity Preview (only before unlock) */}
      {!unlocked && (
        <div className="mb-6">
          <button
            disabled={previewsExhausted}
            onClick={onRequestPreview}
            className={`w-full rounded-xl py-2 text-sm font-semibold flex flex-col items-center justify-center ${
              previewsExhausted
                ? "bg-slate-700 text-slate-500"
                : "bg-blue-600 hover:bg-blue-500"
            }`}
          >
            <span>
              {activityLoading
                ? "Checking..."
                : "Preview Activity (last 7 days)"}
            </span>
            {!previewsExhausted && previewsUsed > 0 && previewsLeft > 0 && (
              <span className="text-[10px] text-sky-100/80 mt-0.5">
                {previewsLeft} left today
              </span>
            )}
            {previewsExhausted && (
              <span className="text-[10px] text-slate-300 mt-0.5">
                No previews left today
              </span>
            )}
          </button>

          {/* Confirmation step */}
          {showPreviewConfirm && !previewsExhausted && (
            <div className="mt-3 border border-slate-700 bg-slate-900/80 rounded-lg p-3 text-sm">
              <div className="text-slate-200 mb-2">
                This is the area you will preview. Confirm?
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  className="px-3 py-1 rounded-full text-xs bg-slate-800 text-slate-200 hover:bg-slate-700"
                  onClick={() => setShowPreviewConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-3 py-1 rounded-full text-xs bg-emerald-600 text-emerald-50 hover:bg-emerald-500"
                  onClick={previewActivity}
                >
                  Confirm
                </button>
              </div>
            </div>
          )}

          {activityBucket && (
            <div className="text-sm text-slate-200 mt-3">
              Activity:{" "}
              <span className="font-semibold">
                {displayBucket(activityBucket)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Purchase Button (100 pts) */}
      {!unlocked && activityBucket && activityBucket !== "NONE" && (
        <button
          onClick={onPurchaseStandard}
          className="w-full bg-emerald-600 hover:bg-emerald-500 rounded-xl py-2 font-semibold"
        >
          Unlock Target Zones – 100 pts
        </button>
      )}

      {activityBucket === "NONE" && !unlocked && (
        <div className="text-slate-400 text-sm mt-4">
          No recent reports here – try a different area.
        </div>
      )}

      {/* Unlocked View */}
      {unlocked && (
        <div className="mt-6">
          <div className="border border-slate-700 bg-slate-900 p-4 rounded-xl">
            <div className="text-sm text-slate-300">
              Standard Target Zones unlocked!
            </div>
            <div className="text-xs text-slate-500">
              (2-mile obfuscated catch circles inside your fixed TargetZone.)
            </div>
          </div>

          {!precisionUnlocked && (
            <button
              onClick={onUpgradePrecision}
              className="w-full bg-purple-600 hover:bg-purple-500 rounded-xl py-2 font-semibold mt-4"
            >
              Increase Precision – 200 pts
            </button>
          )}

          {precisionUnlocked && (
            <div className="mt-4 text-slate-300 text-sm">
              Precision upgrade unlocked (1-mile circles, higher density
              contrast).
            </div>
          )}
        </div>
      )}
    </div>
  );
};
