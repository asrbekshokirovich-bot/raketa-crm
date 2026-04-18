import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { Plus, Store, MapPin, Phone, User as UserIcon, Loader2, Edit2, Trash2, XCircle, CheckCircle2, Map, Clock, ArrowRight, ChevronDown } from 'lucide-react';
import L from 'leaflet';
import StoreDashboard from '../components/StoreDashboard';
import YandexStoreMap from '../components/YandexStoreMap';
import { useAuth } from '../context/AuthContext';

// Fix leaflet marker internal paths
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

interface StoreType {
  id: string;
  name: string;
  address: string;
  manager_name: string;
  manager_phone: string;
  status: 'Active' | 'Inactive' | '24/7';
  location?: string | null;
  image_url?: string | null;
  created_at: string;
}

const regionCoordinates: { [key: string]: [number, number] } = {
  'Toshkent sh.': [41.311081, 69.240562],
  'Toshkent vil.': [41.2291, 69.2227],
  'Samarqand': [39.65417, 66.95972],
  'Buxoro': [39.77472, 64.42861],
  'Farg\'ona': [40.38444, 71.78444],
  'Namangan': [41.00111, 71.66833],
  'Andijon': [40.78333, 72.33333],
  'Qashqadaryo': [38.86111, 65.78917],
  'Surxondaryo': [37.22417, 67.27833],
  'Navoiy': [40.10306, 65.37361],
  'Jizzax': [40.11583, 67.84222],
  'Sirdaryo': [40.48972, 68.78417],
  'Xorazm': [41.37833, 60.36389],
  'Qoraqalpog\'iston': [42.45333, 59.61028],
};

const Stores = () => {
  const { user } = useAuth();
  const [stores, setStores] = useState<StoreType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreType | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [storeToDelete, setStoreToDelete] = useState<string | null>(null);
  const isOwner = user?.role === 'Owner' || user?.role === 'Admin';
  const isManager = user?.role === 'Manager';
  const isSotuvchiYokiOmborchi = user?.role === 'Omborchi' || user?.role === 'Sotuvchi';
  
  // Form State
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive' | '24/7'>('Active');
  const [location, setLocation] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [isRegionDropdownOpen, setIsRegionDropdownOpen] = useState(false);
  const [mapPosition, setMapPosition] = useState<L.LatLng>(new L.LatLng(41.311081, 69.240562));
  
  // Ref for closing custom dropdown on outside click
  const regionDropdownRef = useRef<HTMLDivElement>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchStores();
  }, []);

