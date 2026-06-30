import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Issue } from "../types";
import { MapPin, Info, ArrowUpCircle } from "lucide-react";

interface CivicMapProps {
  issues: Issue[];
  selectedIssueId: string | null;
  onSelectIssue: (issue: Issue) => void;
  onMapClick?: (lat: number, lng: number, address: string) => void;
  pinnedLocation: { lat: number; lng: number } | null;
  isPinningMode: boolean;
}

const getCategoryColor = (category: string) => {
  switch (category) {
    case "Road": return "bg-amber-500 border-amber-600 shadow-amber-200 text-white";
    case "Waste": return "bg-emerald-600 border-emerald-700 shadow-emerald-200 text-white";
    case "Electricity": return "bg-yellow-500 border-yellow-600 shadow-yellow-200 text-slate-900";
    case "Water": return "bg-sky-500 border-sky-600 shadow-sky-200 text-white";
    case "Safety": return "bg-rose-600 border-rose-700 shadow-rose-200 text-white";
    case "Traffic": return "bg-indigo-500 border-indigo-600 shadow-indigo-200 text-white";
    default: return "bg-slate-500 border-slate-600 shadow-slate-200 text-white";
  }
};

const getCategoryEmoji = (category: string) => {
  switch (category) {
    case "Road": return "🛣️";
    case "Waste": return "🗑️";
    case "Electricity": return "⚡";
    case "Water": return "💧";
    case "Safety": return "🚨";
    case "Traffic": return "🚦";
    default: return "📍";
  }
};

