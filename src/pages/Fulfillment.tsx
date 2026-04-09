import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import {
  ClipboardList,
  Search,
  Clock,
  Package,
  User,
  MapPin,
  ChevronRight,
  Printer,
  ShoppingBag,
  ArrowRight
} from 'lucide-react';

interface FulfillmentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  itemsCount: number;
  totalAmount: string;
  status: 'Pending' | 'Picking' | 'Waiting' | 'OnTheWay' | 'Delivered' | 'Returned';
  createdAt: string;
  address: string;
}

const Fulfillment = () => {
  const [activeTab, setActiveTab] = useState<'Pending' | 'Picking' | 'Status'>('Pending');
  const [orders, setOrders] = useState<FulfillmentOrder[]>([]);

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel('orders-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const formatted = data.map(o => ({
        id: o.id,
        orderNumber: o.order_number,
        customerName: o.customer_name,
        itemsCount: o.items_count,
        totalAmount: o.total_amount,
        status: o.status,
        address: o.address,
        createdAt: new Date(o.created_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
      }));
      setOrders(formatted as FulfillmentOrder[]);
    }
  };

  const handleUpdateStatus = async (id: string, currentStatus: string) => {
    let nextStatus: string = 'Pending';
    if (currentStatus === 'Pending') {
      nextStatus = 'Picking';
      setActiveTab('Picking');
    }
    else if (currentStatus === 'Picking') {
      nextStatus = 'Waiting'; // Moves straight into Logistics!
    }

    setOrders(orders.filter(o => o.id !== id).concat(
      orders.filter(o => o.id === id).map(o => ({ ...o, status: nextStatus as any }))
    ));

    const updatePayload: any = { status: nextStatus };
    if (nextStatus === 'Waiting') {
      updatePayload.courier_code = String(Math.floor(10000 + Math.random() * 90000));
    }

    await supabase.from('orders').update(updatePayload).eq('id', id);
  };

  const stats = {
    pending: orders.filter(o => o.status === 'Pending').length,
    picking: orders.filter(o => o.status === 'Picking').length,
    statusCount: orders.filter(o => ['Waiting', 'OnTheWay', 'Delivered', 'Returned'].includes(o.status)).length
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-end bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Buyurtmalar (Fulfillment)</h1>
          <p className="text-slate-500 text-sm mt-1">Buyurtmalarni yig'ish, qadoqlash va yetkazib berishga tayyorlash</p>
        </div>
        <button className="bg-slate-50 hover:bg-slate-100 text-slate-600 px-6 py-3 rounded-xl font-bold border border-slate-100 flex items-center gap-2 transition-all">
          <Printer size={18} />
          <span>Check Chiqarish</span>
        </button>
      </div>

      {/* Tabs / Status Navigation */}
      <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('Pending')}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'Pending' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
        >
          <Clock size={16} />
          <span>Yangi ({stats.pending})</span>
        </button>

        <button
          onClick={() => setActiveTab('Picking')}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'Picking' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
        >
          <ShoppingBag size={16} />
          <span>Tayyorlanmoqda ({stats.picking})</span>
        </button>
        <button
          onClick={() => setActiveTab('Status')}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'Status' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
        >
          <MapPin size={16} />
          <span>Buyurtmalar statusi ({stats.statusCount})</span>
        </button>
-
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Buyurtma raqami yoki mijoz ismi..."
          className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-sidebarDark/10 outline-none bg-white transition-all shadow-sm"
        />
      </div>

      {/* Orders List */}
      <div className="grid grid-cols-1 gap-4">
        {orders.filter(o => activeTab === 'Status' ? ['Waiting', 'OnTheWay', 'Delivered', 'Returned'].includes(o.status) : o.status === activeTab).map((order) => (
          <div key={order.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:border-slate-300 transition-all group">
            <div className="flex justify-between items-start">
              <div className="flex gap-4">
                <div className="w-14 h-14 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-sidebarDark group-hover:text-white transition-colors">
                  <ClipboardList size={28} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-slate-900">{order.orderNumber}</span>
                    <span className="text-xs font-bold text-slate-400 px-2 py-0.5 bg-slate-100 rounded-md">Bugun, {order.createdAt}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
                    <span className="flex items-center gap-1"><User size={14} /> {order.customerName}</span>
                    <span className="flex items-center gap-1"><Package size={14} /> {order.itemsCount} ta tovar</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <MapPin size={12} /> {order.address}
                  </div>
                </div>
              </div>

              <div className="text-right flex flex-col items-end gap-3">
                <span className="text-xl font-black text-slate-800">{order.totalAmount}</span>
                {activeTab === 'Status' ? (
                  <div className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 ${
                    order.status === 'Waiting' ? 'bg-yellow-50 text-yellow-600 border border-yellow-100' :
                    order.status === 'OnTheWay' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                    order.status === 'Delivered' ? 'bg-green-50 text-green-600 border border-green-100' :
                    'bg-red-50 text-red-600 border border-red-100'
                  }`}>
                    {order.status === 'Waiting' && 'Kuryer Kutilmoqda'}
                    {order.status === 'OnTheWay' && 'Yo\'lda'}
                    {order.status === 'Delivered' && 'Yetkazilgan'}
                    {order.status === 'Returned' && 'Qaytarilgan'}
                  </div>
                ) : (
                  <button
                    onClick={() => handleUpdateStatus(order.id, activeTab)}
                    className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'Pending' ? 'bg-sidebarDark text-white hover:bg-slate-800' :
                          activeTab === 'Picking' ? 'bg-green-600 text-white hover:bg-green-700' :
                            'bg-blue-50 text-blue-600 hover:bg-blue-100'
                      }`}>
                    {activeTab === 'Pending' ? 'Qabul qilib Tayyorlash' :
                        activeTab === 'Picking' ? 'Kuryerga yuborish' :
                          ''}
                    <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Progress Bar for Picking */}
            {activeTab === 'Picking' && (
              <div className="mt-5 pt-4 border-t border-dashed border-gray-100 flex items-center gap-4">
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 w-2/3" />
                </div>
                <span className="text-xs font-black text-green-600 uppercase tracking-widest">2 / 3 yig'ildi</span>
                <button className="text-[10px] font-bold text-blue-500 uppercase flex items-center gap-1 ml-auto">
                  Picking List <ChevronRight size={12} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty State Mock */}
      {orders.filter(o => activeTab === 'Status' ? ['Waiting', 'OnTheWay', 'Delivered', 'Returned'].includes(o.status) : o.status === activeTab).length === 0 && (
        <div className="bg-white p-12 rounded-2xl border border-gray-100 text-center flex flex-col items-center shadow-sm">
          <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mx-auto text-slate-200">
            <ClipboardList size={40} />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-900">Buyurtmalar yo'q</h3>
            <p className="text-slate-500 max-w-xs mx-auto text-sm">Ushbu bo'limda hozircha kutulayotgan buyurtmalar mavjud emas.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Fulfillment;
