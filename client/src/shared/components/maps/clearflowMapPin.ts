import L from 'leaflet';

/**
 * Animated 3D Red Location Pin Map Marker
 * Features:
 * - Transparent PNG with red location pin (/icons/location-pin.png)
 * - Up-and-down 3D bobbing floating animation (@keyframes pinFloatBounce)
 * - Synchronized ground shadow contraction/expansion animation (@keyframes pinShadowPulse)
 * - Drop-shadow 3D effect
 * - Exact anchor tip alignment [21, 54] for precision GPS targeting across Client, Worker, and Admin portals
 */
export const createClearFlowPinIcon = (label?: string) => {
  return L.divIcon({
    className: 'clearflow-custom-marker',
    html: `
      <div style="transform: translate(-50%, -100%); background: transparent; border: none;" class="relative flex flex-col items-center pointer-events-auto select-none cursor-pointer">
        <img 
          src="/icons/location-pin.png" 
          alt="Location Pin" 
          style="width: 42px; height: 50px; object-fit: contain; animation: pinFloatBounce 1.2s ease-in-out infinite; filter: drop-shadow(0 6px 8px rgba(0, 0, 0, 0.3)); background: transparent; border: none;"
          class="relative z-10 select-none" 
        />
        <div 
          style="width: 18px; height: 6px; background: rgba(0, 0, 0, 0.35); border-radius: 9999px; filter: blur(1.5px); animation: pinShadowPulse 1.2s ease-in-out infinite; margin-top: -3px;"
          class="relative z-0"
        ></div>
        ${label && !label.toLowerCase().includes('my location') && !label.toLowerCase().includes('worker') && !label.toLowerCase().includes('client') ? `
          <div style="background: rgba(17, 24, 39, 0.9); backdrop-filter: blur(6px); border: 1px solid rgba(255, 255, 255, 0.2); color: #ffffff; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 6px; box-shadow: 0 4px 10px rgba(0,0,0,0.35); margin-top: 4px; white-space: nowrap;">
            ${label}
          </div>
        ` : ''}
      </div>
    `,
    iconSize: [42, 54],
    iconAnchor: [21, 54],
    popupAnchor: [0, -54],
  });
};

export const clearflowPinIcon = createClearFlowPinIcon();
