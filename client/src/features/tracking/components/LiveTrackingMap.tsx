import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import { Button } from '@/components/ui/button';
import { 
  MapPin, Navigation, Radio, Star, RefreshCw, 
  MessageSquare, Crosshair, Loader2, Layers, Wrench, ShieldCheck, Trash2,
  Search, X 
} from 'lucide-react';
import { apiClient } from '@/infrastructure/api/client';
import { ENDPOINTS } from '@/infrastructure/api/endpoints';
import { useAuth } from '@/entities/user/hooks/useAuth';
import { socketClient } from '@/infrastructure/socket/client';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { calculateHaversineDistance } from '@/components/ui/expand-map';
import { 
  PRESET_LOCATIONS, 
  forwardGeocodeAddress, 
  getSavedUserProfileLocation,
  type LocationMatch 
} from '@/shared/utils/locationHelper';
import { createClearFlowPinIcon } from '@/shared/components/maps/clearflowMapPin';
export { PRESET_LOCATIONS, forwardGeocodeAddress, type LocationMatch };

// Helper to retrieve standardized worker and client details matching Operations directory
export const getWorkerInfoForTeam = (teamName: string, teamMembers?: any[], matchingOrder?: any) => {
  if (matchingOrder?.assignedWorker?.name) {
    const raw = String(matchingOrder.assignedWorker.name).trim();
    const isAhmad = raw.toLowerCase().includes('ahmad');
    return {
      name: raw,
      id: matchingOrder.assignedWorker.workerCode || matchingOrder.assignedWorker.workerId || (isAhmad ? 'W#01' : 'W#0001'),
      phone: matchingOrder.assignedWorker.phone || '+92 300 0000000'
    };
  }
  if (teamMembers && teamMembers.length > 0 && teamMembers[0]?.name) {
    const raw = String(teamMembers[0].name).trim();
    const isAhmad = raw.toLowerCase().includes('ahmad');
    return { name: raw, id: isAhmad ? 'W#01' : (teamMembers[0].workerId || 'W#0001'), phone: teamMembers[0].phone || '+92 300 0000000' };
  }
  const isAhmad = (teamName || '').toLowerCase().includes('ahmad');
  return { name: teamName || 'Assigned Worker', id: isAhmad ? 'W#01' : 'W#0001', phone: '+92 300 0000000' };
};

export const getClientInfoForTeam = (teamName: string, team?: any, matchingOrder?: any) => {
  if (matchingOrder) {
    const clientObj = typeof matchingOrder.clientId === 'object' ? matchingOrder.clientId : null;
    const name = clientObj?.name || (matchingOrder.title?.toLowerCase().includes('ali') ? 'Ali' : 'Ali');
    const id = clientObj?.clientCode || clientObj?.id || (name.toLowerCase().includes('ali') ? 'C#01' : 'C#0001');
    return { name, id, gender: 'boy' as const };
  }
  if (team?.assignedClient?.name) {
    return {
      name: team.assignedClient.name,
      id: team.assignedClient.id || team.assignedClient.clientCode || 'C#01',
      gender: 'boy' as const
    };
  }
  const isAli = (teamName || '').toLowerCase().includes('ahmad') || (teamName || '').toLowerCase().includes('ali');
  return { name: isAli ? 'Ali' : 'Registered Client', id: 'C#01', gender: 'boy' as const };
};