-

  // Sync map click with location text
  useEffect(() => {
    if (mapPosition) {
      // Round to 6 decimal places (approx. 11cm accuracy) to match professional app standards
      const lat = mapPosition.lat.toFixed(6);
      const lng = mapPosition.lng.toFixed(6);
      setLocation(`${lat},${lng}`);
    }
  }, [mapPosition]);

  // Mapping geocoded regions to dropdown keys
  const matchRegion = (geocodedRegion: string): string => {
    if (!geocodedRegion) return '';
    const r = geocodedRegion.toLowerCase();
    
    if (r.includes('tashkent') || r.includes('toshkent')) {
      if (r.includes('shahar') || r.includes('город') || r.includes('city') || r.includes('sh.')) return 'Toshkent sh.';
      return 'Toshkent vil.';
    }
    if (r.includes('samarqand')) return 'Samarqand';
    if (r.includes('buxoro')) return 'Buxoro';
    if (r.includes('andijon')) return 'Andijon';
    if (r.includes('farg')) return "Farg'ona";
    if (r.includes('namangan')) return 'Namangan';
    if (r.includes('navoiy')) return 'Navoiy';
    if (r.includes('qashqadaryo')) return 'Qashqadaryo';
    if (r.includes('surxondaryo')) return 'Surxondaryo';
    if (r.includes('jizzax')) return 'Jizzax';
    if (r.includes('sirdaryo')) return 'Sirdaryo';
    if (r.includes('xorazm')) return 'Xorazm';
    if (r.includes('qoraqalpog')) return "Qoraqalpog'iston";
    
    return '';
  };

  const handleMapPositionChange = useCallback((pos: L.LatLng, geocodedAddress?: string, region?: string) => {
    setMapPosition(pos);
    if (geocodedAddress) {
      setAddress(geocodedAddress);
    }
    
    if (region) {
      const matched = matchRegion(region);
      if (matched) {
        setSelectedRegion(matched);
      }
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (regionDropdownRef.current && !regionDropdownRef.current.contains(event.target as Node)) {
        setIsRegionDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchStores = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      if (data) setStores(data as StoreType[]);
    } catch (err) {
      console.error('Error fetching stores:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setAddress('');
    setStatus('Active');
    setLocation('');
    setSelectedRegion('');
    setMapPosition(new L.LatLng(41.311081, 69.240562));
    setEditingStore(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    // Default to Tashkent coordinates on open add
    setMapPosition(new L.LatLng(41.311081, 69.240562));
    setIsModalOpen(true);
  };

  const handleOpenEdit = (store: StoreType) => {
    setEditingStore(store);
    setName(store.name);
    setAddress(store.address);

    setStatus(store.status);
    setLocation(store.location || '');
    
    // Parse map position if valid coordinates
    if (store.location && store.location.includes(',')) {
      const parts = store.location.split(',');
      if (parts.length === 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) {
        setMapPosition(new L.LatLng(Number(parts[0]), Number(parts[1])));
      } else {
        setMapPosition(new L.LatLng(41.311081, 69.240562));
      }
    } else {
      setMapPosition(new L.LatLng(41.311081, 69.240562));
    }

    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) return;
    
    setIsSubmitting(true);
    try {
      const storeData = {
        name, 
        address, 
        status,
        location: location.trim() || null,
        image_url: null, // We no longer use images for stores, only icons
        manager_name: "Biriktirilmagan",
        manager_phone: ""
      };

      if (editingStore) {
        const { error } = await supabase
          .from('stores')
          .update(storeData)
          .eq('id', editingStore.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('stores')
          .insert([storeData])
          .select()
          .single();
        if (error) throw error;
      }
      
      // (Manager assignment is handled independently now via Admins.tsx)
      
      setIsModalOpen(false);
      fetchStores();
    } catch (err: any) {
      console.error('Error saving store:', err);
      alert("Do'konni saqlashda xatolik yuz berdi:\n" + (err.message || JSON.stringify(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    setStoreToDelete(id);
  };

  const confirmDelete = async () => {
    if (!storeToDelete) return;
    try {
      setIsSubmitting(true);
      
      // 1. Clear any product listings associated with this store
      await supabase
        .from('product_listings')
        .delete()
        .eq('store_id', storeToDelete);
      
      // 2. Clear any employee associations (profiles) with this store to avoid FK errors
      await supabase
        .from('profiles')
        .update({ store_id: null })
        .eq('store_id', storeToDelete);

      // 3. Now delete the store itself from Supabase
      const { error } = await supabase.from('stores').delete().eq('id', storeToDelete);
      if (error) throw error;
      
      setStoreToDelete(null);
      fetchStores();
    } catch (err: any) {
      console.error('Error deleting store:', err);
      alert("O'chirishda xatolik yuz berdi:\n" + (err.message || JSON.stringify(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (selectedStoreId) {
    return <StoreDashboard storeId={selectedStoreId} onBack={() => setSelectedStoreId(null)} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            Do'konlar (Filiallar)
            <span className="bg-slate-100 text-slate-500 text-sm font-bold px-3 py-1 rounded-lg">
              {stores.length} ta
            </span>
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Barcha savdo shoxobchalari hamda filiallarni boshqarish paneli
          </p>
        </div>
        {!isSotuvchiYokiOmborchi && isOwner && (
          <button
            onClick={handleOpenAdd}
            className="bg-mustard text-sidebarDark font-bold px-5 py-2.5 rounded-xl hover:bg-yellow-500 transition-all flex items-center gap-2 shadow-sm shadow-yellow-400/20 active:scale-95"
          >
            <Plus size={20} />
            Yangi Do'kon
          </button>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 size={40} className="mb-4 animate-spin text-mustard" />
          <p className="text-sm font-semibold animate-pulse text-slate-500">Filiallar yuklanmoqda...</p>
        </div>
      ) : stores.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {stores.map((store, index) => {
            const isAssignedStore = store.id === user?.store_id;
            const isRestrictedAndAssigned = isSotuvchiYokiOmborchi && isAssignedStore;
            const isRestrictedAndNotAssigned = isSotuvchiYokiOmborchi && !isAssignedStore;

            return (
            <div key={store.id} className={`rounded-[24px] p-5 shadow-sm border transition-all hover:shadow-md hover:border-slate-200 group flex flex-col h-full relative overflow-hidden ${
              isRestrictedAndAssigned ? 'bg-green-50 border-green-300' :
              isRestrictedAndNotAssigned ? 'bg-slate-50 opacity-70 grayscale-[30%] border-slate-100/60' :
              'bg-white border-slate-100/60'
            }`}>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-mustard to-yellow-300 transform origin-left transition-transform group-hover:scale-x-100" />
              
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-sidebarDark/5 text-sidebarDark flex items-center justify-center shrink-0 border border-slate-100 shadow-sm">
                    <Store size={24} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg leading-tight">{store.name}</h3>
                    <span className={`inline-flex items-center px-2 py-0.5 mt-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                      store.status === 'Active' ? 'bg-green-100 text-green-600' : 
                      store.status === '24/7' ? 'bg-blue-100 text-blue-600' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {store.status === 'Active' ? 'Faol Do\'kon' : store.status === '24/7' ? 'Hardoyim Ochiq (24/7)' : 'Faol Emas'}
                    </span>
                  </div>
                </div>
                <div className="text-slate-300 group-hover:text-slate-400 font-black text-xl px-2">
                  #{index + 1}
                </div>
              </div>

              <div className="space-y-3 mb-6 flex-1">
                <div className="flex items-start gap-2.5">
                  <MapPin size={16} className="text-slate-400 mt-0.5 shrink-0" />
                  <span className="text-sm text-slate-600 font-medium leading-snug">{store.address}</span>
                </div>
                {store.location && (
                  <div className="flex items-start gap-2.5">
                    <Map size={16} className="text-slate-400 mt-0.5 shrink-0" />
                    {store.location.includes(',') && !isNaN(Number(store.location.split(',')[0])) ? (
                      <a href={`https://yandex.ru/maps/?pt=${store.location.split(',')[1]},${store.location.split(',')[0]}&z=16`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline font-medium truncate max-w-full block">
                        Xaritada ko'rish
                      </a>
                    ) : (
                      <a href={store.location} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline font-medium truncate max-w-full block">
                        Lokatsiya havolasi
                      </a>
                    )}
                  </div>
                )}
                {store.manager_name ? (
                  <>
                    <div className="flex items-center gap-2.5">
                      <UserIcon size={16} className="text-slate-400 shrink-0" />
                      <span className="text-sm text-slate-700 font-bold">{store.manager_name}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Phone size={16} className="text-slate-400 shrink-0" />
                      <span className="text-sm text-slate-600 font-medium">{store.manager_phone}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2.5 p-2 bg-red-50 rounded-lg border border-red-100">
                    <UserIcon size={16} className="text-red-400 shrink-0" />
                    <span className="text-xs text-red-600 font-bold">Menejer biriktirilmagan</span>
                  </div>
                )}

              </div>

              {!isSotuvchiYokiOmborchi && (
                <div className="flex gap-2 mt-auto border-t border-slate-200/50 pt-4">
                  {(isOwner || (isManager && store.id === user?.store_id)) && (
                    <button
                      onClick={() => setSelectedStoreId(store.id)}
                      className="flex-[2] py-2.5 bg-mustard/10 text-yellow-700 font-bold text-xs rounded-xl hover:bg-mustard hover:text-sidebarDark transition-all flex items-center justify-center gap-2 group/btn"
                      title="Do'kon ichiga kirish"
                    >
                      Do'konga Kirish <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                  )}
                  {isOwner && (
                    <div className="flex flex-1 gap-2">
                      <button
                        onClick={() => handleOpenEdit(store)}
                        className="flex-1 py-2.5 bg-slate-50 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors flex flex-col items-center justify-center"
                        title="Do'konni Tahrirlash"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(store.id)}
                        className="flex-1 py-2.5 flex flex-col items-center justify-center bg-red-50 text-red-500 font-bold text-xs rounded-xl hover:bg-red-500 hover:text-white transition-colors"
                        title="Do'konni O'chirish"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-200 text-center flex flex-col items-center justify-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <Store size={36} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Do'konlar mavjud emas</h3>
          <p className="text-sm text-slate-500 max-w-sm mb-6">Hali tizimga hech qanday do'kon (filial) qo'shilmagan. Yangi do'kon qo'shish orqali infratuzilmani yarating.</p>
          {!isSotuvchiYokiOmborchi && isOwner && (
            <button
              onClick={handleOpenAdd}
              className="bg-mustard text-sidebarDark font-bold px-6 py-3 rounded-xl hover:bg-yellow-500 transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
              title="Yangi do'kon qo'shish"
            >
              <Plus size={18} /> Birinchi do'konni yaratish
            </button>
          )}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden scale-in-center transition-transform relative flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{editingStore ? "Do'konni tahrirlash" : "Yangi do'kon qo'shish"}</h2>
                <p className="text-xs text-slate-500 font-medium mt-1">Filial ma'lumotlarini to'liq va aniq yozing.</p>
              </div>
              <button title="Yopish" type="button" onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-5">
                
                <div className="flex gap-4 items-center">
                  <div className="shrink-0 w-24 h-24 rounded-2xl border border-slate-100 bg-slate-50 flex flex-col items-center justify-center transition-colors overflow-hidden relative group">
                    <Store size={32} className="text-sidebarDark" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mt-1">DOKON</span>
                  </div>
                  
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-1.5 ml-1">Do'kon Nomi / Filial nomi</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-mustard/30 focus:border-mustard outline-none transition-all font-bold text-sm bg-slate-50 focus:bg-white"
                      placeholder="Masalan: Maksim Gorkiy filiali"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-1.5 ml-1">To'liq Manzili</label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-mustard/30 focus:border-mustard outline-none transition-all font-bold text-sm bg-slate-50 focus:bg-white"
                    placeholder="Toshkent sh., M. Ulug'bek tumani, 11-uy..."
                  />
                </div>

                <div className="space-y-4">
                  <div className="relative" ref={regionDropdownRef}>
                    <label className="block text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-1.5 ml-1 flex items-center justify-between">
                      <span>Viloyatni tanlang</span>
                      <span className="text-[10px] text-slate-400 font-normal lowercase">(Osonroq topish uchun)</span>
                    </label>
                    
                    <button
                      type="button"
                      onClick={() => setIsRegionDropdownOpen(!isRegionDropdownOpen)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 hover:border-blue-300 focus:ring-2 focus:ring-blue-500/30 outline-none transition-all font-medium text-sm bg-slate-50 hover:bg-white text-left flex items-center justify-between"
                    >
                      <span className={selectedRegion ? "text-slate-900" : "text-slate-400"}>
                        {selectedRegion || "Viloyatni tanlang..."}
                      </span>
                      <ChevronDown size={16} className={`text-slate-400 transition-transform ${isRegionDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isRegionDropdownOpen && (
                      <div className="absolute z-50 mt-2 w-full bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden py-1">
                        <div className="max-h-[180px] overflow-y-auto select-none custom-scrollbar">
                          {Object.keys(regionCoordinates).map(r => (
                            <button
                              key={r}
                              type="button"
                              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                                selectedRegion === r 
                                  ? 'bg-blue-50 text-blue-600 font-bold' 
                                  : 'text-slate-700 hover:bg-slate-50'
                              }`}
                              onClick={() => {
                                setSelectedRegion(r);
                                setIsRegionDropdownOpen(false);
                                if (regionCoordinates[r]) {
                                  const coords = regionCoordinates[r];
                                  setMapPosition(new L.LatLng(coords[0], coords[1]));
                                }
                              }}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-1.5 ml-1">Lokatsiya (Xaritadan tanlang)</label>
                    <input
                      type="text"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all font-medium text-sm bg-slate-50 focus:bg-white mb-2"
                      placeholder="Xaritadan bosing yoki koordinata kiriting..."
                    />
                    <div className="h-[200px] w-full mt-2 relative z-0">
                      <YandexStoreMap 
                        center={mapPosition || new L.LatLng(41.311081, 69.240562)}
                        onPositionChange={handleMapPositionChange}
                        height="200px"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50/70 border border-blue-100 p-4 rounded-[20px] flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-white border border-blue-100 text-blue-500 shadow-sm flex items-center justify-center shrink-0 mt-0.5">
                    <UserIcon size={20} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h4 className="text-[12px] font-black text-blue-900 uppercase tracking-widest mb-1">Menejer biriktirish</h4>
                    <p className="text-xs text-blue-800/80 font-bold leading-relaxed">
                      Do'kon tizimga qo'shilganidan so'ng, ushbu filial uchun menejerni "<b>Xodimlar</b>" bo'limiga o'tib tayinlashingiz mumkin. Bu oynada ma'lumot kiritilmaydi.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-1.5 ml-1">Holati</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setStatus('Active')}
                      className={`py-3 rounded-xl font-bold text-xs transition-all border-2 flex flex-col items-center justify-center gap-1 ${status === 'Active' ? 'border-green-500 bg-green-50 text-green-600 shadow-sm' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}
                    >
                      <div className={`w-2 h-2 rounded-full ${status === 'Active' ? 'bg-green-500' : 'bg-slate-300'}`} />
                      Ochiq (Faol)
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus('24/7')}
                      className={`py-3 rounded-xl font-bold text-xs transition-all border-2 flex flex-col items-center justify-center gap-1 ${status === '24/7' ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-sm' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}
                    >
                      <Clock size={14} className={status === '24/7' ? 'text-blue-500' : 'text-slate-300'} />
                      24/7 Ochiq
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus('Inactive')}
                      className={`py-3 rounded-xl font-bold text-xs transition-all border-2 flex flex-col items-center justify-center gap-1 ${status === 'Inactive' ? 'border-red-500 bg-red-50 text-red-600 shadow-sm' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}
                    >
                      <div className={`w-2 h-2 rounded-full ${status === 'Inactive' ? 'bg-red-500' : 'bg-slate-300'}`} />
                      Yopiq (Faol Emas)
                    </button>
                  </div>
                </div>

                <div className="pt-4 flex gap-3 pb-2">
                  <button
                    type="button"
                    title="Yopish"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 hover:-translate-y-0.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all text-sm"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="submit"
                    title="Do'konni Saqlash"
                    disabled={isSubmitting}
                    className="flex-1 py-3 rounded-xl hover:-translate-y-0.5 font-bold bg-mustard text-sidebarDark hover:bg-yellow-500 transition-all text-sm shadow-sm flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    {isSubmitting ? 'Saqlanmoqda...' : 'Saqlash'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {storeToDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center mb-4 mx-auto">
              <Trash2 size={24} />
            </div>
            <h3 className="text-xl font-bold text-center text-slate-800 mb-2">Do'konni o'chirish</h3>
            <p className="text-sm text-center text-slate-500 mb-6 px-4">
              Rostdan ham ushbu do'konni tizimdan o'chirmoqchimisiz? Ushbu do'konga tegishli buyurtmalar xarolasiga tushishi mumkin.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setStoreToDelete(null)}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
              >
                Bekor qilish
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors shadow-sm shadow-red-500/20"
              >
                O'chirish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stores;
