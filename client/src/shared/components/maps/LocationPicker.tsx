import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import { Crosshair, Loader2, CheckCircle2, Search, Layers, Globe, MapPin, X, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useRoleTheme } from '@/shared/hooks/useRoleTheme';
import { cn } from '@/lib/utils';
import { clearflowPinIcon } from './clearflowMapPin';
import { getSavedUserProfileLocation, forwardGeocodeAddress, reverseGeocodeCoords, findPresetMatch } from '@/shared/utils/locationHelper';

interface LocationPickerProps {
  lat: number;
  lng: number;
  address: string;
  onChange: (lat: number, lng: number, address: string) => void;
}

// Smooth map pan and fly-to controller ensuring map always stays aligned with pin coordinates
function MapPanController({ 
  center, 
  flyTarget 
}: { 
  center: [number, number]; 
  flyTarget: [number, number] | null; 
}) {
  const map = useMap();
  const lastCenterRef = useRef<[number, number]>(center);

  // Invalidate map size so Leaflet renders full map immediately without empty grey margins
  useEffect(() => {
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [map]);

  useEffect(() => {
    if (flyTarget && flyTarget[0] && flyTarget[1]) {
      map.flyTo(flyTarget, 16, { duration: 0.8 });
      lastCenterRef.current = flyTarget;
    }
  }, [flyTarget, map]);

  useEffect(() => {
    if (center && center[0] && center[1]) {
      const [lastLat, lastLng] = lastCenterRef.current;
      if (Math.abs(center[0] - lastLat) > 0.0001 || Math.abs(center[1] - lastLng) > 0.0001) {
        lastCenterRef.current = center;
        map.flyTo(center, 16, { duration: 0.8 });
      }
    }
  }, [center, map]);

  return null;
}

const DraggablePin = React.memo(function DraggablePin({
  lat,
  lng,
  onDragEnd,
}: {
  lat: number;
  lng: number;
  onDragEnd: (newLat: number, newLng: number) => void;
}) {
  const markerRef = useRef<any>(null);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker) {
          const position = marker.getLatLng();
          onDragEnd(position.lat, position.lng);
        }
      },
    }),
    [onDragEnd]
  );

  useMapEvents({
    click(e) {
      onDragEnd(e.latlng.lat, e.latlng.lng);
    },
  });

  return (
    <Marker
      position={[lat, lng]}
      draggable={true}
      icon={clearflowPinIcon}
      eventHandlers={eventHandlers}
      ref={markerRef}
    >
      <Popup>
        <div className="text-xs p-1">
          <p className="font-bold text-gray-900 flex items-center gap-1">Selected Service Location</p>
          <p className="text-[10px] text-teal-700 mt-1 font-medium">Drag pin or click map to auto-detect address</p>
        </div>
      </Popup>
    </Marker>
  );
});

interface LeafletMapPaneProps {
  lat: number;
  lng: number;
  flyTarget: [number, number] | null;
  mapType: 'roadmap' | 'satellite';
  isLiveGps: boolean;
  onDragEnd: (newLat: number, newLng: number) => void;
}

