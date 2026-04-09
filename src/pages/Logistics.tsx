import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { 
  Truck, 
  Search, 
  MapPin, 
  User, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  Phone,
  MoreVertical,
  Plus
} from 'lucide-react';

interface DeliveryOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  courierName?: string;
  status: 'Waiting' | 'OnTheWay' | 'Delivered' | 'Returned';
  address: string;
  time: string;
  amount: string;
}

const Logistics = () => {
  const [activeTab, setActiveTab] = useState<'Waiting' | 'InTransit' | 'Finished'>('Waiting');
  const [deliveries, setDeliveries] = useState<DeliveryOrder[]>([]);

  useEffect(() => {
    fetchDeliveries();

    const channel = supabase
      .channel('deliveries-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchDeliveries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDeliveries = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .in('status', ['Waiting', 'OnTheWay', 'Delivered', 'Returned'])
      .order('created_at', { ascending: false });

    if (!error && data) {
      const formatted = data.map(o => ({
        id: o.id,
        orderNumber: o.order_number,
        customerName: o.customer_name,
        amount: o.total_amount,
        status: o.status,
        address: o.address,
        time: new Date(o.created_at).toLocaleTimeString('uz-UZ', {hour: '2-digit', minute:'2-digit'})
      }));
      setDeliveries(formatted as DeliveryOrder[]);
    }
  };

  const stats = {
    waiting: deliveries.filter(d => d.status === 'Waiting').length,
    inTransit: deliveries.filter(d => d.status === 'OnTheWay').length,
    finished: deliveries.filter(d => d.status === 'Delivered').length
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-end bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Yetkazib Berish (Logistics)</h1>
          <p className="text-slate-500 text-sm mt-1">Kuryerlarni boshqarish va yetkazib berish statuslarini kuzatish</p>
        </div>
        <button className="bg-sidebarDark hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-slate-900/10">
          <Plus size={18} />
          <span>Kuryer Qo'shish</span>
        </button>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center text-yellow-600">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kutilmoqda</p>
            <p className="text-lg font-black text-slate-900">{stats.waiting} ta</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <Truck size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Yo'lda</p>
            <p className="text-lg font-black text-slate-900">{stats.inTransit} ta</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Topshirildi</p>
            <p className="text-lg font-black text-slate-900">{stats.finished} ta</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600">
            <User size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Faol kuryerlar</p>
            <p className="text-lg font-black text-slate-900">12 nafar</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
        <button 
          onClick={() => setActiveTab('Waiting')}
          className={`px-5 py-2 rounded-lg font-bold text-xs transition-all ${
            activeTab === 'Waiting' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
          }`}
        >
          Kuryer kutilmoqda ({stats.waiting})
        </button>
        <button 
          onClick={() => setActiveTab('InTransit')}
          className={`px-5 py-2 rounded-lg font-bold text-xs transition-all ${
            activeTab === 'InTransit' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
          }`}
        >
          Yo'lda ({stats.inTransit})
        </button>
        <button 
          onClick={() => setActiveTab('Finished')}
          className={`px-5 py-2 rounded-lg font-bold text-xs transition-all ${
            activeTab === 'Finished' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
          }`}
        >
          Yakunlangan ({stats.finished})
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="Kuryer ismi yoki buyurtma raqami..." 
          className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-sidebarDark/10 transition-all font-medium text-sm"
        />
      </div>

      {/* Delivery Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-gray-100">
              <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Buyurtma</th>
              <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mijoz / Manzil</th>
              <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kuryer</th>
              <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vaqt</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {deliveries.filter(d => 
              (activeTab === 'Waiting' && d.status === 'Waiting') ||
              (activeTab === 'InTransit' && d.status === 'OnTheWay') ||
              (activeTab === 'Finished' && (d.status === 'Delivered' || d.status === 'Returned'))
            ).map((delivery) => (
              <tr key={delivery.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div>
                    <p className="text-sm font-black text-slate-900">{delivery.orderNumber}</p>
                    <p className="text-[10px] font-bold text-slate-400">{delivery.amount}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="max-w-xs">
                    <p className="text-sm font-bold text-slate-800 flex items-center gap-1">
                      <User size={12} className="text-slate-400" /> {delivery.customerName}
                    </p>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                      <MapPin size={10} className="text-slate-400" /> {delivery.address}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {delivery.courierName ? (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                        <User size={14} />
                      </div>
                      <span className="text-xs font-bold text-slate-700">{delivery.courierName}</span>
                    </div>
                  ) : (
                    <button className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-100 transition-all uppercase tracking-tighter">
                      Kuryer biriktirish
                    </button>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1 ${
                    delivery.status === 'Waiting' ? 'bg-yellow-100 text-yellow-700' :
                    delivery.status === 'OnTheWay' ? 'bg-blue-100 text-blue-700' :
                    delivery.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {delivery.status === 'Waiting' ? <Clock size={10} /> : 
                     delivery.status === 'OnTheWay' ? <Truck size={10} /> :
                     delivery.status === 'Delivered' ? <CheckCircle2 size={10} /> :
                     <AlertTriangle size={10} />}
                    {delivery.status === 'Waiting' ? 'Tayyor' : 
                     delivery.status === 'OnTheWay' ? 'Yo\'lda' :
                     delivery.status === 'Delivered' ? 'Yetkazildi' : 'Qaytdi'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-[11px] font-medium text-slate-500">{delivery.time}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex gap-2 justify-end">
                    <button className="p-2 text-slate-400 hover:text-blue-600 transition-all" title="Qo'ng'iroq">
                      <Phone size={14} />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-slate-600 transition-all" title="Amallar">
                      <MoreVertical size={14} />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-sidebarDark transition-all" title="Batafsil">
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Placeholder for missing icon
const AlertTriangle = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
);

export default Logistics;