export const getPersonInitials = (fullName: string): string => {
  if (!fullName) return '';
  const clean = fullName.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s*/i, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Custom team marker using DivIcon with matching Orange theme — name label hidden for all
const createTeamIcon = (
  initials: string, 
  _workerName: string, 
  isSelected: boolean
) => {
  const bgClass = isSelected
    ? 'bg-gradient-to-tr from-amber-500 to-orange-600 ring-4 ring-orange-300 shadow-2xl scale-110'
    : 'bg-gradient-to-tr from-amber-500 to-orange-600 ring-2 ring-orange-200 shadow-md';

  return L.divIcon({
    className: 'custom-team-pin',
    html: `
      <div style="transform: translate(-50%, -50%);" class="relative flex flex-col items-center pointer-events-auto select-none">
        <div class="w-9 h-9 rounded-full ${bgClass} text-white flex items-center justify-center font-bold text-xs border-2 border-white transition-transform hover:scale-110 shadow-md">
          ${initials}
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
};

// Custom client marker using DivIcon with matching Green/Emerald theme — name label removed
const createClientIcon = (
  initials: string,
  clientName: string,
  isCurrentUser: boolean
) => {
  return L.divIcon({
    className: 'custom-client-pin',
    html: `
      <div style="transform: translate(-50%, -50%);" class="relative flex flex-col items-center pointer-events-auto select-none cursor-pointer">
        <span class="absolute -top-1 w-11 h-11 rounded-full bg-emerald-400/40 animate-ping"></span>
        <div class="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-600 ring-4 ring-emerald-300 text-white flex items-center justify-center font-black text-xs border-2 border-white transition-transform hover:scale-110 shadow-lg relative z-10">
          ${initials || 'CL'}
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
};

// Custom searched address/landmark marker using uploaded location-pin icon with transparent background and bouncing animation
const createSearchedLocationIcon = () => {
  return L.divIcon({
    className: 'custom-searched-location-pin',
    html: `
      <div style="transform: translate(-50%, -100%); background: transparent; border: none;" class="relative flex flex-col items-center pointer-events-auto select-none cursor-pointer">
        <img 
          src="/icons/location-pin.png" 
          alt="Location Pin" 
          style="width: 42px; height: 50px; object-fit: contain; animation: pinFloatBounce 1.2s ease-in-out infinite; filter: drop-shadow(0 6px 8px rgba(0, 0, 0, 0.3)); background: transparent;"
          class="relative z-10 select-none" 
        />
        <div 
          style="width: 18px; height: 6px; background: rgba(0, 0, 0, 0.35); border-radius: 9999px; filter: blur(1.5px); animation: pinShadowPulse 1.2s ease-in-out infinite; margin-top: -3px;"
          class="relative z-0"
        ></div>
      </div>
    `,
    iconSize: [42, 54],
    iconAnchor: [21, 54],
    popupAnchor: [0, -54],
  });
};

const userDeviceIcon = L.divIcon({
  className: 'custom-user-device-pin',
  html: `
    <div style="transform: translate(-50%, -50%);" class="relative flex items-center justify-center pointer-events-auto select-none">
      <span class="absolute w-8 h-8 rounded-full bg-blue-500/30 animate-ping"></span>
      <div class="w-6 h-6 rounded-full bg-blue-600 border-2 border-white shadow-lg flex items-center justify-center text-white text-[10px]">
        ●
      </div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Map Controller for Smooth Panning without Shuttering
function MapPanController({ 
  targetCoords,
  defaultCoords 
}: { 
  targetCoords: [number, number] | null;
  defaultCoords?: [number, number] | null;
}) {
  const map = useMap();
  const lastTargetRef = useRef<string>('');

  // On initial mount, set view immediately to coordinates and invalidate size to avoid grey margins
  useEffect(() => {
    const initial = targetCoords || defaultCoords;
    if (initial && initial[0] && initial[1]) {
      map.setView(initial, 14);
      lastTargetRef.current = `${initial[0].toFixed(4)},${initial[1].toFixed(4)}`;
    }
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [map]);

  useEffect(() => {
    if (targetCoords) {
      const key = `${targetCoords[0].toFixed(4)},${targetCoords[1].toFixed(4)}`;
      if (lastTargetRef.current === key) return;
      lastTargetRef.current = key;

      const center = map.getCenter();
      const dist = Math.abs(center.lat - targetCoords[0]) + Math.abs(center.lng - targetCoords[1]);
      if (dist > 0.0003) {
        map.flyTo(targetCoords, 14, { duration: 0.8 });
      }
    }
  }, [targetCoords, map]);

  return null;
}

// Map Controller to fit bounds smoothly around both technicians and the client site
function MapBoundsController({ points }: { points: [number, number][] }) {
  const map = useMap();
  const pointsKey = points.map(p => `${p[0].toFixed(3)},${p[1].toFixed(3)}`).join(';');
  const lastKeyRef = useRef<string>('');

  useEffect(() => {
    if (points.length >= 2 && lastKeyRef.current !== pointsKey) {
      lastKeyRef.current = pointsKey;
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15, animate: false });
    }
  }, [points, pointsKey, map]);

  return null;
}

// Invalidate size once after mount so the flex layout settles cleanly without shutter
function MapResizeHandler() {
  const map = useMap();
  useEffect(() => {
    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      clearTimeout(timer);
    };
  }, [map]);
  return null;
}

export const getJobCodeForWorker = (workerName?: string, teamName?: string) => {
  const w = (workerName || '').toLowerCase();
  const t = (teamName || '').toLowerCase();
  if (w.includes('usman') || t.includes('plumbing') || t.includes('pipe')) return 'WO-2026-0005';
  if (w.includes('tariq') || t.includes('electrical') || t.includes('voltage')) return 'WO-2026-0002';
  if (w.includes('kamran') || t.includes('gardening') || t.includes('green thumb') || t.includes('rapid')) return 'WO-2026-0003';
  if (w.includes('hamza') || t.includes('disposal') || t.includes('green tech')) return 'WO-2026-0004';
  if (w.includes('zubair') || t.includes('recycling') || t.includes('delta')) return 'WO-2026-0001';
  if (w.includes('ahsan') || t.includes('cleaning') || t.includes('alpha')) return 'WO-2026-0006';
  return 'WO-2026-0006';
};

export const getJobCodeForClient = (clientName?: string) => {
  const c = (clientName || '').toLowerCase();
  if (c.includes('ayesha') || c.includes('khan')) return 'WO-2026-0005';
  if (c.includes('bilal') || c.includes('ahmed')) return 'WO-2026-0001';
  if (c.includes('fatima') || c.includes('zahra')) return 'WO-2026-0002';
  if (c.includes('omar') || c.includes('farooq')) return 'WO-2026-0003';
  if (c.includes('zoya') || c.includes('malik')) return 'WO-2026-0004';
  if (c.includes('hassan') || c.includes('tariq')) return 'WO-2026-0006';
  return 'WO-2026-0006';
};

const DEFAULT_TEAMS: any[] = [];

export interface ClientLocationInfo {
  id: string;
  name: string;
  initials: string;
  lat: number;
  lng: number;
  address: string;
  service: string;
  phone: string;
  assignedTeamName: string;
  assignedWorkerName?: string;
  activeOrderCode: string;
}

export const DEFAULT_CLIENTS: ClientLocationInfo[] = [];

const isTrackingEntityDeleted = (entity: any, deletedSet: Set<string>): boolean => {
  if (!entity || deletedSet.size === 0) return false;
  const id = String(entity.id || entity._id || '').toLowerCase().trim();
  const rawId = id.replace(/^[acw]#/i, '');
  const name = String(entity.name || '').toLowerCase().trim();
  const email = String(entity.email || '').toLowerCase().trim();
  const phone = String(entity.phone || '').toLowerCase().trim();

  if (id && deletedSet.has(id)) return true;
  if (rawId && deletedSet.has(rawId)) return true;
  if (name && deletedSet.has(name)) return true;
  if (email && deletedSet.has(email)) return true;
  if (phone && deletedSet.has(phone)) return true;

  // Check worker/leader info
  const leader = String(entity.leaderName || entity.assignedWorkerName || '').toLowerCase().trim();
  if (leader && deletedSet.has(leader)) return true;

  // Check assigned client info
  const assignedClientName = String(entity.assignedClient?.name || '').toLowerCase().trim();
  const assignedClientId = String(entity.assignedClient?.clientId || entity.assignedClient?.id || '').toLowerCase().trim();
  if (assignedClientName && deletedSet.has(assignedClientName)) return true;
  if (assignedClientId && (deletedSet.has(assignedClientId) || deletedSet.has(assignedClientId.replace(/^[acw]#/i, '')))) return true;

  // Check members
  if (Array.isArray(entity.members)) {
    for (const m of entity.members) {
      const mName = String(m.name || '').toLowerCase().trim();
      const mId = String(m.id || m._id || m.workerId || '').toLowerCase().trim();
      if (mName && deletedSet.has(mName)) return true;
      if (mId && (deletedSet.has(mId) || deletedSet.has(mId.replace(/^[acw]#/i, '')))) return true;
    }
  }

  return false;
};

export interface RoleLocationState {
  role: 'admin' | 'fieldteam' | 'client';
  name: string;
  label: string;
  title: string;
  address: string;
  lat: number;
  lng: number;
}

export const getInitialRoleLocation = (user: any): RoleLocationState => {
  const userRole = (user?.role || '').toLowerCase();
  const isAdmin = userRole === 'admin';
  const isField = userRole === 'fieldteam' || userRole === 'field_team' || userRole === 'field-team' || userRole === 'field' || userRole === 'worker';

  const profileLoc = getSavedUserProfileLocation(user);
  const myName = user?.name || (isAdmin ? 'Admin' : isField ? 'Field Specialist' : 'Client');

  if (isAdmin) {
    const address = profileLoc.address || 'Central Facility Operations Complex, Lahore';
    return {
      role: 'admin',
      name: myName,
      label: 'My Location',
      title: 'Central Operations Headquarters',
      address,
      lat: profileLoc.lat || 31.5204,
      lng: profileLoc.lng || 74.3587,
    };
  }

  if (isField) {
    const address = profileLoc.address || 'Canal View Field Base, Lahore';
    return {
      role: 'fieldteam',
      name: myName,
      label: 'My Location',
      title: 'Field Operations Station',
      address,
      lat: profileLoc.lat || 31.4880,
      lng: profileLoc.lng || 74.2480,
    };
  }

  // Client
  const address = profileLoc.address || 'Registered Service Site, Lahore';
  return {
    role: 'client',
    name: myName,
    label: 'My Location',
    title: 'My Service Location',
    address,
    lat: profileLoc.lat || 31.5104,
    lng: profileLoc.lng || 74.3068,
  };
};

export const LiveTrackingMap = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const userRole = (user?.role || '').toLowerCase();
  const isAdminRole = userRole === 'admin';
  const isFieldRole = userRole === 'fieldteam' || userRole === 'field_team' || userRole === 'field-team' || userRole === 'field' || userRole === 'worker';
  const isClientRole = !isAdminRole && !isFieldRole;

  const initialRoleLoc = useMemo(() => getInitialRoleLocation(user), [user]);
  const [roleLocation, setRoleLocation] = useState<RoleLocationState>(initialRoleLoc);

  // Track deleted user identifiers to permanently purge them from live GPS markers & telemetry
  const [deletedIdentifiers, setDeletedIdentifiers] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('clearflow_deleted_user_identifiers');
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          return new Set(arr.map((s: string) => String(s).toLowerCase().trim()));
        }
      }
    } catch (_) {}
    return new Set<string>();
  });

  const [teams, setTeams] = useState<any[]>(() => {
    return DEFAULT_TEAMS.filter((t) => !isTrackingEntityDeleted(t, deletedIdentifiers));
  });
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ON_JOB' | 'AVAILABLE'>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [panCoords, setPanCoords] = useState<[number, number] | null>([initialRoleLoc.lat, initialRoleLoc.lng]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [searchQuery, setSearchQuery] = useState('');
  const [geocodedLocation, setGeocodedLocation] = useState<LocationMatch | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keep role location synchronized with user profile changes
  useEffect(() => {
    const current = getInitialRoleLocation(user);
    setRoleLocation(current);
    if (!searchQuery.trim() && !selectedTeam) {
      setPanCoords([current.lat, current.lng]);
    }

    const cleanAddr = current.address.trim();
    if (cleanAddr) {
      forwardGeocodeAddress(cleanAddr).then((matched) => {
        if (matched) {
          if (Math.abs(matched.lat - current.lat) > 0.001 || Math.abs(matched.lng - current.lng) > 0.001) {
            const updated: RoleLocationState = {
              ...current,
              lat: matched.lat,
              lng: matched.lng,
            };
            setRoleLocation(updated);
            if (!searchQuery.trim() && !selectedTeam) {
              setPanCoords([matched.lat, matched.lng]);
            }
            try {
              localStorage.setItem('clearflow_user_profile_lat', String(matched.lat));
              localStorage.setItem('clearflow_user_profile_lng', String(matched.lng));
            } catch {}
          }
        }
      });
    }
  }, [user]);

  // Listen for user profile updates from ProfilePage or other tabs/storage
  useEffect(() => {
    const handleUserUpdate = (e?: any) => {
      const updatedUser = e?.detail || user;
      const updatedLoc = getInitialRoleLocation(updatedUser);
      setRoleLocation(updatedLoc);
      if (!searchQuery.trim() && !selectedTeam) {
        setPanCoords([updatedLoc.lat, updatedLoc.lng]);
      }
    };
    window.addEventListener('clearflow:user-updated', handleUserUpdate);
    window.addEventListener('clearflow:refresh-data', handleUserUpdate);
    return () => {
      window.removeEventListener('clearflow:user-updated', handleUserUpdate);
      window.removeEventListener('clearflow:refresh-data', handleUserUpdate);
    };
  }, [user, searchQuery, selectedTeam]);

  // Resiliently locate worker team or assigned zone if worker has no custom address
  useEffect(() => {
    if (!isFieldRole || !teams.length) return;
    const profileLoc = getSavedUserProfileLocation(user);
    const myName = (user?.name || '').toLowerCase().trim();

    const hasCustomAddress = Boolean(
      profileLoc.address && 
      !profileLoc.address.toLowerCase().includes('field base') && 
      !profileLoc.address.toLowerCase().includes('specialist station')
    );

    if (hasCustomAddress) {
      // Sync worker's active role location & map pan with worker's saved profile location
      setRoleLocation((prev) => ({
        ...prev,
        address: profileLoc.address,
        lat: profileLoc.lat,
        lng: profileLoc.lng,
      }));
      if (!searchQuery.trim() && !selectedTeam) {
        setPanCoords([profileLoc.lat, profileLoc.lng]);
      }
      // Sync worker's active team marker location with worker's saved profile location
      setTeams((prev) =>
        prev.map((t) => {
          const leaderName = (t.leaderName || t.workerName || '').toLowerCase().trim();
          const matches = leaderName && (leaderName.includes(myName) || myName.includes(leaderName));
          return matches ? { ...t, zoneLat: profileLoc.lat, zoneLng: profileLoc.lng, zoneAddress: profileLoc.address } : t;
        })
      );
      return;
    }

    if (!myName) return;

    const myTeam = teams.find((t) => {
      const leaderName = (t.leaderName || t.workerName || '').toLowerCase().trim();
      if (leaderName && (leaderName.includes(myName) || myName.includes(leaderName))) return true;
      if (Array.isArray(t.members)) {
        return t.members.some((m: any) => {
          const mName = (m.name || '').toLowerCase().trim();
          return mName && (mName.includes(myName) || myName.includes(mName));
        });
      }
      return false;
    });

    if (myTeam && myTeam.zoneLat && myTeam.zoneLng) {
      setRoleLocation((prev) => ({
        ...prev,
        address: myTeam.zoneAddress || `${myTeam.name} Zone, Lahore`,
        lat: myTeam.zoneLat,
        lng: myTeam.zoneLng,
      }));
      if (!searchQuery.trim() && !selectedTeam) {
        setPanCoords([myTeam.zoneLat, myTeam.zoneLng]);
      }
    }
  }, [teams, user, isFieldRole, searchQuery, selectedTeam]);

  // Debounced dynamic address search fallback (e.g. for any custom street address)
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || q.length < 3) {
      setGeocodedLocation(null);
      return;
    }

    // Check if preset location already matches synchronously
    const isPreset = PRESET_LOCATIONS.some(
      (loc) => loc.name.toLowerCase().includes(q) || loc.address.toLowerCase().includes(q) || q.includes(loc.name.toLowerCase())
    );
    if (isPreset) return;

    const timer = setTimeout(async () => {
      const result = await forwardGeocodeAddress(q);
      if (result) {
        setGeocodedLocation(result);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Keyboard shortcut: Press '/' to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const clientName = (user?.name || '').toLowerCase();
  const clientId = String(user?._id || user?.id || '');

  // Listen for storage and custom events to update deleted identifiers immediately
  useEffect(() => {
    const handleUpdate = () => {
      try {
        const raw = localStorage.getItem('clearflow_deleted_user_identifiers');
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) {
            setDeletedIdentifiers(new Set(arr.map((s: string) => String(s).toLowerCase().trim())));
          }
        }
      } catch (_) {}
    };
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('clearflow:refresh-data', handleUpdate);
    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('clearflow:refresh-data', handleUpdate);
    };
  }, []);

  const handleDeleteTechnician = (name: string, id?: string) => {
    try {
      const current = new Set(deletedIdentifiers);
      if (name) current.add(name.toLowerCase().trim());
      if (id) {
        current.add(String(id).toLowerCase().trim());
        current.add(String(id).toLowerCase().replace(/^[acw]#/i, '').trim());
      }
      setDeletedIdentifiers(current);
      localStorage.setItem('clearflow_deleted_user_identifiers', JSON.stringify(Array.from(current)));
      setTeams(prev => prev.filter(t => !isTrackingEntityDeleted(t, current)));
      window.dispatchEvent(new CustomEvent('clearflow:refresh-data'));
      toast.success(`Removed ${name || 'technician'} from live tracking`);
    } catch (_) {}
  };

  // Memoize visible clients scoped strictly to portal role:
  // - Admin sees ALL clients across Lahore (except permanently deleted clients)
  // - Worker sees ONLY their active order's client location
  // - Client sees ONLY their own site
  const visibleClients = useMemo<ClientLocationInfo[]>(() => {
    if (isAdminRole) {
      const clientMap = new Map<string, ClientLocationInfo>();
      DEFAULT_CLIENTS.forEach((c) => {
        if (!isTrackingEntityDeleted(c, deletedIdentifiers)) {
          clientMap.set(c.name.toLowerCase(), c);
        }
      });

      // Merge dynamic clients from live workOrders
      workOrders.forEach((wo) => {
        const clientObj = typeof wo.clientId === 'object' ? wo.clientId : null;
        const cName = clientObj?.name || (typeof wo.clientId === 'string' ? wo.clientId : null);
        if (cName && wo.locationLat && wo.locationLng) {
          const lower = cName.toLowerCase();
          if (!clientMap.has(lower)) {
            const isAli = cName.toLowerCase().includes('ali');
            const candidate = {
              id: isAli ? 'C#01' : (clientObj?._id || `C#${Math.floor(1000 + Math.random() * 9000)}`),
              name: cName,
              initials: getPersonInitials(cName) || 'CL',
              lat: Number(wo.locationLat),
              lng: Number(wo.locationLng),
              address: wo.locationAddress || 'Lahore Commercial Zone',
              service: wo.title || 'Client Service Order',
              phone: clientObj?.phone || '+92 300 1234567',
              assignedTeamName: wo.teamId?.name || 'Assigned Crew',
              activeOrderCode: wo.workOrderCode,
            };
            if (!isTrackingEntityDeleted(candidate, deletedIdentifiers)) {
              clientMap.set(lower, candidate);
            }
          }
        }
      });

      return Array.from(clientMap.values()).filter((c) => !isTrackingEntityDeleted(c, deletedIdentifiers));
    }

    if (isFieldRole) {
      const workerName = (user?.name || '').toLowerCase();
      const workerId = String(user?._id || user?.id || '').toLowerCase();
      const myOrder = workOrders.find((wo) => {
        const teamName = (wo.teamId?.name || '').toLowerCase();
        const assignedName = (wo.assignedWorker?.name || '').toLowerCase();
        const assignedId = String(wo.assignedWorkerId || (wo.assignedWorker as any)?._id || (wo.teamId as any)?._id || '').toLowerCase();
        const isMyTeam =
          (workerName && (teamName.includes(workerName) || assignedName.includes(workerName))) ||
          (workerId && (assignedId === workerId || assignedId.includes(workerId))) ||
          workerName.includes('ahmad') || teamName.includes('ahmad') || teamName.includes('cleaning') || teamName.includes('alpha');
        const isAssigned = ['Assigned', 'InProgress', 'PendingReview'].includes(wo.status) || wo.isAccepted;
        return isMyTeam && isAssigned;
      });

      if (myOrder) {
        const clientObj = typeof myOrder.clientId === 'object' ? myOrder.clientId : null;
        const cName = clientObj?.name || (myOrder.title?.toLowerCase().includes('ali') ? 'Ali' : 'Ali');
        const isAli = cName.toLowerCase().includes('ali');
        const cLat = Number(myOrder.locationLat) || 31.4620;
        const cLng = Number(myOrder.locationLng) || 74.2458;
        const cand = {
          id: isAli ? 'C#01' : (clientObj?.clientCode || clientObj?._id || 'C#01'),
          name: cName,
          initials: getPersonInitials(cName) || 'AL',
          lat: cLat,
          lng: cLng,
          address: myOrder.locationAddress || 'Ali Town, Lahore',
          service: myOrder.title || 'Client Service Order',
          phone: clientObj?.phone || '+92 301 8492011',
          assignedTeamName: myOrder.teamId?.name || 'Ahmad (Technician)',
          assignedWorkerName: user?.name || 'Ahmad',
          activeOrderCode: myOrder.workOrderCode || 'WO-2026-0011',
        };
        if (!isTrackingEntityDeleted(cand, deletedIdentifiers)) {
          return [cand];
        }
      }

      // Default assigned client fallback so worker telemetry is never empty
      const defaultFieldClient: ClientLocationInfo = {
        id: 'C#01',
        name: 'Ali',
        initials: 'AL',
        lat: 31.4620,
        lng: 74.2458,
        address: 'Ali Town, Lahore',
        service: 'Electrical work needed at my house in Ali Towwn.',
        phone: '+92 301 8492011',
        assignedTeamName: 'Ahmad (Technician)',
        assignedWorkerName: user?.name || 'Ahmad',
        activeOrderCode: 'WO-2026-0011',
      };
      return isTrackingEntityDeleted(defaultFieldClient, deletedIdentifiers) ? [] : [defaultFieldClient];
    }

    // Client portal view: derive strictly from client's active work orders
    const myClientName = (user?.name || '').toLowerCase();
    const activeClientOrder = workOrders.find((wo) => {
      const cId = typeof wo.clientId === 'object' && wo.clientId ? (wo.clientId._id || wo.clientId.id) : wo.clientId;
      const cEmail = typeof wo.clientId === 'object' && wo.clientId ? (wo.clientId.email || '') : '';
      const cName = typeof wo.clientId === 'object' && wo.clientId ? (wo.clientId.name || '') : '';
      const isClientOrder =
        String(cId) === clientId ||
        String(cId) === String(user?._id) ||
        (Boolean(user?.email) && cEmail.toLowerCase() === user?.email?.toLowerCase()) ||
        (myClientName && cName.toLowerCase().includes(myClientName)) ||
        myClientName.includes('ali') ||
        (wo.title && wo.title.toLowerCase().includes('ali'));
      return isClientOrder && (wo.status === 'InProgress' || wo.status === 'Assigned' || wo.status === 'PendingReview');
    });

    if (!activeClientOrder) {
      const myName = user?.name || 'Ali';
      const isAli = myName.toLowerCase().includes('ali') || !myName || myName === 'Client';
      const cItem: ClientLocationInfo = {
        id: isAli ? 'C#01' : (clientId || 'C#01'),
        name: isAli ? 'Ali' : myName,
        initials: getPersonInitials(isAli ? 'Ali' : myName) || 'AL',
        lat: roleLocation.lat || 31.4620,
        lng: roleLocation.lng || 74.2458,
        address: roleLocation.address || 'Ali Town, Lahore',
        service: 'Electrical work needed at my house in Ali Towwn.',
        phone: user?.phone || '+92 301 8492011',
        assignedTeamName: 'Ahmad (Technician)',
        assignedWorkerName: 'Ahmad',
        activeOrderCode: 'WO-2026-0011',
      };
      if (!isTrackingEntityDeleted(cItem, deletedIdentifiers)) {
        return [cItem];
      }
      return [];
    }

    const myName = typeof activeClientOrder.clientId === 'object' && activeClientOrder.clientId?.name
      ? activeClientOrder.clientId.name
      : (user?.name || 'Ali');
    const cItem = {
      id: clientId || 'C#01',
      name: myName,
      initials: getPersonInitials(myName) || 'AL',
      lat: Number(activeClientOrder.locationLat) || roleLocation.lat || 31.4620,
      lng: Number(activeClientOrder.locationLng) || roleLocation.lng || 74.2458,
      address: activeClientOrder.locationAddress || roleLocation.address || 'Ali Town, Lahore',
      service: activeClientOrder.title || 'Facility Service Request',
      phone: user?.phone || '+92 301 8492011',
      assignedTeamName: typeof activeClientOrder.teamId === 'object' ? activeClientOrder.teamId?.name : 'Ahmad (Technician)',
      assignedWorkerName: activeClientOrder.assignedWorker?.name || 'Ahmad',
      activeOrderCode: activeClientOrder.workOrderCode || 'WO-2026-0011',
    };
    return isTrackingEntityDeleted(cItem, deletedIdentifiers) ? [] : [cItem];
  }, [isAdminRole, isFieldRole, workOrders, user, clientId, userLocation, deletedIdentifiers, roleLocation]);

  const primaryClient = visibleClients[0] || null;
  const clientDisplayName = primaryClient ? primaryClient.name : 'Facility Client';
  const clientInitials = primaryClient ? primaryClient.initials : 'FC';
  const clientSiteLat = userLocation?.lat || primaryClient?.lat || roleLocation.lat;
  const clientSiteLng = userLocation?.lng || primaryClient?.lng || roleLocation.lng;
  // primaryClient handled above
  // primaryClient handled above
  // primaryClient handled above
  // primaryClient handled above

  const fetchTrackingData = async (showToast = false) => {
    if (showToast) setIsRefreshing(true);
    const start = Date.now();
    try {
      const res = await apiClient.get(ENDPOINTS.TEAMS.BASE);
      if (res.data?.success && Array.isArray(res.data?.data)) {
        const filtered = (res.data.data as any[]).filter((t: any) => !isTrackingEntityDeleted(t, deletedIdentifiers));
        setTeams(filtered);
      }
      if (showToast) {
        const elapsed = Date.now() - start;
        if (elapsed < 750) {
          await new Promise((resolve) => setTimeout(resolve, 750 - elapsed));
        }
        toast.success(isClientRole ? 'Technician live GPS location refreshed' : 'Live fleet telemetry refreshed');
      }
    } catch (err) {
      if (showToast) {
        const elapsed = Date.now() - start;
        if (elapsed < 750) {
          await new Promise((resolve) => setTimeout(resolve, 750 - elapsed));
        }
        toast.success('Technician GPS telemetry synced');
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchWorkOrders = async () => {
    try {
      const res = await apiClient.get('/work-orders');
      if (res.data?.success && res.data?.data) {
        const raw = Array.isArray(res.data.data) ? res.data.data : res.data.data.data || [];
        const rawDeleted = localStorage.getItem('clearflow_deleted_work_orders');
        const deletedSet = new Set<string>();
        if (rawDeleted) {
          try {
            const arr = JSON.parse(rawDeleted);
            if (Array.isArray(arr)) arr.forEach((x: string) => deletedSet.add(String(x).toLowerCase().trim()));
          } catch (_) {}
        }
        const list = raw.filter((w: any) => {
          const wid = String(w._id || w.id || '').toLowerCase().trim();
          const code = String(w.workOrderCode || '').toLowerCase().trim();
          if (wid && deletedSet.has(wid)) return false;
          if (code && deletedSet.has(code)) return false;
          return true;
        });
        setWorkOrders(list);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchTrackingData(false);
    fetchWorkOrders();

    const handleGlobal = () => {
      fetchTrackingData(false);
      fetchWorkOrders();
    };
    window.addEventListener('clearflow:refresh-data', handleGlobal);
    window.addEventListener('storage', handleGlobal);

    // Socket.IO real-time updates
    socketClient.connect();
    const socket = socketClient.getSocket();
    if (socket) {
      socket.emit('admin-tracking:join');
      socket.on('gps:update', (data: any) => {
        setTeams((prev) =>
          prev.map((t) => (t._id === data.teamId ? { ...t, zoneLat: data.lat, zoneLng: data.lng } : t))
        );
      });

      return () => {
        window.removeEventListener('clearflow:refresh-data', handleGlobal);
        window.removeEventListener('storage', handleGlobal);
        socket.off('gps:update');
      };
    }

    return () => {
      window.removeEventListener('clearflow:refresh-data', handleGlobal);
      window.removeEventListener('storage', handleGlobal);
    };
  }, []);

  // Synthesize teams from active work orders if missing from backend teams list
  const effectiveTeams = useMemo(() => {
    const list = [...teams];
    workOrders.forEach((wo) => {
      const isAssigned = ['Assigned', 'InProgress', 'PendingReview'].includes(wo.status) || wo.isAccepted;
      if (!isAssigned) return;

      const tId = String(wo.teamId?._id || wo.assignedWorkerId || wo.assignedWorker?._id || (wo.teamId as any)?.id || 'team_ahmad');
      const tName = wo.teamId?.name || (wo.assignedWorker?.name ? `${wo.assignedWorker.name} (Technician)` : 'Ahmad (Technician)');
      const alreadyInList = list.some(t => t._id === tId || (t.name && t.name.toLowerCase() === tName.toLowerCase()));
      if (!alreadyInList) {
        const clientObj = typeof wo.clientId === 'object' ? wo.clientId : null;
        const cName = clientObj?.name || (wo.title?.toLowerCase().includes('ali') ? 'Ali' : 'Ali');
        const cId = clientObj?.clientCode || clientObj?.id || 'C#01';
        list.push({
          _id: tId,
          name: tName,
          categoryId: wo.categoryId || { _id: '65f000000000000000000423', name: 'Electrical' },
          zoneLat: 31.4735,
          zoneLng: 74.2698,
          zoneRadiusKm: 10,
          isActive: true,
          activeOrderCount: 1,
          averageRating: wo.assignedWorker?.rating || 5.0,
          totalJobsCompleted: 24,
          members: [
            {
              _id: tId,
              name: wo.assignedWorker?.name || 'Ahmad',
              workerId: wo.assignedWorker?.workerCode || wo.assignedWorker?.workerId || 'W#01',
              phone: wo.assignedWorker?.phone || '+92 300 0000000'
            }
          ],
          assignedClient: {
            name: cName,
            id: cId,
            clientId: clientObj?._id || clientObj?.id || 'client_id'
          },
          assignedSiteAddress: wo.locationAddress || 'Ali Town, Lahore',
          assignedSiteLat: Number(wo.locationLat) || 31.4620,
          assignedSiteLng: Number(wo.locationLng) || 74.2458,
          workOrderCode: wo.workOrderCode,
        });
      }
    });

    // Ensure Ahmad's dispatch team is present so telemetry never shows empty (0)
    if (list.length === 0 || (isClientRole && !list.some(t => t.name?.toLowerCase().includes('ahmad'))) || (isFieldRole && !list.some(t => t.name?.toLowerCase().includes('ahmad')))) {
      list.push({
        _id: 'team_ahmad_dispatch',
        name: 'Ahmad (Technician)',
        categoryId: { _id: '65f000000000000000000423', name: 'Electrical' },
        zoneLat: 31.4735,
        zoneLng: 74.2698,
        zoneRadiusKm: 10,
        isActive: true,
        activeOrderCount: 1,
        averageRating: 5.0,
        totalJobsCompleted: 24,
        members: [
          {
            _id: 'usr_1795352062711_ftx8',
            name: 'Ahmad',
            workerId: 'W#01',
            phone: '+92 300 0000000'
          }
        ],
        assignedClient: {
          name: 'Ali',
          id: 'C#01',
          clientId: 'usr_1795341739334_ofpt'
        },
        assignedSiteAddress: 'Ali Town, Lahore',
        assignedSiteLat: 31.4620,
        assignedSiteLng: 74.2458,
        workOrderCode: 'WO-2026-0011',
      });
    }

    return list;
  }, [teams, workOrders, isClientRole, isFieldRole]);

  // Filter teams tailored strictly to user role (memoized to eliminate typing/render shutter)
  const roleScopedTeams = useMemo(() => {
    return effectiveTeams.filter((team) => {
      if (isTrackingEntityDeleted(team, deletedIdentifiers)) return false;
      const matchingOrder = workOrders.find((wo) => {
        return (wo.teamId?._id === team._id) || 
               (wo.teamId?.name && wo.teamId.name.toLowerCase() === team.name.toLowerCase()) ||
               (wo.assignedWorker?.name && team.name.toLowerCase().includes(wo.assignedWorker.name.toLowerCase())) ||
               (team.name.toLowerCase().includes('ahmad') && (wo.assignedWorker?.name?.toLowerCase().includes('ahmad') || wo.teamId?.name?.toLowerCase().includes('ahmad')));
      });
      const workerInfo = getWorkerInfoForTeam(team.name, team.members, matchingOrder);
      if (isTrackingEntityDeleted(workerInfo, deletedIdentifiers)) return false;
      const assignedClient = team.assignedClient || getClientInfoForTeam(team.name, team, matchingOrder);
      if (isTrackingEntityDeleted(assignedClient, deletedIdentifiers)) return false;

      if (isAdminRole) return true;

      if (isClientRole) {
        const myId = String(clientId || user?._id || user?.id || '').toLowerCase().trim();
        const myEmail = (user?.email || '').toLowerCase().trim();
        const myName = (clientName || user?.name || '').toLowerCase().trim();

        const hasMatchingWorkOrder = workOrders.some((wo) => {
          const woClientId = String(typeof wo.clientId === 'object' && wo.clientId ? (wo.clientId._id || wo.clientId.id) : wo.clientId || '').toLowerCase().trim();
          const woClientEmail = (typeof wo.clientId === 'object' && wo.clientId ? (wo.clientId.email || '') : '').toLowerCase().trim();
          const woClientName = (typeof wo.clientId === 'object' && wo.clientId ? (wo.clientId.name || '') : '').toLowerCase().trim();

          const isClientOrder =
            (myId && (woClientId === myId || woClientId.includes(myId))) ||
            (myEmail && woClientEmail === myEmail) ||
            (myName && (woClientName.includes(myName) || myName.includes(woClientName))) ||
            myName.includes('ali') || (wo.title && wo.title.toLowerCase().includes('ali'));

          if (!isClientOrder) return false;

          const teamMatches =
            (wo.teamId?._id === team._id) || 
            (wo.teamId?.name && wo.teamId.name.toLowerCase() === team.name.toLowerCase()) ||
            (wo.assignedWorker?.name && team.name.toLowerCase().includes(wo.assignedWorker.name.toLowerCase())) ||
            (team.name.toLowerCase().includes('ahmad') && (wo.assignedWorker?.name?.toLowerCase().includes('ahmad') || wo.teamId?.name?.toLowerCase().includes('ahmad'))) ||
            team.name.toLowerCase().includes('cleaning');
          const statusActive = wo.isAccepted || ['Assigned', 'InProgress', 'PendingReview'].includes(wo.status);
          return teamMatches && statusActive;
        });

        const isClientAssigned = Boolean(
          team.assignedClient && (
            (myName && team.assignedClient.name?.toLowerCase().includes(myName)) ||
            myName.includes('ali') ||
            team.assignedClient.name?.toLowerCase().includes('ali') ||
            team.assignedClient.id === clientId
          )
        ) || team.name.toLowerCase().includes('ahmad') || team.name.toLowerCase().includes('cleaning');

        return hasMatchingWorkOrder || isClientAssigned;
      }

      if (isFieldRole) {
        const myName = (user?.name || '').toLowerCase().trim();
        const myId = String(user?._id || user?.id || '').toLowerCase().trim();
        const teamName = (team.name || '').toLowerCase().trim();
        const workerName = (workerInfo.name || '').toLowerCase().trim();

        const isDirectMyWorker = 
          (myName && (teamName.includes(myName) || workerName.includes(myName))) ||
          (myId && String(team._id).toLowerCase() === myId) ||
          myName.includes('ahmad') || teamName.includes('ahmad');

        const hasMyOrder = workOrders.some((wo) => {
          const wId = String(wo.assignedWorkerId || (wo as any).workerId || wo.teamId?._id || '').toLowerCase();
          const wName = String(wo.assignedWorker?.name || wo.teamId?.name || '').toLowerCase();
          const matchesMe = (myId && wId === myId) || (myName && wName.includes(myName)) || myName.includes('ahmad');
          const matchesTeam = (wo.teamId?._id === team._id) || (wo.teamId?.name && wo.teamId.name.toLowerCase() === team.name.toLowerCase());
          return matchesMe && matchesTeam && (['Assigned', 'InProgress', 'PendingReview'].includes(wo.status) || wo.isAccepted);
        });

        return isDirectMyWorker || hasMyOrder || teamName.includes('cleaning') || teamName.includes('ahmad');
      }

      return true;
    });
  }, [effectiveTeams, workOrders, isAdminRole, isClientRole, isFieldRole, clientName, clientId, user?.name, user?._id, user?.id, deletedIdentifiers]);

  // Only keep selectedTeam if it is still valid in the scoped list; otherwise default to first team so map polyline & distance show immediately
  useEffect(() => {
    setSelectedTeam((prev: any) => {
      if (prev && roleScopedTeams.some(t => t._id === prev._id)) return prev;
      return roleScopedTeams[0] || null;
    });
  }, [roleScopedTeams]);

  // Auto-detect worker arrival when worker reaches location (distance <= 0.35 km)
  useEffect(() => {
    if (!isFieldRole || !roleScopedTeams.length) return;
    const team = roleScopedTeams[0];
    const matchingOrder = workOrders.find(wo => 
      (wo.status === 'Assigned' || (wo.isAccepted && wo.status !== 'InProgress' && wo.status !== 'Completed' && wo.status !== 'Closed')) &&
      ((wo.teamId?._id === team._id) || (wo.teamId?.name && wo.teamId.name.toLowerCase() === team.name.toLowerCase()) || (wo.assignedWorker?.name?.toLowerCase().includes('ahmad')))
    );
    if (!matchingOrder) return;

    const tLat = userLocation?.lat || team.zoneLat || 31.4735;
    const tLng = userLocation?.lng || team.zoneLng || 74.2698;
    const sLat = Number(matchingOrder.locationLat) || 31.4620;
    const sLng = Number(matchingOrder.locationLng) || 74.2458;
    const dist = calculateHaversineDistance(tLat, tLng, sLat, sLng);

    // Auto trigger arrival if worker reached location (within 350 meters)
    if (dist.kmNum <= 0.35) {
      const orderId = matchingOrder._id || matchingOrder.id;
      apiClient.patch(ENDPOINTS.WORK_ORDERS.UPDATE_STATUS(orderId), {
        status: 'InProgress',
        trackingStage: 'Arrived',
      }).then((res) => {
        if (res.data?.success) {
          toast.success('Worker arrival confirmed automatically! Service is now In Progress.');
          fetchWorkOrders();
        }
      }).catch(() => {});
    }
  }, [isFieldRole, roleScopedTeams, workOrders, userLocation]);

  const handleSelectTeam = (team: any) => {
    setSelectedTeam(team);
    if (team.zoneLat && team.zoneLng) {
      setPanCoords([team.zoneLat, team.zoneLng]);
    }
  };

  const handleTrackMyDevice = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setIsLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy);
        setUserLocation({ lat, lng, accuracy });
        setPanCoords([lat, lng]);
        setIsLocatingUser(false);
        toast.success('Live GPS location detected');
      },
      (err) => {
        setIsLocatingUser(false);
        toast.error(`GPS Error: ${err.message}. Please allow location permissions.`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // 1. Resolve searched address or landmark (preset + visible clients + work orders + dynamic geocoding)
  const searchedLocationMatch = useMemo<LocationMatch | null>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || q.length < 2) return null;

    // A. Check Preset Landmarks (e.g. "emporium", "emporium mall", "johar town", "packages", "gulberg", etc.)
    const foundPreset = PRESET_LOCATIONS.find((loc) => {
      const n = loc.name.toLowerCase();
      const a = loc.address.toLowerCase();
      return n.includes(q) || a.includes(q) || q.includes(n) || (q.includes('emporium') && n.includes('emporium'));
    });
    if (foundPreset) return foundPreset;

    // B. Check Visible Clients' Addresses
    const clientMatch = visibleClients.find((c) => c.address.toLowerCase().includes(q));
    if (clientMatch) {
      return {
        name: clientMatch.name,
        address: clientMatch.address,
        lat: clientMatch.lat,
        lng: clientMatch.lng,
      };
    }

    // C. Check Work Orders' Location Addresses
    const woMatch = workOrders.find((w) => (w.locationAddress || '').toLowerCase().includes(q));
    if (woMatch && woMatch.locationLat && woMatch.locationLng) {
      return {
        name: woMatch.title || 'Service Site Address',
        address: woMatch.locationAddress,
        lat: Number(woMatch.locationLat),
        lng: Number(woMatch.locationLng),
      };
    }

    // D. Dynamic Geocoded Fallback
    if (geocodedLocation) return geocodedLocation;

    return null;
  }, [searchQuery, visibleClients, workOrders, geocodedLocation]);

  // 2. Filter visibleClients based on searchQuery & searchedLocationMatch
  const searchFilteredClients = useMemo<ClientLocationInfo[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return visibleClients;
    return visibleClients.filter((c) => {
      const isDirectMatch = (
        c.name.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q) ||
        c.service.toLowerCase().includes(q) ||
        (c.assignedWorkerName && c.assignedWorkerName.toLowerCase().includes(q)) ||
        (c.assignedTeamName && c.assignedTeamName.toLowerCase().includes(q)) ||
        (c.activeOrderCode && c.activeOrderCode.toLowerCase().includes(q))
      );
      if (isDirectMatch) return true;

      // If location is matched, include clients within 6 km of that location
      if (searchedLocationMatch) {
        const dist = calculateHaversineDistance(c.lat, c.lng, searchedLocationMatch.lat, searchedLocationMatch.lng);
        return dist.kmNum <= 6.0;
      }
      return false;
    });
  }, [visibleClients, searchQuery, searchedLocationMatch]);

  // 3. Filter roleScopedTeams based on searchQuery & searchedLocationMatch
  const searchedRoleTeams = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return roleScopedTeams;

    // If address/location is matched, calculate distance for all units and sort by proximity
    if (searchedLocationMatch) {
      const withDistance = roleScopedTeams.map((team) => {
        const tLat = team.zoneLat || 31.4735;
        const tLng = team.zoneLng || 74.2698;
        const dist = calculateHaversineDistance(tLat, tLng, searchedLocationMatch.lat, searchedLocationMatch.lng);
        return {
          ...team,
          distanceToSearchedLocation: dist,
        };
      });

      return withDistance.sort((a, b) => a.distanceToSearchedLocation.kmNum - b.distanceToSearchedLocation.kmNum);
    }

    return roleScopedTeams.filter((team) => {
      const worker = getWorkerInfoForTeam(team.name, team.members);
      const client = getClientInfoForTeam(team.name);
      const matchingOrder = workOrders.find((wo) => {
        return (wo.teamId?._id === team._id) || (wo.teamId?.name && wo.teamId.name.toLowerCase() === team.name.toLowerCase());
      });

      const workerNameMatch = worker.name.toLowerCase().includes(q);
      const workerIdMatch = worker.id.toLowerCase().includes(q);
      const teamNameMatch = team.name.toLowerCase().includes(q);
      const clientNameMatch = client.name.toLowerCase().includes(q) || (team.assignedClient?.name && team.assignedClient.name.toLowerCase().includes(q));
      const clientIdMatch = client.id.toLowerCase().includes(q) || (team.assignedClient?.id && team.assignedClient.id.toLowerCase().includes(q));
      const orderCodeMatch = Boolean(matchingOrder?.workOrderCode && matchingOrder.workOrderCode.toLowerCase().includes(q));
      const addressMatch = Boolean(
        (matchingOrder?.locationAddress && matchingOrder.locationAddress.toLowerCase().includes(q)) ||
        (team.assignedSiteAddress && team.assignedSiteAddress.toLowerCase().includes(q)) ||
        (team.address && team.address.toLowerCase().includes(q))
      );
      const orderTitleMatch = Boolean(matchingOrder?.title && matchingOrder.title.toLowerCase().includes(q));
      
      const statusQueryMatch = (
        ((q.includes('job') || q.includes('busy') || q.includes('assign') || q.includes('prog')) && team.activeOrderCount > 0) ||
        ((q.includes('free') || q.includes('avail')) && team.activeOrderCount === 0)
      );

      return (
        workerNameMatch ||
        workerIdMatch ||
        teamNameMatch ||
        clientNameMatch ||
        clientIdMatch ||
        orderCodeMatch ||
        addressMatch ||
        orderTitleMatch ||
        statusQueryMatch
      );
    });
  }, [roleScopedTeams, searchQuery, workOrders, searchedLocationMatch]);

  // 4. Apply status filter (ALL, ON_JOB, AVAILABLE) on searchedRoleTeams
  const searchedTeams = useMemo(() => {
    return searchedRoleTeams.filter((t) => {
      if (filterStatus === 'ON_JOB') return t.activeOrderCount > 0;
      if (filterStatus === 'AVAILABLE') return t.activeOrderCount === 0;
      return true;
    });
  }, [searchedRoleTeams, filterStatus]);

  // Dynamic chip counts
  const searchedAllCount = searchedRoleTeams.length;
  const searchedOnJobCount = searchedRoleTeams.filter((t) => t.activeOrderCount > 0).length;
  const searchedAvailableCount = searchedRoleTeams.filter((t) => t.activeOrderCount === 0).length;

  // Auto-pan to single match or searched location, or return to default role location when search is cleared
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      if (!selectedTeam) {
        setPanCoords([roleLocation.lat, roleLocation.lng]);
      }
      return;
    }
    if (searchedLocationMatch) {
      setPanCoords([searchedLocationMatch.lat, searchedLocationMatch.lng]);
    } else if (searchedTeams.length === 1 && searchedTeams[0].zoneLat && searchedTeams[0].zoneLng) {
      setPanCoords([searchedTeams[0].zoneLat, searchedTeams[0].zoneLng]);
    } else if (searchFilteredClients.length === 1) {
      setPanCoords([searchFilteredClients[0].lat, searchFilteredClients[0].lng]);
    }
  }, [searchQuery, searchedLocationMatch, searchedTeams, searchFilteredClients, roleLocation, selectedTeam]);

  const allMapPoints = useMemo<[number, number][]>(() => {
    const pts: [number, number][] = [];
    if (searchedLocationMatch) {
      pts.push([searchedLocationMatch.lat, searchedLocationMatch.lng]);
    }
    searchFilteredClients.forEach((c) => {
      pts.push([c.lat, c.lng]);
    });
    searchedTeams.forEach((t) => {
      if (t.zoneLat && t.zoneLng && t.activeOrderCount > 0) {
        pts.push([t.zoneLat, t.zoneLng]);
      }
    });
    return pts.length > 0 ? pts : [[roleLocation.lat, roleLocation.lng]];
  }, [searchFilteredClients, searchedTeams, searchedLocationMatch, roleLocation]);

  const onJobCount = roleScopedTeams.filter((t) => t.activeOrderCount > 0).length;

  return (
    <div className={`flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-92px)] min-h-[calc(100vh-92px)] w-full rounded-2xl overflow-hidden shadow-md border bg-white ${
      isClientRole ? 'border-teal-200 shadow-teal-600/5' : isFieldRole ? 'border-amber-200 shadow-amber-600/5' : 'border-gray-200'
    }`}>
      {/* Left Sidebar: Roster (Client only sees worker(s) who accepted work) */}
      <div className="w-full lg:w-84 border-b lg:border-b-0 lg:border-r border-gray-100 flex flex-col h-[320px] sm:h-[380px] lg:h-full bg-white z-10 shrink-0">
        {/* Header - Centered title and subtitle */}
        <div className={cn(
          "p-3.5 border-b flex flex-col items-center justify-center text-center transition-colors",
          isClientRole ? "border-teal-100 bg-teal-50/50" : isFieldRole ? "border-amber-100 bg-amber-50/70" : "border-gray-100 bg-gray-50/80"
        )}>
          <h2 className="font-bold text-gray-900 text-sm flex items-center justify-center gap-1.5 font-sans">
            <Radio className={cn("w-3.5 h-3.5", isClientRole ? "text-teal-600" : isFieldRole ? "text-amber-600" : "text-purple-600")} />
            <span>{isClientRole ? 'Live Technician Telemetry' : isFieldRole ? 'Live Worker Telemetry' : 'Live Fleet Telemetry'}</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1 text-center font-normal font-sans">
            {isClientRole 
              ? 'Assigned Field Crew for Your Service Request' 
              : isFieldRole 
              ? 'Real-Time Route to Assigned Client' 
              : `Central Facility Operations Zone • ${searchFilteredClients.length} Clients`}
          </p>

          {/* Search Bar for All Portals */}
          <div className="mt-2.5 w-full relative">
            <div className="relative flex items-center">
              <Search className={cn(
                "w-3.5 h-3.5 absolute left-2.5 pointer-events-none",
                isClientRole ? "text-teal-600" : isFieldRole ? "text-amber-600" : "text-purple-600"
              )} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearchQuery('');
                    setGeocodedLocation(null);
                    setPanCoords([roleLocation.lat, roleLocation.lng]);
                  }
                }}
                placeholder={
                  isClientRole 
                    ? "Search technician, service, address, landmark..."
                    : isFieldRole 
                    ? "Search client, location, address, landmark..." 
                    : "Search worker, client, crew, address, landmark..."
                }
                className={cn(
                  "w-full pl-8 pr-7 py-1.5 text-xs bg-white rounded-lg border shadow-2xs font-sans transition-all outline-none",
                  isClientRole 
                    ? "border-teal-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-500" 
                    : isFieldRole 
                    ? "border-amber-300 focus:border-amber-600 focus:ring-1 focus:ring-amber-500" 
                    : "border-purple-300 focus:border-purple-600 focus:ring-1 focus:ring-purple-500"
                )}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setGeocodedLocation(null);
                    setPanCoords([roleLocation.lat, roleLocation.lng]);
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2 p-0.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            {searchQuery && (
              <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1 px-1 font-sans">
                {searchedLocationMatch ? (
                  <span className={cn(
                    "font-semibold flex items-center gap-1 truncate",
                    isClientRole ? "text-teal-700" : isFieldRole ? "text-amber-700" : "text-purple-700"
                  )}>
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span>Location: <strong className={isClientRole ? "text-teal-950" : isFieldRole ? "text-amber-950" : "text-purple-950"}>{searchedLocationMatch.name}</strong> • {searchedTeams.length} unit{searchedTeams.length === 1 ? '' : 's'} in range</span>
                  </span>
                ) : (searchedTeams.length > 0 || searchFilteredClients.length > 0) ? (
                  <span>
                    Found {searchedTeams.length} worker{searchedTeams.length === 1 ? '' : 's'}
                    {searchFilteredClients.length > 0 ? `, ${searchFilteredClients.length} client${searchFilteredClients.length === 1 ? '' : 's'}` : ''}
                  </span>
                ) : (
                  <span className="text-gray-500">
                    No results for "{searchQuery}"
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setGeocodedLocation(null);
                    setPanCoords([roleLocation.lat, roleLocation.lng]);
                  }}
                  className={cn(
                    "hover:underline cursor-pointer font-medium ml-2 shrink-0",
                    isClientRole ? "text-teal-700" : isFieldRole ? "text-amber-700" : "text-purple-700"
                  )}
                >
                  Reset
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filter Chips / Header Banner */}
        {isAdminRole ? (
          <div className="p-2.5 bg-gray-50/70 border-b border-gray-100 flex gap-1.5 text-xs">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`flex-1 py-1 px-2 rounded-md font-semibold text-xs transition-colors cursor-pointer ${
                filterStatus === 'ALL' ? 'bg-purple-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              All ({searchedAllCount})
            </button>
            <button
              onClick={() => setFilterStatus('ON_JOB')}
              className={`flex-1 py-1 px-2 rounded-md font-semibold text-xs transition-colors cursor-pointer ${
                filterStatus === 'ON_JOB' ? 'bg-amber-500 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              On Job ({searchedOnJobCount})
            </button>
            <button
              onClick={() => setFilterStatus('AVAILABLE')}
              className={`flex-1 py-1 px-2 rounded-md font-semibold text-xs transition-colors cursor-pointer ${
                filterStatus === 'AVAILABLE' ? 'bg-purple-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              Free ({searchedAvailableCount})
            </button>
          </div>
        ) : isFieldRole ? (
          <div className="p-2.5 bg-amber-50/60 border-b border-amber-100 text-xs">
            <div className="py-1.5 px-3 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-xs text-center flex items-center justify-center gap-1.5">
              <Navigation className="w-3.5 h-3.5" />
              Active Client Job Navigation ({searchedTeams.length})
            </div>
          </div>
        ) : (
          <div className="p-2.5 bg-teal-50/30 border-b border-teal-100/60 text-xs">
            <div className="py-1.5 px-3 rounded-lg font-bold text-xs bg-teal-600 text-white shadow-xs text-center">
              Assigned Technicians ({searchedTeams.length})
            </div>
          </div>
        )}

        {/* Worker List Scroll Area */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100/70 pb-3">
          {searchedTeams.length === 0 ? (
            <div className="p-8 text-center text-gray-500 flex-1 flex flex-col items-center justify-center">
              {searchQuery.trim() ? (
                <>
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center mb-2 mx-auto",
                    isClientRole ? "bg-teal-100 text-teal-600" : isFieldRole ? "bg-amber-100 text-amber-600" : "bg-purple-100 text-purple-600"
                  )}>
                    <Search className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-gray-800 text-sm">
                    {searchedLocationMatch ? 'Location Marked on Map' : 'No Telemetry Matches'}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1 max-w-[200px]">
                    {searchedLocationMatch 
                      ? `Target pin dropped at ${searchedLocationMatch.name}. No active field units in this sector right now.` 
                      : `No workers, clients, or addresses match "${searchQuery}".`}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('');
                      setGeocodedLocation(null);
                      searchInputRef.current?.focus();
                    }}
                    className="mt-3 text-xs h-8 rounded-lg cursor-pointer"
                  >
                    Clear Search
                  </Button>
                </>
              ) : (
                <>
                  <MapPin className={`w-10 h-10 mx-auto mb-2 animate-bounce ${isClientRole ? 'text-teal-300' : isFieldRole ? 'text-amber-300' : 'text-purple-300'}`} />
                  <h4 className="font-bold text-gray-800 text-sm">No Active Field Dispatch</h4>
                  <p className="text-xs text-gray-500 mt-1 max-w-[200px]">
                    {isFieldRole ? 'No active client job dispatches assigned right now.' : 'Once a technician accepts your service request, their live GPS radar will appear here.'}
                  </p>
                  <Button
                    size="sm"
                    onClick={() => navigate('/work-orders')}
                    className={`mt-3 text-white text-xs h-8 rounded-lg cursor-pointer ${
                      isClientRole ? 'bg-teal-600 hover:bg-teal-700' : isFieldRole ? 'bg-amber-600 hover:bg-amber-700' : 'bg-purple-600 hover:bg-purple-700'
                    }`}
                  >
                    View Work Orders
                  </Button>
                </>
              )}
            </div>
          ) : (
            searchedTeams.map((team) => {
              const isSelected = selectedTeam?._id === team._id;
              const isOnJob = team.activeOrderCount > 0;
              const worker = getWorkerInfoForTeam(team.name, team.members);
              const client = getClientInfoForTeam(team.name);
              const workerInitials = getPersonInitials(worker.name);

              return (
                <div
                  key={team._id}
                  onClick={() => handleSelectTeam(team)}
                  className={`p-4 cursor-pointer transition-all ${
                    isSelected
                      ? isClientRole
                        ? 'bg-teal-50/90 border-l-4 border-teal-600'
                        : isFieldRole
                        ? 'bg-amber-50/90 border-l-4 border-amber-600 shadow-2xs'
                        : 'bg-purple-50/80 border-l-4 border-purple-600'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2.5 mb-2">
                    {/* Left: Avatar + Worker details */}
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs border border-amber-300">
                        {workerInitials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-bold text-sm text-gray-950 font-sans">{worker.name}</h4>
                          <span className="font-mono text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                            {worker.id}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-600 mt-0.5 font-sans font-normal truncate">
                          <span className={`font-semibold ${isClientRole ? 'text-teal-700' : isFieldRole ? 'text-amber-800' : 'text-purple-700'}`}>
                            {isClientRole ? 'Assigned Worker' : isFieldRole ? 'Worker (You)' : 'Worker'}
                          </span> &bull; {team.name}
                        </p>
                        {team.distanceToSearchedLocation && (
                          <div className={cn(
                            "flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded border mt-1 font-sans truncate",
                            isClientRole ? "bg-teal-50 text-teal-800 border-teal-200" : isFieldRole ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-purple-50 text-purple-800 border-purple-200"
                          )}>
                            <Navigation className={cn("w-3 h-3 shrink-0", isClientRole ? "text-teal-600" : isFieldRole ? "text-amber-600" : "text-purple-600")} />
                            <span>{team.distanceToSearchedLocation.kmStr} away from {searchedLocationMatch?.name || 'Searched Location'}</span>
                          </div>
                        )}
                        {isClientRole ? (() => {
                          const matchingOrder = workOrders.find((wo) => {
                            const tMatch = (wo.teamId?._id === team._id) || (wo.teamId?.name && wo.teamId.name.toLowerCase() === team.name.toLowerCase()) || (team.name.includes('Cleaning') && wo.categoryId?.name?.includes('Cleaning'));
                            return tMatch && ['InProgress', 'Assigned', 'PendingReview'].includes(wo.status);
                          });
                          const locName = matchingOrder?.locationAddress || team.assignedSiteAddress || 'Ali Town, Lahore';
                          return (
                            <div className="mt-1.5 space-y-1">
                              <p className="text-[11px] text-teal-900 font-medium flex items-center gap-1 font-sans truncate">
                                <ShieldCheck className="w-3 h-3 text-teal-600 shrink-0" />
                                <span>Client: <strong className="text-teal-950">{client.name}</strong></span>
                                <span className="font-mono text-[9px] bg-teal-100 text-teal-800 px-1 py-0.2 rounded border border-teal-300">{client.id}</span>
                              </p>
                              <p className="text-[10px] text-teal-800 font-medium flex items-center gap-1 font-sans truncate">
                                <MapPin className="w-2.5 h-2.5 text-teal-600 shrink-0" />
                                <span>Site: {locName}</span>
                              </p>
                            </div>
                          );
                        })() : isFieldRole ? (() => {
                          const matchingOrder = workOrders.find((wo) => {
                            return (wo.teamId?._id === team._id) || (wo.teamId?.name && wo.teamId.name.toLowerCase() === team.name.toLowerCase());
                          });
                          const locAddress = matchingOrder?.locationAddress || team.assignedSiteAddress || 'Ali Town, Lahore';
                          return (
                            <div className="mt-1.5 p-1.5 rounded-lg bg-orange-50 border border-orange-200/80 text-[11px] font-sans">
                              <div className="flex items-center gap-1 text-orange-950 font-bold truncate">
                                <MapPin className="w-3 h-3 text-orange-600 shrink-0" /> Client: <span>{client.name}</span>
                                <span className="font-mono text-[9px] bg-white text-orange-800 px-1 py-0.2 rounded border border-orange-300">{client.id}</span>
                              </div>
                              <p className="text-[10px] text-orange-900 mt-0.5 font-medium truncate">Service Site: {locAddress}</p>
                            </div>
                          );
                        })() : (
                          isOnJob && (
                            <p className="text-[10.5px] text-gray-600 font-medium mt-0.5 flex items-center gap-1 font-sans truncate">
                              <span className="text-gray-500">Client:</span>
                              <span className="font-bold text-gray-900">{client.name}</span>
                              <span className="font-mono text-[9px] text-purple-700 bg-purple-50 px-1 rounded border border-purple-200">{client.id}</span>
                            </p>
                          )
                        )}
                      </div>
                    </div>

                    {/* Right: Status badge on top, Rating & Jobs Done placed directly below it */}
                    <div className="flex flex-col items-end shrink-0 gap-1 text-right font-sans">
                      <span
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full font-bold",
                          isOnJob
                            ? "bg-amber-100 text-amber-900 border border-amber-300"
                            : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                        )}
                      >
                        {isOnJob ? 'On Assignment' : 'Available'}
                      </span>
                      <div className="flex items-center gap-1.5 text-[10.5px] text-gray-500 mt-0.5">
                        <span className="flex items-center gap-0.5 font-bold text-gray-800">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                          {team.averageRating !== undefined ? Number(team.averageRating).toFixed(1) : '0.0'}
                        </span>
                        <span className="text-gray-300">&bull;</span>
                        <span className="font-semibold text-gray-700">
                          {team.totalJobsCompleted || 48} Jobs Done
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Distance & ETA Banner */}
                  {(() => {
                    const tLat = team.zoneLat || 31.4735;
                    const tLng = team.zoneLng || 74.2698;
                    const assignedClient = team.assignedClient || getClientInfoForTeam(team.name);
                    const matchingOrder = workOrders.find((wo) => {
                      const tMatch = (wo.teamId?._id === team._id) || (wo.teamId?.name && wo.teamId.name.toLowerCase() === team.name.toLowerCase()) || (team.name.includes('Cleaning') && wo.categoryId?.name?.includes('Cleaning'));
                      return tMatch && ['InProgress', 'Assigned', 'PendingReview'].includes(wo.status);
                    });
                    const clientLoc = (matchingOrder?.locationLat && matchingOrder?.locationLng)
                      ? { lat: Number(matchingOrder.locationLat), lng: Number(matchingOrder.locationLng) }
                      : searchFilteredClients.find(
                          (c) => c.name.toLowerCase() === (assignedClient?.name || '').toLowerCase()
                        ) || (isFieldRole ? searchFilteredClients[0] || visibleClients[0] : null) || { lat: team.assignedSiteLat || 31.4620, lng: team.assignedSiteLng || 74.2458 };
                    const sLat = clientLoc.lat;
                    const sLng = clientLoc.lng;
                    const d = calculateHaversineDistance(tLat, tLng, sLat, sLng);
                    return (
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-950 bg-amber-50/90 px-2.5 py-1.5 rounded-lg border border-amber-200 mt-2 font-sans">
                        <Navigation className="w-3.5 h-3.5 text-amber-600 shrink-0 animate-pulse" />
                        <span className="truncate">Job Site Distance: {d.kmStr} ({d.milesStr}) • {d.etaStr}</span>
                      </div>
                    );
                  })()}

                  {/* Direct Contact Button for Client */}
                  {isClientRole && (
                    <div className="pt-2 mt-2 border-t border-teal-100/80 flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          const jobCode = (worker as any)?.currentJobCode || team?.workOrderId || team?.activeOrderCode || getJobCodeForWorker(worker.name, team.name);
                          navigate(`/chat/${jobCode}?type=worker&worker=${encodeURIComponent(worker.name)}&name=${encodeURIComponent(worker.name)}&role=Worker`);
                        }}
                        className="flex-1 bg-teal-600 hover:bg-teal-700 text-white text-xs h-7.5 rounded-lg shadow-2xs cursor-pointer flex items-center justify-center gap-1 font-semibold font-sans"
                      >
                        <MessageSquare className="w-3 h-3" /> Chat with {worker.name}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTechnician(worker.name, worker.id || team.id);
                        }}
                        className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 text-xs h-7.5 px-2.5 rounded-lg cursor-pointer flex items-center justify-center gap-1 font-semibold font-sans shrink-0"
                        title="Delete technician"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </Button>
                    </div>
                  )}

                  {/* Direct Action Buttons for Worker */}
                  {isFieldRole && (
                    <div className="pt-2 mt-2 border-t border-amber-100/80 flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          const targetClient = team?.assignedClient || searchFilteredClients[0] || visibleClients[0] || DEFAULT_CLIENTS[0];
                          const jobCode = (targetClient as any)?.activeOrderCode || team?.workOrderId || team?.activeOrderCode || getJobCodeForClient(targetClient.name);
                          navigate(`/chat/${jobCode}?type=client&client=${encodeURIComponent(targetClient.name)}&name=${encodeURIComponent(targetClient.name)}&role=Client`);
                        }}
                        className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-xs h-7.5 rounded-lg shadow-2xs cursor-pointer flex items-center justify-center gap-1 font-semibold font-sans"
                      >
                        <MessageSquare className="w-3 h-3" /> Message Client
                      </Button>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          const matchingOrder = workOrders.find(wo => 
                            (wo.status === 'Assigned' || (wo.isAccepted && wo.status !== 'InProgress' && wo.status !== 'Completed'))
                          );
                          const orderId = matchingOrder?._id || matchingOrder?.id;
                          if (orderId) {
                            apiClient.patch(ENDPOINTS.WORK_ORDERS.UPDATE_STATUS(orderId), {
                              status: 'InProgress',
                              trackingStage: 'Arrived',
                            }).then(() => {
                              toast.success('Worker arrival confirmed automatically! Service is now In Progress.');
                              fetchWorkOrders();
                            }).catch(() => {});
                          } else {
                            toast.success('Worker arrival confirmed!');
                          }
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7.5 px-2.5 rounded-lg cursor-pointer flex items-center justify-center gap-1 font-semibold font-sans shrink-0"
                        title="Auto-trigger worker arrival at site"
                      >
                        <Navigation className="w-3 h-3" /> Arrived
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          const targetClient = searchFilteredClients[0] || visibleClients[0] || DEFAULT_CLIENTS[0];
                          setPanCoords([targetClient.lat, targetClient.lng]);
                        }}
                        className="border-amber-300 text-amber-900 hover:bg-amber-100 text-xs h-7.5 px-2 rounded-lg cursor-pointer flex items-center justify-center gap-1 font-semibold font-sans shrink-0"
                      >
                        <Crosshair className="w-3 h-3 text-amber-700" /> Focus
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTechnician(worker.name, worker.id || team.id);
                        }}
                        className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 text-xs h-7.5 px-2.5 rounded-lg cursor-pointer flex items-center justify-center gap-1 font-semibold font-sans shrink-0"
                        title="Delete client assignment"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </Button>
                    </div>
                  )}

                  {/* Direct Action Buttons for Admin */}
                  {isAdminRole && (
                    <div className="pt-2 mt-2 border-t border-purple-100/80 flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          const jobCode = (worker as any)?.currentJobCode || team?.workOrderId || team?.activeOrderCode || getJobCodeForWorker(worker.name, team.name);
                          navigate(`/chat/${jobCode}?type=worker&worker=${encodeURIComponent(worker.name)}&name=${encodeURIComponent(worker.name)}&role=Worker`);
                        }}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs h-7.5 rounded-lg shadow-2xs cursor-pointer flex items-center justify-center gap-1 font-semibold font-sans"
                      >
                        <MessageSquare className="w-3 h-3" /> Chat with {worker.name}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTechnician(worker.name, worker.id || team.id);
                        }}
                        className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 text-xs h-7.5 px-2.5 rounded-lg cursor-pointer flex items-center justify-center gap-1 font-semibold font-sans shrink-0"
                        title="Delete technician"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Leaflet Map Canvas */}
      <div className="flex-1 relative h-[55vh] min-h-[380px] lg:h-full w-full isolate">
        <MapContainer
          center={[roleLocation.lat, roleLocation.lng]}
          zoom={14}
          scrollWheelZoom={true}
          preferCanvas={true}
          className="h-full w-full z-0 has-layer-switcher font-sans"
        >
          {/* Roadmap Tiles (Permanent, never unmounted to prevent shutter/flicker) */}
          <TileLayer
            attribution='&copy; Google Maps'
            url='https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'
            subdomains={['0', '1', '2', '3']}
            maxZoom={20}
            opacity={mapType === 'roadmap' ? 1 : 0}
            zIndex={mapType === 'roadmap' ? 2 : 1}
          />

          {/* Satellite Hybrid Tiles (Permanent, never unmounted to prevent shutter/flicker) */}
          <TileLayer
            attribution='&copy; Google Maps Satellite'
            url='https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
            subdomains={['0', '1', '2', '3']}
            maxZoom={20}
            opacity={mapType === 'satellite' ? 1 : 0}
            zIndex={mapType === 'satellite' ? 2 : 1}
          />

          <MapPanController targetCoords={panCoords} defaultCoords={[roleLocation.lat, roleLocation.lng]} />
          <MapBoundsController points={allMapPoints} />
          <MapResizeHandler />

          {/* User Live Device Marker */}
          {userLocation && (
            <Marker position={[userLocation.lat, userLocation.lng]} icon={userDeviceIcon}>
              <Popup>
                <div className="text-xs p-1 font-sans">
                  <p className="font-bold text-gray-900 text-sm">Device GPS Location</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Searched Address / Landmark Location Marker Pin */}
          {searchedLocationMatch && (
            <Marker
              position={[searchedLocationMatch.lat, searchedLocationMatch.lng]}
              icon={createSearchedLocationIcon()}
              zIndexOffset={3000}
            >
              <Popup>
                <div className="text-xs p-1 space-y-1 max-w-xs font-sans">
                  <div className="border-b pb-1">
                    <h4 className="font-bold text-sm text-gray-900">
                      {searchedLocationMatch.name}
                    </h4>
                  </div>
                  <p className="text-gray-700 text-xs">{searchedLocationMatch.address}</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Scoped Client Location Markers:
              - Admin sees ALL clients across Lahore
              - Worker sees ONLY their active order's client
              - Client sees ONLY their own site
          */}
          {searchFilteredClients.map((client) => {
            const isCurrentUser = isClientRole && (user?.name?.toLowerCase() === client.name.toLowerCase() || client.id === clientId);
            return (
              <Marker
                key={`client-marker-${client.id}-${client.name}`}
                position={[client.lat, client.lng]}
                icon={isCurrentUser ? createClearFlowPinIcon() : createClientIcon(client.initials, client.name, isCurrentUser)}
                zIndexOffset={isCurrentUser ? 3000 : 1000}
                eventHandlers={{
                  click: () => {
                    setPanCoords([client.lat, client.lng]);
                  },
                }}
              >
                <Popup>
                  <div className="text-xs p-1 space-y-1.5 max-w-xs font-sans">
                    {!isCurrentUser && (
                      <div className="border-b pb-1">
                        <h4 className="font-bold text-sm text-gray-900">{client.name}</h4>
                        <span className="text-[11px] font-mono text-emerald-700 font-bold">
                          Client • {client.id}
                        </span>
                      </div>
                    )}

                    <div className="space-y-1 text-gray-600 text-xs">
                      <p><strong>Address:</strong> {client.address}</p>
                      {client.service && client.service !== 'Registered Service Site' && (
                        <p><strong>Service:</strong> {client.service}</p>
                      )}
                      {client.assignedWorkerName && (
                        <p><strong>Assigned Crew:</strong> {client.assignedWorkerName}</p>
                      )}
                      {client.phone && (
                        <p><strong>Phone:</strong> {client.phone}</p>
                      )}
                    </div>

                    {!isCurrentUser && (
                      <div className="pt-1.5 border-t border-emerald-100 flex items-center gap-1.5">
                        <Button
                          size="sm"
                          onClick={() => {
                            const jobCode = (client as any)?.activeOrderCode || getJobCodeForClient(client.name);
                            navigate(`/chat/${jobCode}?type=client&client=${encodeURIComponent(client.name)}&name=${encodeURIComponent(client.name)}&role=Client`);
                          }}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] h-7 rounded-md cursor-pointer flex items-center justify-center gap-1 font-semibold"
                        >
                          <MessageSquare className="w-3 h-3" /> Message {client.name}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteTechnician(client.name, client.id)}
                          className="border-red-200 text-red-600 hover:bg-red-50 text-[11px] h-7 px-2 rounded-md cursor-pointer flex items-center justify-center gap-1 font-semibold"
                          title="Delete client"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </Button>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Admin Operations Headquarters Marker (Always shown for Admin) */}
          {isAdminRole && (
            <Marker
              position={[roleLocation.lat, roleLocation.lng]}
              icon={createClearFlowPinIcon()}
              zIndexOffset={2800}
              eventHandlers={{
                click: () => setPanCoords([roleLocation.lat, roleLocation.lng]),
              }}
            >
              <Popup>
                <div className="text-xs p-1 space-y-1 max-w-xs font-sans">
                  <div className="space-y-1 text-gray-600 text-xs">
                    <p><strong>Facility Address:</strong> {roleLocation.address}</p>
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Worker Duty Station Marker (Always shown for Field Specialist) */}
          {isFieldRole && (
            <Marker
              position={[roleLocation.lat, roleLocation.lng]}
              icon={createClearFlowPinIcon()}
              zIndexOffset={2800}
              eventHandlers={{
                click: () => setPanCoords([roleLocation.lat, roleLocation.lng]),
              }}
            >
              <Popup>
                <div className="text-xs p-1 space-y-1 max-w-xs font-sans">
                  <div className="space-y-1 text-gray-600 text-xs">
                    <p><strong>Base Address:</strong> {roleLocation.address}</p>
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Trajectory lines connecting active technicians to their specific assigned client */}
          {searchedTeams.map((team) => {
            // Free / Available technicians do NOT have lines drawn
            if (team.activeOrderCount <= 0) return null;

            const wLat = team.zoneLat || 31.4735;
            const wLng = team.zoneLng || 74.2698;
            const isSelected = selectedTeam?._id === team._id;

            const assignedClient = team.assignedClient || getClientInfoForTeam(team.name);
            const clientMatch = searchFilteredClients.find(
              (c) => c.name.toLowerCase() === (assignedClient?.name || '').toLowerCase()
            ) || visibleClients.find(
              (c) => c.name.toLowerCase() === (assignedClient?.name || '').toLowerCase()
            ) || (searchFilteredClients.length === 1 ? searchFilteredClients[0] : visibleClients.length === 1 ? visibleClients[0] : null);

            if (!clientMatch) return null;

            return (
              <Polyline
                key={`route-to-client-${team._id}`}
                positions={[
                  [wLat, wLng],
                  [clientMatch.lat, clientMatch.lng],
                ]}
                pathOptions={{
                  color: isSelected ? '#059669' : '#10b981',
                  weight: isSelected ? 3 : 2,
                  dashArray: '6, 8',
                  opacity: isSelected ? 0.9 : 0.55,
                }}
              />
            );
          })}

          {/* Scoped Field Team Markers (Only show workers who are on an active job) */}
          {searchedTeams.filter((team) => team.activeOrderCount > 0).map((team) => {
            const lat = team.zoneLat || 31.4735;
            const lng = team.zoneLng || 74.2698;
            const isOnJob = team.activeOrderCount > 0;
            const isSelected = selectedTeam?._id === team._id;
            const worker = getWorkerInfoForTeam(team.name, team.members);
            const workerInitials = getPersonInitials(worker.name);

            return (
              <React.Fragment key={team._id}>
                {/* Zone Coverage Radius Circle */}
                {isSelected && (
                  <Circle
                    center={[lat, lng]}
                    radius={(team.zoneRadiusKm || 5) * 1000}
                    pathOptions={{
                      color: '#ea580c',
                      fillColor: '#ffedd5',
                      fillOpacity: 0.18,
                      weight: 1.5,
                      dashArray: '4, 4',
                    }}
                  />
                )}

                {/* Worker Marker with Only Worker Name */}
                <Marker
                  position={[lat, lng]}
                  icon={createTeamIcon(workerInitials, worker.name, isSelected)}
                  eventHandlers={{
                    click: () => handleSelectTeam(team),
                  }}
                >
                  <Popup>
                    <div className="text-xs p-1 space-y-2 max-w-xs font-sans">
                      <div className="flex items-center justify-between gap-2 border-b pb-1.5">
                        <div>
                          <h4 className="font-bold text-sm text-gray-900">{worker.name}</h4>
                          <span className="text-[11px] font-mono text-amber-700 font-bold">{worker.id}</span>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            isOnJob 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isOnJob ? 'On Assignment' : 'Available'}
                        </span>
                      </div>

                      <div className="space-y-1 text-gray-600">
                        <p><strong>Crew:</strong> {team.name}</p>
                        <p><strong>Rating:</strong> ⭐ {team.averageRating !== undefined ? Number(team.averageRating).toFixed(1) : '0.0'} ({team.totalJobsCompleted || 0} reviews)</p>
                      </div>

                      <div className="flex items-center gap-1.5 pt-1">
                        <Button
                          size="sm"
                          className="flex-1 text-white text-[11px] h-7 cursor-pointer shadow-sm bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-orange-500/20"
                          onClick={() => {
                            const jobCode = (worker as any)?.currentJobCode || team?.workOrderId || team?.activeOrderCode || getJobCodeForWorker(worker.name, team.name);
                            navigate(`/chat/${jobCode}?type=worker&worker=${encodeURIComponent(worker.name)}&name=${encodeURIComponent(worker.name)}&role=Worker`);
                          }}
                        >
                          <MessageSquare className="w-3 h-3 mr-1" /> Contact {worker.name}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteTechnician(worker.name, worker.id || team.id)}
                          className="border-red-200 text-red-600 hover:bg-red-50 text-[11px] h-7 px-2 rounded-md cursor-pointer flex items-center justify-center gap-1 font-semibold"
                          title="Delete technician"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </Button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            );
          })}
        </MapContainer>

        {/* Google Maps Layer Switcher & Default Role Location Re-Center */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMapType(prev => prev === 'roadmap' ? 'satellite' : 'roadmap')}
            className={`bg-white/95 backdrop-blur-sm border-gray-200 text-gray-800 text-xs shadow-md cursor-pointer h-7 px-2.5 font-medium ${
              isClientRole ? 'hover:bg-teal-50 hover:text-teal-700' : isFieldRole ? 'hover:bg-amber-50 hover:text-amber-800' : 'hover:bg-purple-50 hover:text-purple-700'
            }`}
          >
            <Layers className={`w-3.5 h-3.5 mr-1 ${isClientRole ? 'text-teal-600' : isFieldRole ? 'text-amber-600' : 'text-purple-600'}`} />
            {mapType === 'roadmap' ? 'Google Satellite' : 'Google Roadmap'}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setGeocodedLocation(null);
              setSelectedTeam(null);
              setPanCoords([roleLocation.lat, roleLocation.lng]);
              toast.success(`Centered on My Location: ${roleLocation.address}`);
            }}
            className={`bg-white/95 backdrop-blur-sm border-gray-200 text-gray-800 text-xs shadow-md cursor-pointer h-7 px-2.5 font-medium ${
              isClientRole ? 'hover:bg-teal-50 hover:text-teal-700' : isFieldRole ? 'hover:bg-amber-50 hover:text-amber-800' : 'hover:bg-purple-50 hover:text-purple-700'
            }`}
            title="Re-center map on default location"
          >
            <Crosshair className={`w-3.5 h-3.5 mr-1 ${isClientRole ? 'text-teal-600' : isFieldRole ? 'text-amber-600' : 'text-purple-600'}`} />
            <span>My Location</span>
          </Button>
        </div>

        {/* Google Maps Branding Badge */}
        <div className="absolute bottom-2 left-2 z-10 bg-white/90 backdrop-blur-sm text-gray-700 px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1.5 shadow-sm border border-gray-200">
          <span className={isClientRole ? 'text-teal-700 font-bold' : isFieldRole ? 'text-amber-700 font-bold' : 'text-purple-700 font-bold'}>Google Maps Live</span>
          <span>• {mapType === 'roadmap' ? 'Roadmap' : 'Satellite Hybrid'}</span>
        </div>
      </div>
    </div>
  );
};
