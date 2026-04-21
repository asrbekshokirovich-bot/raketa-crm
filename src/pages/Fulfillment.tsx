import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import {
  ClipboardList,
  Search,
  Clock,
  Package,
  User,
  MapPin,
  Printer,
  ShoppingBag,
  ArrowRight,
  X,
  Smartphone
} from 'lucide-react';

const parsePrice = (priceStr: string | number | undefined | null) => {
  if (typeof priceStr === 'number') return priceStr;
  if (!priceStr) return 0;
  const cleaned = priceStr.toString()
    .replace(/uzs/i, '')
    .replace(/,/g, '')
    .replace(/\s/g, '')
    .trim();
  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
};

interface FulfillmentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customer_phone?: string;
  itemsCount: number;
  totalAmount: string;
  status: 'Pending' | 'Picking' | 'Waiting' | 'OnTheWay' | 'Delivered' | 'Returned';
  createdAt: string;
  address: string;
  discount_amount: number;
  promo_code: string | null;
  items_subtotal: number;
  coordinates: string;
  delivery_fee: number;
  promo_type?: string;
  promo_value?: number;
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '---';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Sana xato';
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const orderDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const timeStr = date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
  
  if (orderDate.getTime() === today.getTime()) {
    return `Bugun, ${timeStr}`;
  } else if (orderDate.getTime() === yesterday.getTime()) {
    return `Kecha, ${timeStr}`;
  } else {
    return `${date.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' })}, ${timeStr}`;
  }
};

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  price_at_time: number;
  products: {
    name: string;
    image_url: string;
    sku: string;
  };
}