export default function CivicMap({
  issues,
  selectedIssueId,
  onSelectIssue,
  onMapClick,
  pinnedLocation,
  isPinningMode
}: CivicMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const pinnedMarkerRef = useRef<L.Marker | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<string>("");

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Center on default location: San Francisco Market Street area (close to seed issues)
    const initialLat = 37.7749;
    const initialLng = -122.4194;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false, // will add in top-right
      attributionControl: true
    }).setView([initialLat, initialLng], 14);

    L.control.zoom({ position: "topright" }).addTo(map);

    // Light modern tile style
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // Set up a ResizeObserver to robustly invalidate map sizes on container resize (mobile/tablet/desktop shifts)
    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    // Handle map clicks in pinning mode
    map.on("click", async (e: L.LeafletMouseEvent) => {
      // Accessing state variables inside event handlers in Leaflet requires handling carefully.
      // We will check isPinningMode via DOM or hook triggers, but standard Leaflet callback trigger is fine.
    });

    return () => {
      resizeObserver.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Sync isPinningMode click listeners
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleMapClickEvent = async (e: L.LeafletMouseEvent) => {
      if (!isPinningMode || !onMapClick) return;

      const { lat, lng } = e.latlng;
      setAddressLoading(true);

      // Perform a quick free reverse-geocode search (OSM Nominatim)
      let resolvedAddress = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
          headers: { "Accept-Language": "en" }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.display_name) {
            resolvedAddress = data.display_name;
            // Shorten extremely long addresses
            const parts = resolvedAddress.split(",");
            if (parts.length > 3) {
              resolvedAddress = parts.slice(0, 3).join(",").trim();
            }
          }
        }
      } catch (err) {
        console.warn("Reverse geocoding failed, using coordinates", err);
      } finally {
        setAddressLoading(false);
      }

      onMapClick(lat, lng, resolvedAddress);
    };

    map.off("click");
    map.on("click", handleMapClickEvent);

    return () => {
      map.off("click", handleMapClickEvent);
    };
  }, [isPinningMode, onMapClick]);

  // Render Issues Markers
  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    issues.forEach((issue) => {
      if (
        typeof issue.latitude !== "number" ||
        typeof issue.longitude !== "number" ||
        isNaN(issue.latitude) ||
        isNaN(issue.longitude)
      ) {
        console.warn("Skipping issue rendering due to invalid/NaN coordinates:", issue);
        return;
      }

      const isSelected = issue.id === selectedIssueId;
      const colorClass = getCategoryColor(issue.category);
      const emoji = getCategoryEmoji(issue.category);

      const size = isSelected ? 36 : 28;
      const ringClass = isSelected ? "ring-4 ring-teal-500 scale-125 z-50 animate-bounce" : "hover:scale-110";

      // Custom marker HTML
      const markerHtml = `
        <div class="relative group">
          <div class="${colorClass} ${ringClass} rounded-full border-2 border-white w-[${size}px] h-[${size}px] flex items-center justify-center shadow-lg transition-all duration-300 cursor-pointer">
            <span class="text-xs font-bold">${emoji}</span>
          </div>
          <!-- Tooltip on hover -->
          <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-[1000]">
            <div class="bg-slate-900 text-white text-[11px] px-2 py-1 rounded shadow-md whitespace-nowrap font-sans">
              <p class="font-semibold">${issue.title}</p>
              <p class="opacity-80 text-[10px]">${issue.specificType} • Priority ${issue.priorityScore}</p>
            </div>
            <div class="w-1.5 h-1.5 bg-slate-900 rotate-45 -mt-1"></div>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: "custom-issue-marker",
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
      });

      const marker = L.marker([issue.latitude, issue.longitude], { icon: customIcon });

      marker.on("click", () => {
        onSelectIssue(issue);
      });

      markersLayer.addLayer(marker);

      // Auto center if selected
      if (isSelected) {
        map.setView([issue.latitude, issue.longitude], map.getZoom() < 15 ? 15 : map.getZoom(), {
          animate: true,
          duration: 0.6
        });
      }
    });
  }, [issues, selectedIssueId, onSelectIssue]);

  // Render Pinned Marker for New Issue Submission
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (pinnedLocation && typeof pinnedLocation.lat === "number" && typeof pinnedLocation.lng === "number" && !isNaN(pinnedLocation.lat) && !isNaN(pinnedLocation.lng)) {
      if (pinnedMarkerRef.current) {
        pinnedMarkerRef.current.setLatLng([pinnedLocation.lat, pinnedLocation.lng]);
      } else {
        const pinHtml = `
          <div class="relative animate-bounce">
            <div class="bg-teal-500 border-2 border-white rounded-full w-9 h-9 flex items-center justify-center shadow-xl">
              <span class="text-white">🎯</span>
            </div>
            <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-slate-950/20 rounded-full blur-xs"></div>
          </div>
        `;

        const pinIcon = L.divIcon({
          html: pinHtml,
          className: "custom-pin-marker",
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        });

        pinnedMarkerRef.current = L.marker([pinnedLocation.lat, pinnedLocation.lng], {
          icon: pinIcon,
          draggable: true
        }).addTo(map);

        pinnedMarkerRef.current.on("dragend", async (e: any) => {
          const marker = e.target;
          const position = marker.getLatLng();
          if (onMapClick) {
            setAddressLoading(true);
            let resolvedAddress = `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`;
            try {
              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.lat}&lon=${position.lng}`, {
                headers: { "Accept-Language": "en" }
              });
              if (res.ok) {
                const data = await res.json();
                if (data && data.display_name) {
                  resolvedAddress = data.display_name;
                  const parts = resolvedAddress.split(",");
                  if (parts.length > 3) {
                    resolvedAddress = parts.slice(0, 3).join(",").trim();
                  }
                }
              }
            } catch (err) {
              console.warn("Reverse geocoding failed", err);
            } finally {
              setAddressLoading(false);
            }
            onMapClick(position.lat, position.lng, resolvedAddress);
          }
        });
      }

      // Fly to pinned location
      map.flyTo([pinnedLocation.lat, pinnedLocation.lng], 16, { duration: 0.8 });
    } else {
      if (pinnedMarkerRef.current) {
        pinnedMarkerRef.current.remove();
        pinnedMarkerRef.current = null;
      }
    }
  }, [pinnedLocation, onMapClick]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-inner border border-slate-200">
      {/* Map Container */}
      <div id="civic-map-element" ref={mapContainerRef} className="w-full h-full min-h-[350px] z-10" />

      {/* Pinning instructions helper */}
      {isPinningMode && (
        <div className="absolute top-4 left-4 right-16 z-20 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-xl shadow-lg border border-teal-100 flex items-center gap-2.5 max-w-sm animate-fade-in">
          <div className="bg-teal-50 text-teal-600 p-1.5 rounded-lg shrink-0 animate-pulse">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <p className="font-semibold text-slate-800">Pin Location Mode Active</p>
            <p className="text-slate-500">
              {addressLoading ? "Reverse geocoding address..." : "Click anywhere on the map or drag the 🎯 target pin."}
            </p>
          </div>
        </div>
      )}

      {/* Floating Category Legend */}
      <div className="absolute bottom-4 left-4 z-20 bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl shadow-md border border-slate-100 flex flex-wrap gap-x-3 gap-y-1.5 max-w-[280px] sm:max-w-md text-[10px]">
        <div className="flex items-center gap-1 font-medium text-slate-500 mb-0.5 w-full">
          <Info className="w-3 h-3 text-slate-400" />
          <span>Category Legend</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-slate-600">🛣️ Road</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-600" />
          <span className="text-slate-600">🗑️ Waste</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-yellow-500" />
          <span className="text-slate-600">⚡ Electricity</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-sky-500" />
          <span className="text-slate-600">💧 Water</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-rose-600" />
          <span className="text-slate-600">🚨 Safety</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          <span className="text-slate-600">🚦 Traffic</span>
        </div>
      </div>
    </div>
  );
}
