import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase'; // Connected to real database
import { 
  Plus, 
  TicketPercent, 
  Trash2, 
  Copy, 
  Calendar, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  Search,
  Filter,
  X,
  Check,
  Loader2
} from 'lucide-react';

interface PromoCode {
  id: string;
  code: string;
  value: number; // Percent % or Amount
  min_amount: number;
  used_count: number;
  total_limit: number;
  user_limit: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  description: string;
  target: 'products' | 'delivery';
  type: 'percent' | 'amount';
}

const CountdownTimer = ({ startDate, endDate }: { startDate: string, endDate: string }) => {
  const [timerData, setTimerData] = useState<{ now: number, start: number, end: number, mode: 'pending' | 'active' | 'expired' } | null>(null);

  useEffect(() => {
    const calculate = () => {
      try {
        const now = Date.now();
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();

        if (isNaN(start) || isNaN(end)) return null;

        let mode: 'pending' | 'active' | 'expired' = 'expired';
        if (now < start) mode = 'pending';
        else if (now < end) mode = 'active';

        return { now, start, end, mode };
      } catch (e) { return null; }
    };

    const timer = setInterval(() => setTimerData(calculate()), 1000);
    setTimerData(calculate());
    return () => clearInterval(timer);
  }, [startDate, endDate]);

  if (!timerData || timerData.mode === 'expired') {
    return (
      <div className="flex items-center gap-2 mb-6 p-3 bg-red-50 rounded-2xl border border-red-100 animate-in fade-in duration-500">
        <Clock size={16} className="text-red-500" />
        <span className="text-[11px] font-black text-red-600 uppercase tracking-widest">Aksiya yakunlandi</span>
      </div>
    );
  }

  const getTimeBlocks = (diff: number) => {
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / 1000 / 60) % 60);
    const s = Math.floor((diff / 1000) % 60);
    return { d: Math.max(0, d), h: Math.max(0, h), m: Math.max(0, m), s: Math.max(0, s) };
  };

  const TimeBlock = ({ value, label, active }: { value: number, label: string, active: boolean }) => (
    <div className={`flex flex-col items-center min-w-[36px] p-1.5 bg-white rounded-xl border border-slate-100 shadow-sm transition-all group ${active ? 'hover:border-sidebarDark' : 'hover:border-blue-400'}`}>
       <span className={`text-xs font-black text-slate-800 ${active ? 'group-hover:text-sidebarDark' : 'group-hover:text-blue-500'}`}>{value < 10 ? `0${value}` : value}</span>
       <span className={`text-[7px] font-black text-slate-400 uppercase tracking-tighter ${active ? 'group-hover:text-sidebarDark/60' : 'group-hover:text-blue-400'}`}>{label}</span>
    </div>
  );

  const DisplayTimer = ({ diff, label, mode }: { diff: number, label: string, mode: 'active' | 'pending' }) => {
    const blocks = getTimeBlocks(diff);
    const isActive = mode === 'active';
    
    return (
      <div className={`flex items-center gap-2 p-3 rounded-[20px] border h-[56px] transition-all duration-500 ${isActive ? 'bg-slate-50/50 border-slate-100 shadow-sm' : 'bg-blue-50/20 border-blue-100/50'}`}>
        <div className="flex items-center gap-1.5 mr-auto">
           <Clock size={12} className={isActive ? 'text-sidebarDark animate-pulse' : 'text-blue-500'} />
           <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">{label}</span>
        </div>
        <div className="flex items-center gap-1">
           <TimeBlock value={blocks.d} label="K" active={isActive} />
           <span className="text-slate-200 font-black text-[10px]">:</span>
           <TimeBlock value={blocks.h} label="S" active={isActive} />
           <span className="text-slate-200 font-black text-[10px]">:</span>
           <TimeBlock value={blocks.m} label="D" active={isActive} />
           <span className="text-slate-200 font-black text-[10px]">:</span>
           <TimeBlock value={blocks.s} label="S" active={isActive} />
        </div>
      </div>
    );
  };

  // Business Logic: 
  // 1. Time to Start (Only if pending, otherwise 00:00:00)
  // 2. Promo Duration (If pending: End - Start. If active: End - Now)
  const timeToStart = Math.max(0, timerData.start - timerData.now);
  const timeToExpiry = timerData.mode === 'pending' ? (timerData.end - timerData.start) : (timerData.end - timerData.now);

  return (
    <div className="flex flex-col gap-2 mb-6 animate-in fade-in duration-500">
       <DisplayTimer 
         diff={timeToStart} 
         label="Boshlanishiga:" 
         mode={timerData.mode === 'pending' ? 'pending' : 'active'} 
       />
       <DisplayTimer 
         diff={timeToExpiry} 
         label="Aksiya muddati:" 
         mode={timerData.mode === 'active' ? 'active' : 'pending'} 
       />
    </div>
  );
};

