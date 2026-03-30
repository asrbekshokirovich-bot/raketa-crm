import { 
  TrendingUp, 
  ShoppingBag, 
  Clock, 
  CheckCircle2, 
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Medal
} from 'lucide-react';

const Analytics = () => {
  const performanceStats = [
    { label: 'O\'rtacha yig\'ish vaqti', value: '12 min', change: '-2min', trend: 'up', icon: <Clock className="text-blue-600" /> },
    { label: 'Muvaffaqiyatli yetkazmalar', value: '98.4%', change: '+1.2%', trend: 'up', icon: <CheckCircle2 className="text-green-600" /> },
    { label: 'Qaytarilgan tovarlar', value: '1.2%', change: '-0.5%', trend: 'down', icon: <ArrowDownRight className="text-red-600" /> },
    { label: 'Kunlik buyurtmalar', value: '142 ta', change: '+18 ta', trend: 'up', icon: <ShoppingBag className="text-purple-600" /> }
  ];

  const topStaff = [
    { name: 'Sardorbek H.', role: 'Yig\'uvchi', score: '98 pts', orders: '450+', avatar: 'SH', color: 'bg-blue-500' },
    { name: 'Doniyor A.', role: 'Kuryer', score: '96 pts', orders: '380+', avatar: 'DA', color: 'bg-green-500' },
    { name: 'Nilufar M.', role: 'Yig\'uvchi', score: '95 pts', orders: '410+', avatar: 'NM', color: 'bg-purple-500' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-end bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analitika va KPI</h1>
          <p className="text-slate-500 text-sm mt-1">Hodimlar samaradorligi va savdo ko'rsatkichlarini real vaqtda kuzatish</p>
        </div>
        <div className="flex gap-2">
          <select title="Vaqt oralig'i" className="px-4 py-3 rounded-xl border border-gray-200 outline-none bg-white font-bold text-sm text-slate-600 focus:ring-2 focus:ring-sidebarDark/10">
            <option>Oxirgi 7 kun</option>
            <option>Oxirgi 30 kun</option>
            <option>Shu oy</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {performanceStats.map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center font-bold">
                {stat.icon}
              </div>
              <span className={`text-[10px] font-black px-2 py-1 rounded-lg flex items-center gap-0.5 ${
                stat.trend === 'up' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
              }`}>
                {stat.trend === 'up' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                {stat.change}
              </span>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Top Staff Leaderboard */}
        <div className="xl:col-span-1 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-fit">
          <div className="flex items-center gap-2 mb-6">
            <Medal className="text-mustard" size={24} />
            <h2 className="text-lg font-bold text-slate-900">Eng yaxshi hodimlar</h2>
          </div>
          <div className="space-y-4">
            {topStaff.map((staff, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${staff.color} flex items-center justify-center text-white font-bold text-xs shadow-lg`}>
                    {staff.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{staff.name}</p>
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">{staff.role}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-800">{staff.score}</p>
                  <p className="text-[10px] font-bold text-green-500 uppercase">{staff.orders} ta xizmat</p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-3 rounded-xl bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-widest hover:bg-slate-100 transition-all">
            Barchasini ko'rish
          </button>
        </div>

        {/* Growth/Trend Placeholder Chart */}
        <div className="xl:col-span-2 bg-sidebarDark rounded-2xl p-8 relative overflow-hidden shadow-2xl">
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-mustard text-[10px] font-black uppercase tracking-[0.2em] mb-1">Savdo o'sishi</p>
              <h2 className="text-2xl font-black text-white">+24.8%</h2>
            </div>
            <button title="O'sish tendentsiyasi" className="p-2 text-white/40 hover:text-white transition-colors">
              <TrendingUp size={24} />
            </button>
          </div>
          
          {/* Mock Chart Visual */}
          <div className="mt-12 h-32 flex items-end gap-2 group cursor-crosshair">
            {[
              { h: 40, cls: 'h-[40%]' },
              { h: 65, cls: 'h-[65%]' },
              { h: 45, cls: 'h-[45%]' },
              { h: 80, cls: 'h-[80%]' },
              { h: 55, cls: 'h-[55%]' },
              { h: 90, cls: 'h-[90%]' },
              { h: 75, cls: 'h-[75%]' },
              { h: 95, cls: 'h-[95%]' },
              { h: 85, cls: 'h-[85%]' },
              { h: 110, cls: 'h-[110%]' },
              { h: 100, cls: 'h-[100%]' },
              { h: 120, cls: 'h-[120%]' }
            ].map((item, i) => (
              <div 
                key={i} 
                className={`flex-1 bg-white/10 rounded-t-lg transition-all duration-500 hover:bg-mustard relative ${item.cls}`}
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-sidebarDark text-[8px] font-black px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.h}k
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-4 text-[9px] font-black text-white/30 uppercase tracking-widest">
            <span>Yan</span>
            <span>Fev</span>
            <span>Mar</span>
            <span>Apr</span>
            <span>May</span>
            <span>Iyun</span>
          </div>
          
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32" />
        </div>
      </div>

      {/* Distribution Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
            <ShoppingBag size={18} className="text-slate-400" /> Buyurtmalar statusi taqsimoti
          </h3>
          <div className="space-y-4">
            {[
              { label: 'Muvaffaqiyatli', value: 85, color: 'bg-green-500' },
              { label: 'Bekor qilingan', value: 10, color: 'bg-red-500' },
              { label: 'Qaytarilgan', value: 5, color: 'bg-yellow-500' }
            ].map((item, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-600">{item.label}</span>
                  <span className="text-slate-900">{item.value}%</span>
                </div>
                <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${item.color} ${
                      item.value === 85 ? 'w-[85%]' : 
                      item.value === 10 ? 'w-[10%]' : 
                      'w-[5%]'
                    }`} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-mustard/10 flex items-center justify-center text-mustard">
            <Star size={32} fill="currentColor" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-slate-900">Mijozlar mamnuniyati</h4>
            <p className="text-4xl font-black text-slate-900 mt-1">4.9 / 5.0</p>
            <p className="text-xs font-medium text-slate-400 mt-2 italic">1,240 ta fikr-mulohaza asosida</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
