import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { MapPin, Navigation, Compass, Layers, Minimize2 } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AssignedTeamInfo {
  id?: string;
  name: string;
  workerName?: string;
  workerId?: string;
  initials?: string;
  lat: number;
  lng: number;
  status?: string;
  rating?: number;
  jobsCompleted?: number;
}

export interface LocationMapProps {
  location?: string;
  coordinates?: string;
  lat?: number;
  lng?: number;
  subtitle?: string;
  statusText?: string;
  roleTheme?: "admin" | "fieldteam" | "client";
  className?: string;
  onExpandChange?: (expanded: boolean) => void;
  initialExpanded?: boolean;
  alwaysExpanded?: boolean;
  assignedTeam?: AssignedTeamInfo | null;
  assignedTeamName?: string;
  showTeamLocation?: boolean; // When false, hides field crew location from client map
  userLocation?: { lat: number; lng: number } | null; // For field team: technician's own live location
  technicianName?: string;
  clientName?: string;
  showDistanceBadge?: boolean;
  expandedHeight?: number;
}

// Calculate Haversine distance between two coordinates in km, miles, and estimated driving minutes
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const toRadian = (angle: number) => (Math.PI / 180) * angle;
  const earthRadiusKm = 6371;

  const dLat = toRadian(lat2 - lat1);
  const dLon = toRadian(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) *
      Math.sin(dLon / 2) *
      Math.cos(toRadian(lat1)) *
      Math.cos(toRadian(lat2));
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const km = earthRadiusKm * c;
  const miles = km * 0.621371;
  const minutes = Math.max(1, Math.round((km / 25) * 60)); // Avg 25 km/h urban speed

  return {
    kmNum: km,
    kmStr: km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`,
    milesStr: miles < 1 ? `${(miles * 5280).toFixed(0)} ft` : `${miles.toFixed(1)} mi`,
    etaStr: `~${minutes} min${minutes === 1 ? '' : 's'}`,
    minutes,
  };
}

export function getPersonInitials(fullName: string): string {
  if (!fullName) return "";
  const clean = fullName.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s*/i, "").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Safely parse coordinates or format string into [lat, lng]
function parseCoordinates(coordStr?: string, defaultLat = 31.4697, defaultLng = 74.2728): [number, number] {
  if (!coordStr) return [defaultLat, defaultLng];
  try {
    const isSouth = /S/i.test(coordStr);
    const isWest = /W/i.test(coordStr);
    const matches = coordStr.match(/[-+]?[0-9]*\.?[0-9]+/g);
    if (matches && matches.length >= 2) {
      const rawLat = parseFloat(matches[0]);
      const rawLng = parseFloat(matches[1]);
      let lat = rawLat;
      let lng = rawLng;

      if (isSouth) lat = -Math.abs(lat);
      else if (/N/i.test(coordStr)) lat = Math.abs(lat);

      if (isWest) lng = -Math.abs(lng);
      else if (/E/i.test(coordStr) && rawLng > 0) lng = Math.abs(lng);
      else if (rawLng < 0) lng = -Math.abs(lng);

      if (!isNaN(lat) && !isNaN(lng)) {
        return [lat, lng];
      }
    }
  } catch {
    // fallback
  }
  return [defaultLat, defaultLng];
}

function resolveTeamData(
  assignedTeam?: AssignedTeamInfo | null,
  assignedTeamName?: string,
  clientCoords: [number, number] = [31.4697, 74.2728]
): AssignedTeamInfo | null {
  if (
    assignedTeam &&
    typeof assignedTeam.lat === "number" &&
    typeof assignedTeam.lng === "number" &&
    !isNaN(assignedTeam.lat) &&
    !isNaN(assignedTeam.lng)
  ) {
    const dLat = Math.abs(assignedTeam.lat - clientCoords[0]);
    const dLng = Math.abs(assignedTeam.lng - clientCoords[1]);
    if (dLat < 1.5 && dLng < 1.5) {
      return assignedTeam;
    }
  }
  if (!assignedTeamName) return null;

  const TEAM_WORKER_MAPPING: Record<string, { workerName: string; workerId: string; initials: string }> = {};
  let workerInfo = TEAM_WORKER_MAPPING[assignedTeamName];
  if (!workerInfo) {
    for (const [key, val] of Object.entries(TEAM_WORKER_MAPPING)) {
      if (assignedTeamName.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(assignedTeamName.toLowerCase())) {
        workerInfo = val;
        break;
      }
    }
  }

  const words = assignedTeamName.split(" ").filter(Boolean);
  const initials = workerInfo?.initials || (
    words.length >= 2
      ? (words[0][0] + words[1][0]).toUpperCase()
      : assignedTeamName.substring(0, 2).toUpperCase()
  );

  // Check shared live technician coordinates from localStorage or default
  let teamLat = clientCoords[0] + 0.0055;
  let teamLng = clientCoords[1] + (clientCoords[1] < 0 ? 0.0065 : -0.0065);
  try {
    const stored = localStorage.getItem("clearflow_field_tech_coords");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (
        typeof parsed.lat === "number" &&
        typeof parsed.lng === "number" &&
        !isNaN(parsed.lat) &&
        !isNaN(parsed.lng)
      ) {
        const dLat = Math.abs(parsed.lat - clientCoords[0]);
        const dLng = Math.abs(parsed.lng - clientCoords[1]);
        if (dLat < 0.35 && dLng < 0.35) {
          teamLat = parsed.lat;
          teamLng = parsed.lng;
        }
      }
    }
  } catch {}

  const resolvedWorkerName = workerInfo?.workerName || assignedTeamName || "Assigned Worker";
  const isAhmad = resolvedWorkerName.toLowerCase().includes('ahmad') || (workerInfo?.workerId === 'W#01');
  const resolvedWorkerId = isAhmad ? 'W#01' : (workerInfo?.workerId || "W#6754");

  return {
    name: workerInfo ? `${resolvedWorkerName} (${resolvedWorkerId})` : assignedTeamName,
    workerName: resolvedWorkerName,
    workerId: resolvedWorkerId,
    initials: initials || "AM",
    lat: teamLat,
    lng: teamLng,
    status: "En Route to Work Site",
    rating: 4.9,
    jobsCompleted: 48,
  };
}

// High-Performance Map Controller (Synchronous Recalc, Zero-Jank Resize & Immediate Tile Load)
function MapResizeController({ center }: { center: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    if (!container) return;

    const triggerRecalc = () => {
      map.invalidateSize({ pan: false });
      map.setView(center, map.getZoom(), { animate: false });
    };

    // 1. Immediate synchronous recalc on mount & center change
    triggerRecalc();

    // 2. Microtask and staggered renders to ensure all tiles on right edge load
    const t0 = setTimeout(triggerRecalc, 20);
    const t1 = setTimeout(triggerRecalc, 80);
    const t2 = setTimeout(triggerRecalc, 180);
    const t3 = setTimeout(triggerRecalc, 320);

    // 3. Immediate ResizeObserver for container changes (no debounce delay)
    const ro = new ResizeObserver(() => {
      map.invalidateSize({ pan: false });
    });
    ro.observe(container);

    const handleWindowResize = () => {
      map.invalidateSize({ pan: false });
    };
    window.addEventListener("resize", handleWindowResize);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", handleWindowResize);
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [center, map]);

  return null;
}

// Map Bounds Controller to fit both Client Site and Technician/Team within view
function MapBoundsController({
  points,
  center,
}: {
  points: [number, number][];
  center: [number, number];
}) {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    if (!container) return;

    const fit = () => {
      map.invalidateSize({ pan: false });
      if (points.length >= 2) {
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, {
          paddingTopLeft: [50, 50],
          paddingBottomRight: [50, 50],
          maxZoom: 16,
          animate: false,
        });
      } else {
        map.setView(center, 15, { animate: false });
      }
    };

    fit();
    const t0 = setTimeout(fit, 30);
    const t1 = setTimeout(fit, 120);
    const t2 = setTimeout(fit, 250);

    const ro = new ResizeObserver(() => {
      map.invalidateSize({ pan: false });
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [points, center, map]);

  return null;
}

// Custom Leaflet Icons
const createHqIcon = () =>
  L.divIcon({
    className: "custom-hq-pin",
    html: `
      <div style="transform: translate(-50%, -50%);" class="relative flex flex-col items-center pointer-events-auto">
        <div class="w-10 h-10 rounded-full bg-purple-700 text-white flex items-center justify-center font-bold text-xs border-2 border-white shadow-xl ring-4 ring-purple-400/40 animate-pulse">
          HQ
        </div>
        <div class="bg-purple-950 text-purple-200 text-[9px] font-bold px-1.5 py-0.5 rounded shadow mt-1 whitespace-nowrap border border-purple-700">
          ClearFlow Operations HQ
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });

