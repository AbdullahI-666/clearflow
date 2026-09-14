import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Radio, Users, Star, RefreshCw, CheckCircle2, Clock, Phone, MessageSquare, Shield, Crosshair, Loader2, Layers } from 'lucide-react';
import { apiClient } from '@/infrastructure/api/client';
import { ENDPOINTS } from '@/infrastructure/api/endpoints';
import type { FieldTeam } from '@/entities/team/types';
import { socketClient } from '@/infrastructure/socket/client';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

// Custom team marker using DivIcon
const createTeamIcon = (initials: string, isOnJob: boolean, isSelected: boolean) => {
  const bgClass = isSelected
    ? 'bg-emerald-500 ring-4 ring-emerald-300 shadow-xl'
    : isOnJob
    ? 'bg-amber-500 ring-2 ring-amber-200 shadow-md'
    : 'bg-teal-600 ring-2 ring-teal-200 shadow-md';

  return L.divIcon({
    className: 'custom-team-pin',
    html: `
      <div style="transform: translate(-50%, -50%);" class="relative flex flex-col items-center">
        <div class="w-9 h-9 rounded-full ${bgClass} text-white flex items-center justify-center font-bold text-xs border-2 border-white transition-transform hover:scale-110">
          ${initials}
        </div>
        <div class="bg-slate-900/90 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded shadow mt-1 whitespace-nowrap border border-slate-700">
          ${initials}
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
};

const userDeviceIcon = L.divIcon({
  className: 'custom-user-pin',
  html: `
    <div style="transform: translate(-50%, -50%);" class="relative flex flex-col items-center">
      <div class="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs border-2 border-white shadow-2xl ring-4 ring-blue-300 animate-bounce">
        📍 ME
      </div>
      <div class="bg-blue-950 text-blue-200 text-[9px] font-bold px-1.5 py-0.5 rounded shadow mt-1 whitespace-nowrap border border-blue-700">
        My Live GPS
      </div>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -22],
});

const hqIcon = L.divIcon({
  className: 'custom-hq-pin',
  html: `
    <div style="transform: translate(-50%, -50%);" class="relative flex flex-col items-center">
      <div class="w-11 h-11 rounded-full bg-teal-700 text-white flex items-center justify-center font-bold text-xs border-2 border-white shadow-2xl ring-4 ring-teal-400/40 animate-pulse">
        HQ
      </div>
      <div class="bg-teal-950 text-teal-200 text-[10px] font-bold px-2 py-0.5 rounded shadow mt-1 whitespace-nowrap border border-teal-700">
        ClearFlow Operations HQ
      </div>
    </div>
  `,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
  popupAnchor: [0, -24],
});

// Map Controller for Smooth Panning
function MapPanController({ targetCoords }: { targetCoords: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (targetCoords) {
      map.flyTo(targetCoords, 14, { duration: 1.2 });
    }
  }, [targetCoords, map]);
  return null;
}

const DEFAULT_TEAMS: any[] = [
  {
    _id: '65f000000000000000000301',
    name: 'Alpha Crew (Cleaning)',
    zoneLat: 31.4697,
    zoneLng: 74.2728,
    zoneRadiusKm: 5,
    isActive: true,
    activeOrderCount: 1,
    averageRating: 4.9,
    totalJobsCompleted: 48,
    members: [{ name: 'Marcus Vance' }],
  },
  {
    _id: '65f000000000000000000302',
    name: 'Pipe Pros (Plumbing)',
    zoneLat: 31.4650,
    zoneLng: 74.2800,
    zoneRadiusKm: 6,
    isActive: true,
    activeOrderCount: 1,
    averageRating: 4.8,
    totalJobsCompleted: 39,
    members: [{ name: 'Alex Rivera' }],
  },
  {
    _id: '65f000000000000000000303',
    name: 'Voltage Elite (Electrical)',
    zoneLat: 31.5100,
    zoneLng: 74.3450,
    zoneRadiusKm: 8,
    isActive: true,
    activeOrderCount: 0,
    averageRating: 4.7,
    totalJobsCompleted: 52,
    members: [{ name: 'Sam Taylor' }],
  },
  {
    _id: '65f000000000000000000304',
    name: 'Green Thumb (Gardening)',
    zoneLat: 31.4850,
    zoneLng: 74.3200,
    zoneRadiusKm: 7,
    isActive: true,
    activeOrderCount: 0,
    averageRating: 4.9,
    totalJobsCompleted: 27,
    members: [{ name: 'Jordan Lee' }],
  },
  {
    _id: '65f000000000000000000305',
    name: 'Delta Waste (Recycling)',
    zoneLat: 31.4720,
    zoneLng: 74.4000,
    zoneRadiusKm: 10,
    isActive: true,
    activeOrderCount: 1,
    averageRating: 4.6,
    totalJobsCompleted: 64,
    members: [{ name: 'Chris Morgan' }],
  },
];