const CalendarPicker = ({ onSelect, onClose, minDate }: { onSelect: (date: string) => void, onClose: () => void, minDate?: string }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const parseDateUI = (dStr: string) => {
    const [d, m, y] = dStr.split('.').map(Number);
    return new Date(y, m - 1, d);
  };

  const minDateTime = minDate ? parseDateUI(minDate).getTime() : null;
  
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
  
  const days = [];
  const totalDays = daysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const startDay = firstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());
  
  const daysOfWeek = ['D', 'S', 'C', 'P', 'J', 'S', 'Y'];
  
  for (let i = 0; i < (startDay === 0 ? 6 : startDay - 1); i++) {
    days.push(null);
  }
  
  for (let i = 1; i <= totalDays; i++) {
    days.push(i);
  }
  
  const months = [
    "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", 
    "Iyul", "Avgust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"
  ];
 
  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };
 
  return (
    <div className="absolute top-[110%] left-0 z-[110] bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 w-[280px] animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-4">
        <button title="Oldingi oy" onClick={(e) => { e.preventDefault(); changeMonth(-1); }} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
          <ChevronLeft size={16} />
        </button>
        <div className="font-black text-slate-800 text-sm uppercase tracking-tighter">
          {months[currentDate.getMonth()]} {currentDate.getFullYear()}
        </div>
        <button title="Keyingi oy" onClick={(e) => { e.preventDefault(); changeMonth(1); }} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mb-2">
        {daysOfWeek.map(d => (
          <div key={d} className="text-[10px] font-black text-slate-300 text-center uppercase">{d}</div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((day, idx) => {
          if (!day) return <div key={idx} className="p-2" />;
          
          const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
          const isDisabled = minDateTime ? dateObj.getTime() < minDateTime : false;
          
          return (
            <button 
              key={idx} 
              disabled={isDisabled}
              title={`${day}-sana ${isDisabled ? '(Tanlab bo\'lmaydi)' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                const d = day < 10 ? `0${day}` : day;
                const m = (currentDate.getMonth() + 1) < 10 ? `0${currentDate.getMonth() + 1}` : currentDate.getMonth() + 1;
                onSelect(`${d}.${m}.${currentDate.getFullYear()}`);
                onClose();
              }}
              className={`p-2 rounded-xl text-xs font-bold transition-all ${
                isDisabled 
                ? 'text-slate-200 cursor-not-allowed bg-slate-50/50' 
                : day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear()
                ? 'bg-sidebarDark text-white shadow-lg hover:scale-110' 
                : 'text-slate-700 hover:bg-slate-100 hover:text-sidebarDark hover:scale-110'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const TimePicker = ({ onSelect, onClose, minTime }: { onSelect: (time: string) => void, onClose: () => void, minTime?: string }) => {
  const hours = Array.from({ length: 24 }, (_, i) => i < 10 ? `0${i}` : `${i}`);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5 < 10 ? `0${i * 5}` : `${i * 5}`);
  
  const [minH, minM] = minTime ? minTime.split(':').map(Number) : [null, null];
  
  const [selHour, setSelHour] = useState(minH !== null ? (minH < 10 ? `0${minH}` : `${minH}`) : '12');
  const [selMin, setSelMin] = useState(minM !== null ? (minM < 10 ? `0${minM}` : `${minM}`) : '00');

  const isOKDisabled = minH !== null && minM !== null && (Number(selHour) < minH || (Number(selHour) === minH && Number(selMin) < minM));

  return (
    <div className="absolute top-[110%] left-0 z-[110] bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 w-[180px] animate-in fade-in zoom-in duration-200 flex flex-col" onClick={(e) => e.stopPropagation()}>
      <div className="flex h-[200px]">
        {/* Hours */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
          <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest text-center mb-2">Soat</div>
          {hours.map(h => {
             const isDisabled = minH !== null && Number(h) < minH;
             return (
               <button 
                 key={h} 
                 disabled={isDisabled}
                 title={`${h} soat ${isDisabled ? '(Tanlab bo\'lmaydi)' : ''}`}
                 onClick={() => setSelHour(h)}
                 className={`w-full py-2 rounded-xl text-xs font-bold transition-all mb-1 ${
                   isDisabled
                   ? 'text-slate-200 cursor-not-allowed bg-slate-50/50'
                   : selHour === h ? 'bg-sidebarDark text-white shadow-md' : 'hover:bg-slate-100 text-slate-600'
                 }`}
               >
                 {h}
               </button>
             );
          })}
        </div>
        
        {/* Divider */}
        <div className="w-[1px] bg-slate-100 h-full mx-1" />
        
        {/* Minutes */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
          <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest text-center mb-2">Min</div>
          {minutes.map(m => {
             const isDisabled = minH !== null && Number(selHour) === minH && Number(m) < minM!;
             return (
               <button 
                 key={m} 
                 disabled={isDisabled}
                 title={`${m} minut ${isDisabled ? '(Tanlab bo\'lmaydi)' : ''}`}
                 onClick={() => setSelMin(m)}
                 className={`w-full py-2 rounded-xl text-xs font-bold transition-all mb-1 ${
                   isDisabled
                   ? 'text-slate-200 cursor-not-allowed bg-slate-50/50'
                   : selMin === m ? 'bg-sidebarDark text-white shadow-md' : 'hover:bg-slate-100 text-slate-600'
                 }`}
               >
                 {m}
               </button>
             );
          })}
        </div>
      </div>
      
      <div className="mt-2 pt-2 border-t border-slate-100 flex gap-2">
        <button 
          title="Yopish"
          onClick={onClose}
          className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
        >
          Yopish
        </button>
        <button 
          title="Tanlash"
          disabled={isOKDisabled}
          onClick={() => {
            onSelect(`${selHour}:${selMin}`);
            onClose();
          }}
          className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            isOKDisabled
            ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
            : 'bg-sidebarDark text-white shadow-lg hover:shadow-xl'
          }`}
        >
          OK
        </button>
      </div>
    </div>
  );
};

const PromosManager = () => {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activePicker, setActivePicker] = useState<'start' | 'end' | 'time-start' | 'time-end' | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [promoData, setPromoData] = useState({
    code: '',
    target: 'products', // 'products' | 'delivery'
    type: 'percent', // 'percent' | 'amount'
    value: '',
    userLimit: '1',
    totalLimit: '100',
    minAmount: '50000',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    description: '',
    isActive: true
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPromo, setSelectedPromo] = useState<PromoCode | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchPromos();
  }, []);

  const fetchPromos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPromos(data || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDurationSummary = () => {
    if (!promoData.startDate || !promoData.startTime || !promoData.endDate || !promoData.endTime) return null;
    
    const parseDateUI = (dStr: string) => {
      const [d, m, y] = dStr.split('.').map(Number);
      return new Date(y, m - 1, d);
    };

    try {
      const startD = parseDateUI(promoData.startDate);
      const endD = parseDateUI(promoData.endDate);
      const start = new Date(`${startD.getFullYear()}-${(startD.getMonth()+1).toString().padStart(2,'0')}-${startD.getDate().toString().padStart(2,'0')}T${promoData.startTime}:00`);
      const end = new Date(`${endD.getFullYear()}-${(endD.getMonth()+1).toString().padStart(2,'0')}-${endD.getDate().toString().padStart(2,'0')}T${promoData.endTime}:00`);
      
      const diff = end.getTime() - start.getTime();
      if (diff <= 0) return null;

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const mins = Math.floor((diff / (1000 * 60)) % 60);

      let parts = [];
      if (days > 0) parts.push(`${days} kun`);
      if (hours > 0) parts.push(`${hours} soat`);
      if (mins > 0 && days === 0) parts.push(`${mins} minut`);

      return parts.join(' ');
    } catch (e) { return null; }
  };

  const isFormValid = () => {
    return (
      promoData.code.trim() !== '' &&
      promoData.value.trim() !== '' &&
      promoData.userLimit.trim() !== '' &&
      promoData.totalLimit.trim() !== '' &&
      promoData.minAmount.trim() !== '' &&
      promoData.startDate !== '' &&
      promoData.startTime !== '' &&
      promoData.endDate !== '' &&
      promoData.endTime !== '' &&
      getDurationSummary() !== null
    );
  };

  const handleSave = async () => {
    if (!isFormValid()) return;
    setIsSaving(true);

    const parseDateUI = (dStr: string) => {
        const [d, m, y] = dStr.split('.').map(Number);
        return { d, m: m - 1, y };
    };

    try {
      const s = parseDateUI(promoData.startDate);
      const e = parseDateUI(promoData.endDate);
      const [sh, sm] = promoData.startTime.split(':').map(Number);
      const [eh, em] = promoData.endTime.split(':').map(Number);

      // Create dates in LOCAL time first, then toISOString converts to UTC
      const startISO = new Date(s.y, s.m, s.d, sh, sm).toISOString();
      const endISO = new Date(e.y, e.m, e.d, eh, em).toISOString();

      const newPromo = {
        code: promoData.code.toUpperCase(),
        target: promoData.target,
        type: promoData.type,
        value: Number(promoData.value),
        user_limit: Number(promoData.userLimit),
        total_limit: Number(promoData.totalLimit),
        min_amount: Number(promoData.minAmount),
        start_date: startISO,
        end_date: endISO,
        description: promoData.description,
        is_active: promoData.isActive
      };

      const { data, error } = await supabase
        .from('promo_codes')
        .insert([newPromo])
        .select()
        .single();

      if (error) throw error;

      setPromos([data, ...promos]);
      setIsModalOpen(false);
      setShowConfirmSave(false);
      setPromoData({
        code: '', target: 'products', type: 'percent', value: '',
        userLimit: '1', totalLimit: '100', minAmount: '50000',
        startDate: '', startTime: '', endDate: '', endTime: '', description: '',
        isActive: true
      });
    } catch (err) {
      console.error('Save error:', err);
      alert('Tizimda xatolik! promo_codes jadvali mavjudligini tekshiring.');
    } finally {
      setIsSaving(false);
    }
  };

  const calculateTotalDuration = (start: string, end: string) => {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    if (diff <= 0) return null;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / (1000 * 60)) % 60);
    
    let parts = [];
    if (days > 0) parts.push(`${days} kun`);
    if (hours > 0) parts.push(`${hours} soat`);
    if (mins > 0 && days === 0) parts.push(`${mins} d`);
    return parts.join(' ');
  };

  const handleDeleteExecute = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    try {
        const { error } = await supabase
            .from('promo_codes')
            .delete()
            .eq('id', deleteConfirm);
        
        if (error) throw error;
        setPromos(promos.filter(p => p.id !== deleteConfirm));
        setDeleteConfirm(null);
    } catch (err) {
        console.error('Delete error:', err);
        alert('O\'chirishda xatolik!');
    } finally {
        setIsDeleting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const filteredPromos = promos.filter(p => 
     p.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
     p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
          <div className="fixed inset-0 z-[300] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
             <div className="bg-white rounded-[40px] p-10 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-6">
                   <Trash2 size={32} />
                </div>
                <h4 className="text-xl font-black text-slate-900 tracking-tight mb-2">O'chirishni tasdiqlaysizmi?</h4>
                <p className="text-sm font-medium text-slate-500 leading-relaxed mb-8">Bu promo kod tizimdan butunlay o'chib ketadi. Buni ortga qaytarib bo'lmaydi.</p>
                <div className="flex flex-col gap-3 w-full">
                    <button 
                       disabled={isDeleting}
                       onClick={handleDeleteExecute}
                       className="w-full py-4 rounded-2xl bg-red-500 text-white font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-all flex items-center justify-center gap-2"
                    >
                       {isDeleting ? <Loader2 size={16} className="animate-spin" /> : 'O\'chirish'}
                    </button>
                    <button 
                       disabled={isDeleting}
                       onClick={() => setDeleteConfirm(null)}
                       className="w-full py-4 rounded-2xl bg-slate-50 text-slate-600 font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all"
                    >
                       Bekor qilish
                    </button>
                </div>
             </div>
          </div>
      )}

      {/* Header & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full md:w-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Promo kodlarni qidirish..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-3xl border border-gray-100 focus:ring-4 focus:ring-sidebarDark/5 outline-none bg-white transition-all shadow-sm font-bold text-slate-700"
          />
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button title="Saralash (Filter)" className="px-6 py-4 rounded-[20px] border border-gray-100 bg-white font-black text-slate-600 flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm uppercase text-xs tracking-widest">
            <Filter size={18} />
            <span>Filter</span>
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-8 py-4 rounded-[23px] bg-sidebarDark text-white font-black flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-sidebarDark/20 uppercase text-xs tracking-widest"
          >
            <Plus size={20} />
            <span>Yaratish</span>
          </button>
        </div>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
             Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-[40px] border border-gray-100 p-6 shadow-sm h-[450px] animate-pulse flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 w-24 bg-slate-100 rounded" />
                            <div className="h-2 w-32 bg-slate-50 rounded" />
                        </div>
                    </div>
                    <div className="h-20 bg-slate-50 rounded-2xl" />
                    <div className="h-10 bg-slate-50 rounded-2xl mt-auto" />
                </div>
             ))
        ) : filteredPromos.length === 0 ? (
             <div className="col-span-1 md:col-span-2 xl:col-span-3 py-20 flex flex-col items-center justify-center text-slate-300">
                <TicketPercent size={64} strokeWidth={1} />
                <p className="mt-4 font-black uppercase tracking-widest text-sm">Promo kodlar topilmadi</p>
             </div>
        ) : filteredPromos.map((promo) => {
          const isExpired = new Date(promo.end_date) < new Date();
          const isFull = promo.used_count >= promo.total_limit;
          
          return (
            <div 
              key={promo.id} 
              className={`group bg-white rounded-[40px] border border-gray-100 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all relative overflow-hidden flex flex-col h-full ${
                isExpired || !promo.is_active ? 'opacity-75 grayscale-[0.5]' : ''
              }`}
            >
              {/* Status Badge */}
              <div className="absolute top-6 right-6">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 border shadow-sm ${
                  promo.is_active && !isExpired && !isFull
                    ? 'bg-green-50 text-green-600 border-green-100' 
                    : isExpired
                    ? 'bg-red-50 text-red-600 border-red-100'
                    : 'bg-blue-50 text-blue-600 border-blue-100'
                }`}>
                  {promo.is_active && !isExpired && !isFull && <CheckCircle2 size={12} />}
                  {isExpired && <XCircle size={12} />}
                  {(!promo.is_active || isFull) && <Clock size={12} />}
                  {promo.is_active && !isExpired && !isFull ? 'Faol' : isExpired ? 'Yakunlangan' : isFull ? 'To\'lgan' : 'Nofaol'}
                </span>
              </div>

              {/* Icon & Code */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-sidebarDark shadow-sm group-hover:bg-sidebarDark group-hover:text-white transition-all">
                  <TicketPercent size={28} />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">{promo.code}</h3>
                    <button 
                      title="Nusxalash"
                      onClick={() => copyToClipboard(promo.code)}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    {promo.value}{promo.type === 'percent' ? '%' : ' UZS'} chegirma • {promo.target === 'products' ? 'Mahsulotlar' : 'Dastavka'} uchun
                  </p>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm font-medium text-slate-500 mb-6 flex-1 line-clamp-2">
                {promo.description || 'Izohsiz'}
              </p>

              {/* Duration Info */}
              <div className="flex items-center justify-between mb-4 px-1">
                 <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Umumiy muddat</span>
                    <span className="text-xs font-black text-slate-800">{calculateTotalDuration(promo.start_date, promo.end_date) || 'Cheksiz'}</span>
                 </div>
                 <div className="w-[1px] h-6 bg-slate-100" />
                 <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Jami limit</span>
                    <span className="text-xs font-black text-slate-800">{promo.total_limit} ta</span>
                 </div>
              </div>

              {/* Dynamic Countdown Timer */}
              <CountdownTimer startDate={promo.start_date} endDate={promo.end_date} />

              {/* Progress Bar */}
              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-[11px] font-black text-slate-400 uppercase tracking-widest">
                  <span>Ishlatildi</span>
                  <span>{promo.used_count} / {promo.total_limit}</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${
                      promo.is_active && !isExpired ? 'bg-sidebarDark' : 'bg-slate-300'
                    }`}
                    style={{ width: `${(promo.used_count / promo.total_limit) * 100}%` }}
                  />
                </div>
              </div>

              {/* Meta Info */}
              <div className="grid grid-cols-2 gap-3 pt-6 border-t border-dashed border-gray-100 mt-auto">
                <div className="flex flex-col gap-2">
                   <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 text-left">Boshlandi</span>
                      <div className="flex items-center gap-2 text-slate-800">
                         <Calendar size={12} className="text-slate-400" />
                         <span className="text-xs font-bold whitespace-nowrap">{new Date(promo.start_date).toLocaleDateString()} {new Date(promo.start_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                   </div>
                   <div className="flex flex-col mt-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 text-left">Tugaydi</span>
                      <div className="flex items-center gap-2 text-slate-800">
                         <Clock size={12} className="text-slate-400" />
                         <span className="text-xs font-bold whitespace-nowrap">{new Date(promo.end_date).toLocaleDateString()} {new Date(promo.end_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                   </div>
                </div>
                <div className="flex flex-col gap-1 items-end">
                   <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Min. Buyurtma</span>
                   <div className="flex items-center gap-2 text-slate-500">
                      <Users size={14} />
                      <span className="text-xs font-bold">{promo.min_amount > 0 ? `${promo.min_amount.toLocaleString()} UZS` : 'Yo\'q'}</span>
                   </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex gap-3">
                <button 
                  title="Batafsil ko'rish" 
                  onClick={() => setSelectedPromo(promo)}
                  className="flex-1 py-3 rounded-2xl bg-slate-50 text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all border border-gray-50 flex items-center justify-center gap-2"
                >
                   Batafsil
                   <ChevronRight size={14} />
                </button>
                <button 
                  title="O'chirish" 
                  onClick={() => setDeleteConfirm(promo.id)}
                  className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Promo Details Modal */}
      {selectedPromo && (
        <div className="fixed inset-0 z-[400] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-white rounded-[40px] w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col relative">
              {/* Modal Header */}
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-sidebarDark text-white flex items-center justify-center shadow-lg">
                       <TicketPercent size={28} />
                    </div>
                    <div>
                       <h3 className="text-2xl font-black text-slate-900 tracking-tight">{selectedPromo.code}</h3>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Promo kod batafsil ma'lumotlari</p>
                    </div>
                 </div>
                 <button 
                   onClick={() => setSelectedPromo(null)} 
                   title="Yopish"
                   className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-slate-200 hover:text-slate-600 transition-all"
                 >
                    <X size={24} />
                 </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Basic Info */}
                    <div className="space-y-6">
                       <div className="space-y-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chegirma turi va qiymati</span>
                          <p className="text-lg font-black text-sidebarDark">
                             {selectedPromo.value}{selectedPromo.type === 'percent' ? '%' : ' UZS'} 
                             <span className="text-sm text-slate-400 font-bold ml-2 italic">({selectedPromo.target === 'products' ? 'Mahsulotlar' : 'Dastavka'})</span>
                          </p>
                       </div>
                       <div className="space-y-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ishlatilish holati</span>
                          <div className="flex items-center gap-2">
                             <div className={`w-2 h-2 rounded-full ${selectedPromo.is_active ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                             <p className="text-sm font-bold text-slate-700">{selectedPromo.is_active ? 'Faol tizimda xizmat qiladi' : 'Hozirda nofaol'}</p>
                          </div>
                       </div>
                       <div className="pt-4 space-y-4">
                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Aksiya tavsifi</span>
                             <p className="text-sm font-medium text-slate-600 leading-relaxed italic">
                                "{selectedPromo.description || 'Izoh qoldirilmagan'}"
                             </p>
                          </div>
                       </div>
                    </div>

                    {/* Limits & Stats */}
                    <div className="space-y-6">
                       <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Jami Limit</span>
                             <p className="text-xl font-black text-slate-800">{selectedPromo.total_limit} <span className="text-[10px] text-slate-400">ta</span></p>
                          </div>
                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Ishlatildi</span>
                             <p className="text-xl font-black text-sidebarDark">{selectedPromo.used_count} <span className="text-[10px] text-slate-400">marta</span></p>
                          </div>
                       </div>
                       <div className="space-y-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Minimal buyurtma summasi</span>
                          <p className="text-sm font-black text-slate-800">{selectedPromo.min_amount.toLocaleString()} UZS</p>
                       </div>
                       <div className="space-y-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Har bir mijoz uchun limit</span>
                          <p className="text-sm font-black text-slate-800">{selectedPromo.user_limit} marta</p>
                       </div>
                    </div>
                 </div>

                 {/* Timeline Section */}
                 <div className="mt-10 pt-10 border-t border-slate-100">
                    <div className="flex items-center gap-3 mb-6">
                       <Calendar size={18} className="text-slate-400" />
                       <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Vaqt jadvali</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="relative pl-6 border-l-2 border-slate-100">
                          <div className="absolute top-0 left-[-7px] w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow-sm" />
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Boshlanish sanasi</span>
                          <p className="text-sm font-bold text-slate-800 mt-1">
                             {new Date(selectedPromo.start_date).toLocaleDateString()}
                             <span className="text-slate-400 mx-2">|</span>
                             {new Date(selectedPromo.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                       </div>
                       <div className="relative pl-6 border-l-2 border-slate-100">
                          <div className="absolute top-0 left-[-7px] w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-sm" />
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Tugash sanasi</span>
                          <p className="text-sm font-bold text-slate-800 mt-1">
                             {new Date(selectedPromo.end_date).toLocaleDateString()}
                             <span className="text-slate-400 mx-2">|</span>
                             {new Date(selectedPromo.end_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                       </div>
                    </div>
                    
                    {/* Total Duration Footer */}
                    <div className="mt-8 p-4 bg-sidebarDark/5 rounded-2xl flex items-center justify-between border border-sidebarDark/10">
                       <div className="flex items-center gap-2 text-sidebarDark">
                          <Clock size={16} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Aksiya jami davomiyligi:</span>
                       </div>
                       <span className="text-sm font-black text-sidebarDark">
                          {calculateTotalDuration(selectedPromo.start_date, selectedPromo.end_date)}
                       </span>
                    </div>
                 </div>
              </div>

              {/* Modal Footer */}
              <div className="p-8 bg-slate-50/50 border-t border-slate-100">
                 <button 
                   onClick={() => setSelectedPromo(null)}
                   className="w-full py-4 rounded-2xl bg-white border border-slate-200 text-slate-600 font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all shadow-sm"
                 >
                    Yopish
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Mockup Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 relative">
            
            {/* Centered Confirmation Modal (Ask in a separate center) */}
            {showConfirmSave && (
              <div className="absolute inset-0 z-[200] bg-white/60 backdrop-blur-[2px] flex items-center justify-center p-6 animate-in fade-in duration-300">
                 <div className="bg-white rounded-[40px] p-10 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-2xl bg-sidebarDark text-white flex items-center justify-center shadow-xl shadow-sidebarDark/20 mb-6">
                       <TicketPercent size={32} />
                    </div>
                    <h4 className="text-xl font-black text-slate-900 tracking-tight mb-2">Saqlashni tasdiqlaysizmi?</h4>
                    <p className="text-sm font-medium text-slate-500 leading-relaxed mb-8">Barcha kiritilgan ma'lumotlar tizimda saqlanadi va promo kod darhol faollashadi.</p>
                    
                    <div className="flex flex-col gap-3 w-full">
                       <button 
                          disabled={isSaving}
                          onClick={handleSave}
                          className="w-full py-4 rounded-2xl bg-sidebarDark text-white font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-sidebarDark/20 flex items-center justify-center gap-2"
                       >
                          {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'Ha, tasdiqlayman'}
                       </button>
                       <button 
                          disabled={isSaving}
                          onClick={() => setShowConfirmSave(false)}
                          className="w-full py-4 rounded-2xl bg-slate-50 text-slate-600 font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-100"
                       >
                          Bekor qilish
                       </button>
                    </div>
                 </div>
              </div>
            )}

            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-white relative">
               <div className="flex flex-col">
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Yangi promo kod</h3>
                    <button 
                      title="Ma'lumot (Qo'llanma)"
                      onClick={() => setShowGuide(!showGuide)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        showGuide ? 'bg-sidebarDark text-white shadow-lg rotate-12' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-sidebarDark'
                      }`}
                    >
                      <HelpCircle size={18} />
                    </button>
                  </div>
                  <p className="text-lg font-black text-slate-600 mt-1 uppercase tracking-widest">Aksiya parametrlarini kiritish</p>
               </div>
               <button title="Yopish" onClick={() => setIsModalOpen(false)} className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-all">
                 <X size={24} />
               </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-white relative">
               {/* Quick Help Guide Overlay */}
               {showGuide && (
                  <div className="absolute inset-0 z-[150] bg-white/98 backdrop-blur-xl p-10 animate-in fade-in zoom-in-98 duration-300 overflow-y-auto">
                     <div className="flex justify-between items-center mb-10">
                        <div className="flex items-center gap-3">
                           <div className="w-1.5 h-6 bg-sidebarDark rounded-full" />
                           <h4 className="text-xl font-bold text-slate-900 tracking-tight">Yordam va qo'llanma</h4>
                        </div>
                        <button title="Qo'llanmani yopish" onClick={() => setShowGuide(false)} className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-all flex items-center justify-center">
                           <X size={20} />
                        </button>
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 pb-12">
                        <div className="space-y-2">
                           <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Promo kod nomi</div>
                           <p className="text-sm font-medium text-slate-500 leading-relaxed italic">Mijoz savatda kiritadigan maxsus so'z (masalan: ROKETA20). Faqat lotin harflari va sonlardan foydalaning.</p>
                        </div>
                        <div className="space-y-2">
                           <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Qo'llanilishi (Target)</div>
                           <p className="text-sm font-medium text-slate-500 leading-relaxed">Chegirma mahsulotlar narxidan yoki yetkazib berish xizmatidan (dastavka) ayirilishini belgilaydi.</p>
                        </div>
                        <div className="space-y-2">
                           <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chegirma qiymati</div>
                           <p className="text-sm font-medium text-slate-500 leading-relaxed">Foiz (%) yoki aniq summa (UZS) ko'rinishida belgilanadi. Foiz bo'lsa maksimal 100%, summa bo'lsa istalgan miqdor.</p>
                        </div>
                        <div className="space-y-2">
                           <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Limitlar</div>
                           <p className="text-sm font-medium text-slate-500 leading-relaxed">1 kishi uchun va umumiy jami foydalanish sonini cheklash. 0 qiymati cheksiz foydalanishni anglatadi.</p>
                        </div>
                        <div className="space-y-2">
                           <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Minimal buyurtma</div>
                           <p className="text-sm font-medium text-slate-500 leading-relaxed">Promo kod ishlashi uchun savatdagi jami mahsulotlar narxi kamida shu summaga teng bo'lishi shart.</p>
                        </div>
                        <div className="space-y-2">
                           <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Muddati</div>
                           <p className="text-sm font-medium text-slate-500 leading-relaxed">Aksiya amal qilish vaqti. Tugash vaqti boshlanish vaqtidan kamida 1 minut keyin bo'lishi talab etiladi.</p>
                        </div>
                     </div>

                     <div className="p-8 bg-slate-50/50 rounded-[32px] border border-slate-100 flex items-start gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-white shadow-sm border border-slate-100 text-sidebarDark flex items-center justify-center flex-shrink-0">
                           <CheckCircle2 size={20} />
                        </div>
                        <div className="space-y-1">
                           <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Muhim eslatma</h5>
                           <p className="text-[13px] font-medium text-slate-500 leading-relaxed">
                              Agar promo kod muddati tugasa yoki foydalanish limitlari to'lsa, u avtomatik ravishda "Yakunlangan" holatiga o'tadi va mijozlar tomonidan qayta ishlatib bo'lmaydi.
                           </p>
                        </div>
                     </div>
                  </div>
               )}
               
               <div className="p-8 space-y-6">
                  {/* Row 1: Nomi va Target */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-2">
                        <label className="text-xs font-black text-slate-700 uppercase tracking-widest ml-1">Promo kod nomi</label>
                        <input 
                           type="text" 
                           placeholder="MASALAN: ROKETA10" 
                           value={promoData.code}
                           onChange={(e) => setPromoData({ ...promoData, code: e.target.value.toUpperCase() })}
                           className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50/50 focus:bg-white focus:border-sidebarDark focus:ring-4 focus:ring-sidebarDark/5 outline-none font-black text-slate-950 uppercase transition-all placeholder:text-slate-500 text-sm" 
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-xs font-black text-slate-700 uppercase tracking-widest ml-1">Qo'llanilishi (Target)</label>
                        <div className="flex gap-2 p-1 bg-slate-50/50 rounded-xl border border-slate-200 h-[44px]">
                           <button 
                              onClick={() => setPromoData({ ...promoData, target: 'products' })}
                              className={`flex-1 rounded-[10px] font-black text-[12px] transition-all ${
                                 promoData.target === 'products' ? 'bg-white text-slate-950 shadow-sm border border-slate-100' : 'text-slate-600 hover:text-slate-950'
                              }`}
                           >
                              Mahsulotlar
                           </button>
                           <button 
                              onClick={() => setPromoData({ ...promoData, target: 'delivery', minAmount: '0' })}
                              className={`flex-1 rounded-[10px] font-black text-[12px] transition-all ${
                                 promoData.target === 'delivery' ? 'bg-white text-slate-950 shadow-sm border border-slate-100' : 'text-slate-600 hover:text-slate-950'
                              }`}
                           >
                              Dastavka
                           </button>
                        </div>
                     </div>
                  </div>

                  {/* Row 2: Turi va Qiymati */}
                  <div className="space-y-2">
                     <label className="text-xs font-black text-slate-700 uppercase tracking-widest ml-1">Chegirma turi va qiymati</label>
                     <div className="flex gap-4">
                        <div className="w-1/3 flex gap-2 p-1 bg-slate-50/50 rounded-xl border border-slate-200 h-[44px]">
                           <button 
                              onClick={() => setPromoData({ ...promoData, type: 'percent' })}
                              className={`flex-1 rounded-[10px] font-black text-[12px] transition-all ${
                                 promoData.type === 'percent' ? 'bg-white text-slate-950 shadow-sm border border-slate-100' : 'text-slate-600 hover:text-slate-950'
                              }`}
                           >
                              Foiz (%)
                           </button>
                           <button 
                              onClick={() => setPromoData({ ...promoData, type: 'amount' })}
                              className={`flex-1 rounded-[10px] font-black text-[12px] transition-all ${
                                 promoData.type === 'amount' ? 'bg-white text-slate-950 shadow-sm border border-slate-100' : 'text-slate-600 hover:text-slate-950'
                              }`}
                           >
                              Summa
                           </button>
                        </div>
                        <div className="flex-1 relative">
                           <input 
                              type="number" 
                              placeholder={promoData.type === 'percent' ? "15" : "50 000"} 
                              value={promoData.value}
                              onChange={(e) => setPromoData({ ...promoData, value: e.target.value })}
                              className="w-full h-[44px] px-4 rounded-xl border border-slate-300 bg-slate-50/50 focus:bg-white focus:border-sidebarDark focus:ring-4 focus:ring-sidebarDark/5 outline-none font-black text-slate-950 transition-all pr-12 text-sm placeholder:text-slate-500" 
                           />
                           <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-600 text-sm">{promoData.type === 'percent' ? '%' : 'UZS'}</span>
                        </div>
                     </div>
                  </div>

                  {/* Row 3 & 4: Limitlar */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-2">
                        <label className="text-xs font-black text-slate-700 uppercase tracking-widest ml-1">1 kishi uchun limit</label>
                        <input 
                           type="number" 
                           placeholder="1" 
                           value={promoData.userLimit}
                           onChange={(e) => setPromoData({ ...promoData, userLimit: e.target.value })}
                           className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50/50 focus:bg-white focus:border-sidebarDark focus:ring-4 focus:ring-sidebarDark/5 outline-none font-black text-slate-950 transition-all text-sm placeholder:text-slate-500" 
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-xs font-black text-slate-700 uppercase tracking-widest ml-1">Umumiy foydalanish (Jami)</label>
                        <input 
                           type="number" 
                           placeholder="100" 
                           value={promoData.totalLimit}
                           onChange={(e) => setPromoData({ ...promoData, totalLimit: e.target.value })}
                           className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50/50 focus:bg-white focus:border-sidebarDark focus:ring-4 focus:ring-sidebarDark/5 outline-none font-black text-slate-950 transition-all text-sm placeholder:text-slate-500" 
                        />
                     </div>
                  </div>

                  {/* Row 5: Min Summa */}
                  <div className="space-y-2">
                     <label className="text-xs font-black text-slate-700 uppercase tracking-widest ml-1">Minimal buyurtma summasi</label>
                     <div className="relative">
                        <input 
                           type="number" 
                           placeholder="50 000" 
                           disabled={promoData.target === 'delivery'}
                           value={promoData.minAmount}
                           onChange={(e) => setPromoData({ ...promoData, minAmount: e.target.value })}
                           className={`w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50/50 focus:bg-white focus:border-sidebarDark focus:ring-4 focus:ring-sidebarDark/5 outline-none font-black text-slate-950 transition-all pr-14 text-sm placeholder:text-slate-500 ${promoData.target === 'delivery' ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}`} 
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-600 text-xs">UZS</span>
                     </div>
                  </div>

                  {/* Row 6: Muddati - Integrated Custom Calendar & Time Picker */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-2">
                        <label className="text-xs font-black text-slate-700 uppercase tracking-widest ml-1">Boshlanish vaqti</label>
                        <div className="flex gap-2">
                           <div className="flex-[3] relative group">
                              <input 
                                 type="text" 
                                 placeholder="25.04.2026" 
                                 value={promoData.startDate}
                                 readOnly
                                 onClick={() => setActivePicker(activePicker === 'start' ? null : 'start')}
                                 className="w-full h-[42px] pl-10 pr-4 rounded-xl border border-slate-300 bg-slate-50/50 focus:bg-white focus:border-sidebarDark outline-none font-black text-slate-950 text-sm transition-all tracking-wider cursor-pointer placeholder:text-slate-500" 
                              />
                              <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-sidebarDark transition-colors" />
                              {activePicker === 'start' && (
                                 <CalendarPicker 
                                    onSelect={(date) => setPromoData({ ...promoData, startDate: date })} 
                                    onClose={() => setActivePicker(null)} 
                                 />
                              )}
                           </div>
                           <div className="flex-[2] relative group">
                              <input 
                                 type="text" 
                                 placeholder="14:30" 
                                 value={promoData.startTime}
                                 readOnly
                                 onClick={() => setActivePicker(activePicker === 'time-start' ? null : 'time-start')}
                                 className="w-full h-[42px] pl-10 pr-4 rounded-xl border border-slate-300 bg-slate-50/50 focus:bg-white focus:border-sidebarDark outline-none font-black text-slate-950 text-sm transition-all tracking-wider cursor-pointer placeholder:text-slate-500" 
                              />
                              <Clock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-sidebarDark transition-colors" />
                              {activePicker === 'time-start' && (
                                 <TimePicker 
                                    onSelect={(time) => setPromoData({ ...promoData, startTime: time })} 
                                    onClose={() => setActivePicker(null)} 
                                 />
                              )}
                           </div>
                        </div>
                     </div>
                     <div className="space-y-2">
                        <label className="text-xs font-black text-slate-700 uppercase tracking-widest ml-1">Tugash vaqti</label>
                        <div className="flex gap-2">
                           <div className="flex-[3] relative group">
                              <input 
                                 type="text" 
                                 placeholder="01.05.2026" 
                                 value={promoData.endDate}
                                 readOnly
                                 onClick={() => setActivePicker(activePicker === 'end' ? null : 'end')}
                                 className="w-full h-[42px] pl-10 pr-4 rounded-xl border border-slate-300 bg-slate-50/50 focus:bg-white focus:border-sidebarDark outline-none font-black text-slate-950 text-sm transition-all tracking-wider cursor-pointer placeholder:text-slate-500" 
                              />
                              <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-sidebarDark transition-colors" />
                              {activePicker === 'end' && (
                                 <CalendarPicker 
                                    minDate={promoData.startDate}
                                    onSelect={(date) => setPromoData({ ...promoData, endDate: date })} 
                                    onClose={() => setActivePicker(null)} 
                                 />
                              )}
                           </div>
                           <div className="flex-[2] relative group">
                              <input 
                                 type="text" 
                                 placeholder="23:59" 
                                 value={promoData.endTime}
                                 readOnly
                                 onClick={() => setActivePicker(activePicker === 'time-end' ? null : 'time-end')}
                                 className={`w-full h-[42px] pl-10 pr-4 rounded-xl border bg-slate-50/50 focus:bg-white focus:border-sidebarDark outline-none font-black text-slate-950 text-sm transition-all tracking-wider cursor-pointer placeholder:text-slate-500 ${
                                    promoData.endDate === promoData.startDate && promoData.startTime && promoData.endTime && promoData.endTime < promoData.startTime ? 'border-red-300 focus:border-red-500' : 'border-slate-300'
                                 }`} 
                              />
                              <Clock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-sidebarDark transition-colors" />
                              {activePicker === 'time-end' && (
                                 <TimePicker 
                                    minTime={promoData.endDate === promoData.startDate ? promoData.startTime : undefined}
                                    onSelect={(time) => setPromoData({ ...promoData, endTime: time })} 
                                    onClose={() => setActivePicker(null)} 
                                 />
                              )}
                           </div>
                        </div>
                        
                        {getDurationSummary() && (
                           <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl animate-in slide-in-from-top-1 duration-300">
                              <Clock size={12} className="text-sidebarDark" />
                              <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest leading-none">
                                 Umumiy davomiyligi: <span className="text-sidebarDark">{getDurationSummary()}</span>
                              </span>
                           </div>
                        )}
                     </div>
                  </div>

                  {/* Row 7: Tavsif */}
                  <div className="space-y-2">
                     <label className="text-xs font-black text-slate-700 uppercase tracking-widest ml-1">Tavsif (Optional)</label>
                     <textarea 
                        placeholder="PROMO KOD SHARTLARI..." 
                        value={promoData.description}
                        onChange={(e) => setPromoData({ ...promoData, description: e.target.value })}
                        className="w-full h-24 px-4 py-3 rounded-2xl border border-slate-300 bg-slate-50/50 focus:bg-white focus:border-sidebarDark focus:ring-4 focus:ring-sidebarDark/5 outline-none font-black text-slate-950 resize-none transition-all placeholder:text-slate-500 text-sm" 
                     />
                  </div>

                  <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-200 flex items-center justify-between group hover:bg-white transition-all">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                           <CheckCircle2 size={16} />
                        </div>
                        <div className="flex flex-col">
                           <span className="text-sm font-black text-slate-950">Faol holatda saqlash</span>
                           <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Yaratilgandan so'ng darhol ishlaydi</span>
                        </div>
                     </div>
                     <button 
                        title="Faol holatni o'zgartirish" 
                        onClick={() => setPromoData({ ...promoData, isActive: !promoData.isActive })}
                        className={`w-12 h-6 rounded-full relative transition-all active:scale-95 shadow-sm p-1 cursor-pointer flex items-center ${
                             promoData.isActive ? 'bg-green-500 shadow-green-200/50' : 'bg-slate-300 shadow-slate-200/50'
                        }`}
                     >
                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-all ${
                             promoData.isActive ? 'ml-auto' : 'ml-0'
                        }`} />
                     </button>
                  </div>
               </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3">
                <button 
                   onClick={() => setIsModalOpen(false)}
                   className="px-6 py-2.5 rounded-xl bg-white border border-slate-200 font-black text-slate-600 text-xs uppercase tracking-widest hover:bg-slate-50 hover:text-slate-900 transition-all"
                >
                  Bekor qilish
                </button>
                <button 
                   disabled={!isFormValid()}
                   onClick={() => setShowConfirmSave(true)}
                   className={`px-10 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95 ${
                    isFormValid() 
                    ? 'bg-sidebarDark text-white hover:shadow-xl hover:-translate-y-0.5 shadow-lg shadow-sidebarDark/20' 
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                   }`}
                >
                  <Check size={14} strokeWidth={3} />
                  Saqlash
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromosManager;