const createTeamIcon = (
  initials: string,
  isOnJob: boolean,
  isSelected: boolean,
  customColor?: string,
  _subLabel?: string
) => {
  const bgClass = customColor
    ? ""
    : isSelected
    ? "bg-teal-600 ring-4 ring-teal-300 shadow-xl"
    : isOnJob
    ? "bg-amber-500 ring-2 ring-amber-200 shadow-md"
    : "bg-indigo-600 ring-2 ring-indigo-200 shadow-md";

  const customStyle = customColor
    ? `background-color: ${customColor}; box-shadow: 0 4px 14px ${customColor}66;`
    : "";

  return L.divIcon({
    className: "custom-team-pin",
    html: `
      <div style="transform: translate(-50%, -50%);" class="relative flex flex-col items-center pointer-events-auto">
        <div class="relative flex items-center justify-center">
          <span class="absolute w-10 h-10 rounded-full bg-current opacity-30 animate-ping"></span>
          <div class="w-8 h-8 rounded-full ${bgClass} text-white flex items-center justify-center font-bold text-xs border-2 border-white shadow-lg transition-transform hover:scale-110" style="${customStyle}">
            ${initials}
          </div>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
};

const createTechnicianIcon = (_name: string = "Assigned Worker", roleTheme = "fieldteam", workerInitials?: string) => {
  const isField = roleTheme === "fieldteam";
  const bgClass = isField
    ? "bg-amber-600 ring-4 ring-amber-300 shadow-xl"
    : "bg-blue-600 ring-4 ring-blue-300 shadow-xl";

  return L.divIcon({
    className: "custom-technician-pin",
    html: `
      <div style="transform: translate(-50%, -50%);" class="relative flex flex-col items-center pointer-events-auto">
        <div class="relative flex items-center justify-center">
          <span class="absolute w-11 h-11 rounded-full ${isField ? 'bg-amber-400/40' : 'bg-blue-400/40'} animate-ping"></span>
          <div class="w-9 h-9 rounded-full ${bgClass} text-white flex items-center justify-center font-bold text-xs border-2 border-white shadow-xl">
            ${workerInitials || "AM"}
          </div>
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
};

const createTargetSiteIcon = (_pinColor: string, _label: string = "Current Client Site", clientInitials?: string) =>
  L.divIcon({
    className: "custom-target-pin",
    html: `
      <div style="transform: translate(-50%, -50%);" class="relative flex flex-col items-center pointer-events-auto select-none">
        <span class="absolute -top-1 w-11 h-11 rounded-full bg-emerald-400/40 animate-ping"></span>
        <div class="w-9 h-9 rounded-full flex items-center justify-center text-white border-2 border-white shadow-xl ring-4 ring-emerald-300 font-black text-xs relative z-10 bg-gradient-to-tr from-emerald-600 to-teal-600">
          ${clientInitials ? clientInitials : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`}
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });

export function LocationMap({
  location = "Building A, Room 302, Central Facility Complex",
  coordinates = "31.4697° N, 74.2728° E",
  lat,
  lng,
  subtitle,
  statusText = "Live",
  roleTheme = "client",
  className = "",
  onExpandChange,
  initialExpanded = true,
  alwaysExpanded = true,
  assignedTeam,
  assignedTeamName,
  showTeamLocation = true,
  userLocation,
  technicianName,
  clientName,
  showDistanceBadge = true,
  expandedHeight,
}: LocationMapProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(alwaysExpanded ? true : initialExpanded);
  const [mapType, setMapType] = useState<"roadmap" | "satellite">("roadmap");
  const containerRef = useRef<HTMLDivElement>(null);

  const isFullWidth = className.includes("w-full");
  const parsedCenter = useMemo<[number, number]>(() => {
    if (typeof lat === "number" && typeof lng === "number" && !isNaN(lat) && !isNaN(lng)) {
      return [lat, lng];
    }
    return parseCoordinates(coordinates);
  }, [lat, lng, coordinates]);

  const resolvedClientInitials = useMemo(() => {
    if (clientName) {
      const clean = clientName.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s*/i, '').trim();
      const parts = clean.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    }
    return roleTheme === "client" ? "HT" : "HT";
  }, [clientName, roleTheme]);

  // Resolve technician coordinates for Field Team
  const techCoords = useMemo<[number, number]>(() => {
    if (
      userLocation &&
      typeof userLocation.lat === "number" &&
      typeof userLocation.lng === "number" &&
      !isNaN(userLocation.lat) &&
      !isNaN(userLocation.lng)
    ) {
      return [userLocation.lat, userLocation.lng];
    }
    // Check shared live technician coordinates from localStorage
    try {
      const stored = localStorage.getItem("clearflow_field_tech_coords");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (
          typeof parsed.lat === "number" &&
          typeof parsed.lng === "number" &&
          !isNaN(parsed.lat) &&
          !isNaN(parsed.lng)
        ) {
          const dLat = Math.abs(parsed.lat - parsedCenter[0]);
          const dLng = Math.abs(parsed.lng - parsedCenter[1]);
          if (dLat < 0.35 && dLng < 0.35) {
            return [parsed.lat, parsed.lng];
          }
        }
      }
    } catch {}
    // Realistic fallback position (~800m away, en-route toward client work site)
    return [
      parsedCenter[0] + 0.0055,
      parsedCenter[1] + (parsedCenter[1] < 0 ? 0.0065 : -0.0065),
    ];
  }, [userLocation, parsedCenter]);

  // Resolve assigned field team data (for Client and Admin)
  const resolvedTeam = useMemo(() => {
    if (roleTheme === "fieldteam") return null;
    if (!showTeamLocation) return null;
    const nameToUse = assignedTeamName || assignedTeam?.name || (roleTheme === "admin" ? "Alpha Crew (Assigned)" : "Alpha Crew (Cleaning)");
    return resolveTeamData(assignedTeam, nameToUse, parsedCenter);
  }, [assignedTeam, assignedTeamName, roleTheme, showTeamLocation, parsedCenter]);

  // Calculate live Haversine distance and travel time
  const calculatedDistance = useMemo(() => {
    let otherLat: number;
    let otherLng: number;
    if (roleTheme === "fieldteam") {
      otherLat = techCoords[0];
      otherLng = techCoords[1];
    } else if (resolvedTeam) {
      otherLat = resolvedTeam.lat;
      otherLng = resolvedTeam.lng;
    } else {
      return null;
    }
    return calculateHaversineDistance(otherLat, otherLng, parsedCenter[0], parsedCenter[1]);
  }, [roleTheme, techCoords, resolvedTeam, parsedCenter]);

  // Route points to frame both points smoothly in view
  const routePoints = useMemo<[number, number][]>(() => {
    if (roleTheme === "fieldteam") {
      return [techCoords, parsedCenter];
    }
    if (resolvedTeam) {
      return [[resolvedTeam.lat, resolvedTeam.lng], parsedCenter];
    }
    return [parsedCenter];
  }, [roleTheme, techCoords, resolvedTeam, parsedCenter]);

  const mapCenter = useMemo<[number, number]>(() => {
    if (routePoints.length >= 2) {
      return [
        (routePoints[0][0] + routePoints[1][0]) / 2,
        (routePoints[0][1] + routePoints[1][1]) / 2,
      ];
    }
    return parsedCenter;
  }, [routePoints, parsedCenter]);

  // Gentle 3D spring only when collapsed
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useTransform(mouseY, [-50, 50], [6, -6]);
  const rotateY = useTransform(mouseX, [-50, 50], [-6, 6]);

  const springRotateX = useSpring(rotateX, { stiffness: 280, damping: 28 });
  const springRotateY = useSpring(rotateY, { stiffness: 280, damping: 28 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isExpanded || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    mouseX.set(e.clientX - centerX);
    mouseY.set(e.clientY - centerY);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setIsHovered(false);
  };

  const handleExpand = () => {
    setIsExpanded(true);
    if (onExpandChange) onExpandChange(true);
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 40);
  };

  const handleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (alwaysExpanded) return;
    setIsExpanded(false);
    if (onExpandChange) onExpandChange(false);
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 40);
  };

  // Theme palettes
  const themeStyles = {
    client: {
      pinColor: "#0D9488", // teal-600
      pinGlow: "rgba(13, 148, 136, 0.4)",
      accentGradient: "from-teal-500/60 via-emerald-400/30 to-transparent",
      badgeDot: "bg-teal-500",
      badgeBg: "bg-teal-50 text-teal-800 border-teal-200",
      iconColor: "text-teal-600",
      borderHover: "hover:border-teal-400",
      activeBorder: "border-teal-400 shadow-teal-500/10",
      expandedBorder: "border-teal-500 shadow-lg shadow-teal-500/10",
      radarBg: "bg-teal-400/20",
    },
    fieldteam: {
      pinColor: "#F59E0B", // amber-500
      pinGlow: "rgba(245, 158, 11, 0.4)",
      accentGradient: "from-amber-500/60 via-amber-400/30 to-transparent",
      badgeDot: "bg-amber-500",
      badgeBg: "bg-amber-50 text-amber-800 border-amber-200",
      iconColor: "text-amber-500",
      borderHover: "hover:border-amber-400",
      activeBorder: "border-amber-400 shadow-amber-500/10",
      expandedBorder: "border-amber-500 shadow-lg shadow-amber-500/10",
      radarBg: "bg-amber-400/20",
    },
    admin: {
      pinColor: "#7E22CE", // purple-700
      pinGlow: "rgba(126, 34, 206, 0.4)",
      accentGradient: "from-purple-500/60 via-purple-400/30 to-transparent",
      badgeDot: "bg-purple-600",
      badgeBg: "bg-purple-50 text-purple-800 border-purple-200",
      iconColor: "text-purple-600",
      borderHover: "hover:border-purple-400",
      activeBorder: "border-purple-300 shadow-purple-500/10",
      expandedBorder: "border-purple-500 shadow-lg shadow-purple-500/10",
      radarBg: "bg-purple-400/20",
    },
  }[roleTheme] || {
    pinColor: "#0D9488",
    pinGlow: "rgba(13, 148, 136, 0.4)",
    accentGradient: "from-teal-500/60 via-emerald-400/30 to-transparent",
    badgeDot: "bg-teal-500",
    badgeBg: "bg-teal-50 text-teal-800 border-teal-200",
    iconColor: "text-teal-600",
    borderHover: "hover:border-teal-400",
    activeBorder: "border-teal-400 shadow-teal-500/10",
    expandedBorder: "border-teal-500 shadow-lg shadow-teal-500/10",
    radarBg: "bg-teal-400/20",
  };

  return (
    <motion.div
      ref={containerRef}
      className={`relative select-none max-w-full isolate ${className}`}
      style={{
        perspective: isExpanded ? undefined : 1000,
        width: isFullWidth ? "100%" : undefined,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={!isExpanded ? handleExpand : undefined}
    >
      <motion.div
        className={`relative overflow-hidden rounded-2xl bg-white border transition-[border-color,box-shadow] duration-200 max-w-full isolate z-0 ${
          isExpanded
            ? `${themeStyles.expandedBorder} shadow-xl`
            : `${themeStyles.borderHover} ${themeStyles.activeBorder} cursor-pointer shadow-md`
        }`}
        style={{
          rotateX: isExpanded ? 0 : springRotateX,
          rotateY: isExpanded ? 0 : springRotateY,
          transformStyle: isExpanded ? "flat" : "preserve-3d",
          width: isFullWidth ? "100%" : undefined,
        }}
        animate={{
          width: isFullWidth ? "100%" : isExpanded ? 460 : 280,
          height: isExpanded ? (expandedHeight ?? 320) : 150,
        }}
        transition={{
          duration: 0.22,
          ease: [0.16, 1, 0.3, 1],
        }}
        onAnimationComplete={() => {
          window.dispatchEvent(new Event("resize"));
        }}
      >
        {/* ================= COMPACT / COLLAPSED STATE ================= */}
        {!isExpanded && (
          <div className="relative w-full h-full flex flex-col justify-between p-3.5 bg-[#F8FAFC]">
            {/* Subtle Grid Background */}
            <div className="absolute inset-0 opacity-[0.08] pointer-events-none">
              <svg width="100%" height="100%">
                <defs>
                  <pattern id={`compact-map-grid-${roleTheme}`} width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" className="stroke-gray-900" strokeWidth="0.8" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill={`url(#compact-map-grid-${roleTheme})`} />
              </svg>
            </div>

            {/* Subtle Building Blocks */}
            <div className="absolute top-[18%] left-[12%] w-[18%] h-[24%] rounded bg-gray-200/70 border border-gray-300/40 pointer-events-none" />
            <div className="absolute top-[22%] right-[14%] w-[22%] h-[32%] rounded bg-gray-200/60 border border-gray-300/40 pointer-events-none" />
            <div className="absolute bottom-[28%] left-[30%] w-[16%] h-[20%] rounded bg-gray-200/60 border border-gray-300/40 pointer-events-none" />

            {/* Central Animated Pulse Pin */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
              <motion.div
                className={`absolute w-14 h-14 rounded-full ${themeStyles.radarBg}`}
                animate={{
                  scale: [1, 2.1, 1],
                  opacity: [0.75, 0, 0.75],
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <svg
                width="34"
                height="34"
                viewBox="0 0 24 24"
                fill="none"
                style={{ filter: `drop-shadow(0 4px 10px ${themeStyles.pinGlow})` }}
              >
                <path
                  d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                  fill={themeStyles.pinColor}
                />
                <circle cx="12" cy="9" r="2.8" fill="#FFFFFF" />
              </svg>
            </div>

            {/* Top Row: Pin / Status Badge */}
            <div className="relative z-10 flex items-start justify-between">
              <div className="p-1 rounded-md bg-white/80 shadow-2xs">
                <MapPin className={`w-4 h-4 ${themeStyles.iconColor}`} />
              </div>
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border shadow-2xs backdrop-blur-xs ${
                showTeamLocation ? themeStyles.badgeBg : 'bg-gray-100 text-gray-700 border-gray-200'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${showTeamLocation ? `${themeStyles.badgeDot} animate-pulse` : 'bg-gray-400'}`} />
                <span className="text-[10px] font-bold tracking-wide uppercase">{statusText}</span>
              </div>
            </div>

            {/* Bottom Row: Info & Coordinates */}
            <div className="relative z-10 space-y-0.5 bg-white/85 backdrop-blur-xs p-2 rounded-xl border border-gray-100 shadow-2xs">
              {subtitle && (
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <Navigation className="w-2.5 h-2.5 text-gray-400" />
                  <span className="truncate">{subtitle}</span>
                </p>
              )}
              <h4 className="text-gray-900 font-bold text-xs tracking-tight line-clamp-1">
                {location}
              </h4>
              <p className="text-gray-500 text-[10px] font-mono flex items-center gap-1">
                <Compass className="w-2.5 h-2.5 text-gray-400 shrink-0" />
                <span>{coordinates}</span>
              </p>
              <div className={`h-0.5 bg-gradient-to-r ${themeStyles.accentGradient} rounded-full`} />
            </div>
          </div>
        )}

        {/* ================= EXPANDED LEAFLET MAP STATE ================= */}
        {isExpanded && (
          <div className="relative w-full h-full flex flex-col min-w-full overflow-hidden">
            <MapContainer
              center={mapCenter}
              zoom={14}
              scrollWheelZoom={true}
              className="w-full h-full min-w-full z-0 flex-1 has-layer-switcher"
              style={{ width: "100%", height: "100%", minWidth: "100%" }}
            >
              {/* Roadmap Tiles (Permanent, never unmounted to prevent shutter/flicker) */}
              <TileLayer
                attribution="&copy; Google Maps"
                url="https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                subdomains={["0", "1", "2", "3"]}
                maxZoom={20}
                opacity={mapType === "roadmap" ? 1 : 0}
                zIndex={mapType === "roadmap" ? 2 : 1}
              />

              {/* Satellite Hybrid Tiles (Permanent, never unmounted to prevent shutter/flicker) */}
              <TileLayer
                attribution="&copy; Google Maps Satellite"
                url="https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                subdomains={["0", "1", "2", "3"]}
                maxZoom={20}
                opacity={mapType === "satellite" ? 1 : 0}
                zIndex={mapType === "satellite" ? 2 : 1}
              />

              <MapResizeController center={mapCenter} />
              <MapBoundsController points={routePoints} center={mapCenter} />

              {/* ADMIN ROLE VIEW: Operations HQ */}
              {roleTheme === "admin" && (
                <Marker position={[31.4697, 74.2728]} icon={createHqIcon()}>
                  <Popup>
                    <div className="text-xs p-1">
                      <p className="font-bold text-purple-900 text-sm">🏢 ClearFlow Operations Command HQ</p>
                      <p className="text-gray-600 mt-1">Central Facility Complex, Global Operations Hub</p>
                      <p className="text-[10px] text-purple-700 font-medium mt-1">Automated Assignment Gateway Active</p>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* WORKER VIEW: "You (Worker Unit)" Marker */}
              {roleTheme === "fieldteam" && (
                <Marker
                  position={techCoords}
                  icon={createTechnicianIcon(technicianName || "You (Worker Unit)", roleTheme, technicianName ? getPersonInitials(technicianName) : "AM")}
                >
                  <Popup>
                    <div className="text-xs p-1.5 space-y-1 max-w-xs">
                      <p className="font-bold text-amber-900 text-sm flex items-center gap-1.5">
                        <Navigation className="w-3.5 h-3.5 text-amber-600" />
                        {technicianName || "You (Worker Unit)"}
                      </p>
                      <p className="text-gray-700"><strong>Status:</strong> Assigned & En Route</p>
                      {calculatedDistance && (
                        <div className="pt-1 mt-1 border-t border-amber-200/60 flex items-center justify-between text-[11px] font-semibold text-amber-950">
                          <span>Distance to Client:</span>
                          <span className="bg-amber-100 px-1.5 py-0.5 rounded font-bold text-amber-900">
                            {calculatedDistance.kmStr} ({calculatedDistance.milesStr}) • {calculatedDistance.etaStr}
                          </span>
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* CLIENT VIEW: Assigned Technician Unit Marker */}
              {roleTheme === "client" && resolvedTeam && (
                <Marker
                  position={[resolvedTeam.lat, resolvedTeam.lng]}
                  icon={createTeamIcon(
                    resolvedTeam.initials || "AM",
                    true,
                    true,
                    "#0D9488",
                    `Worker: ${(resolvedTeam as any).workerName || "Assigned Worker"} (${(resolvedTeam as any).workerId || "W#6754"})`
                  )}
                >
                  <Popup>
                    <div className="text-xs p-1.5 space-y-1 max-w-xs">
                      <p className="font-bold text-teal-900 text-sm">
                        {(resolvedTeam as any).workerName || "Assigned Worker"} <span className="text-amber-700 font-mono text-[11px]">({(resolvedTeam as any).workerId || "W#6754"})</span>
                      </p>
                      <p className="text-gray-600"><strong>Role:</strong> <span className="text-amber-700 font-semibold">Worker</span> &bull; {resolvedTeam.name}</p>
                      <p className="text-gray-600"><strong>Status:</strong> {resolvedTeam.status || "En Route to Facility"}</p>
                      {calculatedDistance && (
                        <div className="pt-1 mt-1 border-t border-teal-200/60 flex items-center justify-between text-[11px] font-semibold text-teal-950">
                          <span>Distance to you:</span>
                          <span className="bg-teal-100 px-1.5 py-0.5 rounded font-bold text-teal-900">
                            {calculatedDistance.kmStr} ({calculatedDistance.milesStr}) • {calculatedDistance.etaStr}
                          </span>
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* ADMIN VIEW: Accepted / Assigned Service Team Marker */}
              {roleTheme === "admin" && resolvedTeam && (
                <Marker
                  position={[resolvedTeam.lat, resolvedTeam.lng]}
                  icon={createTeamIcon(
                    resolvedTeam.initials || "AM",
                    true,
                    true,
                    "#7E22CE",
                    `Worker: ${(resolvedTeam as any).workerName || "Assigned Worker"} (${(resolvedTeam as any).workerId || "W#6754"})`
                  )}
                >
                  <Popup>
                    <div className="text-xs p-1.5 space-y-1 max-w-xs">
                      <p className="font-bold text-purple-900 text-sm">
                        Worker: {(resolvedTeam as any).workerName || "Assigned Worker"} <span className="text-amber-700 font-mono text-[11px]">({(resolvedTeam as any).workerId || "W#6754"})</span>
                      </p>
                      <p className="text-gray-600"><strong>Crew / Specialization:</strong> {resolvedTeam.name}</p>
                      <p className="text-gray-600"><strong>Status:</strong> Job Accepted & Assigned</p>
                      {calculatedDistance && (
                        <div className="pt-1 mt-1 border-t border-purple-200/60 flex items-center justify-between text-[11px] font-semibold text-purple-950">
                          <span>Distance to Client Site:</span>
                          <span className="bg-purple-100 px-1.5 py-0.5 rounded font-bold text-purple-900">
                            {calculatedDistance.kmStr} ({calculatedDistance.milesStr}) • {calculatedDistance.etaStr}
                          </span>
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* CLIENT WORK SITE PIN (Rendered for ALL roles) */}
              <Marker
                position={parsedCenter}
                icon={createTargetSiteIcon(
                  themeStyles.pinColor,
                  roleTheme === "fieldteam"
                    ? `Client: ${clientName || "Client"}`
                    : roleTheme === "client"
                    ? `Your Facility (${clientName || "Client"})`
                    : `Client: ${clientName || "Client"}`,
                  resolvedClientInitials
                )}
              >
                <Popup>
                  <div className="text-xs p-1.5 space-y-1 max-w-xs">
                    <p className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                      <MapPin className={`w-3.5 h-3.5 ${themeStyles.iconColor}`} />
                      {roleTheme === "fieldteam"
                        ? "Current Client Work Site"
                        : roleTheme === "client"
                        ? "Your Facility Work Site"
                        : "Client Service Work Site"}
                    </p>
                    <p className="text-gray-800 font-medium">{location}</p>
                    <p className="text-gray-500 font-mono text-[11px]">{coordinates}</p>
                    {calculatedDistance && (
                      <div className="pt-1 mt-1 border-t border-gray-100 flex items-center justify-between text-[11px]">
                        <span className="text-gray-500">Distance:</span>
                        <span className="font-bold text-gray-900">
                          {calculatedDistance.kmStr} ({calculatedDistance.milesStr})
                        </span>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>

              {/* ROUTE LINE (Dotted direct path connecting team/technician to client work site) */}
              {roleTheme === "fieldteam" ? (
                <Polyline
                  positions={[techCoords, parsedCenter]}
                  pathOptions={{
                    color: themeStyles.pinColor,
                    weight: 3.5,
                    dashArray: "6, 8",
                    opacity: 0.9,
                  }}
                />
              ) : (
                resolvedTeam && (
                  <Polyline
                    positions={[
                      [resolvedTeam.lat, resolvedTeam.lng],
                      parsedCenter,
                    ]}
                    pathOptions={{
                      color: themeStyles.pinColor,
                      weight: 3.5,
                      dashArray: "6, 8",
                      opacity: 0.9,
                    }}
                  />
                )
              )}
            </MapContainer>

            {/* Dynamic Distance & ETA Overlay Badge */}
            {calculatedDistance && showDistanceBadge && (
              <div className="absolute top-3 right-3 z-10 flex items-center pointer-events-auto">
                <div
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-xl shadow-lg backdrop-blur-md border text-xs font-bold transition-all",
                    roleTheme === "fieldteam"
                      ? "bg-amber-950/85 text-amber-200 border-amber-500/40"
                      : roleTheme === "admin"
                      ? "bg-purple-950/85 text-purple-200 border-purple-500/40"
                      : "bg-teal-950/85 text-teal-200 border-teal-500/40"
                  )}
                >
                  <span className="flex h-2 w-2 relative">
                    <span
                      className={cn(
                        "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                        roleTheme === "fieldteam"
                          ? "bg-amber-400"
                          : roleTheme === "admin"
                          ? "bg-purple-400"
                          : "bg-teal-400"
                      )}
                    />
                    <span
                      className={cn(
                        "relative inline-flex rounded-full h-2 w-2",
                        roleTheme === "fieldteam"
                          ? "bg-amber-500"
                          : roleTheme === "admin"
                          ? "bg-purple-500"
                          : "bg-teal-500"
                      )}
                    />
                  </span>
                  <Navigation className="w-3.5 h-3.5 text-current shrink-0" />
                  <span>
                    {roleTheme === "fieldteam"
                      ? `Distance to Work: ${calculatedDistance.kmStr} (${calculatedDistance.milesStr}) • ${calculatedDistance.etaStr}`
                      : roleTheme === "admin"
                      ? `Team Distance: ${calculatedDistance.kmStr} (${calculatedDistance.milesStr}) • ${calculatedDistance.etaStr}`
                      : `Technician: ${calculatedDistance.kmStr} (${calculatedDistance.milesStr}) • ${calculatedDistance.etaStr}`}
                  </span>
                </div>
              </div>
            )}

            {/* Top-Left Floating Controls: Satellite Toggle & Minimize Button */}
            <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 pointer-events-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setMapType((prev) => (prev === "roadmap" ? "satellite" : "roadmap"));
                }}
                className="bg-white/95 backdrop-blur-sm border-gray-200 text-gray-800 text-xs shadow-md hover:bg-gray-50 cursor-pointer h-7 px-2.5 font-medium"
              >
                <Layers className="w-3.5 h-3.5 mr-1 text-gray-600" />
                {mapType === "roadmap" ? "Google Satellite" : "Google Roadmap"}
              </Button>

              {!alwaysExpanded && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCollapse}
                  className="bg-white/95 backdrop-blur-sm border-gray-200 text-gray-700 text-xs shadow-md hover:bg-red-50 hover:text-red-700 cursor-pointer h-7 px-2 font-medium"
                  title="Minimize map to compact card"
                >
                  <Minimize2 className="w-3.5 h-3.5 mr-1 text-gray-600" />
                  Minimize
                </Button>
              )}
            </div>

            {/* Bottom-Left Live Google Maps Branding Badge */}
            <div className="absolute bottom-2 left-2 z-10 bg-white/90 backdrop-blur-sm text-gray-700 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 shadow-sm border border-gray-200 pointer-events-none">
              <span className="font-bold text-gray-900">Google Maps Live</span>
              <span>• {mapType === "roadmap" ? "Roadmap" : "Satellite Hybrid"}</span>
            </div>

            {/* Bottom-Right Coordinates Badge (Distance removed to prevent duplication with top badge) */}
            <div className="absolute bottom-2 right-2 z-10 bg-white/95 backdrop-blur-sm text-gray-700 px-2.5 py-1 rounded-lg text-[10px] font-mono shadow-md border border-gray-200 pointer-events-none flex items-center gap-1.5 max-w-[280px]">
              <span className="truncate">{coordinates}</span>
            </div>
          </div>
        )}
      </motion.div>

      {/* Click to Expand Tooltip / Hint */}
      {!isExpanded && !alwaysExpanded && (
        <motion.p
          className="absolute -bottom-5 left-1/2 text-[10px] font-semibold text-gray-400 whitespace-nowrap pointer-events-none"
          style={{ x: "-50%" }}
          initial={{ opacity: 0 }}
          animate={{
            opacity: isHovered ? 1 : 0,
            y: isHovered ? 0 : 3,
          }}
          transition={{ duration: 0.2 }}
        >
          Click to expand live map ↗
        </motion.p>
      )}
    </motion.div>
  );
}

export default LocationMap;
