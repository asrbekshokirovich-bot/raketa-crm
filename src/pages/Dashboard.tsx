import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { 
  Rocket,
  ShoppingBag, 
  X,
  CheckCircle2, 
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Users,
  ChevronRight,
  Package,
  Tag,
  TicketPercent,
  MousePointer2,
  TrendingDown,
  TrendingUp
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();
  const displayName = user?.fullName ? user.fullName.split(' ')[0] : (user?.email ? user.email.split('@')[0] : 'Xodim');
  const [activeRange, setActiveRange] = useState('7_days');
  const [loading, setLoading] = useState(true);

  // States for real data
  const [stats, setStats] = useState({
    total: 0,
    delivered: 0,
    cancelled: 0,
    returned: 0,
    warehouseStock: 0,
    activeListings: 0,
    withDiscount: 0,
    withoutDiscount: 0,
    uniqueProducts: 0,
    totalInventoryValue: 0
  });
  const [salesData, setSalesData] = useState<{ name: string; total: number }[]>([]);
  const [lowStockItems, setLowStockItems] = useState<{ name: string; stock: number; sku: string }[]>([]);
  const [quickStatuses, setQuickStatuses] = useState({
    waiting: 0,
    onTheWay: 0
  });
  const [trends, setTrends] = useState<{
    total: { change: string; trend: 'up' | 'down' };
    delivered: { change: string; trend: 'up' | 'down' };
    cancelled: { change: string; trend: 'up' | 'down' };
    returned: { change: string; trend: 'up' | 'down' };
  }>({
    total: { change: '0%', trend: 'up' },
    delivered: { change: '0%', trend: 'up' },
    cancelled: { change: '0%', trend: 'up' },
    returned: { change: '0%', trend: 'up' }
  });

  const [bestSellers, setBestSellers] = useState<{ id: string; name: string; sales: number; price: number; stock: number }[]>([]);
  const [leastSellers, setLeastSellers] = useState<{ id: string; name: string; sales: number; price: number; stock: number }[]>([]);
  const [promoStats, setPromoStats] = useState<{ id: string; code: string; discount: string; used: number; total: number; trend: 'up' | 'down' }[]>([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Setup Time Ranges
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfYesterday = new Date(startOfToday);
      startOfYesterday.setDate(startOfYesterday.getDate() - 1);
      
      const startOfTodayStr = startOfToday.toISOString();
      const startOfYesterdayStr = startOfYesterday.toISOString();

      // For charts and general filtering
      let filterDate = new Date();
      if (activeRange === '7_days') filterDate.setDate(filterDate.getDate() - 7);
      else if (activeRange === '30_days') filterDate.setDate(filterDate.getDate() - 30);
      else if (activeRange === 'month') filterDate = new Date(filterDate.getFullYear(), filterDate.getMonth(), 1);
      
      const filterDateStr = filterDate.toISOString();

      // Fetch orders for the whole relevant period (at least from yesterday)
      const fetchStart = filterDateStr < startOfYesterdayStr ? filterDateStr : startOfYesterdayStr;

      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, status, created_at')
        .gte('created_at', fetchStart);

      if (!ordersError && ordersData) {
        // Current Stats (for the selected filter range)
        const currentData = ordersData.filter(o => o.created_at >= filterDateStr);
        setStats(prev => ({
          ...prev,
          total: currentData.length,
          delivered: currentData.filter(o => o.status === 'Delivered').length,
          cancelled: currentData.filter(o => o.status === 'Cancelled').length,
          returned: currentData.filter(o => o.status === 'Returned').length
        }));

        // Calculate Trends (Today vs Yesterday)
        const todayData = ordersData.filter(o => o.created_at >= startOfTodayStr);
        const yesterdayData = ordersData.filter(o => o.created_at >= startOfYesterdayStr && o.created_at < startOfTodayStr);

        const calculateTrend = (cat: 'total' | 'Delivered' | 'Cancelled' | 'Returned') => {
          const tCount = cat === 'total' ? todayData.length : todayData.filter(o => o.status === cat).length;
          const yCount = cat === 'total' ? yesterdayData.length : yesterdayData.filter(o => o.status === cat).length;
          
          if (yCount === 0) {
             return { change: tCount > 0 ? `+${tCount}` : '0%', trend: tCount > 0 ? 'up' as const : 'down' as const };
          }
          const diff = tCount - yCount;
          const pct = Math.round((diff / yCount) * 100);
          return {
            change: `${pct >= 0 ? '+' : ''}${pct}%`,
            trend: pct >= 0 ? 'up' as const : 'down' as const
          };
        };

        setTrends({
          total: calculateTrend('total'),
          delivered: calculateTrend('Delivered'),
          cancelled: calculateTrend('Cancelled'),
          returned: calculateTrend('Returned')
        });

        // 2. Process Sales Data for Chart (Daily)
        const last7Days = [...Array(7)].map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - i);
          return d.toISOString().split('T')[0];
        }).reverse();

        const weekdays = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan'];
        const chartMapped = last7Days.map(dateStr => {
          const count = ordersData.filter(o => o.created_at.startsWith(dateStr)).length;
          const dateObj = new Date(dateStr);
          return {
            name: weekdays[dateObj.getDay()],
            total: count
          };
        });
        setSalesData(chartMapped);

        // 3. Quick Statuses
        setQuickStatuses({
          waiting: ordersData.filter(o => o.status === 'Waiting').length,
          onTheWay: ordersData.filter(o => o.status === 'OnTheWay').length
        });
      }

      // 4. Low Stock
      const { data: productsData } = await supabase.from('products').select('id, name, stock, sku, price').lt('stock', 15).order('stock', { ascending: true }).limit(5);
      if (productsData) setLowStockItems(productsData);

      // 6. Best & Least Sellers (Using the already fetched ordersData)
      if (!ordersError && ordersData && ordersData.length > 0) {
        // Filter orders by the requested "sold" statuses
        const soldOrders = ordersData.filter(o => 
          ['OnTheWay', 'Delivered'].includes(o.status)
        );

        if (soldOrders.length > 0) {
          const orderIds = soldOrders.map(o => o.id);
          const { data: itemsData } = await supabase
            .from('order_items')
            .select('product_id, quantity')
            .in('order_id', orderIds);

          if (itemsData) {
            const salesMap: Record<string, number> = {};
            itemsData.forEach(item => {
              salesMap[item.product_id] = (salesMap[item.product_id] || 0) + (item.quantity || 0);
            });

            // Get all products to match names
            const { data: allProductsForSales } = await supabase.from('products').select('id, name, price, stock');
            
            if (allProductsForSales) {
              const processedProducts = allProductsForSales.map(p => ({
                id: p.id,
                name: p.name,
                sales: salesMap[p.id] || 0,
                price: p.price || 0,
                stock: p.stock || 0
              }));

              const best = [...processedProducts]
                .sort((a, b) => b.sales - a.sales)
                .filter(p => p.sales > 0)
                .slice(0, 5);
              
              const least = [...processedProducts]
                .filter(p => p.stock > 0) // Only items we can actually sell
                .sort((a, b) => a.sales - b.sales)
                .slice(0, 5);

              setBestSellers(best);
              setLeastSellers(least);
            }
          }
        } else {
          // No sold orders in this period
          setBestSellers([]);
          setLeastSellers([]);
        }
      }

      // 7. Promo Codes & Trends
      const { data: promos } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('is_active', true)
        .order('used_count', { ascending: false });

      if (promos) {
        // Simple trend logic based on used_count (mocking actual daily trend for now)
        const mappedPromos = promos.map(p => ({
          id: p.id,
          code: p.code,
          discount: `${p.value}${p.type === 'percent' ? '%' : ' UZS'}`,
          used: p.used_count || 0,
          total: p.total_limit || 0,
          trend: (p.used_count % 3 === 0) ? 'up' as const : 'down' as const // Placeholder trend
        }));
        setPromoStats(mappedPromos);
      }

      // 5. Fetch Global Stats (Warehouse & Listings)
      const [allProducts, activeListings] = await Promise.all([
        supabase.from('products').select('stock, price'),
        supabase.from('product_listings').select('discount_percent').eq('status', 'Active')
      ]);

      const totalStock = allProducts.data?.reduce((sum, p) => sum + (p.stock || 0), 0) || 0;
      const totalValue = allProducts.data?.reduce((sum, p) => sum + ((p.stock || 0) * (p.price || 0)), 0) || 0;
      const uniqueTypes = allProducts.data?.length || 0;

      const totalActive = activeListings.data?.length || 0;
      const withDiscount = activeListings.data?.filter(l => l.discount_percent && l.discount_percent !== '0').length || 0;
      const withoutDiscount = totalActive - withDiscount;

      setStats(prev => ({
        ...prev,
        warehouseStock: totalStock,
        activeListings: totalActive,
        withDiscount,
        withoutDiscount,
        uniqueProducts: uniqueTypes,
        totalInventoryValue: totalValue
      }));

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Set up real-time subscriptions
    const ordersChannel = supabase
      .channel('dashboard_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchDashboardData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchDashboardData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
        fetchDashboardData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'promo_codes' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
    };
  }, []);

  const performanceStats = [
    { label: 'Jami buyurtmalar', value: `${stats.total} ta`, change: trends.total.change, trend: trends.total.trend, icon: <ShoppingBag className="text-purple-600" /> },
    { label: 'Yetkazildi', value: `${stats.delivered} ta`, change: trends.delivered.change, trend: trends.delivered.trend, icon: <CheckCircle2 className="text-green-600" /> },
    { label: 'Bekor qilindi', value: `${stats.cancelled} ta`, change: trends.cancelled.change, trend: trends.cancelled.trend, icon: <X className="text-red-600" /> },
    { label: 'Qaytarildi', value: `${stats.returned} ta`, change: trends.returned.change, trend: trends.returned.trend, icon: <ArrowDownRight className="text-orange-600" /> }
  ];

  return (
    <div className="p-4 space-y-6 animate-in fade-in duration-500 w-full relative">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column (Core Metrics & Charts) */}
        <div className="space-y-6">
          {loading && stats.total === 0 && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm rounded-[24px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sidebarDark"></div>
            </div>
          )}
          
          {/* Welcome Banner */}
          <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-5 flex items-center gap-6 relative overflow-hidden">
            <div className="absolute top-1/2 right-10 -translate-y-1/2 w-[300px] h-[300px] bg-sidebarDark/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="w-16 h-16 bg-sidebarDark rounded-2xl flex items-center justify-center text-white drop-shadow-lg rotate-3 hover:rotate-0 transition-transform cursor-default relative z-10 shrink-0">
              <Rocket size={32} strokeWidth={2.5} />
            </div>
            <div className="relative z-10">
              <h1 className="text-xl font-black text-slate-800 capitalize tracking-tight">
                Xush kelibsiz, {displayName}! 👋
              </h1>
              <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                Bugungi ko'rsatkichlar tahlili.
              </p>
            </div>
            <div className="ml-auto relative z-10 hidden md:block">
               <select 
                 value={activeRange}
                 onChange={(e) => setActiveRange(e.target.value)}
                 className="px-3 py-2 rounded-xl border border-gray-200 outline-none bg-white font-bold text-[11px] text-slate-600 focus:ring-2 focus:ring-sidebarDark/10 transition-all cursor-pointer shadow-sm"
                 aria-label="Vaqt oralig'ini tanlash"
                 title="Vaqt oralig'i"
               >
                 <option value="7_days">Oxirgi 7 kun</option>
                 <option value="30_days">Oxirgi 30 kun</option>
                 <option value="month">Shu oy</option>
               </select>
            </div>
          </div>

          {/* KPI Cards (Grid 2x2) */}
          <div className="grid grid-cols-2 gap-4">
            {performanceStats.map((stat, i) => (
              <div key={i} className="bg-white p-4 rounded-[24px] border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                <div className="flex justify-between items-center mb-2">
                  <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                    {stat.icon && React.cloneElement(stat.icon as any, { size: 16 })}
                  </div>
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-lg flex items-center gap-0.5 ${
                    stat.trend === 'up' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                  }`}>
                    {stat.trend === 'up' ? <ArrowUpRight size={8} /> : <ArrowDownRight size={8} />}
                    {stat.change}
                  </span>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                  <p className="text-lg font-black text-slate-900 leading-tight">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Main Orders Chart */}
          <div className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Buyurtmalar Dinamikasi</h3>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-sidebarDark"></div>
                <span className="text-[9px] font-bold text-slate-600 uppercase">Buyurtmalar</span>
              </div>
            </div>
            
            <div className="h-[120px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1e293b" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#1e293b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }}
                    height={20}
                  />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      padding: '8px',
                      fontSize: '10px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#1e293b" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorTotal)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-5">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-500 border border-red-100">
                     <AlertTriangle size={16} />
                  </div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Tugayotgan Mahsulotlar</h3>
               </div>
               <span className="text-[8px] font-black text-red-500 px-2 py-0.5 bg-red-50 rounded-full border border-red-100">KRITIK</span>
            </div>
            
            <div className="space-y-3">
              {lowStockItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-2xl border border-slate-50 bg-slate-50/30 group hover:border-sidebarDark/10 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-sidebarDark transition-all">
                      <ShoppingBag size={18} />
                    </div>
                    <div>
                      <p className="font-black text-slate-900 text-[11px] truncate w-[150px]">{item.name}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{item.sku}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-black ${item.stock < 10 ? 'text-red-500' : 'text-orange-500'}`}>{item.stock} dona</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Qoldiq</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (Analytics & Statistics) */}
        <div className="space-y-6">
          {/* Best & Least Sellers (Side by Side Row) */}
          <div className="grid grid-cols-2 gap-4">
            {/* Top Sellers Widget */}
            <div className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-sidebarDark text-white flex items-center justify-center shadow-lg shadow-sidebarDark/10">
                  <TrendingUp size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Eng ko'p</h3>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Top sotilganlar</p>
                </div>
              </div>
              <div className="space-y-3">
                {bestSellers.map((item, i) => (
                  <div key={item.id} className="flex items-center gap-2.5 p-1.5 rounded-xl transition-all group hover:bg-slate-50">
                    <div className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center text-[9px] font-black text-slate-400 group-hover:bg-sidebarDark group-hover:text-white transition-all">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-slate-800 truncate" title={item.name}>{item.name}</p>
                      <p className="text-[8px] font-bold text-slate-400">{item.price.toLocaleString()} UZS</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-black text-sidebarDark">{item.sales}</p>
                    </div>
                  </div>
                ))}
                {bestSellers.length === 0 && <p className="text-center py-4 text-[10px] font-bold text-slate-400">Ma'lumot yo'q</p>}
              </div>
            </div>

            {/* Least Sellers Widget */}
            <div className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center border border-orange-100">
                  <TrendingDown size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Eng kam</h3>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Sotuvi past</p>
                </div>
              </div>
              <div className="space-y-3">
                {leastSellers.map((item) => (
                  <div key={item.id} className="flex items-center gap-2.5 p-1.5 rounded-xl transition-all group hover:bg-slate-50">
                    <div className="w-6 h-6 rounded-lg bg-orange-50 flex items-center justify-center text-orange-400 group-hover:bg-orange-500 group-hover:text-white transition-all">
                      <MousePointer2 size={12} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-slate-800 truncate" title={item.name}>{item.name}</p>
                      <p className="text-[8px] font-bold text-orange-400">Qoldiq: {item.stock}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-black text-orange-600">{item.sales}</p>
                    </div>
                  </div>
                ))}
                {leastSellers.length === 0 && <p className="text-center py-4 text-[10px] font-bold text-slate-400">Ma'lumot yo'q</p>}
              </div>
            </div>
          </div>

          {/* Promo Codes Analytics Card */}
          <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm transition-all hover:shadow-md">
             <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                      <TicketPercent size={22} />
                   </div>
                   <div>
                      <h3 className="text-sm font-black text-slate-800">Promo kodlar tahlili</h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">Faollik ko'rsatkichi</p>
                   </div>
                </div>
             </div>
             
             <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
                {promoStats.map((promo) => (
                  <div key={promo.id} className="p-4 rounded-[24px] border border-slate-50 bg-slate-50/50 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="px-3 py-1 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-900 shadow-sm tracking-tight">{promo.code}</span>
                        <span className="text-xs font-bold text-blue-600">{promo.discount}</span>
                      </div>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${promo.trend === 'up' ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
                        {promo.trend === 'up' ? <ArrowUpRight size={16} /> : <TrendingDown size={16} />}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                       <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                          <span>Ishlatildi</span>
                          <span className="text-slate-600">{promo.used} {' / '} {promo.total}</span>
                       </div>
                       <div className="h-2 w-full bg-white rounded-full overflow-hidden border border-slate-100 shadow-inner p-[1px]">
                          <div 
                            className="h-full bg-blue-500 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                            style={{ width: (promo.total > 0 ? (promo.used / promo.total) * 100 : 0) + '%' }}
                          />
                       </div>
                    </div>
                  </div>
                ))}
                {promoStats.length === 0 && <p className="text-center py-6 text-xs font-bold text-slate-400">Faol promo kodlar hozircha mavjud emas</p>}
             </div>
          </div>

          {/* Quick Links Section */}
          <div className="grid grid-cols-2 gap-4">
               <Link to="/orders" className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm transition-all group hover:border-sidebarDark/10 hover:shadow-md block relative overflow-hidden">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-sidebarDark group-hover:bg-sidebarDark group-hover:text-white transition-all shadow-sm">
                        <Tag size={20} />
                     </div>
                     <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Sotuvda</p>
                        <h4 className="text-lg font-black text-slate-900 tracking-tight">{stats.activeListings} <span className="text-[9px] text-slate-400">tur</span></h4>
                     </div>
                  </div>
                  <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                     <ChevronRight size={14} className="text-sidebarDark" />
                  </div>
               </Link>

               <Link to="/inventory" className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm transition-all group hover:border-sidebarDark/10 hover:shadow-md block relative overflow-hidden">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-sidebarDark group-hover:bg-sidebarDark group-hover:text-white transition-all shadow-sm">
                        <Package size={20} />
                     </div>
                     <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Omborda</p>
                        <h4 className="text-lg font-black text-slate-900 tracking-tight">{stats.uniqueProducts} <span className="text-[9px] text-slate-400">hil</span></h4>
                     </div>
                  </div>
                  <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                     <ChevronRight size={14} className="text-sidebarDark" />
                  </div>
               </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
