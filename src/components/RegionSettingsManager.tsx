import { useState, useEffect } from 'react';
import { MapPin, Check, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../services/supabase';

const UZB_REGIONS = [
  { id: 'tashkent_city', name: 'Toshkent shahri' },
  { id: 'tashkent_v', name: 'Toshkent viloyati' },
  { id: 'andijan', name: 'Andijon viloyati' },
  { id: 'bukhara', name: 'Buxoro viloyati' },
  { id: 'fergana', name: 'Fargʻona viloyati' },
  { id: 'jizzakh', name: 'Jizzax viloyati' },
  { id: 'namangan', name: 'Namangan viloyati' },
  { id: 'navoiy', name: 'Navoiy viloyati' },
  { id: 'qashqadaryo', name: 'Qashqadaryo viloyati' },
  { id: 'samarqand', name: 'Samarqand viloyati' },
  { id: 'sirdaryo', name: 'Sirdaryo viloyati' },
  { id: 'surxondaryo', name: 'Surxondaryo viloyati' },
  { id: 'xorazm', name: 'Xorazm viloyati' },
  { id: 'karakalpakstan', name: 'Qoraqalpogʻiston Respublikasi' },
];

const RegionSettingsManager = () => {
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('key', 'active_regions')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data && data.value) {
        setSelectedRegions(JSON.parse(data.value));
      }
    } catch (error) {
      console.error('Error fetching regions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRegion = (id: string) => {
    setSelectedRegions(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ 
          key: 'active_regions', 
          value: JSON.stringify(selectedRegions) 
        }, { onConflict: 'key' });

      if (error) throw error;
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving regions:', error);
      alert("Xatolik yuz berdi!");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="animate-spin text-sidebarDark" size={40} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight italic uppercase">
            Bu yerda biz bormiz
          </h2>
          <p className="text-slate-400 font-bold mt-2">
            Xizmatimiz mavjud bo'lgan viloyatlarni tanlang
          </p>
        </div>
        
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`flex items-center gap-3 px-8 py-4 rounded-[22px] font-black transition-all shadow-lg ${
            isSaving 
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
              : 'bg-sidebarDark text-white hover:bg-slate-800 shadow-sidebarDark/20 hover:scale-105 active:scale-95'
          }`}
        >
          {isSaving ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Check size={20} />
          )}
          <span>SAQLASH</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {UZB_REGIONS.map((region) => {
          const isSelected = selectedRegions.includes(region.id);
          return (
            <button
              key={region.id}
              onClick={() => toggleRegion(region.id)}
              className={`flex items-center gap-4 p-5 rounded-[28px] border-2 transition-all text-left ${
                isSelected
                  ? 'bg-sidebarDark border-sidebarDark text-white shadow-xl shadow-sidebarDark/10 scale-[1.02]'
                  : 'bg-white border-gray-100 text-slate-600 hover:border-gray-200 hover:bg-slate-50'
              }`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'
              }`}>
                <MapPin size={22} />
              </div>
              <span className={`text-sm font-black tracking-tight ${isSelected ? 'text-white' : 'text-slate-700'}`}>
                {region.name}
              </span>
              {isSelected && (
                <div className="ml-auto w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                  <Check size={14} className="text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Success Modal */}
      {saveSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200 border border-gray-100">
                <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-6 ring-4 ring-green-50">
                    <CheckCircle2 size={32} strokeWidth={2} />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">Muvaffaqiyatli!</h3>
                <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">
                    Xududlar ro'yxati muvaffaqiyatli yangilandi va saqlandi.
                </p>
                <div className="flex w-full">
                    <button 
                      onClick={() => setSaveSuccess(false)}
                      className="w-full h-12 bg-green-500 text-white font-bold rounded-2xl hover:bg-green-600 transition-all shadow-lg shadow-green-500/30 flex justify-center items-center"
                    >
                      Ajoyib
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default RegionSettingsManager;