export const LiveTrackingMap = () => {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<any[]>(DEFAULT_TEAMS);
  const [selectedTeam, setSelectedTeam] = useState<any>(DEFAULT_TEAMS[0]);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ON_JOB' | 'AVAILABLE'>('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [panCoords, setPanCoords] = useState<[number, number] | null>([31.4697, 74.2728]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');

  const fetchTrackingData = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get(ENDPOINTS.TEAMS.BASE);
      if (res.data?.success && res.data?.data && res.data.data.length > 0) {
        setTeams(res.data.data);
      }
    } catch (err) {
      console.warn('Using fleet coordinates');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackingData();

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
        socket.off('gps:update');
      };
    }
  }, []);

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
        toast.success(`📍 Your live device location detected: ${lat.toFixed(4)}, ${lng.toFixed(4)}!`);
      },
      (err) => {
        setIsLocatingUser(false);
        toast.error(`GPS Error: ${err.message}. Please allow location permissions.`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const filteredTeams = teams.filter((t) => {
    if (filterStatus === 'ON_JOB') return t.activeOrderCount > 0;
    if (filterStatus === 'AVAILABLE') return t.activeOrderCount === 0;
    return true;
  });

  const activeCount = teams.filter((t) => t.isActive).length;
  const onJobCount = teams.filter((t) => t.activeOrderCount > 0).length;

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-110px)] w-full rounded-2xl overflow-hidden shadow-md border border-gray-200 bg-white">
      {/* Left Sidebar: Fleet Roster */}
      <div className="w-full lg:w-84 border-r border-gray-100 flex flex-col h-full bg-white z-10 shrink-0">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-emerald-500 animate-pulse" /> Live Fleet Telemetry
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Central Facility Dispatch Zone</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchTrackingData}
            className="h-8 w-8 text-gray-500 hover:text-teal-600"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Filter Chips */}
        <div className="p-2.5 bg-gray-50/70 border-b border-gray-100 flex gap-1.5 text-xs">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`flex-1 py-1 px-2 rounded-md font-semibold text-xs transition-colors ${
              filterStatus === 'ALL' ? 'bg-teal-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            All ({teams.length})
          </button>
          <button
            onClick={() => setFilterStatus('ON_JOB')}
            className={`flex-1 py-1 px-2 rounded-md font-semibold text-xs transition-colors ${
              filterStatus === 'ON_JOB' ? 'bg-amber-500 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            On Job ({onJobCount})
          </button>
          <button
            onClick={() => setFilterStatus('AVAILABLE')}
            className={`flex-1 py-1 px-2 rounded-md font-semibold text-xs transition-colors ${
              filterStatus === 'AVAILABLE' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            Free ({activeCount - onJobCount})
          </button>
        </div>

        {/* Team List Scroll Area */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {filteredTeams.map((team) => {
            const isSelected = selectedTeam?._id === team._id;
            const isOnJob = team.activeOrderCount > 0;
            const initials = team.name.substring(0, 2).toUpperCase();

            return (
              <div
                key={team._id}
                onClick={() => handleSelectTeam(team)}
                className={`p-3.5 cursor-pointer transition-all ${
                  isSelected ? 'bg-teal-50/80 border-l-4 border-teal-600' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-xs ${
                        isOnJob ? 'bg-amber-500' : 'bg-teal-600'
                      }`}
                    >
                      {initials}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-gray-900">{team.name}</h4>
                      <p className="text-[10px] text-gray-500">
                        Lead: {team.members?.[0]?.name || 'Bilal Khan'} &bull; Radius: {team.zoneRadiusKm || 8} km
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      isOnJob ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {isOnJob ? 'On Assignment' : 'Available'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 mt-2 pt-1 border-t border-gray-100/60">
                  <span className="flex items-center gap-1 font-medium text-gray-700">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {team.averageRating || 4.8}
                  </span>
                  <span className="text-[11px] text-teal-700 font-mono font-medium">
                    {team.totalJobsCompleted || 32} Jobs Done
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Locate Device Button & Legend */}
        <div className="p-3 bg-gray-50 border-t border-gray-100 space-y-2">
          <Button
            size="sm"
            onClick={handleTrackMyDevice}
            disabled={isLocatingUser}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-8 shadow-sm cursor-pointer"
          >
            {isLocatingUser ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Crosshair className="w-3.5 h-3.5 mr-1.5" />
            )}
            📍 Locate My Device On Map
          </Button>

          <div className="text-[10px] text-gray-500 flex justify-between items-center pt-1">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-700"></span> HQ
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Available
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> On Duty
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> You
            </span>
          </div>
        </div>
      </div>

      {/* Right Leaflet Map Canvas */}
      <div className="flex-1 relative h-full w-full">
        <MapContainer
          center={[31.4697, 74.2728]}
          zoom={13}
          scrollWheelZoom={true}
          className="h-full w-full z-0"
        >
          <TileLayer
            key={mapType}
            attribution='&copy; Google Maps'
            url={mapType === 'roadmap' ? 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}' : 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'}
            subdomains={['0', '1', '2', '3']}
            maxZoom={20}
          />

          <MapPanController targetCoords={panCoords} />

          {/* Central HQ Marker */}
          <Marker position={[31.4697, 74.2728]} icon={hqIcon}>
            <Popup>
              <div className="text-xs p-1">
                <p className="font-bold text-teal-900 text-sm">🏢 ClearFlow Central Command HQ</p>
                <p className="text-gray-600 mt-1">Central Facility Complex, Global Operations Hub</p>
                <p className="text-[10px] text-teal-700 font-medium mt-1">Automated Haversine Dispatch Gateway Active</p>
              </div>
            </Popup>
          </Marker>

          {/* User Live Device Marker */}
          {userLocation && (
            <Marker position={[userLocation.lat, userLocation.lng]} icon={userDeviceIcon}>
              <Popup>
                <div className="text-xs p-1">
                  <p className="font-bold text-blue-900 text-sm">📍 Your Current Device Location</p>
                  <p className="text-gray-600 mt-1 font-mono">{userLocation.lat.toFixed(5)}, {userLocation.lng.toFixed(5)}</p>
                  <p className="text-[10px] text-blue-700 font-medium mt-1">Accuracy: &plusmn;{userLocation.accuracy} meters</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Field Teams Markers */}
          {filteredTeams.map((team) => {
            const lat = team.zoneLat || 31.4697;
            const lng = team.zoneLng || 74.2728;
            const isOnJob = team.activeOrderCount > 0;
            const isSelected = selectedTeam?._id === team._id;
            const initials = team.name.substring(0, 2).toUpperCase();

            return (
              <React.Fragment key={team._id}>
                {/* Zone Coverage Radius Circle */}
                {isSelected && (
                  <Circle
                    center={[lat, lng]}
                    radius={(team.zoneRadiusKm || 5) * 1000}
                    pathOptions={{
                      color: isOnJob ? '#f59e0b' : '#0d9488',
                      fillColor: isOnJob ? '#fef3c7' : '#ccfbf1',
                      fillOpacity: 0.2,
                      weight: 1.5,
                      dashArray: '4, 4',
                    }}
                  />
                )}

                <Marker
                  position={[lat, lng]}
                  icon={createTeamIcon(initials, isOnJob, isSelected)}
                  eventHandlers={{
                    click: () => handleSelectTeam(team),
                  }}
                >
                  <Popup>
                    <div className="text-xs p-1 space-y-2 max-w-xs">
                      <div className="flex items-center justify-between gap-2 border-b pb-1.5">
                        <h4 className="font-bold text-sm text-gray-900">{team.name}</h4>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            isOnJob ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isOnJob ? 'Active Job' : 'Available'}
                        </span>
                      </div>

                      <div className="space-y-1 text-gray-600">
                        <p><strong>Team Lead:</strong> {team.members?.[0]?.name || 'Bilal Khan'}</p>
                        <p><strong>Coordinates:</strong> {lat.toFixed(4)}, {lng.toFixed(4)}</p>
                        <p><strong>Zone Radius:</strong> {team.zoneRadiusKm || 5} km</p>
                        <p><strong>Rating:</strong> ⭐ {team.averageRating || 4.8} ({team.totalJobsCompleted || 32} reviews)</p>
                      </div>

                      <div className="flex gap-1.5 pt-1">
                        <Button
                          size="sm"
                          className="w-full bg-teal-600 hover:bg-teal-700 text-white text-[11px] h-7 cursor-pointer"
                          onClick={() => navigate('/chat')}
                        >
                          <MessageSquare className="w-3 h-3 mr-1" /> Contact Crew
                        </Button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            );
          })}
        </MapContainer>

        {/* Selected Team Floating Telemetry Card */}
        {selectedTeam && (
          <div className="absolute top-4 right-4 z-[400] bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-xl border border-teal-100 max-w-sm">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
                <span className="font-bold text-sm text-gray-900">{selectedTeam.name}</span>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  selectedTeam.activeOrderCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {selectedTeam.activeOrderCount > 0 ? 'On Task' : 'Standby'}
              </span>
            </div>

            <p className="text-xs text-gray-600 mt-1 font-mono">
              GPS Lat: <span className="font-bold text-teal-800">{selectedTeam.zoneLat?.toFixed(4)}</span>, Lng:{' '}
              <span className="font-bold text-teal-800">{selectedTeam.zoneLng?.toFixed(4)}</span>
            </p>

            <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-gray-100 text-xs">
              <div className="bg-teal-50 text-teal-900 p-1.5 rounded text-center">
                <span className="font-bold text-sm">{selectedTeam.totalJobsCompleted || 48}</span>
                <p className="text-[10px] text-teal-700">Completed</p>
              </div>
              <div className="bg-amber-50 text-amber-900 p-1.5 rounded text-center">
                <span className="font-bold text-sm">{selectedTeam.activeOrderCount}</span>
                <p className="text-[10px] text-amber-700">Active WO</p>
              </div>
            </div>
          </div>
        )}

        {/* Google Maps Layer Switcher */}
        <div className="absolute top-4 left-4 z-[400] flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMapType(prev => prev === 'roadmap' ? 'satellite' : 'roadmap')}
            className="bg-white/95 backdrop-blur-sm border-gray-200 text-gray-800 text-xs shadow-md hover:bg-teal-50 cursor-pointer h-8 px-2.5 font-medium"
          >
            <Layers className="w-3.5 h-3.5 mr-1.5 text-teal-600" />
            {mapType === 'roadmap' ? 'Google Satellite' : 'Google Roadmap'}
          </Button>
        </div>

        {/* Google Maps Branding Badge */}
        <div className="absolute bottom-2 left-2 z-[400] bg-white/90 backdrop-blur-sm text-gray-700 px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1.5 shadow-sm border border-gray-200">
          <span className="text-teal-700 font-bold">Google Maps Live</span>
          <span>• {mapType === 'roadmap' ? 'Roadmap' : 'Satellite Hybrid'}</span>
        </div>
      </div>
    </div>
  );
};
