import React, { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import { MapPin, Crosshair, Loader2, CheckCircle2, Search, Layers, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import L from 'leaflet';

interface LocationPickerProps {
  lat: number;
  lng: number;
  address: string;
  onChange: (lat: number, lng: number, address: string) => void;
}

// Google Maps live tile providers (Roadmap and Satellite Hybrid)
const GOOGLE_MAPS_TILES = {
  roadmap: {
    url: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    attribution: '&copy; Google Maps',
    name: 'Google Roadmap',
  },
  satellite: {
    url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    attribution: '&copy; Google Maps Satellite',
    name: 'Google Satellite',
  },
};

function MapPanController({ coords }: { coords: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (coords && coords[0] && coords[1]) {
      map.flyTo(coords, 16, { duration: 1.2 });
    }
  }, [coords, map]);
  return null;
}

// Custom map marker icon to ensure reliable rendering without asset bundler issues
const pinIcon = L.divIcon({
  className: 'clearflow-pin-icon',
  html: `<div style="background-color: #0d9488; color: #ffffff; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.35); border: 2.5px solid #ffffff; font-size: 18px; transform: translate(-2px, -2px);">📍</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

function DraggablePin({ lat, lng, onDragEnd }: { lat: number; lng: number; onDragEnd: (newLat: number, newLng: number) => void }) {
  const eventHandlers = useMemo(
    () => ({
      dragend(e: any) {
        const marker = e.target;
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
    <Marker position={[lat, lng]} draggable={true} icon={pinIcon} eventHandlers={eventHandlers}>
      <Popup>
        <div className="text-xs p-1">
          <p className="font-bold text-teal-800">📍 Selected Service Location</p>
          <p className="text-gray-600 mt-0.5 font-mono">{lat.toFixed(5)}, {lng.toFixed(5)}</p>
          <p className="text-[10px] text-teal-600 mt-1">Drag anywhere to adjust dispatch target</p>
        </div>
      </Popup>
    </Marker>
  );
}

export const LocationPicker: React.FC<LocationPickerProps> = ({ lat, lng, address, onChange }) => {
  const [currentPos, setCurrentPos] = useState({ lat: lat || 40.7128, lng: lng || -74.0060 }); // Global default
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isLiveGps, setIsLiveGps] = useState(false);

  useEffect(() => {
    if (lat && lng && (lat !== currentPos.lat || lng !== currentPos.lng)) {
      setCurrentPos({ lat, lng });
    }
  }, [lat, lng]);

  const handleDrag = async (newLat: number, newLng: number) => {
    setCurrentPos({ lat: newLat, lng: newLng });
    setIsLiveGps(false);

    try {
      // Reverse geocode via OpenStreetMap Nominatim for clean worldwide address text
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${newLat}&lon=${newLng}&zoom=18&addressdetails=1`);
      const data = await res.json();
      if (data && data.display_name) {
        const cleanAddr = data.display_name.split(',').slice(0, 4).join(',');
        onChange(newLat, newLng, cleanAddr);
        return;
      }
    } catch {}

    const generatedAddress = `Coordinates (${newLat.toFixed(5)}, ${newLng.toFixed(5)})`;
    onChange(newLat, newLng, address || generatedAddress);
  };

  // Worldwide Address / Place Search
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery.trim())}&limit=1`
      );
      const results = await res.json();
      if (results && results.length > 0) {
        const found = results[0];
        const newLat = parseFloat(found.lat);
        const newLng = parseFloat(found.lon);
        setCurrentPos({ lat: newLat, lng: newLng });
        setIsLiveGps(false);
        const cleanAddr = found.display_name.split(',').slice(0, 4).join(',');
        onChange(newLat, newLng, cleanAddr);
        toast.success(`📍 Located: ${cleanAddr}`);
      } else {
        toast.error('Location not found. Try entering a city, zip code, or address.');
      }
    } catch (err) {
      toast.error('Failed to search location. Check internet connection.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        setCurrentPos({ lat: userLat, lng: userLng });
        setIsLiveGps(true);
        setIsLocating(false);

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLat}&lon=${userLng}&zoom=18&addressdetails=1`
          );
          const data = await res.json();
          if (data && data.display_name) {
            const cleanAddr = data.display_name.split(',').slice(0, 4).join(',');
            onChange(userLat, userLng, cleanAddr);
            toast.success('📍 Live device GPS coordinates & address acquired!');
            return;
          }
        } catch {}

        onChange(userLat, userLng, `My Device Location (${userLat.toFixed(5)}, ${userLng.toFixed(5)})`);
        toast.success('📍 Live GPS coordinates acquired!');
      },
      (err) => {
        setIsLocating(false);
        toast.error(`Unable to retrieve GPS: ${err.message}. Please allow location permission in your browser.`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const activeTile = GOOGLE_MAPS_TILES[mapType];

  return (
    <div className="space-y-3">
      {/* Worldwide Search & GPS Controls */}
      <div className="space-y-2">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search any worldwide city, street, facility, or landmark..."
              className="pl-9 h-9 text-xs bg-white focus-visible:ring-teal-500"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={isSearching || !searchQuery.trim()}
            className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-9 px-3 cursor-pointer shrink-0"
          >
            {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
          </Button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
            <Globe className="w-3.5 h-3.5 text-teal-600" />
            <span>Drag pin anywhere worldwide:</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Google Maps Layer Switcher */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMapType(prev => prev === 'roadmap' ? 'satellite' : 'roadmap')}
              className="text-xs h-8 px-2.5 border-gray-200 text-gray-700 hover:bg-teal-50 hover:text-teal-800 cursor-pointer"
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
              className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-8 px-3 shadow-sm cursor-pointer"
            >
              {isLocating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  Locating...
                </>
              ) : (
                <>
                  <Crosshair className="w-3.5 h-3.5 mr-1" />
                  Use My Live Location
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Interactive Google Map */}
      <div className="relative h-72 w-full rounded-xl overflow-hidden border border-gray-200 shadow-sm z-0">
        <MapContainer
          center={[currentPos.lat, currentPos.lng]}
          zoom={15}
          scrollWheelZoom={true}
          className="h-full w-full"
        >
          <TileLayer
            key={mapType}
            attribution={activeTile.attribution}
            url={activeTile.url}
            subdomains={activeTile.subdomains}
            maxZoom={20}
          />
          <MapPanController coords={[currentPos.lat, currentPos.lng]} />
          <DraggablePin lat={currentPos.lat} lng={currentPos.lng} onDragEnd={handleDrag} />
        </MapContainer>

        {/* Floating Google Maps branding badge */}
        <div className="absolute bottom-2 left-2 z-[400] bg-white/90 backdrop-blur-sm text-gray-700 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 shadow-sm border border-gray-200">
          <span className="text-teal-700 font-bold">Google Maps</span>
          <span>• {mapType === 'roadmap' ? 'Roadmap' : 'Satellite Hybrid'}</span>
        </div>

        {isLiveGps && (
          <div className="absolute top-2 left-2 z-[400] bg-emerald-600/90 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 shadow">
            <CheckCircle2 className="w-3 h-3 animate-pulse" /> Live Device GPS Active
          </div>
        )}
      </div>
    </div>
  );
};
