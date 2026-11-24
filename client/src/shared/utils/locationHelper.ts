export interface LocationMatch {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export const PRESET_LOCATIONS: LocationMatch[] = [
  { name: 'Ali Town', address: 'Ali Town, Raiwind Road, Lahore', lat: 31.4620, lng: 74.2458 },
  { name: 'Ali Towm', address: 'Ali Town, Raiwind Road, Lahore', lat: 31.4620, lng: 74.2458 },
  { name: 'Ali Town Lahore', address: 'Ali Town, Raiwind Road, Lahore', lat: 31.4620, lng: 74.2458 },
  { name: 'Canal View', address: 'Canal View Housing Society, Canal Bank Rd, Lahore', lat: 31.4880, lng: 74.2480 },
  { name: 'Canal View Society', address: 'Canal View Housing Society, Canal Bank Rd, Lahore', lat: 31.4880, lng: 74.2480 },
  { name: 'Canalberg', address: 'Canalberg Housing Society, Lahore', lat: 31.4850, lng: 74.2450 },
  { name: 'Crystal Boys Hostel', address: 'Crystal Boys Hostel, Muslim Town, Lahore', lat: 31.5104, lng: 74.3068 },
  { name: 'Muslim Town', address: 'Muslim Town, Wahdat Rd / Canal Bank, Lahore', lat: 31.5104, lng: 74.3068 },
  { name: 'New Muslim Town', address: 'New Muslim Town, Ayubia Market, Lahore', lat: 31.5080, lng: 74.3120 },
  { name: 'Old Muslim Town', address: 'Old Muslim Town, Lahore', lat: 31.5120, lng: 74.3050 },
  { name: 'Wahdat Colony', address: 'Wahdat Colony / Wahdat Road, Lahore', lat: 31.5060, lng: 74.2980 },
  { name: 'Wahdat Road', address: 'Wahdat Road, Lahore', lat: 31.5060, lng: 74.2980 },
  { name: 'Emporium Mall', address: 'Abdul Haque Rd, Commercial Area Phase 2 Johar Town, Lahore', lat: 31.4678, lng: 74.2662 },
  { name: 'Block H-3', address: 'Block H-3, Commercial Area Phase 2 Johar Town, Lahore', lat: 31.4678, lng: 74.2662 },
  { name: 'Johar Town', address: 'Johar Town Commercial & Residential Zone, Lahore', lat: 31.4697, lng: 74.2728 },
  { name: 'Packages Mall', address: 'Walton Rd, Shahrah-e-Roomi, Nishter Town, Lahore', lat: 31.4746, lng: 74.3540 },
  { name: 'Gulberg III', address: 'Main Boulevard, Gulberg III, Lahore', lat: 31.5126, lng: 74.3465 },
  { name: 'Gulberg', address: 'Main Boulevard, Gulberg, Lahore', lat: 31.5126, lng: 74.3465 },
  { name: 'Gulberg II', address: 'Gulberg II, Main Market, Lahore', lat: 31.5180, lng: 74.3480 },
  { name: 'DHA Phase 5', address: 'Defence Housing Authority Phase 5, Lahore', lat: 31.4650, lng: 74.4050 },
  { name: 'DHA Phase 6', address: 'Defence Housing Authority Phase 6, Lahore', lat: 31.4550, lng: 74.4420 },
  { name: 'DHA Phase 1', address: 'Defence Housing Authority Phase 1, Lahore', lat: 31.4850, lng: 74.3850 },
  { name: 'DHA', address: 'Defence Housing Authority, Lahore', lat: 31.4650, lng: 74.4050 },
  { name: 'Model Town', address: 'Model Town Central Commercial Zone, Lahore', lat: 31.4883, lng: 74.3216 },
  { name: 'Lahore Expo Centre', address: 'Trade Centre, Abdul Haque Rd, Johar Town, Lahore', lat: 31.4655, lng: 74.2640 },
  { name: 'Liberty Market', address: 'Liberty Roundabout, Gulberg III, Lahore', lat: 31.5100, lng: 74.3435 },
  { name: 'Mall Road', address: 'The Mall Road Central Commercial Area, Lahore', lat: 31.5580, lng: 74.3280 },
  { name: 'Bahria Town', address: 'Bahria Town Sector C / Safari Villas, Lahore', lat: 31.3650, lng: 74.1800 },
  { name: 'Wapda Town', address: 'Wapda Town Phase 1 & 2, Lahore', lat: 31.4350, lng: 74.2650 },
  { name: 'Faisal Town', address: 'Faisal Town Commercial Market, Lahore', lat: 31.4820, lng: 74.3050 },
  { name: 'Allama Iqbal Town', address: 'Allama Iqbal Town, Lahore', lat: 31.5150, lng: 74.2850 },
  { name: 'Iqbal Town', address: 'Allama Iqbal Town, Lahore', lat: 31.5150, lng: 74.2850 },
  { name: 'Cavalry Ground', address: 'Cavalry Ground Extension, Lahore Cantt', lat: 31.5050, lng: 74.3750 },
  { name: 'Lahore Cantt', address: 'Saddar Cantt Commercial Zone, Lahore', lat: 31.5350, lng: 74.3900 },
  { name: 'Shadman', address: 'Shadman Market & Colony, Lahore', lat: 31.5380, lng: 74.3250 },
  { name: 'Barkat Market', address: 'Barkat Market, New Garden Town, Lahore', lat: 31.5020, lng: 74.3280 },
  { name: 'MM Alam Road', address: 'MM Alam Road, Gulberg, Lahore', lat: 31.5160, lng: 74.3510 },
  { name: 'Lake City', address: 'Lake City Golf & Country Club, Raiwind Rd, Lahore', lat: 31.3800, lng: 74.2500 },
  { name: 'Garden Town', address: 'New Garden Town, Lahore', lat: 31.5040, lng: 74.3220 },
  { name: 'Township', address: 'Township Commercial Area, Lahore', lat: 31.4550, lng: 74.3050 },
  { name: 'Valencia', address: 'Valencia Town, Lahore', lat: 31.4150, lng: 74.2600 },
  { name: 'Ichhra', address: 'Ichhra Ferozepur Road, Lahore', lat: 31.5200, lng: 74.3150 },
  { name: 'Samanabad', address: 'Samanabad Main Market, Lahore', lat: 31.5350, lng: 74.3000 },
  { name: 'Gulshan-e-Ravi', address: 'Gulshan-e-Ravi, Lahore', lat: 31.5450, lng: 74.2850 },
  { name: 'Anarkali', address: 'Anarkali Bazaar, Lahore', lat: 31.5650, lng: 74.3100 },
  { name: 'Green Town', address: 'Green Town Sector D, Lahore', lat: 31.4400, lng: 74.3100 },
  { name: 'Thokar Niaz Baig', address: 'Thokar Niaz Baig Interchange, Lahore', lat: 31.4700, lng: 74.2400 },
  { name: 'Thokar', address: 'Thokar Niaz Baig Interchange, Lahore', lat: 31.4700, lng: 74.2400 },
  { name: 'Sabzazar', address: 'Sabzazar Scheme, Multan Road, Lahore', lat: 31.5160, lng: 74.2620 },
  { name: 'Askari 10', address: 'Askari 10 Sector A, Lahore Cantt', lat: 31.5120, lng: 74.4100 },
  { name: 'Askari 11', address: 'Askari 11, Bedian Road, Lahore', lat: 31.4700, lng: 74.4500 },
  { name: 'Chauburji', address: 'Chauburji Chowk, Multan Road, Lahore', lat: 31.5540, lng: 74.3050 },
  { name: 'Mughalpura', address: 'Mughalpura Railway Colony, Lahore', lat: 31.5720, lng: 74.3790 },
  { name: 'Dharampura', address: 'Dharampura, Canal Bank Road, Lahore', lat: 31.5560, lng: 74.3630 },
  { name: 'Islampura', address: 'Islampura, Krishan Nagar, Lahore', lat: 31.5620, lng: 74.2980 },
  { name: 'Shahdara', address: 'Shahdara Town, GT Road, Lahore', lat: 31.6210, lng: 74.2800 },
  { name: 'Raiwind', address: 'Raiwind City, Raiwind Road, Lahore', lat: 31.2500, lng: 74.2150 },
  { name: 'Azimabad', address: 'Azimabad, Multan Road, Lahore', lat: 31.4600, lng: 74.2380 },
  { name: 'Azeemabad', address: 'Azimabad, Multan Road, Lahore', lat: 31.4600, lng: 74.2380 },
  { name: 'Azeem Abad', address: 'Azimabad, Multan Road, Lahore', lat: 31.4600, lng: 74.2380 },
  { name: 'Central Facility Operations Complex', address: 'Central Facility Operations Complex, Lahore', lat: 31.5204, lng: 74.3587 },
  { name: 'Central Operations', address: 'Central Facility Operations Complex, Lahore', lat: 31.5204, lng: 74.3587 },
  { name: 'Islamabad F-6', address: 'Sector F-6, Super Market, Islamabad', lat: 33.7294, lng: 73.0760 },
  { name: 'Islamabad F-7', address: 'Sector F-7, Jinnah Super, Islamabad', lat: 33.7200, lng: 73.0560 },
  { name: 'Islamabad Blue Area', address: 'Blue Area Commercial Corridor, Islamabad', lat: 33.7120, lng: 73.0650 },
  { name: 'Rawalpindi Saddar', address: 'Saddar Bazar, Rawalpindi Cantt', lat: 33.5950, lng: 73.0550 },
  { name: 'Karachi Clifton', address: 'Clifton Block 2 & 5, Karachi', lat: 24.8140, lng: 67.0300 },
  { name: 'Karachi DHA', address: 'DHA Phase 5 & 6, Karachi', lat: 24.8050, lng: 67.0650 },
];

/**
 * Normalizes address strings for typo-tolerant matching
 */
export function normalizeAddressQuery(str: string): string {
  return str
    .toLowerCase()
    .replace(/[.,;:!?#/-]+/g, ' ')
    .replace(/\btowm\b/g, 'town')
    .replace(/\bsoceity\b|\bsocirty\b/g, 'society')
    .replace(/\bhosptial\b|\bhospitl\b/g, 'hospital')
    .replace(/\bhostle\b/g, 'hostel')
    .replace(/\blahor\b/g, 'lahore')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fast synchronous preset lookup with typo and token matching
 */
export function findPresetMatch(query: string): LocationMatch | null {
  const cleanQ = (query || '').trim();
  if (!cleanQ || cleanQ.length < 2) return null;

  const qNorm = normalizeAddressQuery(cleanQ);
  const segments = cleanQ.split(',').map((s) => normalizeAddressQuery(s)).filter(Boolean);

  // 1. Direct or partial match on normalized text
  for (const loc of PRESET_LOCATIONS) {
    const nNorm = normalizeAddressQuery(loc.name);
    const aNorm = normalizeAddressQuery(loc.address);
    if (qNorm === nNorm || qNorm.includes(nNorm) || nNorm.includes(qNorm) || qNorm.includes(aNorm)) {
      return { name: loc.name, address: loc.address, lat: loc.lat, lng: loc.lng };
    }
  }

  // 2. Segment match in PRESET_LOCATIONS
  for (const seg of segments) {
    if (seg.length < 3) continue;
    for (const loc of PRESET_LOCATIONS) {
      const nNorm = normalizeAddressQuery(loc.name);
      if (seg === nNorm || seg.includes(nNorm) || nNorm.includes(seg)) {
        return { name: loc.name, address: loc.address, lat: loc.lat, lng: loc.lng };
      }
    }
  }

  // 3. Keyword / token match for key neighborhoods
  const keywords: Array<{ name: string; keys: string[]; lat: number; lng: number }> = [
    { name: 'Ali Town', keys: ['ali town', 'ali towm'], lat: 31.4620, lng: 74.2458 },
    { name: 'Canal View', keys: ['canal view', 'canalview'], lat: 31.4880, lng: 74.2480 },
    { name: 'Muslim Town', keys: ['muslim town', 'crystal boys'], lat: 31.5104, lng: 74.3068 },
    { name: 'Wahdat Colony', keys: ['wahdat'], lat: 31.5060, lng: 74.2980 },
    { name: 'Johar Town', keys: ['johar town', 'johar'], lat: 31.4697, lng: 74.2728 },
    { name: 'Emporium Mall', keys: ['emporium'], lat: 31.4678, lng: 74.2662 },
    { name: 'Lahore Expo Centre', keys: ['expo centre', 'expo center'], lat: 31.4655, lng: 74.2640 },
    { name: 'Azimabad', keys: ['azimabad', 'azeemabad', 'azeem abad'], lat: 31.4600, lng: 74.2380 },
    { name: 'Thokar Niaz Baig', keys: ['thokar'], lat: 31.4700, lng: 74.2400 },
    { name: 'Gulberg', keys: ['gulberg'], lat: 31.5126, lng: 74.3465 },
    { name: 'Model Town', keys: ['model town'], lat: 31.4883, lng: 74.3216 },
    { name: 'DHA Phase 6', keys: ['dha phase 6'], lat: 31.4550, lng: 74.4420 },
    { name: 'DHA Phase 5', keys: ['dha phase 5', 'dha'], lat: 31.4650, lng: 74.4050 },
    { name: 'Wapda Town', keys: ['wapda town', 'wapda'], lat: 31.4350, lng: 74.2650 },
    { name: 'Valencia', keys: ['valencia'], lat: 31.4150, lng: 74.2600 },
    { name: 'Bahria Town', keys: ['bahria'], lat: 31.3650, lng: 74.1800 },
    { name: 'Allama Iqbal Town', keys: ['iqbal town'], lat: 31.5150, lng: 74.2850 },
    { name: 'Cavalry Ground', keys: ['cantt', 'cavalry'], lat: 31.5050, lng: 74.3750 },
    { name: 'Lake City', keys: ['lake city'], lat: 31.3800, lng: 74.2500 },
    { name: 'Garden Town', keys: ['garden town', 'barkat market'], lat: 31.5020, lng: 74.3280 },
    { name: 'Township', keys: ['township'], lat: 31.4550, lng: 74.3050 },
    { name: 'Central Operations Complex', keys: ['central facility', 'central operations'], lat: 31.5204, lng: 74.3587 },
  ];

  for (const item of keywords) {
    if (item.keys.some((k) => qNorm.includes(k))) {
      return { name: item.name, address: cleanQ, lat: item.lat, lng: item.lng };
    }
  }

  return null;
}

/**
 * Resilient multi-provider forward geocoding (Presets -> Photon with progressive sub-queries -> Nominatim)
 */
export async function forwardGeocodeAddress(query: string): Promise<LocationMatch | null> {
  const cleanQ = query.trim();
  if (!cleanQ || cleanQ.length < 2) return null;

  // 1. Direct or fuzzy preset lookup (instant, offline-reliable, typo-tolerant)
  const presetMatch = findPresetMatch(cleanQ);
  if (presetMatch) {
    return presetMatch;
  }

  const segments = cleanQ.split(',').map((s) => s.trim()).filter(Boolean);

  // 2. Build progressive candidates (e.g. ["Crystal Boys Hostel, Muslim Town, Lahore", "Muslim Town, Lahore"])
  const candidates: string[] = [];
  const fullQ = cleanQ.toLowerCase().includes('lahore') ? cleanQ : `${cleanQ}, Lahore`;
  candidates.push(fullQ);

  if (segments.length > 1) {
    for (let i = 1; i < segments.length; i++) {
      const sub = segments.slice(i).join(', ');
      const subFormatted = sub.toLowerCase().includes('lahore') ? sub : `${sub}, Lahore`;
      if (!candidates.includes(subFormatted)) {
        candidates.push(subFormatted);
      }
    }
  }

  // 3. Query Photon with candidates (with 3s timeout)
  for (const candidate of candidates) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(candidate)}&limit=1`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        const first = data?.features?.[0];
        if (first && first.geometry?.coordinates) {
          const [lon, lat] = first.geometry.coordinates;
          const props = first.properties || {};
          const address = [props.street, props.district || props.locality, props.city, props.country].filter(Boolean).join(', ') || cleanQ;
          return { name: cleanQ, address, lat, lng: lon };
        }
      }
    } catch (_) {}
  }

  // 4. Query Nominatim OpenStreetMap fallback with candidates (with 3s timeout)
  for (const candidate of candidates) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(candidate)}&limit=1&accept-language=en`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
      if (res.ok) {
        const results = await res.json();
        if (Array.isArray(results) && results.length > 0) {
          const found = results[0];
          const lat = parseFloat(found.lat);
          const lng = parseFloat(found.lon);
          const resolvedAddr = found.display_name.split(',').slice(0, 4).join(',').trim();
          return { name: cleanQ, address: resolvedAddr, lat, lng };
        }
      }
    } catch (_) {}
  }

  return null;
}

/**
 * Multi-provider reverse geocoding with resilient cascade (Photon -> Nominatim -> BigDataCloud)
 */
export async function reverseGeocodeCoords(lat: number, lng: number): Promise<string> {
  // Strategy 1: Photon reverse geocoding
  try {
    const res = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`, {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      const props = data?.features?.[0]?.properties;
      if (props) {
        const parts = [
          props.name || props.street,
          props.street && props.name !== props.street ? props.street : null,
          props.locality || props.district,
          props.city,
          props.state,
          props.country,
        ].filter(Boolean);
        const unique = parts.filter((p, i) => parts.indexOf(p) === i);
        if (unique.length > 0) {
          return unique.slice(0, 4).join(', ');
        }
      }
    }
  } catch (err) {
    console.warn('Photon reverse geocode error, trying Nominatim...', err);
  }

  // Strategy 2: Nominatim with English localization
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.display_name) {
        const clean = data.display_name.split(',').slice(0, 4).join(',').trim();
        if (clean) return clean;
      }
    }
  } catch (err) {
    console.warn('Nominatim reverse geocode error, trying BigDataCloud...', err);
  }

  // Strategy 3: BigDataCloud client reverse geocode
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    );
    if (res.ok) {
      const data = await res.json();
      const informative = data?.localityInfo?.informative || [];
      const localName = informative[informative.length - 1]?.name;
      const parts = [
        localName,
        data.locality,
        data.city,
        data.principalSubdivision,
        data.countryName,
      ].filter(Boolean);
      const unique = parts.filter((p, i) => parts.indexOf(p) === i);
      if (unique.length > 0) {
        return unique.slice(0, 4).join(', ');
      }
    }
  } catch (err) {
    console.warn('BigDataCloud reverse geocode error', err);
  }

  return `Service Site (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
}

/**
 * Resolves an address string (e.g. from user profile) into coordinates and formatted address
 */
export async function resolveAddressCoordinates(address: string, city?: string): Promise<{ lat: number; lng: number; address: string } | null> {
  const clean = (address || '').trim();
  if (!clean) return null;

  const fullQuery = city && !clean.toLowerCase().includes(city.toLowerCase()) ? `${clean}, ${city}` : clean;
  const match = await forwardGeocodeAddress(fullQuery);
  if (match) {
    return { lat: match.lat, lng: match.lng, address: clean };
  }

  return null;
}

/**
 * Helper to synchronously or asynchronously extract the user's default location from profile & storage
 */
export function getSavedUserProfileLocation(user?: any): { address: string; lat: number; lng: number } {
  let savedUser = user;
  const hasStorage = typeof localStorage !== 'undefined';
  if (!savedUser && hasStorage) {
    try {
      const raw = localStorage.getItem('clearflow_user');
      if (raw) savedUser = JSON.parse(raw);
    } catch {}
  }

  const userKey = String(savedUser?._id || savedUser?.id || savedUser?.email || '').toLowerCase().trim();
  const userScopedAddr = (hasStorage && userKey) ? (localStorage.getItem(`clearflow_user_profile_address_${userKey}`) || '').trim() : '';
  const generalCachedAddr = hasStorage ? (localStorage.getItem('clearflow_user_profile_address') || '').trim() : '';
  const userAddr = (savedUser?.address || '').trim();

  // Primary address is the user's explicit profile address, followed by scoped storage, then general storage
  const profileAddress = userAddr || userScopedAddr || generalCachedAddr;

  // Check if profile address matches a preset location (including fuzzy and typo matching)
  const preset = profileAddress ? findPresetMatch(profileAddress) : null;

  const userScopedLat = (hasStorage && userKey) ? localStorage.getItem(`clearflow_user_profile_lat_${userKey}`) : null;
  const userScopedLng = (hasStorage && userKey) ? localStorage.getItem(`clearflow_user_profile_lng_${userKey}`) : null;

  let lat = Number(
    preset?.lat ??
    savedUser?.locationLat ??
    savedUser?.lat ??
    (userScopedLat ? Number(userScopedLat) : null) ??
    (hasStorage ? localStorage.getItem('clearflow_user_profile_lat') : null)
  );
  let lng = Number(
    preset?.lng ??
    savedUser?.locationLng ??
    savedUser?.lng ??
    (userScopedLng ? Number(userScopedLng) : null) ??
    (hasStorage ? localStorage.getItem('clearflow_user_profile_lng') : null)
  );

  // If user address matches a verified preset location, enforce verified preset coordinates
  if (preset) {
    lat = preset.lat;
    lng = preset.lng;
    if (hasStorage) {
      try {
        if (userKey) {
          localStorage.setItem(`clearflow_user_profile_address_${userKey}`, profileAddress);
          localStorage.setItem(`clearflow_user_profile_lat_${userKey}`, String(lat));
          localStorage.setItem(`clearflow_user_profile_lng_${userKey}`, String(lng));
        }
        localStorage.setItem('clearflow_user_profile_address', profileAddress);
        localStorage.setItem('clearflow_user_profile_lat', String(lat));
        localStorage.setItem('clearflow_user_profile_lng', String(lng));
      } catch {}
    }
  } else if ((isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) && profileAddress) {
    const fallbackMatch = findPresetMatch(profileAddress);
    if (fallbackMatch) {
      lat = fallbackMatch.lat;
      lng = fallbackMatch.lng;
      if (hasStorage) {
        try {
          if (userKey) {
            localStorage.setItem(`clearflow_user_profile_address_${userKey}`, profileAddress);
            localStorage.setItem(`clearflow_user_profile_lat_${userKey}`, String(lat));
            localStorage.setItem(`clearflow_user_profile_lng_${userKey}`, String(lng));
          }
          localStorage.setItem('clearflow_user_profile_address', profileAddress);
          localStorage.setItem('clearflow_user_profile_lat', String(lat));
          localStorage.setItem('clearflow_user_profile_lng', String(lng));
        } catch {}
      }
    }
  }

  // Determine fallback by role if no address or coordinates exist
  const userRole = (savedUser?.role || '').toLowerCase();
  const isAdmin = userRole === 'admin';
  const isWorker = userRole === 'fieldteam' || userRole === 'field_team' || userRole === 'field-team' || userRole === 'field' || userRole === 'worker';

  const defaultLat = isAdmin ? 31.5204 : isWorker ? 31.4880 : 31.5104;
  const defaultLng = isAdmin ? 74.3587 : isWorker ? 74.2480 : 74.3068;
  const defaultAddr = isAdmin
    ? 'Central Facility Operations Complex, Lahore'
    : isWorker
    ? 'Canal View Field Base, Lahore'
    : 'Registered Service Site, Lahore';

  return {
    address: profileAddress || defaultAddr,
    lat: !isNaN(lat) && lat !== 0 ? lat : defaultLat,
    lng: !isNaN(lng) && lng !== 0 ? lng : defaultLng,
  };
}
