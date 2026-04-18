import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, useMapEvents, useMap, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, Loader2 } from 'lucide-react';

interface YandexStoreMapProps {
  center: L.LatLng;
  onPositionChange: (pos: L.LatLng, address?: string, region?: string) => void;
  height?: string;
}

// Sub-component to handle prop-based view updates
const ChangeView = ({ center }: { center: L.LatLng }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

// Sub-component to handle map click events
const MapController = ({ onMapClick }: { onMapClick: (pos: L.LatLng) => void }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    }
  });
  return null;
};

const YandexStoreMap: React.FC<YandexStoreMapProps> = ({ center, onPositionChange, height = "300px" }) => {
  const [isLocating, setIsLocating] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<string>("");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  const lastCenterRef = useRef<string>("");

  // Only refetch address when the actual center point changes from external selection
  useEffect(() => {
    const coordString = `${center.lat},${center.lng}`;
    if (lastCenterRef.current !== coordString) {
      lastCenterRef.current = coordString;
      fetchAddress(center.lat, center.lng).then(({ address, region }) => {
         onPositionChange(center, address, region);
      });
    }
  }, [center, onPositionChange]);

  const customIcon = useMemo(() => {
    return new L.DivIcon({
      className: 'bg-transparent border-none',
      html: `
        <div class="relative flex flex-col items-center animate-bounce-subtle ml-[-20px] mt-[-40px]">
           <div class="w-10 h-10 bg-[#FF7A00] rounded-full border-4 border-white shadow-lg flex items-center justify-center text-white">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
           </div>
           <div class="w-1 h-4 bg-[#FF7A00] -mt-1 shadow-sm"></div>
           <div class="w-4 h-1.5 bg-black/20 rounded-full blur-[2px] mt-0.5"></div>
        </div>
      `,
      iconSize: [40, 50],
      iconAnchor: [20, 50], // Bottom tip of the pin
    });
  }, []);

  const fetchAddress = async (lat: number, lng: number) => {
    setIsGeocoding(true);
    let regionName = "";
    try {
      // Primary: Yandex Geocoder (More accurate for Uzbekistan building numbers)
      const yandexResponse = await fetch(`https://geocode-maps.yandex.ru/1.x/?apikey=8f570068-9634-477c-a942-f826bd633620&geocode=${lng},${lat}&format=json&lang=uz_UZ`);
      if (yandexResponse.ok) {
        const data = await yandexResponse.json();
        const obj = data.response?.GeoObjectCollection?.featureMember[0]?.GeoObject;
        
        if (obj) {
          // Extract region from description or components
          regionName = obj.description?.split(',')[0]?.trim() || "";
          
          const fullAddress = obj.metaDataProperty?.GeocoderMetaData?.text || obj.name;
          if (fullAddress) {
            const normalized = fullAddress.replace(/, (\d+)$/, ', $1-uy');
            setCurrentAddress(normalized);
            return { address: normalized, region: regionName };
          }
        }
      }

      // Secondary Fallback: Nominatim (OpenStreetMap)
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=uz,ru,en`);
      const data = await response.json();
      
      if (data && data.address) {
        const addr = data.address;
        regionName = addr.state || addr.province || addr.region || "";
        const parts = [];
        const district = addr.city_district || addr.district || addr.county || addr.city;
        if (district) parts.push(district);
        const street = addr.road || addr.street || addr.pedestrian;
        if (street) parts.push(street);
        const houseNumber = addr.house_number || addr.building || addr.housenumber;
        if (houseNumber) parts.push(houseNumber + "-uy");
        const formattedAddress = parts.length > 0 ? parts.join(', ') : data.display_name;
        setCurrentAddress(formattedAddress);
        return { address: formattedAddress, region: regionName };
      }
    } catch (error) {
      console.error("Reverse geocoding error:", error);
    } finally {
      setIsGeocoding(false);
    }
    return { address: "", region: "" };
  };

  const handlePositionChange = useCallback(async (newPos: L.LatLng) => {
    const { address, region } = await fetchAddress(newPos.lat, newPos.lng);
    onPositionChange(newPos, address, region);
  }, [onPositionChange]);

  const handleMyLocation = () => {
    setIsLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const newPos = new L.LatLng(latitude, longitude);
          onPositionChange(newPos);
          if (mapRef.current) {
            mapRef.current.setView(newPos, 16);
          }
          setIsLocating(false);
        },
        (error) => {
          console.error("Geolocation error:", error);
          setIsLocating(false);
        }
      );
    } else {
      setIsLocating(false);
    }
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-inner group" style={{ height }}>
      <MapContainer
        center={center}
        zoom={16}
        crs={L.CRS.EPSG3395}
        className="h-full w-full"
        zoomControl={false}
        ref={(map) => { mapRef.current = map; }}
      >
        <ChangeView center={center} />
        <TileLayer
          attribution='&copy; Yandex Maps'
          url="https://core-renderer-tiles.maps.yandex.net/tiles?l=map&x={x}&y={y}&z={z}&lang=ru_RU"
        />
        <MapController onMapClick={(pos) => handlePositionChange(pos)} />
        
        <Marker 
          position={center} 
          icon={customIcon} 
          draggable={true} 
          eventHandlers={{
            dragend: (e) => {
              const marker = e.target;
              // Reset the last center ref so the address fetches normally without loop block
              const newPos = marker.getLatLng();
              lastCenterRef.current = `${newPos.lat},${newPos.lng}`;
              handlePositionChange(newPos);
            }
          }}
        />
      </MapContainer>

      {/* Geocoding Status */}
      {isGeocoding && (
        <div className="absolute bottom-4 left-4 right-4 bg-white/80 backdrop-blur-md px-4 py-2 rounded-xl text-[11px] font-bold text-slate-700 flex items-center gap-2 shadow-sm border border-white/50 z-[400] animate-in fade-in slide-in-from-bottom-2">
          <Loader2 size={14} className="animate-spin text-[#FF7A00]" />
          Manzil aniqlanmoqda...
        </div>
      )}

      {/* My Location Button */}
      <button
        type="button"
        onClick={handleMyLocation}
        className="absolute top-4 right-4 bg-white hover:bg-slate-50 text-slate-700 p-2.5 rounded-xl shadow-lg border border-slate-100 transition-all active:scale-95 group/btn z-[400]"
        title="Mening joylashuvim"
      >
        {isLocating ? (
          <Loader2 size={20} className="animate-spin text-[#FF7A00]" />
        ) : (
          <Navigation size={20} className="group-hover/btn:text-[#FF7A00] transition-colors" />
        )}
      </button>

      {/* Address Tooltip (Optional) */}
      {!isGeocoding && currentAddress && (
         <div className="absolute top-4 left-4 max-w-[200px] bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-900 shadow-sm border border-white/50 z-[400] truncate animate-in fade-in">
           {currentAddress}
         </div>
      )}
      
      <style>{`
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default YandexStoreMap;
