import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
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
  Smartphone,
  CheckCircle2,
  Circle,
  Activity
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
  status: 'Pending' | 'Picking' | 'Waiting' | 'OnTheWay' | 'Delivered' | 'Returned' | 'Cancelled';
  createdAt: string;
  address: string;
  discount_amount: number;
  promo_code: string | null;
  items_subtotal: number;
  coordinates: string;
  delivery_fee: number;
  promo_type?: string;
  promo_value?: number;
  picker_id?: string | null;
  picker_name?: string | null;
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
  
  const formattedDate = date.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${formattedDate}, ${timeStr}`;
};

const NumberTicker = ({ value }: { value: number }) => {
  const [prevValue, setPrevValue] = useState(value);
  const [direction, setDirection] = useState<'up' | 'down'>('down');

  useEffect(() => {
    if (value > prevValue) setDirection('up');
    else if (value < prevValue) setDirection('down');
    setPrevValue(value);
  }, [value, prevValue]);

  return (
    <div className="inline-flex flex-col h-[1.1em] overflow-hidden relative translate-y-[0.1em]" style={{ verticalAlign: 'baseline' }}>
      <span 
        key={value}
        className={`inline-block font-black ${
          direction === 'down' ? 'animate-num-down' : 'animate-num-up'
        }`}
      >
        {value}
      </span>
    </div>
  );
};

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price_at_time: number;
  products: {
    name: string;
    image_url: string;
    sku: string;
    stock: number;
  };
}

const Fulfillment = () => {
  const { user } = useAuth();
  const employeeName = user?.email ? user.email.split('@')[0] : 'Xodim';
  const [activeTab, setActiveTab] = useState<'Pending' | 'Picking' | 'Status'>('Pending');
  const [orders, setOrders] = useState<FulfillmentOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<FulfillmentOrder | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());
  const [pickedItems, setPickedItems] = useState<Set<string>>(new Set());
  const [isReceiptPrinted, setIsReceiptPrinted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusSubFilter, setStatusSubFilter] = useState<'ALL' | 'Waiting' | 'OnTheWay' | 'Delivered' | 'Cancelled'>('ALL');
  const [alertConfig, setAlertConfig] = useState<{ title: string; message: string; type?: 'warning' | 'error' | 'success' } | null>(null);

  const togglePicked = async (item: OrderItem) => {
    // Safety guard: Cannot pick items for cancelled orders
    if (selectedOrder?.status === 'Cancelled') return;

    // Checkmarks now only serve as a visual checklist
    setPickedItems(prev => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      
      // Persist to localStorage for this session
      const orderPickedKey = `picked_items_${item.order_id}`;
      localStorage.setItem(orderPickedKey, JSON.stringify(Array.from(next)));
      
      return next;
    });
  };

  // Global Barcode Scanner Listener for Order Search
  useEffect(() => {
    let barcodeBuffer = '';
    let lastKeyTime = Date.now();
    let firstKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore functional keys and key combos
      if (e.key === 'Escape' || e.key === 'Tab' || e.key === 'Shift' || e.ctrlKey || e.metaKey || e.altKey) return;

      const currentTime = Date.now();
      
      // Reset buffer if typing normally (>100ms per keystroke)
      if (currentTime - lastKeyTime > 100) {
        barcodeBuffer = '';
        firstKeyTime = currentTime;
      }
      lastKeyTime = currentTime;

      // Capture single characters
      if (e.key.length === 1) {
        barcodeBuffer += e.key;
      } else if (e.key === 'Enter' && barcodeBuffer.length >= 3) {
        // Check if the sequence was fast (scanner speed)
        const totalDuration = currentTime - firstKeyTime;
        // 3+ characters in < 500ms is highly likely a scanner
        if (totalDuration < 500) {
          e.preventDefault();
          e.stopPropagation();
          setSearchQuery(barcodeBuffer);
          barcodeBuffer = '';
          
          // Show a subtle notification or just let the search update
          console.log('Barcode scanned:', searchQuery);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  useEffect(() => {
    fetchOrders();
    // Reset picked items when modal opens
    setPickedItems(new Set());

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
          const updatedOrder = payload.new as any;
          
          // Update the list
          setOrders(prev => prev.map(o => 
            o.id === updatedOrder.id 
              ? { 
                  ...o, 
                  status: updatedOrder.status,
                  totalAmount: updatedOrder.total_amount,
                  customer_phone: updatedOrder.customer_phone,
                  address: updatedOrder.address,
                  coordinates: updatedOrder.coordinates
                } 
              : o
          ));

          // Update the selected modal if it's the same order
          setSelectedOrder(prev => {
            if (prev && prev.id === updatedOrder.id) {
              return {
                ...prev,
                status: updatedOrder.status,
                totalAmount: updatedOrder.total_amount,
                customer_phone: updatedOrder.customer_phone,
                address: updatedOrder.address,
                coordinates: updatedOrder.coordinates,
                items_subtotal: parsePrice(updatedOrder.total_amount) - (updatedOrder.delivery_fee || 0) + (updatedOrder.discount_amount || 0)
              };
            }
            return prev;
          });
          
          // Also call fetchOrders to ensure everything is perfectly synced
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

  // Sync selectedOrder with the orders list whenever it updates
  useEffect(() => {
    if (selectedOrder) {
      const updated = orders.find(o => o.id === selectedOrder.id);
      if (updated && (updated.status !== selectedOrder.status || updated.totalAmount !== selectedOrder.totalAmount)) {
        console.log('Syncing selectedOrder status:', updated.status);
        setSelectedOrder(updated);
      }
    }
  }, [orders]);

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
        promo_value: o.promo_value,
        picker_id: o.picker_id,
        picker_name: o.picker_name
      }));
      setOrders(formatted as FulfillmentOrder[]);
    }
  };

  const fetchOrderItems = async (orderId: string) => {
    setIsLoadingItems(true);
    try {
      // First, get the raw items with product details
      const { data, error } = await supabase
        .from('order_items')
        .select('*, products(name, image_url, sku, stock)')
        .eq('order_id', orderId);

      if (!error && data) {
        setIsReceiptPrinted(false);
        // Load from localStorage for this order
        const orderPickedKey = `picked_items_${orderId}`;
        const saved = localStorage.getItem(orderPickedKey);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
              setPickedItems(new Set(parsed));
            }
          } catch (e) {
            console.error('Error parsing saved picked items:', e);
          }
        } else {
          setPickedItems(new Set());
        }

        // Fetch missing images from product_listings based on SKUs
        const skus = data.filter(item => !item.products?.image_url && item.products?.sku)
                         .map(item => item.products.sku);

        if (skus.length > 0) {
          const { data: listingImages } = await supabase
            .from('product_listings')
            .select('sku, image_url')
            .in('sku', skus);

          if (listingImages && listingImages.length > 0) {
            const imageMap = new Map(listingImages.map(l => [l.sku, l.image_url]));
            const enrichedData = data.map(item => {
              if (!item.products?.image_url && item.products?.sku && imageMap.has(item.products.sku)) {
                return {
                  ...item,
                  products: {
                    ...item.products,
                    image_url: imageMap.get(item.products.sku)
                  }
                };
              }
              return item;
            });
            setOrderItems(enrichedData as any);
            return;
          }
        }
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
    // strict check for picking status
    if (order.status === 'Picking') {
       if (order.picker_id && order.picker_id !== user?.id) {
         setAlertConfig({
           title: 'BUYURTMA BAND!',
           message: `Ushbu buyurtmani hozirda ${order.picker_name || 'boshqa xodim'} yig'moqda. Har bir buyurtmani faqat bir kishi yig'ishi mumkin.`,
           type: 'warning'
         });
         return;
       }
       // If status is Picking but picker_id is missing, we might want to warn or auto-assign
       if (!order.picker_id) {
         console.warn('Order is in Picking status but has no picker_id');
       }
    }
    setSelectedOrder(order);
    fetchOrderItems(order.id);
  };

  // handleCancelOrder logic is handled via Database triggers or external workflow

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
    if (nextStatus === 'Picking') {
      updatePayload.picker_id = user?.id;
      updatePayload.picker_name = user?.fullName;
    }
    if (nextStatus === 'Waiting') {
      updatePayload.courier_code = String(Math.floor(10000 + Math.random() * 90000));
    }

    const { error } = await supabase.from('orders').update(updatePayload).eq('id', id);
    if (error) {
      console.error('Update status error:', error);
      setAlertConfig({
        title: 'Xatolik yuz berdi!',
        message: `Buyurtma statusini o'zgartirib bo'lmadi: ${error.message}. Iltimos, bazada 'picker_id' va 'picker_name' ustunlari borligini tekshiring.`,
        type: 'error'
      });
    }
  };

  const stats = {
    pending: orders.filter(o => o.status === 'Pending').length,
    picking: orders.filter(o => o.status === 'Picking').length,
    statusCount: orders.filter(o => ['Waiting', 'OnTheWay', 'Delivered', 'Returned', 'Cancelled'].includes(o.status)).length
  };
  const filteredOrders = useMemo(() => {
    return orders
      .filter(o => {
        if (activeTab !== 'Status') return o.status === activeTab;
        if (statusSubFilter === 'ALL') return ['Waiting', 'OnTheWay', 'Delivered', 'Returned', 'Cancelled'].includes(o.status);
        if (statusSubFilter === 'Cancelled') return o.status === 'Cancelled' || o.status === 'Returned';
        return o.status === statusSubFilter;
      })
      .filter(o => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return o.orderNumber.toLowerCase().includes(q) || 
               o.customerName.toLowerCase().includes(q) ||
               (o.customer_phone && o.customer_phone.toLowerCase().includes(q));
      });
  }, [orders, activeTab, searchQuery, statusSubFilter]);

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
          <Activity size={16} />
          <span>Buyurtmalar statusi ({stats.statusCount})</span>
        </button>
      </div>

      {/* Sub-filters for Status Tab */}
      {activeTab === 'Status' && (
        <div className="flex gap-4 p-1 border-b border-slate-100 items-center overflow-x-auto no-scrollbar">
          {[
            { id: 'ALL', label: 'Umumiy' },
            { id: 'Cancelled', label: 'Bekor qilinganlar' },
            { id: 'Waiting', label: 'Kuryer kutilmoqda' },
            { id: 'OnTheWay', label: 'Yo\'lda' },
            { id: 'Delivered', label: 'Yetkazildi' }
          ].map((sub) => (
            <button
              key={sub.id}
              onClick={() => setStatusSubFilter(sub.id as any)}
              className={`px-4 py-2 rounded-lg text-xs font-black transition-all shrink-0 ${
                statusSubFilter === sub.id 
                  ? 'bg-slate-900 text-white shadow-md' 
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100'
              }`}
            >
              {sub.label} ({
                sub.id === 'ALL' ? stats.statusCount :
                sub.id === 'Cancelled' ? orders.filter(o => o.status === 'Cancelled' || o.status === 'Returned').length :
                orders.filter(o => o.status === sub.id).length
              })
            </button>
          ))}
        </div>
      )}

      {/* Search Bar */}
      <div className="relative group">
        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${searchQuery ? 'text-sidebarDark' : 'text-slate-400'}`} size={20} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buyurtma raqami yoki mijoz ismi..."
          className="w-full pl-12 pr-12 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-sidebarDark/10 outline-none bg-white transition-all shadow-sm focus:border-sidebarDark/30"
        />
        {searchQuery && (
          <button 
            title="Qidiruvni tozalash"
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Orders List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-white p-12 rounded-[32px] border border-gray-100 text-center flex flex-col items-center shadow-sm animate-in fade-in zoom-in-95 duration-500">
            <div className="w-24 h-24 rounded-3xl bg-slate-50 flex items-center justify-center mx-auto text-slate-200 mb-6">
              <ClipboardList size={48} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-900">Buyurtmalar yo'q</h3>
              <p className="text-slate-500 max-w-sm mx-auto font-medium">Ushbu bo'limda hozircha kutulayotgan buyurtmalar mavjud emas.</p>
            </div>
          </div>
        ) : (
          filteredOrders.map((order) => (
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
                    {order.status === 'Picking' && order.picker_name && (
                      <div className="flex items-center gap-1.5 mt-2 px-3 py-1 bg-purple-50 text-purple-600 rounded-lg w-fit border border-purple-100">
                        <User size={12} />
                        <span className="text-[10px] font-black uppercase tracking-tight">{order.picker_name} yig'moqda</span>
                      </div>
                    )}
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
                      order.status === 'Cancelled' ? 'bg-red-50 text-red-600 border border-red-100' :
                      'bg-slate-50 text-slate-600 border border-slate-100'
                    }`}>
                      {order.status === 'Waiting' && 'Kuryer Kutilmoqda'}
                      {order.status === 'OnTheWay' && 'Yo\'lda'}
                      {order.status === 'Delivered' && 'Yetkazilgan'}
                      {order.status === 'Returned' && 'Qaytarilgan'}
                      {order.status === 'Cancelled' && 'Bekor qilindi'}
                    </div>
                  ) : activeTab === 'Picking' ? null : (
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
          ))
        )}
      </div>

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
                  <div>
                    <h2 className="text-lg font-black text-slate-900">{selectedOrder.orderNumber}</h2>
                    {/* Status Indicator (Read-only) */}
                    <div className={`mt-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider inline-block border ${
                      (selectedOrder.status === 'Returned' || selectedOrder.status === 'Cancelled')
                      ? 'bg-red-50 text-red-600 border-red-100' 
                      : 'bg-green-50 text-green-600 border-green-100'
                    }`}>
                      {(selectedOrder.status === 'Returned' || selectedOrder.status === 'Cancelled') ? 'Bekor qilindi' : 'Kutilmoqda'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* Employee Info */}
                  <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                      <User size={16} />
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-black text-slate-900 leading-none">{user?.fullName || 'Xodim'}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{user?.role || 'Operator'}</p>
                    </div>
                  </div>

                  <button 
                    onClick={() => setSelectedOrder(null)}
                    className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all shadow-sm"
                    title="Yopish"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 flex overflow-hidden">
                {/* Left Side: Receipt Style (The "Check" column) */}
                <div className="w-1/3 border-r border-slate-100 bg-white flex flex-col font-mono text-[13px]">
                  <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 scrollbar-thin">
                    <div className="text-center pb-4 border-b border-dashed border-slate-300">
                      <h3 className="font-black text-slate-900 text-lg uppercase tracking-tighter mb-0.5">RAKETA MARKET</h3>
                      <div className="text-2xl font-black text-slate-900 tracking-tighter leading-none mb-1">
                        {selectedOrder.orderNumber.split(' • ')[1] || selectedOrder.orderNumber}
                      </div>
                      <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Buyurtma Kvitansiyasi</p>
                    </div>

                    {/* Header Info */}
                    <div className="space-y-1 text-slate-900">
                      <div className="flex justify-between">
                        <span className="font-bold">Buyurtma sanasi:</span>
                        <span>{formatDate(selectedOrder.createdAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-bold">Buyurtma raqami:</span>
                        <span className="font-black">{selectedOrder.orderNumber.split(' • ')[0]}</span>
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
                        <span className="font-black">Manzil:</span>
                        <span className="italic bg-slate-50 p-2 rounded mt-1 leading-relaxed text-slate-900">{selectedOrder.address.split('\n')[0]}</span>
                      </div>
                      {selectedOrder.address.split('\n')[1] && (
                        <div className="flex flex-col mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                          <span className="font-black text-slate-900 text-[10px] uppercase tracking-wider mb-1">Kuryerga tavsif:</span>
                          <span className="text-slate-900 font-black leading-tight">{selectedOrder.address.split('\n')[1]}</span>
                        </div>
                      )}
                      <div className="flex justify-between mt-1 text-slate-900">
                        <span className="font-black">Kordinata:</span>
                        <span className="font-bold">{selectedOrder.coordinates || "---"}</span>
                      </div>
                    </div>

                    <div className="py-2 text-center text-slate-800 font-bold opacity-30">
                      ---------------------------------
                    </div>

                    {/* Products Section */}
                    <div className="space-y-4">
                      <h4 className="font-black text-slate-900 uppercase text-center border-b border-slate-100 pb-2">Maxsulotlar</h4>
                      {isLoadingItems ? (
                        <div className="py-4 text-center text-slate-400">Yuklanmoqda...</div>
                      ) : orderItems.length > 0 ? (
                        <div className="space-y-4">
                          {orderItems.map((item, idx) => (
                            <div key={item.id} className="space-y-1">
                              <div className="flex justify-between gap-4">
                                <span className="font-black text-slate-900">{idx + 1}. {item.products?.name}</span>
                                <span className="font-black text-slate-900 shrink-0">x {item.quantity}</span>
                              </div>
                              <div className="flex justify-between text-[11px] text-slate-900 pl-4 font-bold">
                                <span>{new Intl.NumberFormat('uz-UZ').format(item.price_at_time)} sum x {item.quantity}</span>
                                <span className="font-black">= {new Intl.NumberFormat('uz-UZ').format(item.price_at_time * item.quantity)} sum</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-2 text-center text-slate-400 font-bold">Mahsulotlar topilmadi</div>
                      )}
                    </div>

                    <div className="py-2 text-center text-slate-900 font-bold opacity-30">
                      ---------------------------------
                    </div>

                    {/* Summary Section */}
                    <div className="space-y-2 text-slate-900 font-black">
                      <div className="flex justify-between">
                        <span>Maxsulotlar jami:</span>
                        <span>{new Intl.NumberFormat('uz-UZ').format(selectedOrder.items_subtotal)} sum</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span>Dastavka narxi:</span>
                        <span>+{new Intl.NumberFormat('uz-UZ').format(selectedOrder.delivery_fee)} sum</span>
                      </div>
                      
                      {selectedOrder.promo_code && (
                        <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                          <span>Promo kod ({selectedOrder.promo_code}):</span>
                          <span>-{new Intl.NumberFormat('uz-UZ').format(selectedOrder.discount_amount)} sum</span>
                        </div>
                      )}

                      <div className="pt-3 border-t border-slate-300 flex justify-between items-center text-base">
                        <span className="font-black">To'lanadi:</span>
                        <span className="font-black bg-yellow-100 px-2 py-0.5 rounded italic">
                          {new Intl.NumberFormat('uz-UZ').format(parsePrice(selectedOrder.totalAmount))} sum
                        </span>
                      </div>
                      <div className="flex justify-between pt-2">
                        <span>To'lov usuli:</span>
                        <span>naqd / online</span>
                      </div>
                    </div>

                    {/* Barcode Section */}
                    <div className="mt-4 pt-4 border-t border-dashed border-slate-300 flex flex-col items-center">
                      <div className="mb-2 w-full flex justify-center">
                        <img 
                          src={`https://bwipjs-api.metafloor.com/?bcid=code128&text=${selectedOrder.orderNumber.split(' • ')[1]?.replace('#ID-', '') || selectedOrder.orderNumber}&scale=4&rotate=N&includetext&textsize=10&textcolor=000000&barwidth=2&height=12`} 
                          alt="Order Barcode"
                          className="w-full h-20 object-contain mix-blend-multiply"
                        />
                      </div>
                      <span className="text-[9px] font-black tracking-[0.4em] text-slate-500 uppercase">RAKETA MARKET • BUYURTMA ID</span>
                    </div>
                  </div>

                  {/* Fixed Button Footer at the bottom of the left column */}
                  <div className="p-6 border-t border-slate-100 bg-slate-50/50 shrink-0">
                    {['Pending', 'Picking'].includes(selectedOrder.status) ? (
                      <button 
                        onClick={() => {
                          if (selectedOrder.status === 'Cancelled') {
                            setAlertConfig({
                              title: 'BEKOR QILINGAN',
                              message: 'Ushbu buyurtma bekor qilingan, chek chiqarib bo\'lmaydi.',
                              type: 'error'
                            });
                            return;
                          }
                          setAlertConfig({
                            title: 'CHOP ETISH',
                            message: 'Check chop etish tizimi ulanmoqda...',
                            type: 'success'
                          });
                          setIsReceiptPrinted(true);
                        }}
                        className={`w-full py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-3 shadow-xl shadow-sidebarDark/10 ${
                          selectedOrder.status === 'Cancelled'
                          ? 'bg-slate-200 text-slate-500 cursor-not-allowed opacity-50'
                          : (pickedItems.size === orderItems.length && orderItems.length > 0)
                            ? 'bg-sidebarDark text-white hover:scale-[1.02] active:scale-95' 
                            : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                        }`}
                      >
                        <Printer size={20} />
                        <span>CHEK CHIQARISH</span>
                      </button>
                    ) : (
                      <div className="w-full py-4 rounded-2xl bg-green-50 border border-green-100 text-green-600 font-black text-xs flex items-center justify-center gap-2">
                        <CheckCircle2 size={16} />
                        <span>CHEK CHIQARILGAN</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side: Product Picking List */}
                <div className="flex-1 bg-slate-50/50 flex flex-col overflow-hidden">
                  <div className="p-8 border-b border-slate-100 bg-white shrink-0">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-xl font-black text-slate-800">Mahsulotlarni tekshirish</h3>
                        <p className="text-slate-500 text-sm">Buyurtmani yig'ish va qadoqlash uchun tekshirib chiqing</p>
                      </div>
                      <div className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        selectedOrder.status === 'Cancelled'
                        ? 'bg-red-100 text-red-600'
                        : pickedItems.size === orderItems.length && orderItems.length > 0
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {pickedItems.size} / {orderItems.length} yig'ildi
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-8">
                    {isLoadingItems ? (
                      <div className="h-full flex items-center justify-center">
                         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sidebarDark"></div>
                      </div>
                    ) : orderItems.length > 0 ? (
                      <div className="space-y-3">
                        {orderItems.map((item) => {
                          const isPicked = pickedItems.has(item.id);
                          return (
                            <div 
                              key={item.id}
                              onClick={() => {
                                if (selectedOrder.status === 'Cancelled') {
                                  setAlertConfig({
                                    title: "Buyurtma bekor qilingan",
                                    message: "Ushbu buyurtma mijoz tomonidan bekor qilingan, uni yig'ish (picking) imkoniyati yo'q.",
                                    type: 'warning'
                                  });
                                  return;
                                }
                                togglePicked(item);
                              }}
                              className={`bg-white p-4 rounded-2xl border transition-all duration-300 flex items-center gap-4 group ${
                                selectedOrder.status === 'Cancelled' 
                                  ? 'opacity-70 cursor-not-allowed border-red-100 bg-red-50/5' 
                                  : 'cursor-pointer hover:border-slate-300 hover:scale-[1.01] active:scale-[0.99]'
                              } ${
                                isPicked && selectedOrder.status !== 'Cancelled' ? 'border-green-200 bg-green-50/10 opacity-70' : 
                                isPicked && selectedOrder.status === 'Cancelled' ? 'border-red-200 bg-red-50/10' : 
                                'border-slate-100'
                              }`}
                            >
                              {/* Product Image */}
                              <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-50">
                                {item.products?.image_url ? (
                                  <img src={item.products.image_url} alt={item.products.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                                    <ShoppingBag size={24} />
                                  </div>
                                )}
                              </div>

                              {/* Product Details */}
                              <div className="flex-1 min-w-0">
                                <h4 className={`font-bold text-slate-800 truncate ${isPicked ? 'line-through text-slate-400' : ''}`}>
                                  {item.products?.name}
                                </h4>
                                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                  <span className="bg-slate-100 px-2 py-0.5 rounded font-mono">{item.products?.sku || 'SKU yo\'q'}</span>
                                  <span>{new Intl.NumberFormat('uz-UZ').format(item.price_at_time)} sum</span>
                                </div>
                                
                                {/* Real-time Stock Automation Status */}
                                <div className="mt-1 flex items-center gap-1.5">
                                  {selectedOrder.status === 'Cancelled' ? (
                                    <>
                                      <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
                                      <span className="text-[10px] font-black text-orange-600 uppercase tracking-tight">
                                        Olingan mahsulot omborga qaytarildi
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-tight">
                                        Ombordan {item.quantity} dona ayrildi
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Quantity */}
                              <div className="text-right px-4">
                                <div className="text-lg font-black text-slate-900">x {item.quantity}</div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase">dona</div>
                              </div>

                              {/* Checkbox */}
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                isPicked ? 
                                  selectedOrder.status === 'Cancelled' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-green-500 text-white shadow-lg shadow-green-500/20' 
                                : 'bg-slate-50 text-slate-300 group-hover:bg-slate-100'
                              }`}>
                                {isPicked ? 
                                  selectedOrder.status === 'Cancelled' ? <X size={24} /> : <CheckCircle2 size={24} /> 
                                : <Circle size={24} />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                           <ShoppingBag size={40} />
                        </div>
                        <p className="text-slate-500">Mahsulotlar topilmadi</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Footer Actions */}
                  <div className="p-8 bg-white border-t border-slate-100">
                    <button 
                      disabled={pickedItems.size < orderItems.length || !['Pending', 'Picking'].includes(selectedOrder.status)}
                      onClick={() => {
                        if (pickedItems.size === orderItems.length && selectedOrder) {
                          if (selectedOrder.status !== 'Picking' && selectedOrder.status !== 'Pending') return;
                          
                          if (!isReceiptPrinted) {
                            setAlertConfig({
                              title: 'DIQQAT: Chek chiqarilmagan!',
                              message: "Chek chiqarilmasa, mijozga qog'ozli kvitansiya yetkazilmaydi va bu buyurtma hisob-kitobida chalkashliklarga olib kelishi mumkin.\n\nIltimos, avval kvitansiyani chiqaring!",
                              type: 'warning'
                            });
                            return;
                          }
                          handleUpdateStatus(selectedOrder.id, selectedOrder.status);
                          setSelectedOrder(null);
                        }
                      }}
                      className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all ${
                        (pickedItems.size === orderItems.length && ['Pending', 'Picking'].includes(selectedOrder.status))
                        ? 'bg-green-600 text-white shadow-xl shadow-green-600/20 hover:scale-[1.02] active:scale-95' 
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {selectedOrder.status === 'Cancelled' ? <X size={20} /> : 
                       !['Pending', 'Picking'].includes(selectedOrder.status) ? <CheckCircle2 size={20} /> :
                       (pickedItems.size === orderItems.length ? <ArrowRight size={20} /> : <Package size={20} />)}
                      <span>
                        {selectedOrder.status === 'Cancelled' ? 'BUYURTMA BEKOR QILINGAN' : 
                         selectedOrder.status === 'Waiting' ? 'KURYER KUTILMOQDA' :
                         selectedOrder.status === 'OnTheWay' ? 'BUYURTMA YO\'LDA' :
                         ['Delivered', 'Returned'].includes(selectedOrder.status) ? 'YAKUNLANGAN' :
                         (pickedItems.size === orderItems.length ? 'KURYERGA YUBORISH' : 'MAHSULOTLARNI BELGILANG')}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Custom Alert Modal */}
      {alertConfig && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
            <div className={`h-2 ${
              alertConfig.type === 'warning' ? 'bg-orange-500' : 
              alertConfig.type === 'error' ? 'bg-red-500' : 'bg-green-500'
            }`} />
            <div className="p-8 text-center space-y-4">
              <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center ${
                alertConfig.type === 'warning' ? 'bg-orange-50 text-orange-500' : 
                alertConfig.type === 'error' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'
              }`}>
                {alertConfig.type === 'warning' && <ClipboardList size={32} />}
                {alertConfig.type === 'error' && <X size={32} />}
                {alertConfig.type === 'success' && <CheckCircle2 size={32} />}
              </div>
              <h3 className="text-xl font-black text-slate-900 leading-tight">{alertConfig.title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{alertConfig.message}</p>
              <button 
                onClick={() => setAlertConfig(null)}
                className={`w-full py-4 rounded-2xl font-black text-sm transition-all shadow-lg active:scale-95 mt-4 ${
                  alertConfig.type === 'warning' ? 'bg-orange-600 text-white shadow-orange-600/20 hover:bg-orange-700' : 
                  alertConfig.type === 'error' ? 'bg-red-600 text-white shadow-red-600/20 hover:bg-red-700' : 
                  'bg-green-600 text-white shadow-green-600/20 hover:bg-green-700 border border-green-500/50'
                }`}
              >
                TUSHUNARLI
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Fulfillment;
