// src/components/CatchDetailsModal.tsx
import React from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import { getThumbnailUrlSync } from "../utils/thumbnailUrl";

// Fix for default marker icon in react-leaflet
const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

type CatchDetailsModalProps = {
  entry: {
    id: string;
    createdAt: string;
    species?: string | null;
    lat?: number | null;
    lng?: number | null;
    thumbnailKey?: string | null;
    videoKey?: string | null;
  };
  onClose: () => void;
};

export const CatchDetailsModal: React.FC<CatchDetailsModalProps> = ({
  entry,
  onClose,
}) => {
  const [thumbnailUrl, setThumbnailUrl] = React.useState<string | null>(null);
  const date = new Date(entry.createdAt);
  const hasLocation = entry.lat != null && entry.lng != null;

  React.useEffect(() => {
    const loadThumbnail = async () => {
      try {
        const { getThumbnailUrl } = await import("../utils/thumbnailUrl");
        const url = await getThumbnailUrl(entry.thumbnailKey, entry.videoKey);
        setThumbnailUrl(url);
      } catch (error) {
        console.warn("Failed to load thumbnail URL:", error);
        // Fallback to sync version
        setThumbnailUrl(getThumbnailUrlSync(entry.thumbnailKey, entry.videoKey));
      }
    };
    loadThumbnail();
  }, [entry.thumbnailKey, entry.videoKey]);

  // Determine zoom level - zoom out enough to show land/context
  // For ocean locations, we want to zoom out to show nearby land
  const zoomLevel = hasLocation ? 8 : 10; // Zoom level 8 shows a wider area

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 rounded-2xl border border-slate-700 max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-slate-100">Catch Details</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Thumbnail Image */}
          {thumbnailUrl && (
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">
                Catch Photo
              </div>
              <div className="rounded-lg overflow-hidden border border-slate-700 bg-slate-800">
                <img
                  src={thumbnailUrl}
                  alt="Catch thumbnail"
                  className="w-full h-auto max-h-64 object-cover"
                  onError={(e) => {
                    // Hide image if it fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                  }}
                />
              </div>
            </div>
          )}

          {/* Species */}
          {entry.species && (
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                Species
              </div>
              <div className="text-base font-semibold text-slate-100">
                {entry.species}
              </div>
            </div>
          )}

          {/* Date and Time */}
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">
              Date & Time
            </div>
            <div className="text-sm text-slate-200">
              {date.toLocaleDateString(undefined, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
            <div className="text-sm text-slate-300">
              {date.toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </div>
          </div>

          {/* Location Map */}
          {hasLocation ? (
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">
                Location
              </div>
              <div className="h-48 rounded-lg overflow-hidden border border-slate-700">
                <MapContainer
                  center={[entry.lat!, entry.lng!]}
                  zoom={zoomLevel}
                  className="h-full w-full"
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <Marker position={[entry.lat!, entry.lng!]} />
                </MapContainer>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {entry.lat!.toFixed(6)}, {entry.lng!.toFixed(6)}
              </div>
            </div>
          ) : (
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                Location
              </div>
              <div className="text-sm text-slate-400">Location not available</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