// Dedicated Memoized Map Component:
// Isolated from search input typing so typing letters NEVER re-renders or stutters the map!
const LeafletMapPane = React.memo(function LeafletMapPane({
  lat,
  lng,
  flyTarget,
  mapType,
  isLiveGps,
  onDragEnd,
}: LeafletMapPaneProps) {
  return (
    <div className="relative h-72 sm:h-80 w-full rounded-xl overflow-hidden border border-gray-200 shadow-sm z-0 isolate">
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        scrollWheelZoom={true}
        preferCanvas={true}
        className="h-full w-full"
      >
        {/* Roadmap Tiles (Permanent, never unmounted to prevent shutter/flicker) */}
        <TileLayer
          attribution="&copy; Google Maps"
          url="https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
          subdomains={['0', '1', '2', '3']}
          maxZoom={20}
          opacity={mapType === 'roadmap' ? 1 : 0}
          zIndex={mapType === 'roadmap' ? 2 : 1}
        />

        {/* Satellite Hybrid Tiles (Permanent, never unmounted to prevent shutter/flicker) */}
        <TileLayer
          attribution="&copy; Google Maps Satellite"
          url="https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
          subdomains={['0', '1', '2', '3']}
          maxZoom={20}
          opacity={mapType === 'satellite' ? 1 : 0}
          zIndex={mapType === 'satellite' ? 2 : 1}
        />

        <MapPanController center={[lat, lng]} flyTarget={flyTarget} />
        <DraggablePin lat={lat} lng={lng} onDragEnd={onDragEnd} />
      </MapContainer>

      {/* Floating Google Maps branding badge */}
      <div className="absolute bottom-2 left-2 z-10 bg-white/90 backdrop-blur-sm text-gray-700 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 shadow-sm border border-gray-200 pointer-events-none select-none">
        <span className="font-bold text-teal-700">Google Maps</span>
        <span>• {mapType === 'roadmap' ? 'Roadmap' : 'Satellite Hybrid'}</span>
      </div>

      {isLiveGps && (
        <div className="absolute top-2 left-2 z-10 bg-emerald-600/90 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 shadow pointer-events-none select-none">
          <CheckCircle2 className="w-3 h-3 animate-pulse" /> Live Device GPS Active
        </div>
      )}
    </div>
  );
});