const Fulfillment = () => {
  const [activeTab, setActiveTab] = useState<'Pending' | 'Picking' | 'Status'>('Pending');
  const [orders, setOrders] = useState<FulfillmentOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<FulfillmentOrder | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel('fulfillment_realtime_channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('CRM REALTIME INSERT:', payload);
          const newOrder = payload.new as any;
          setRecentlyAdded(prev => new Set(prev).add(newOrder.id));
          setTimeout(() => {
            setRecentlyAdded(prev => {
              const next = new Set(prev);
              next.delete(newOrder.id);
              return next;
            });
          }, 4000);
          fetchOrders();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('CRM REALTIME UPDATE:', payload);
          fetchOrders();
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'orders' },
        () => {
          console.log('CRM REALTIME DELETE');
          fetchOrders();
        }
      )
      .subscribe((status) => {
        console.log('Fulfillment Realtime status:', status);
      });

    const handleGlobalUpdate = () => {
      console.log('Fulfillment: Received orders-updated event');
      fetchOrders();
    };

    window.addEventListener('orders-updated', handleGlobalUpdate);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('orders-updated', handleGlobalUpdate);
    };
  }, []);

  const fetchOrders = async () => {
    console.log('Fetching orders...');
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const formatted = data.map(o => ({
        id: o.id,
        orderNumber: o.order_number,
        customerName: o.customer_name,
        customer_phone: o.customer_phone,
        itemsCount: o.items_count,
        totalAmount: o.total_amount,
        status: o.status,
        address: o.address,
        createdAt: o.created_at,
        discount_amount: o.discount_amount || 0,
        promo_code: o.promo_code || null,
        items_subtotal: parsePrice(o.total_amount) - (o.delivery_fee || 0) + (o.discount_amount || 0),
        delivery_fee: o.delivery_fee || 0,
        coordinates: o.coordinates || '',
        promo_type: o.promo_type,
        promo_value: o.promo_value
      }));
      setOrders(formatted as FulfillmentOrder[]);
    }
  };

  const fetchOrderItems = async (orderId: string) => {
    setIsLoadingItems(true);
    try {
      // First, get the raw items to ensure we have data even if join fails
      const { data, error } = await supabase
        .from('order_items')
        .select('*, products(name, image_url, sku)')
        .eq('order_id', orderId);

      if (!error && data) {
        setOrderItems(data as any);
      } else if (error) {
        console.error('Items fetch error:', error);
      }
    } catch (err) {
      console.error('Items catch error:', err);
    } finally {
      setIsLoadingItems(false);
    }
  };

  const handleOrderClick = (order: FulfillmentOrder) => {
    setSelectedOrder(order);
    fetchOrderItems(order.id);
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
          <div 
            key={order.id} 
            onClick={() => activeTab !== 'Pending' && handleOrderClick(order)}
            className={`bg-white p-5 rounded-2xl border border-gray-100 shadow-sm transition-all group ${
              activeTab !== 'Pending' ? 'hover:border-slate-300 cursor-pointer' : 'cursor-default'
            } relative overflow-hidden`}
          >
            {recentlyAdded.has(order.id) && (
              <div className="absolute top-0 right-0">
                <div className="bg-green-500 text-white text-[10px] font-black px-4 py-1 rounded-bl-xl uppercase tracking-widest shadow-lg animate-in slide-in-from-top-full duration-300">
                  New
                </div>
              </div>
            )}
            <div className="flex justify-between items-start">
              <div className="flex gap-4">
                <div className="w-14 h-14 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-sidebarDark group-hover:text-white transition-colors">
                  <ClipboardList size={28} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-slate-900">{order.orderNumber}</span>
                    <span className="text-xs font-bold text-slate-400 px-2 py-0.5 bg-slate-100 rounded-md">{formatDate(order.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
                    <span className="flex items-center gap-1"><User size={14} /> {order.customerName}</span>
                    <span className="flex items-center gap-1"><Package size={14} /> {order.itemsCount} ta tovar</span>
                    {order.customer_phone && (
                      <span className="flex items-center gap-1 text-slate-400 text-xs"><Smartphone size={12} /> {order.customer_phone}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <MapPin size={12} /> {order.address}
                  </div>
                </div>
              </div>

              <div className="text-right flex flex-col items-end gap-3">
                <span className="text-xl font-black text-slate-800">
                  {new Intl.NumberFormat('uz-UZ').format(Number(order.totalAmount))} UZS
                </span>
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
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpdateStatus(order.id, activeTab);
                    }}
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

          </div>
        ))}

        {/* Order Details Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
              className="bg-white w-full max-w-5xl rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 flex flex-col h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-slate-50 px-8 py-5 border-b border-slate-100 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-sidebarDark flex items-center justify-center text-white shadow-lg">
                    <ClipboardList size={20} />
                  </div>
                  <h2 className="text-lg font-black text-slate-900">{selectedOrder.orderNumber}</h2>
                </div>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all shadow-sm"
                  title="Yopish"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 flex overflow-hidden">
                {/* Left Side: Receipt Style (The "Check" column) */}
                <div className="w-1/3 border-r border-slate-100 bg-white overflow-y-auto p-6 flex flex-col gap-4 font-mono text-[13px]">
                  <div className="text-center pb-4 border-b border-dashed border-slate-200">
                    <h3 className="font-black text-slate-800 text-sm">RAKETA MARKET</h3>
                    <p className="text-[10px] text-slate-400">Buyurtma Kvitansiyasi</p>
                  </div>

                  {/* Header Info */}
                  <div className="space-y-1 text-slate-600">
                    <div className="flex justify-between">
                      <span className="font-bold">Buyurtma sanasi:</span>
                      <span>{formatDate(selectedOrder.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold">Buyurtma ID:</span>
                      <span>{selectedOrder.orderNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold">Mijoz:</span>
                      <span className="font-black text-slate-800">{selectedOrder.customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold">Telefon raqam:</span>
                      <span>{selectedOrder.customer_phone || "---"}</span>
                    </div>
                    <div className="flex flex-col mt-2">
                      <span className="font-bold">Manzil:</span>
                      <span className="italic bg-slate-50 p-2 rounded mt-1">{selectedOrder.address}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="font-bold">Kordinata:</span>
                      <span>{selectedOrder.coordinates || "---"}</span>
                    </div>
                  </div>

                  <div className="py-2 text-center text-slate-300">
                    ---------------------------------
                  </div>

                  {/* Products Section */}
                  <div className="space-y-4">
                    <h4 className="font-black text-slate-800 uppercase text-center border-b border-slate-50 pb-2">Maxsulotlar</h4>
                    {isLoadingItems ? (
                      <div className="py-4 text-center text-slate-400">Yuklanmoqda...</div>
                    ) : orderItems.length > 0 ? (
                      <div className="space-y-4">
                        {orderItems.map((item, idx) => (
                          <div key={item.id} className="space-y-1">
                            <div className="flex justify-between gap-4">
                              <span className="font-bold text-slate-700">{idx + 1}. {item.products?.name}</span>
                              <span className="font-black text-slate-900 shrink-0">x {item.quantity}</span>
                            </div>
                            <div className="flex justify-between text-[11px] text-slate-500 pl-4">
                              <span>{new Intl.NumberFormat('uz-UZ').format(item.price_at_time)} sum x {item.quantity}</span>
                              <span className="font-bold">= {new Intl.NumberFormat('uz-UZ').format(item.price_at_time * item.quantity)} sum</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-4 text-center text-slate-400">Mahsulotlar topilmadi</div>
                    )}
                  </div>

                  <div className="py-2 text-center text-slate-300">
                    ---------------------------------
                  </div>

                  {/* Summary Section */}
                  <div className="space-y-2 text-slate-700">
                    <div className="flex justify-between">
                      <span>Maxsulotlar jami:</span>
                      <span className="font-bold">{new Intl.NumberFormat('uz-UZ').format(selectedOrder.items_subtotal)} sum</span>
                    </div>
                    
                    <div className="flex justify-between text-blue-600">
                      <span>Dastavka narxi:</span>
                      <span className="font-bold">+{new Intl.NumberFormat('uz-UZ').format(selectedOrder.delivery_fee)} sum</span>
                    </div>

                    <div className="flex justify-between">
                      <span>Promo kod:</span>
                      <span className={selectedOrder.promo_code ? "text-green-600 font-bold" : "text-slate-400"}>
                        {selectedOrder.promo_code ? `foydalanilgan (${selectedOrder.promo_code})` : "foydalanilmagan"}
                      </span>
                    </div>
                    {selectedOrder.promo_code && (
                      <div className="flex justify-between text-green-600 pl-4 text-[11px]">
                        <span>
                          {selectedOrder.promo_type === 'percent' 
                            ? `(${selectedOrder.promo_value}% chegirma)` 
                            : `(${new Intl.NumberFormat('uz-UZ').format(selectedOrder.promo_value || 0)} sum chegirma)`}
                        </span>
                        <span className="font-bold">-{new Intl.NumberFormat('uz-UZ').format(selectedOrder.discount_amount)} sum</span>
                      </div>
                    )}

                    <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-base">
                      <span className="font-black text-slate-900">To'lanadi:</span>
                      <span className="font-black text-slate-900 bg-yellow-50 px-2 py-1 rounded">
                        {new Intl.NumberFormat('uz-UZ').format(parsePrice(selectedOrder.totalAmount))} sum
                      </span>
                    </div>
                    <div className="flex justify-between pt-2">
                       <span>To'lov usuli:</span>
                       <span className="font-bold">naqd / online</span>
                    </div>
                  </div>

                  <div className="mt-8 pb-4">
                    <button 
                      onClick={() => alert('Check chop etish tizimi ulanmoqda...')}
                      className="w-full py-4 bg-sidebarDark text-white rounded-2xl font-black text-sm hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 shadow-xl shadow-sidebarDark/10"
                    >
                      <Printer size={20} />
                      <span>CHEK CHIQARISH</span>
                    </button>
                  </div>
                </div>

                {/* Right Side: Visual representation if needed or just empty/status */}
                <div className="flex-1 bg-slate-50/50 flex flex-col overflow-hidden">
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6">
                    <div className="w-32 h-32 rounded-full bg-white shadow-2xl flex items-center justify-center text-sidebarDark">
                      <ShoppingBag size={64} />
                    </div>
                    <div className="space-y-2">
                       <h2 className="text-2xl font-black text-slate-800">Buyurtma Holati</h2>
                       <p className="text-slate-500 max-w-md">Buyurtma hozirda <b>{selectedOrder.status}</b> holatida. Chap tomondagi kvitansiya orqali barcha ma'lumotlarni tekshiring.</p>
                    </div>
                    
                    <div className="flex gap-4">
                      {activeTab === 'Pending' && (
                        <button 
                          onClick={() => handleUpdateStatus(selectedOrder.id, 'Pending')}
                          className="px-8 py-4 bg-green-600 text-white rounded-2xl font-black text-sm hover:shadow-lg hover:shadow-green-600/20 active:scale-95 transition-all flex items-center gap-3"
                        >
                          <span>QABUL QILIB TAYYORLASH</span>
                          <ArrowRight size={20} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
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
