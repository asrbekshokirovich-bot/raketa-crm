import { useState, useEffect } from 'react';
import { Search, Bell, Loader2, Store, History, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { supabase } from '../services/supabase';

interface StoreItem {
  id: string;
  name: string;
}

const Navbar = () => {
  const { user, activeStore, setActiveStore } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, setIsHistoryOpen } = useNotifications();
  const [isFetching, setIsFetching] = useState(false);
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchStores();
      
      const channel = supabase
        .channel('stores_sync')
        .on(
          'postgres_changes', 
          { event: '*', schema: 'public', table: 'stores' }, 
          () => {
            fetchStores();
          }
        )
        .subscribe();
 
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);
 
  const fetchStores = async () => {
    setIsFetching(true);
    const { data } = await supabase.from('stores').select('id, name').order('name');
    if (data) setStores(data);
    setIsFetching(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
  };

  const isToday = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    return d.getDate() === today.getDate() &&
           d.getMonth() === today.getMonth() &&
           d.getFullYear() === today.getFullYear();
  };

  useEffect(() => {
    if (isNotifOpen && unreadCount > 0) {
      const timer = setTimeout(() => {
        markAllAsRead();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isNotifOpen, unreadCount]);

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
        {(user?.role === 'Owner' || user?.role === 'Admin') ? (
          <div className="flex items-center gap-2 bg-yellow-50 px-3 py-2 rounded-xl border border-yellow-100/50 transition-all duration-300">
            {isFetching ? <Loader2 size={18} className="text-yellow-600 animate-spin" /> : <Store size={18} className="text-yellow-600" />}
            <select 
              value={activeStore}
              onFocus={() => fetchStores()}
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
        {/* Notifications Bell */}
        <div className="relative">
          <button 
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2.5 text-slate-400 hover:text-mustard hover:bg-mustard/5 rounded-xl transition-all duration-200"
            title="Bildirishnomalar"
            aria-label="Bildirishnomalar"
          >
            <Bell size={24} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[10px] font-black min-w-[18px] h-[18px] flex items-center justify-center rounded-full border-2 border-white px-1 shadow-lg shadow-red-500/20 animate-in zoom-in">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {isNotifOpen && (
            <>
              <div 
                className="fixed inset-0 z-[-1]" 
                onClick={() => setIsNotifOpen(false)} 
              />
              <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200 z-[100] overflow-hidden">
                <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                  <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <Bell size={16} className="text-mustard" /> Bildirishnomalar
                  </h3>
                  <button 
                    onClick={() => {
                      setIsHistoryOpen(true);
                      setIsNotifOpen(false);
                    }}
                    className="text-[11px] font-black text-mustard bg-mustard/10 px-2 py-1 rounded-lg hover:bg-mustard hover:text-white transition-all flex items-center gap-1 uppercase tracking-wider"
                  >
                    <History size={12} /> Ko'proq
                  </button>
                </div>

                <div className="max-h-[360px] overflow-y-auto">
                  {notifications.length > 0 ? (
                    <div className="divide-y divide-slate-50">
                      {notifications.filter(n => isToday(n.created_at)).slice(0, 5).map((notif) => (
                        <div 
                          key={notif.id} 
                          onClick={() => {
                            markAsRead(notif.id);
                          }}
                          className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors relative group ${!notif.is_read ? 'bg-mustard/5' : ''}`}
                        >
                          {!notif.is_read && (
                            <span className="absolute right-4 top-4 bg-green-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter shadow-sm shadow-green-200">Yangi</span>
                          )}
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${!notif.is_read ? 'bg-mustard text-white' : 'bg-slate-100 text-slate-400'}`}>
                              <Clock size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-black text-slate-800 leading-tight">
                                {notif.order_number}
                              </p>
                              <p className="text-[11px] font-bold text-slate-400 mb-1">yangi buyurtma</p>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatDate(notif.created_at)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-12 text-center opacity-50">
                      <Bell size={40} className="mx-auto text-slate-200 mb-2" />
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Hozircha bo'sh</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
        
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
