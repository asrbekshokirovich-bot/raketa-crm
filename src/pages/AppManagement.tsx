import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import BannersManager from '../components/BannersManager';
import AnnouncementsManager from '../components/AnnouncementsManager';
import ContactSettingsManager from '../components/ContactSettingsManager';
import RegionSettingsManager from '../components/RegionSettingsManager';
import PromosManager from '../components/PromosManager';
import DeliveryPricingManager from '../components/DeliveryPricingManager';
import { 
  Users, 
  Settings, 
  Image as ImageIcon, 
  Smartphone, 
  Search, 
  Filter, 
  MoreVertical, 
  Mail, 
  Phone, 
  Calendar,
  ShieldCheck,
  UserX,
  MapPin,
  Megaphone,
  Settings2,
  TicketPercent,
  Truck
} from 'lucide-react';

const AppManagement = () => {
  const [activeApp, setActiveApp] = useState<'customer' | 'courier'>('customer');
  const [activeTab, setActiveTab] = useState<string>('users');
  const [activeSettingTab, setActiveSettingTab] = useState<string>('banners');
  const [activePromoTab, setActivePromoTab] = useState<string>('coupons');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [activeApp, activeTab]);

  const fetchUsers = async () => {
    if (activeTab !== 'users') return;
    setLoading(true);
    try {
      const roleFilter = activeApp === 'customer' ? 'Mijoz' : 'Kuryer';
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('role', roleFilter)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Fetch error:', error);
        setUsers([]);
      } else {
        setUsers(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const customerTabs = [
    { id: 'users', name: 'Mijozlar', icon: <Users size={20} /> },
    { id: 'promos', name: 'Aksiya va Narxlar', icon: <TicketPercent size={20} /> },
    { id: 'settings', name: 'Sozlamalar', icon: <Settings size={20} /> },
  ];

  const courierTabs = [
    { id: 'users', name: 'Kuryerlar', icon: <Users size={20} /> },
    { id: 'settings', name: 'Sozlamalar', icon: <Settings size={20} /> },
  ];

  const currentTabs = activeApp === 'customer' ? customerTabs : courierTabs;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-7 rounded-[32px] border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Ilova boshqaruvi</h1>
          <p className="text-slate-500 font-bold text-sm mt-1">
            {activeApp === 'customer' ? 'Mijoz Ilovasi' : 'Dastavka (Kuryer) Ilovasi'} boshqaruv paneli
          </p>
        </div>

        {/* App Selector Toggle */}
        <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit">
          <button 
            onClick={() => { setActiveApp('customer'); setActiveTab('users'); }}
            className={`px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
              activeApp === 'customer' 
              ? 'bg-white text-slate-900 shadow-md' 
              : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            Mijoz Ilovasi
          </button>
          <button 
            onClick={() => { setActiveApp('courier'); setActiveTab('users'); }}
            className={`px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
              activeApp === 'courier' 
              ? 'bg-white text-slate-900 shadow-md' 
              : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            Dastavka Ilovasi
          </button>
        </div>
      </div>

      {/* App-specific Tabs Navigation */}
      <div className="flex items-center gap-2 px-2 overflow-x-auto no-scrollbar">
        {currentTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 text-sm font-black transition-all rounded-2xl flex items-center gap-2 ${
              activeTab === tab.id 
                ? 'bg-sidebarDark text-white shadow-lg shadow-sidebarDark/20' 
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.icon}
            <span>{tab.name}</span>
          </button>
        ))}
      </div>

      {activeTab === 'users' && (
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-2">
            <div className="relative flex-1 w-full md:w-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                placeholder={`${activeApp === 'customer' ? 'Mijozlarni' : 'Kuryerlarni'} qidirish (ism, tel, email)...`} 
                className="w-full pl-12 pr-4 py-4 rounded-3xl border border-gray-100 focus:ring-4 focus:ring-sidebarDark/5 outline-none bg-white transition-all shadow-sm font-bold text-slate-700"
              />
            </div>
            <button className="px-6 py-4 rounded-[20px] border border-gray-100 bg-white font-black text-slate-600 flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm uppercase text-xs tracking-widest">
              <Filter size={18} />
              <span>Filter</span>
            </button>
          </div>

          <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden border-t-0 min-h-[400px]">
            {loading ? (
              <div className="flex items-center justify-center py-40">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sidebarDark"></div>
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-40 text-slate-300 px-8 text-center">
                <Users size={64} strokeWidth={1} />
                <p className="mt-4 font-black text-slate-400 text-lg uppercase tracking-tight italic">Foydalanuvchilar topilmadi</p>
                <p className="text-sm text-slate-400 font-bold max-w-sm mt-1">Hozircha hech qanday ma'lumot mavjud emas yoki "app_users" jadvali topilmadi.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-gray-100">
                      <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                        {activeApp === 'customer' ? 'Mijoz' : 'Kuryer'}
                      </th>
                      <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Turi</th>
                      <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Sana</th>
                      <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Holati</th>
                      <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-3xl bg-slate-100 flex items-center justify-center font-black text-2xl text-slate-400 group-hover:bg-sidebarDark group-hover:text-white transition-all shadow-sm">
                              {item.full_name?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <p className="font-black text-slate-900 mb-1.5 text-base tracking-tight">
                                {item.full_name}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-slate-500 font-bold">
                                <span className="flex items-center gap-1.5"><Phone size={13} /> {item.phone}</span>
                                <span className="flex items-center gap-1.5"><Mail size={13} /> {item.email || 'Noma\'lum'}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                            activeApp === 'customer' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {item.role || 'MIJOZ'}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <div className="flex flex-col items-center">
                            <span className="text-sm font-black text-slate-800 flex items-center gap-1.5"><Calendar size={14} /> {item.created_at ? new Date(item.created_at).toLocaleDateString('uz-UZ') : '---'}</span>
                            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">{item.created_at ? new Date(item.created_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }) : '---'}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-widest border border-green-100 shadow-sm">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            Faol
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center justify-end gap-3 text-right">
                            <button title="Ruxsatlarni tekshirish" className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 hover:text-sidebarDark transition-all group/btn shadow-sm">
                               <ShieldCheck size={22} className="group-hover/btn:scale-110 transition-transform" />
                            </button>
                            <button title="Foydalanuvchini bloklash" className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 hover:text-red-500 transition-all group/btn shadow-sm">
                               <UserX size={22} className="group-hover/btn:scale-110 transition-transform" />
                            </button>
                            <button title="Batafsil" className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 hover:text-slate-800 transition-all group/btn">
                               <MoreVertical size={22} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className="p-6 bg-slate-50/50 border-t border-gray-100 flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jami {users.length} ta {activeApp === 'customer' ? 'mijoz' : 'kuryer'}</p>
              <div className="flex gap-3">
                <button className="px-6 py-2.5 rounded-xl bg-white border border-gray-200 text-[11px] font-black text-slate-600 hover:bg-gray-50 transition-all shadow-sm uppercase tracking-widest">Oldingi</button>
                <button className="px-6 py-2.5 rounded-xl bg-white border border-gray-200 text-[11px] font-black text-slate-600 hover:bg-gray-50 transition-all shadow-sm uppercase tracking-widest">Keyingi</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="flex flex-col lg:flex-row gap-6 animate-in slide-in-from-bottom-4 duration-500">
          {/* Settings Sidebar */}
          <div className="w-full lg:w-72 bg-white rounded-[40px] p-4 border border-gray-100 shadow-sm flex flex-col gap-2 h-fit">
            <div className="p-4 mb-2">
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Ilova sozlamalari</h3>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Tizimni moslashtirish</p>
            </div>
            
            {[
              { id: 'banners', name: 'Bannerlar', icon: <ImageIcon size={18} /> },
              ...(activeApp === 'courier' 
                ? [{ id: 'zones', name: 'Hududlar (Tarif)', icon: <MapPin size={18} /> }]
                : []
              ),
              { id: 'general', name: 'Umumiy e\'lonlar', icon: <Megaphone size={18} /> },
              { id: 'contact', name: 'Aloqa sozlamalari', icon: <Phone size={18} /> },
              { id: 'app_settings', name: 'Sozlamalar', icon: <Settings2 size={18} /> },
              { id: 'versions', name: 'Versiya', icon: <Smartphone size={18} /> },
            ].map(tab => (
               <button
                  key={tab.id}
                  onClick={() => setActiveSettingTab(tab.id)}
                  className={`px-5 py-4 rounded-[20px] flex items-center gap-4 text-sm font-black transition-all text-left group ${
                    activeSettingTab === tab.id 
                      ? 'bg-slate-50 text-sidebarDark shadow-sm border border-gray-100' 
                      : 'text-slate-500 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                    activeSettingTab === tab.id 
                      ? 'bg-white shadow-sm text-sidebarDark' 
                      : 'bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-slate-500'
                  }`}>
                    {tab.icon}
                  </div>
                  {tab.name}
                </button>
            ))}
          </div>

          {/* Settings Content */}
          <div className="flex-1">
            {activeSettingTab === 'banners' && <BannersManager />}
            {activeSettingTab === 'general' && <AnnouncementsManager />}
            {activeSettingTab === 'contact' && <ContactSettingsManager />}
            {activeSettingTab === 'app_settings' && <RegionSettingsManager />}
            
            {activeSettingTab !== 'banners' && activeSettingTab !== 'general' && activeSettingTab !== 'contact' && activeSettingTab !== 'app_settings' && (
              <div className="bg-white py-32 rounded-[60px] border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300">
                 <Settings size={80} strokeWidth={1} />
                 <p className="text-xl font-black mt-6 text-slate-800 uppercase tracking-tight italic">Yaqin kunda...</p>
                 <p className="text-sm mt-2 text-slate-500 font-bold whitespace-nowrap">Ushbu bo'lim ustida qizg'in ish olib borilmoqda.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'promos' && (
        <div className="flex flex-col lg:flex-row gap-6 animate-in slide-in-from-bottom-4 duration-500">
          {/* Promo Sidebar */}
          <div className="w-full lg:w-72 bg-white rounded-[40px] p-4 border border-gray-100 shadow-sm flex flex-col gap-2 h-fit">
            <div className="p-4 mb-2">
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Aksiya va Narxlar</h3>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Marketing boshqaruvi</p>
            </div>
            
            {[
              { id: 'coupons', name: 'Promo kodlar', icon: <TicketPercent size={18} /> },
              { id: 'delivery', name: 'Dastavka narxi', icon: <Truck size={18} /> },
            ].map(tab => (
               <button
                  key={tab.id}
                  onClick={() => setActivePromoTab(tab.id)}
                  className={`px-5 py-4 rounded-[20px] flex items-center gap-4 text-sm font-black transition-all text-left group ${
                    activePromoTab === tab.id 
                      ? 'bg-slate-50 text-sidebarDark shadow-sm border border-gray-100' 
                      : 'text-slate-500 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                    activePromoTab === tab.id 
                      ? 'bg-white shadow-sm text-sidebarDark' 
                      : 'bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-slate-500'
                  }`}>
                    {tab.icon}
                  </div>
                  {tab.name}
                </button>
            ))}
          </div>

          {/* Promo Content */}
          <div className="flex-1">
            {activePromoTab === 'coupons' && <PromosManager />}
            {activePromoTab === 'delivery' && <DeliveryPricingManager />}
            
            {activePromoTab !== 'coupons' && activePromoTab !== 'delivery' && (
              <div className="bg-white py-32 rounded-[60px] border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300">
                 <TicketPercent size={80} strokeWidth={1} />
                 <p className="text-xl font-black mt-6 text-slate-800 uppercase tracking-tight italic">Yaqin kunda...</p>
                 <p className="text-sm mt-2 text-slate-500 font-bold whitespace-nowrap">
                   Ushbu bo'lim ustida ish ketmoqda.
                 </p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default AppManagement;