export const LocationPicker: React.FC<LocationPickerProps> = ({ lat, lng, address, onChange }) => {
  const theme = useRoleTheme();
  const [currentPos, setCurrentPos] = useState({ lat: lat || 31.4697, lng: lng || 74.2728 });
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [searchQuery, setSearchQuery] = useState(address || '');
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isLiveGps, setIsLiveGps] = useState(false);
  const profileLocation = useMemo(() => getSavedUserProfileLocation(), []);

  // Debounce ref for typing without stuttering the parent form
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external coordinates
  useEffect(() => {
    if (lat && lng && (lat !== currentPos.lat || lng !== currentPos.lng)) {
      setCurrentPos({ lat, lng });
      setFlyTarget([lat, lng]);
    }
  }, [lat, lng]);

  // Sync external address changes into the input (only when not actively typing or searching)
  useEffect(() => {
    if (address && address !== searchQuery && !isReverseGeocoding && !isSearching && !debounceTimerRef.current) {
      setSearchQuery(address);
    }
  }, [address]);

  // Auto-resolve non-Johar address coordinates if currently stuck at default Johar Town coordinates or mismatched preset
  useEffect(() => {
    const cleanAddr = (address || searchQuery || '').trim();
    if (!cleanAddr) return;

    const preset = findPresetMatch(cleanAddr);
    if (preset && (Math.abs(preset.lat - currentPos.lat) > 0.003 || Math.abs(preset.lng - currentPos.lng) > 0.003)) {
      setCurrentPos({ lat: preset.lat, lng: preset.lng });
      setFlyTarget([preset.lat, preset.lng]);
      onChange(preset.lat, preset.lng, cleanAddr);
      return;
    }

    const isJoharDefault = (
      ((Math.abs(currentPos.lat - 31.4697) < 0.002 && Math.abs(currentPos.lng - 74.2728) < 0.002) ||
       (Math.abs(currentPos.lat - 31.4735) < 0.002 && Math.abs(currentPos.lng - 74.2698) < 0.002)) &&
      !cleanAddr.toLowerCase().includes('johar town')
    );

    if (isJoharDefault) {
      forwardGeocodeAddress(cleanAddr).then((found) => {
        if (found && (Math.abs(found.lat - currentPos.lat) > 0.001 || Math.abs(found.lng - currentPos.lng) > 0.001)) {
          setCurrentPos({ lat: found.lat, lng: found.lng });
          setFlyTarget([found.lat, found.lng]);
          onChange(found.lat, found.lng, cleanAddr);
        }
      });
    }
  }, [address, searchQuery, currentPos.lat, currentPos.lng, onChange]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Handle marker drag / map click -> auto-detect address and update search input
  const handleDrag = useCallback(async (newLat: number, newLng: number) => {
    setCurrentPos({ lat: newLat, lng: newLng });
    setIsLiveGps(false);
    setIsReverseGeocoding(true);

    try {
      const detectedAddr = await reverseGeocodeCoords(newLat, newLng);
      setSearchQuery(detectedAddr);
      onChange(newLat, newLng, detectedAddr);
      toast.success(`Address detected: ${detectedAddr}`);
    } catch {
      const fallbackAddr = 'Selected Map Location';
      setSearchQuery(fallbackAddr);
      onChange(newLat, newLng, fallbackAddr);
    } finally {
      setIsReverseGeocoding(false);
    }
  }, [onChange]);

  // Handle manual typing: updates local input immediately, debounces geocoding and parent onChange
  const handleManualInputChange = (val: string) => {
    setSearchQuery(val);
    setIsLiveGps(false);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(async () => {
      const clean = val.trim();
      if (clean.length >= 3) {
        try {
          const found = await forwardGeocodeAddress(clean);
          if (found) {
            setCurrentPos({ lat: found.lat, lng: found.lng });
            setFlyTarget([found.lat, found.lng]);
            onChange(found.lat, found.lng, val);
            debounceTimerRef.current = null;
            return;
          }
        } catch (_) {}
      }
      onChange(currentPos.lat, currentPos.lng, val);
      debounceTimerRef.current = null;
    }, 450);
  };

  const handleInputBlur = async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    const clean = searchQuery.trim();
    if (clean.length >= 3) {
      try {
        const found = await forwardGeocodeAddress(clean);
        if (found) {
          setCurrentPos({ lat: found.lat, lng: found.lng });
          setFlyTarget([found.lat, found.lng]);
          onChange(found.lat, found.lng, searchQuery);
          return;
        }
      } catch (_) {}
    }
    onChange(currentPos.lat, currentPos.lng, searchQuery);
  };

  // Search/locate on map when user enters text and clicks search / presses enter
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    setIsSearching(true);
    try {
      const found = await forwardGeocodeAddress(q);
      if (found) {
        const { lat: newLat, lng: newLng, address: resolvedAddr } = found;
        setCurrentPos({ lat: newLat, lng: newLng });
        setFlyTarget([newLat, newLng]);
        setIsLiveGps(false);
        onChange(newLat, newLng, q);
        toast.success(`Located on map: ${resolvedAddr || q}`);
      } else {
        toast.info('Could not locate exact coordinates. You can drag the map pin to pinpoint the service spot.');
        onChange(currentPos.lat, currentPos.lng, q);
      }
    } catch (err) {
      toast.error('Search failed. Check your network connection.');
    } finally {
      setIsSearching(false);
    }
  };

  const applyPosition = useCallback(async (pos: GeolocationPosition) => {
    const userLat = pos.coords.latitude;
    const userLng = pos.coords.longitude;
    setCurrentPos({ lat: userLat, lng: userLng });
    setFlyTarget([userLat, userLng]);
    setIsLiveGps(true);
    setIsLocating(false);
    setIsReverseGeocoding(true);

    try {
      const detected = await reverseGeocodeCoords(userLat, userLng);
      setSearchQuery(detected);
      onChange(userLat, userLng, detected);
      toast.success('Live GPS location & address acquired!');
    } catch {
      const fallback = 'My Live Location';
      setSearchQuery(fallback);
      onChange(userLat, userLng, fallback);
      toast.success('Location acquired');
    } finally {
      setIsReverseGeocoding(false);
    }
  }, [onChange]);

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      applyPosition,
      (err) => {
        if (err.code === 1) {
          setIsLocating(false);
          toast.error('Location permission denied. Please allow location access in your browser settings.');
          return;
        }
        navigator.geolocation.getCurrentPosition(
          applyPosition,
          (err2) => {
            setIsLocating(false);
            if (err2.code === 1) {
              toast.error('Location permission denied. Please allow location access in your browser settings.');
            } else {
              toast.error('Could not determine your location. Try dragging the map pin manually.');
            }
          },
          { enableHighAccuracy: false, timeout: 30000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [applyPosition]);

  return (
    <div className="space-y-3">
      {/* ── Top Header & Status ── */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-teal-600" />
          <span>Service Location / Address & Map Pin</span>
          <span className="text-red-500">*</span>
        </Label>
        {isReverseGeocoding && (
          <span className="text-xs text-teal-600 font-semibold flex items-center gap-1 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" /> Auto-detecting address...
          </span>
        )}
      </div>

      {/* ── Unified Address / Search Bar ── */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          {isReverseGeocoding ? (
            <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-600 animate-spin" />
          ) : (
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          )}
          <Input
            value={searchQuery}
            onChange={(e) => handleManualInputChange(e.target.value)}
            onBlur={handleInputBlur}
            placeholder="Type address / room or search any city, street, facility..."
            className={cn("pl-9 pr-8 h-9 text-xs sm:text-sm bg-white border-gray-300 shadow-xs", theme.focusRing)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => handleManualInputChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <Button
          type="submit"
          size="sm"
          disabled={isSearching || !searchQuery.trim()}
          className={cn(theme.primaryBtn, "text-xs h-9 px-3.5 shrink-0 shadow-xs cursor-pointer flex items-center gap-1.5")}
        >
          {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
          <span>{isSearching ? 'Locating...' : 'Locate on Map'}</span>
        </Button>
      </form>

      {/* ── Map Action Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Globe className="w-3.5 h-3.5 text-teal-600" />
          <span>Drag the pin or click map to auto-detect address</span>
        </div>

        <div className="flex items-center gap-2">
          {profileLocation.address && searchQuery.trim().toLowerCase() !== profileLocation.address.toLowerCase() && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                setSearchQuery(profileLocation.address);
                let pLat = profileLocation.lat;
                let pLng = profileLocation.lng;
                if ((Math.abs(pLat - 31.4697) < 0.001 && Math.abs(pLng - 74.2728) < 0.001) && !profileLocation.address.toLowerCase().includes('johar town')) {
                  const resolved = await forwardGeocodeAddress(profileLocation.address);
                  if (resolved) {
                    pLat = resolved.lat;
                    pLng = resolved.lng;
                  }
                }
                setCurrentPos({ lat: pLat, lng: pLng });
                setFlyTarget([pLat, pLng]);
                setIsLiveGps(false);
                onChange(pLat, pLng, profileLocation.address);
                toast.success(`Set to profile location: ${profileLocation.address}`);
              }}
              className="text-xs h-8 px-2.5 border-teal-200 text-teal-800 bg-teal-50/70 hover:bg-teal-100/90 cursor-pointer transition-all active:scale-95"
              title="Reset to your saved profile address"
            >
              <User className="w-3.5 h-3.5 mr-1 text-teal-700" />
              <span>Use Profile Address</span>
            </Button>
          )}

          {/* Layer Switcher - Zero Shutter Crossfade */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMapType(prev => (prev === 'roadmap' ? 'satellite' : 'roadmap'))}
            className="text-xs h-8 px-2.5 border-gray-200 text-gray-700 cursor-pointer transition-all active:scale-95"
          >
            <Layers className="w-3.5 h-3.5 mr-1 text-teal-600" />
            {mapType === 'roadmap' ? 'Satellite View' : 'Roadmap View'}
          </Button>

          {/* Live GPS Button */}
          <Button
            type="button"
            size="sm"
            onClick={handleLocateMe}
            disabled={isLocating}
            className={cn(theme.primaryBtn, "text-xs h-8 px-3 shadow-xs min-w-[140px] justify-center cursor-pointer transition-all active:scale-95")}
          >
            {isLocating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Acquiring GPS…
              </>
            ) : isLiveGps ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-white" />
                GPS Active
              </>
            ) : (
              <>
                <Crosshair className="w-3.5 h-3.5 mr-1.5" />
                Use My Live Location
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Interactive Leaflet & Google Maps (Memoized & Shutter-Free) ── */}
      <LeafletMapPane
        lat={currentPos.lat}
        lng={currentPos.lng}
        flyTarget={flyTarget}
        mapType={mapType}
        isLiveGps={isLiveGps}
        onDragEnd={handleDrag}
      />

      {/* ── Active Service Target Confirmation ── */}
      {address && (
        <div className="p-2.5 bg-teal-50/70 border border-teal-200/80 rounded-xl flex items-start gap-2 text-xs">
          <MapPin className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-teal-950">Active Service Location: </span>
            <span className="text-teal-800 break-words">{address}</span>
          </div>
        </div>
      )}
    </div>
  );
};
