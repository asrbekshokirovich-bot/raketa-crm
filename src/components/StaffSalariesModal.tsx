import { useState, useEffect } from 'react';
import { X, Check, User, Users, ArrowLeft, Store, Crown, Calendar as CalendarIcon, Save } from 'lucide-react';
import { supabase } from '../services/supabase';

interface Profile {
  id: string;
  full_name: string;
  role: string;
  salary: number;
  store_id?: string;
}

interface StaffSalariesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

// Roles removed as they are managed globally

export default function StaffSalariesModal({ isOpen, onClose, onUpdate }: StaffSalariesModalProps) {
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [payoutDate, setPayoutDate] = useState<string>('');
  const [savedPayoutDate, setSavedPayoutDate] = useState<string>('');
  const [savingDate, setSavingDate] = useState(false);
  const [showDateSuccess, setShowDateSuccess] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{ salary: string }>({
    salary: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchEmployees();
      fetchPayoutDate();
    }
  }, [isOpen]);

  const fetchPayoutDate = async () => {
    const { data } = await supabase.from('app_settings').select('value').eq('key', 'salary_payout_date').single();
    if (data) {
      setPayoutDate(data.value);
      setSavedPayoutDate(data.value);
    }
  };

  const handleSavePayoutDate = async () => {
    if (!payoutDate) return;
    setSavingDate(true);
    await supabase.from('app_settings').upsert({ key: 'salary_payout_date', value: payoutDate }, { onConflict: 'key' });
    setSavedPayoutDate(payoutDate);
    setSavingDate(false);
    
    // Notify globally so NotificationContext can re-fetch
    window.dispatchEvent(new Event('salary-date-changed'));
    
    // Show tiny success pill
    setShowDateSuccess(true);
    setTimeout(() => setShowDateSuccess(false), 2500);
  };

  const fetchEmployees = async () => {
    setLoading(true);
    // Fetch stores separately to map id -> name
    const { data: storesData } = await supabase.from('stores').select('id, name');
    if (storesData) setStores(storesData);

    const { data, error } = await supabase.from('profiles').select('id, full_name, role, salary, store_id').order('created_at', { ascending: true });
    if (!error && data) {
      // Sort so Owner is always on top
      data.sort((a, b) => {
        if (a.role === 'Owner') return -1;
        if (b.role === 'Owner') return 1;
        return 0;
      });
      setEmployees(data);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    const parsedSalary = formData.salary.toString();
    const salaryNum = parseInt(parsedSalary.replace(/[^0-9]/g, '')) || 0;

    if (editingId) {
      setSavingId(editingId);
      const { error } = await supabase.from('profiles').update({
        salary: salaryNum
      }).eq('id', editingId);
      
      if (error) {
        alert("Saqlashda xatolik yuz berdi: " + error.message);
        setSavingId(null);
        return;
      }
    }
    
    setEditingId(null);
    setFormData({ salary: '' });
    await fetchEmployees();
    setSavingId(null);
    onUpdate();
  };

  const handleSalaryChange = (val: string) => {
    const rawValue = val.replace(/[^0-9]/g, '');
    if (!rawValue) {
      setFormData({ salary: '' });
      return;
    }
    setFormData({ salary: parseInt(rawValue).toLocaleString('uz-UZ') });
  };

  const startEdit = (emp: Profile) => {
    setEditingId(emp.id);
    const initialFormat = emp.salary ? emp.salary.toLocaleString('uz-UZ') : '0';
    setFormData({ salary: initialFormat });
  };

  const formatUz = (num: number) => num.toLocaleString('uz-UZ') + ' UZS';

  const getStoreName = (storeId?: string) => {
    if (!storeId) return "Biriktirilmagan";
    const st = stores.find(s => s.id === storeId);
    return st ? st.name : "Biriktirilmagan";
  };

  if (!isOpen) return null;

  return (
    <div className="w-full animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="bg-white rounded-3xl w-full border border-gray-100 overflow-hidden flex flex-col shadow-sm">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-slate-50/50">
          <div className="flex items-center gap-4">
            <button onClick={onClose} title="Orqaga" className="p-3 bg-white border border-gray-200 hover:bg-slate-50 rounded-xl transition-colors text-slate-800 shadow-sm flex items-center justify-center">
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-3 ml-2">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600">
                <Users size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800">Xodimlar va Maoshlar</h2>
                <p className="text-xs font-bold text-slate-400">Lavozim va maoshlarni boshqarish</p>
              </div>
            </div>
            
            {/* Tiny Floating Success Toast relative to modal */}
            {showDateSuccess && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-1.5 rounded-full shadow-lg shadow-green-500/20 text-xs font-black tracking-widest uppercase flex items-center gap-2 animate-in slide-in-from-top-4 fade-in duration-300 z-50">
                <Check size={14} /> Saqlandi
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-2xl border border-gray-200 shadow-sm relative">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
              <CalendarIcon size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-1">Maosh tarqatish sanasi</span>
              <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                <span>Har oyning</span>
                <div className="relative">
                  <button 
                    onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                    className="w-16 pl-3 pr-6 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-black text-slate-800 text-center text-sm cursor-pointer transition-all hover:bg-slate-100 flex items-center justify-center shadow-sm relative overflow-hidden group"
                  >
                    {payoutDate || '-'}
                    <div className="absolute inset-y-0 right-0 flex items-center pr-1.5 text-slate-400 group-hover:text-blue-500 transition-colors">
                      <svg className={`fill-current h-4 w-4 transition-transform duration-300 ${isDatePickerOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                  </button>

                  {isDatePickerOpen && (
                    <>
                      <div className="fixed inset-0 z-[50]" onClick={() => setIsDatePickerOpen(false)} />
                      <div className="absolute top-full mt-2 w-64 -left-16 sm:left-0 bg-white border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.12)] rounded-3xl z-[60] p-4 animate-in fade-in zoom-in-95">
                        <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest text-center mb-3">Har oyning qaysi kuni?</div>
                        <div className="grid grid-cols-7 gap-1.5">
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                            <button
                              key={day}
                              onClick={() => {
                                setPayoutDate(day.toString());
                                setIsDatePickerOpen(false);
                              }}
                              className={`aspect-square flex items-center justify-center text-[11px] font-black rounded-lg transition-all ${
                                payoutDate === day.toString() 
                                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-110' 
                                  : 'bg-slate-50 text-slate-600 hover:bg-slate-200 hover:text-slate-900 border border-slate-100'
                              }`}
                            >
                              {day}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <span>- sanasi</span>
                
                <button 
                  onClick={handleSavePayoutDate}
                  disabled={savingDate || !payoutDate || payoutDate === savedPayoutDate}
                  className={`ml-2 px-3 py-1.5 rounded-lg transition-all font-black text-xs flex items-center gap-2 group ${
                    payoutDate === savedPayoutDate 
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' 
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20'
                  }`}
                  title={payoutDate === savedPayoutDate ? "Saqlangan" : "Saqlash"}
                >
                  {savingDate ? (
                     <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                     <>
                        <Save size={14} className={payoutDate !== savedPayoutDate ? "group-hover:scale-110 transition-transform" : ""} /> 
                        SAQLASH
                     </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-slate-800">Xodimlar ro'yxati ({employees.length})</h3>
            <div className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
              Yangi xodimni Asosiy "Xodimlar" pultidan qo'shing
            </div>
          </div>

          <div className="border border-gray-100 rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100 text-[11px] uppercase tracking-widest text-slate-400 font-black">
                  <th className="p-4">F.I.SH</th>
                  <th className="p-4">Lavozim</th>
                  <th className="p-4 text-right">Maosh (UZS)</th>
                  <th className="p-4 text-center">Boshqaruv</th>
                </tr>
              </thead>
              <tbody className="text-sm font-bold text-slate-700 divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="p-12 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-400"></div>
                        <span className="text-slate-400 text-xs tracking-widest font-bold uppercase">Yuklanmoqda...</span>
                      </div>
                    </td>
                  </tr>
                ) : employees.map(emp => (
                  <tr key={emp.id} className={`${emp.role === 'Owner' ? 'bg-yellow-50/50' : 'hover:bg-slate-50'} transition-colors`}>
                    <td className="p-4 flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full ${emp.role === 'Owner' ? 'bg-yellow-100 text-yellow-600' : 'bg-slate-100 text-slate-400'} flex items-center justify-center`}>
                        {emp.role === 'Owner' ? <Crown size={14} /> : <User size={14} />}
                      </div>
                      {emp.full_name}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-md text-xs border ${emp.role === 'Owner' ? 'bg-slate-800 text-yellow-400 border-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {emp.role}
                      </span>
                      {emp.role !== 'Owner' && (
                        <div className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                          <Store size={10} /> {getStoreName(emp.store_id)}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {editingId === emp.id ? (
                        <div className="flex items-center justify-end gap-1">
                           <input type="text" title="Maosh" value={formData.salary} onChange={e => handleSalaryChange(e.target.value)} className="w-32 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 focus:ring-2 focus:ring-blue-400 outline-none text-right font-bold text-blue-800" />
                           <span className="text-xs font-bold text-slate-400">UZS</span>
                        </div>
                      ) : formatUz(emp.salary)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        {savingId === emp.id ? (
                          <div className="p-2 text-blue-600 bg-blue-50 rounded-lg flex items-center justify-center">
                             <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                          </div>
                        ) : editingId === emp.id ? (
                          <>
                            <button onClick={handleSave} title="Saqlash" className="p-2 text-green-600 bg-green-50 rounded-lg hover:bg-green-100 shadow-sm"><Check size={16} /></button>
                            <button onClick={() => setEditingId(null)} title="Bekor qilish" className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 shadow-sm"><X size={16} /></button>
                          </>
                        ) : (
                          <button onClick={() => startEdit(emp)} title="Maoshni O'zgartirish" className="px-3 py-1.5 text-blue-600 bg-blue-50 font-bold text-xs rounded-lg hover:bg-blue-100 transition-colors">Maosh belgilash</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && employees.length === 0 && (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-400">Hech qanday xodim topilmadi. Avval "Xodimlar" bo'limidan odam qo'shing.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
