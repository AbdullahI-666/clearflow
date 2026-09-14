export const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const toRadian = (angle: number) => (Math.PI / 180) * angle;
  const earthRadiusKm = 6371;

  const dLat = toRadian(lat2 - lat1);
  const dLon = toRadian(lon2 - lon1);

  lat1 = toRadian(lat1);
  lat2 = toRadian(lat2);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
};
