import { useState, useEffect } from 'react';
import { Search, Bell, Store } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';

interface StoreItem {
  id: string;
  name: string;
}

const Navbar = () => {
  const { user, activeStore, setActiveStore } = useAuth();
  const [stores, setStores] = useState<StoreItem[]>([]);

  useEffect(() => {
    if (user) {
      fetchStores();
    }
  }, [user]);

  const fetchStores = async () => {
    const { data } = await supabase.from('stores').select('id, name').order('name');
    if (data) setStores(data);
  };

  return (
    <header className="h-20 shrink-0 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-50 transition-all">
      <div className="flex items-center gap-6">
        <div className="flex items-center bg-bgSubtle rounded-xl px-4 py-2 w-96 focus-within:ring-2 ring-mustard/50 transition-all border border-transparent focus-within:border-mustard/30">
          <Search size={20} className="text-gray-400" />
          <input 
            type="text" 
            placeholder="Search products, orders, employees..." 
            className="bg-transparent border-none outline-none w-full ml-3 text-sm text-textMain placeholder-gray-400"
          />
        </div>

        {/* Store Indicator */}
        {user?.role === 'Owner' ? (
          <div className="flex items-center gap-2 bg-yellow-50 px-3 py-2 rounded-xl border border-yellow-100/50">
            <Store size={18} className="text-yellow-600" />
            <select 
              value={activeStore}
              onChange={(e) => setActiveStore(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-700 outline-none cursor-pointer pr-2"
              title="Aktiv filialni tanlang"
            >
              <option value="ALL">Barcha Filiallar (Global)</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
            <Store size={18} className="text-slate-500" />
            <span className="bg-transparent text-sm font-semibold text-slate-700 outline-none pr-2 select-none" title="Sizga biriktirilgan filial">
              {stores.find(s => s.id === user?.store_id)?.name || "Birlashtirilgan Tarmoq"}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-6">
        <button 
          title="Notifications" 
          aria-label="Notifications" 
          className="relative p-2 text-gray-400 hover:text-mustard transition-colors"
        >
          <Bell size={24} />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        
        <div className="flex items-center gap-3 pl-6 border-l border-gray-200 cursor-pointer hover:opacity-80 transition-opacity">
          <img src={`https://ui-avatars.com/api/?name=${user?.fullName}&background=FFC107&color=1E1E2D&bold=true`} alt="Profile" className="w-10 h-10 rounded-full" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold">{user?.fullName}</span>
            <span className="text-xs text-mustard border border-mustard/30 px-2 py-0.5 rounded-full inline-block mt-0.5 max-w-max bg-mustard/10 font-bold">
              {user?.role}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
