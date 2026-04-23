import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Package, 
  Calendar,
  Timer
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import StaffSalariesModal from '../components/StaffSalariesModal';

export default function Finance() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    deliveredTotal: 0,
    cancelledTotal: 0,
    waitingTotal: 0,
    inventoryValue: 0,
    employeeSalaries: 0, 
  });

  const [chartData, setChartData] = useState<{ date: string; Tushum: number; Zarar: number }[]>([]);
  const [chartPeriod, setChartPeriod] = useState<'14_days' | 'month' | 'custom'>('14_days');
  const [customDate, setCustomDate] = useState({ start: '', end: '' });
  const [rawDateMap, setRawDateMap] = useState<Record<string, { tushum: number; zarar: number }>>({});
  const [isSalariesModalOpen, setIsSalariesModalOpen] = useState(false);

  const fetchFinanceData = async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        // Fetch all orders
        const { data: orders } = await supabase.from('orders').select('status, total_amount, created_at');
        // Fetch all products
        const { data: products } = await supabase.from('products').select('price, stock');
        // Fetch employees salaries from profiles
        const { data: employeesData } = await supabase.from('profiles').select('salary');

        let deliveredSum = 0;
        let cancelledSum = 0;
        let waitingSum = 0;
        
        const dateMap: Record<string, { tushum: number; zarar: number }> = {};

        if (orders) {
          orders.forEach(order => {
            // Parse total_amount (e.g. "230,000" or "230,000 UZS" or integer)
            let amount = 0;
            if (typeof order.total_amount === 'string') {
              amount = parseInt(order.total_amount.replace(/[^0-9]/g, '')) || 0;
            } else if (typeof order.total_amount === 'number') {
              amount = order.total_amount;
            }

            const dateStr = new Date(order.created_at).toLocaleDateString('en-CA'); // YYYY-MM-DD
            if (!dateMap[dateStr]) dateMap[dateStr] = { tushum: 0, zarar: 0 };

            if (order.status === 'Delivered') {
              deliveredSum += amount;
              dateMap[dateStr].tushum += amount;
            } else if (order.status === 'Cancelled' || order.status === 'Returned') {
              cancelledSum += amount;
              dateMap[dateStr].zarar += amount;
            } else if (order.status === 'Waiting') {
              waitingSum += amount;
            }
          });
        }

        // Save parsed map for dates to state
        setRawDateMap(dateMap);

        // Calculate total inventory value
        let inventorySum = 0;
        if (products) {
          products.forEach(p => {
            inventorySum += (p.price || 0) * (p.stock || 0);
          });
        }

        // Calculate total employee salaries dynamically
        let totalSalaries = 0;
        if (employeesData) {
          totalSalaries = employeesData.reduce((sum, emp) => sum + (emp.salary || 0), 0);
        }

        setMetrics({
          deliveredTotal: deliveredSum,
          cancelledTotal: cancelledSum,
          waitingTotal: waitingSum,
          inventoryValue: inventorySum,
          employeeSalaries: totalSalaries
        });
      } catch (error) {
        console.error("Error fetching finance logic", error);
      } finally {
        if (!silent) setLoading(false);
      }
    };

  useEffect(() => {
    fetchFinanceData();
  }, []);

  useEffect(() => {
    // Generate dates based on chartPeriod
    const finalChartData: { date: string; Tushum: number; Zarar: number }[] = [];
    let datesArray: Date[] = [];
    
    if (chartPeriod === '14_days') {
      for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        datesArray.push(d);
      }
    } else if (chartPeriod === 'month') {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        datesArray.push(d);
      }
    } else if (chartPeriod === 'custom') {
      if (customDate.start && customDate.end) {
        let curr = new Date(customDate.start);
        const endD = new Date(customDate.end);
        endD.setHours(23, 59, 59, 999);
        while (curr <= endD) {
          datesArray.push(new Date(curr));
          curr.setDate(curr.getDate() + 1);
        }
      } else {
         for (let i = 13; i >= 0; i--) {
           const d = new Date(); d.setDate(d.getDate() - i);
           datesArray.push(d);
         }
      }
    }

    datesArray.forEach(d => {
      const dateStr = d.toLocaleDateString('en-CA');
      finalChartData.push({
        date: dateStr,
        Tushum: rawDateMap[dateStr]?.tushum || 0,
        Zarar: rawDateMap[dateStr]?.zarar || 0
      });
    });

    setChartData(finalChartData);
  }, [chartPeriod, customDate, rawDateMap]);

  const formatUz = (num: number) => {
    return num.toLocaleString('uz-UZ') + ' UZS';
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Moliya Bo'limi</h1>
          <p className="text-[13px] font-bold text-slate-400 mt-1">Barcha daromad va xarajatlar statistikasi</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sidebarDark"></div>
        </div>
      ) : isSalariesModalOpen ? (
        <StaffSalariesModal 
          isOpen={isSalariesModalOpen}
          onClose={() => setIsSalariesModalOpen(false)}
          onUpdate={() => fetchFinanceData(true)}
        />
      ) : (
        <>
          {/* Main KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            
            {/* 1. Yetkazib berilgan tavar narxi */}
            <div className="bg-white p-5 rounded-[24px] border border-green-100 transition-all shadow-sm hover:shadow-md relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all duration-500 scale-150 rotate-12">
                <TrendingUp size={80} className="text-green-600" />
              </div>
              <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center mb-4 border border-green-100 relative z-10 group-hover:scale-110 transition-transform">
                <DollarSign size={24} />
              </div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider relative z-10 truncate" title="1. Yetkazib berilgan summasi">1. Yetkazib berilgan summasi</p>
              <h3 className="text-xl font-black text-slate-800 mt-1 tracking-tight relative z-10">{formatUz(metrics.deliveredTotal)}</h3>
            </div>

            {/* 2. Bekor qilingan tavar narxi */}
            <div className="bg-white p-5 rounded-[24px] border border-red-100 transition-all shadow-sm hover:shadow-md relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all duration-500 scale-150 -rotate-12">
                <TrendingDown size={80} className="text-red-600" />
              </div>
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4 border border-red-100 relative z-10 group-hover:scale-110 transition-transform">
                <TrendingDown size={24} />
              </div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider relative z-10 truncate" title="2. Bekor qilingan summasi">2. Bekor qilingan summasi</p>
              <h3 className="text-xl font-black text-slate-800 mt-1 tracking-tight relative z-10">{formatUz(metrics.cancelledTotal)}</h3>
            </div>

            {/* 3. Kuryerni kutayotgan narx */}
            <div className="bg-white p-5 rounded-[24px] border border-orange-100 transition-all shadow-sm hover:shadow-md relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all duration-500 scale-150 rotate-12">
                <Timer size={80} className="text-orange-600" />
              </div>
              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mb-4 border border-orange-100 relative z-10 group-hover:scale-110 transition-transform">
                <Timer size={24} />
              </div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider relative z-10 truncate" title="3. Kuryerni kutayotgan buyurtmalar narxi">3. Kuryerni kutayotgan buyurtmalar narxi</p>
              <h3 className="text-xl font-black text-slate-800 mt-1 tracking-tight relative z-10">{formatUz(metrics.waitingTotal)}</h3>
            </div>

            {/* 4. Ombordagi maxsulotlar narxi */}
            <div className="bg-white p-5 rounded-[24px] border border-purple-100 transition-all shadow-sm hover:shadow-md relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all duration-500 scale-150 -rotate-12">
                <Package size={80} className="text-purple-600" />
              </div>
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 border border-purple-100 relative z-10 group-hover:scale-110 transition-transform">
                <Package size={24} />
              </div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider relative z-10 truncate" title="4. Ombor tovar qimmati">4. Ombor tovar qimmati</p>
              <h3 className="text-xl font-black text-slate-800 mt-1 tracking-tight relative z-10">{formatUz(metrics.inventoryValue)}</h3>
            </div>

            {/* 5. Ishchi Maoshi (Interactive Button) */}
            <button 
              type="button"
              onClick={() => setIsSalariesModalOpen(true)}
              className="bg-gradient-to-br from-blue-50 to-white p-5 rounded-[24px] border-2 border-blue-200 transition-all shadow-sm hover:shadow-md hover:border-blue-400 relative overflow-hidden group cursor-pointer hover:-translate-y-1 text-left w-full"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all duration-500 scale-150 rotate-12">
                <Users size={80} className="text-blue-600" />
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white text-blue-600 flex items-center justify-center mb-4 border border-blue-100 relative z-10 group-hover:scale-110 transition-transform shadow-sm">
                <Users size={24} />
              </div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider relative z-10 truncate" title="5. Ishchi maoshlari jami">5. Ishchi maoshlari jami</p>
              <div className="flex items-center justify-between mt-1 relative z-10">
                <h3 className="text-xl font-black text-slate-800 tracking-tight">{formatUz(metrics.employeeSalaries)}</h3>
                <span className="bg-blue-600 text-white text-[9px] px-2 py-1 rounded-md font-bold shadow-sm group-hover:bg-blue-700 transition-colors">
                  Boshqarish &rarr;
                </span>
              </div>
            </button>

          </div>

          {/* 5. Narx Dinamikalari Chart */}
          <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm mt-6">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 border border-orange-100">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">5. Narx dinamikasi (Pul oqimi)</h3>
                  <p className="text-xs font-bold text-slate-400">Kunlik tushum va qochirilgan foyda grafigi</p>
                </div>
              </div>

              {/* Chart Filters */}
              <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                {chartPeriod === 'custom' && (
                  <div className="flex items-center gap-2">
                    <input 
                      type="date" 
                      title="Boshlanish sanasi"
                      aria-label="Boshlanish sanasi"
                      value={customDate.start}
                      onChange={(e) => setCustomDate(prev => ({ ...prev, start: e.target.value }))}
                      className="px-2 py-1.5 rounded-lg border border-gray-200 outline-none text-[10px] font-bold text-slate-600 focus:ring-1 focus:ring-sidebarDark/10"
                    />
                    <span className="text-slate-300">-</span>
                    <input 
                      type="date" 
                      title="Tugash sanasi"
                      aria-label="Tugash sanasi"
                      value={customDate.end}
                      onChange={(e) => setCustomDate(prev => ({ ...prev, end: e.target.value }))}
                      className="px-2 py-1.5 rounded-lg border border-gray-200 outline-none text-[10px] font-bold text-slate-600 focus:ring-1 focus:ring-sidebarDark/10"
                    />
                  </div>
                )}
                <select 
                  value={chartPeriod}
                  title="Grafik davrini tanlash"
                  aria-label="Grafik davrini tanlash"
                  onChange={(e) => setChartPeriod(e.target.value as any)}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-bold text-xs text-slate-600 focus:ring-1 focus:ring-sidebarDark/10 outline-none cursor-pointer shadow-sm"
                >
                  <option value="14_days">Oxirgi 14 kun</option>
                  <option value="month">Oylik (30 kun)</option>
                  <option value="custom">Qo'lda kiritish</option>
                </select>
              </div>
            </div>

            <div className="h-[400px] w-full pr-4">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTushum" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorZarar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }}
                      tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '16px', 
                        border: '1px solid #f1f5f9', 
                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                        padding: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}
                      formatter={(value: any) => [`${Number(value).toLocaleString('uz-UZ')} UZS`, '']}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 'bold' }} />
                    <Area 
                      type="monotone" 
                      name="Tasdiqlangan Foyda (Tushum)"
                      dataKey="Tushum" 
                      stroke="#22c55e" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorTushum)" 
                    />
                    <Area 
                      type="monotone" 
                      name="Bekor Qilingan (Zarar)"
                      dataKey="Zarar" 
                      stroke="#ef4444" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorZarar)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                 <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl">
                    <p className="text-slate-400 font-bold text-sm">Grafik uchun ma'lumotlar topilmadi</p>
                 </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
