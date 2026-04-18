import { useState, useEffect } from 'react';
import { 
  Truck, 
  Plus, 
  Save, 
  Trash2, 
  AlertCircle,
  Hash,
  Layers,
  CheckCircle2,
  Loader2,
  Lightbulb,
  HelpCircle,
  ArrowRight
} from 'lucide-react';
import { useBlocker } from 'react-router-dom';
import { supabase } from '../services/supabase';

const formatPrice = (val: number | null | undefined) => {
  if (val === null || val === undefined || val === 0) return '';
  return new Intl.NumberFormat('uz-UZ').format(val).replace(/,/g, ' ');
};

const parsePriceInput = (val: string) => {
  const cleaned = val.replace(/\s/g, '');
  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
};

interface DeliveryTier {
  id: string;
  min: number;
  max: number | null;
  price: number;
}

interface DeliveryConfig {
  mode: 'fixed' | 'tiered';
  fixedPrice: number;
  tiers: DeliveryTier[];
}

const DeliveryPricingManager = () => {
  const [config, setConfig] = useState<DeliveryConfig>({
    mode: 'fixed',
    fixedPrice: 0,
    tiers: []
  });
  const [initialConfig, setInitialConfig] = useState<DeliveryConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const isDirty = !!initialConfig && JSON.stringify(config) !== JSON.stringify(initialConfig);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    fetchConfig();
  }, []);

  useEffect(() => {
    if (blocker.state === "blocked") {
      const proceed = window.confirm("Sizda saqlanmagan o'zgarishlar bor. Rostdan ham chiqmoqchimisiz?");
      if (proceed) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker.state]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const fetchConfig = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'delivery_config')
      .single();

    if (!error && data) {
      try {
        const parsed = JSON.parse(data.value);
        setConfig(parsed);
        setInitialConfig(parsed); 
      } catch (e) {
        console.error('Config parse error:', e);
      }
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    setShowConfirm(false);
    setIsSaving(true);
    const { error } = await supabase
      .from('app_settings')
      .upsert({ 
        key: 'delivery_config', 
        value: JSON.stringify(config),
        updated_at: new Date().toISOString()
      });

    if (!error) {
      setInitialConfig(JSON.parse(JSON.stringify(config))); // Update initial state after save
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      alert('Xatolik yuz berdi: ' + error.message);
    }
    setIsSaving(false);
  };

  const addTier = () => {
    const newTier: DeliveryTier = {
      id: Math.random().toString(36).substr(2, 9),
      min: 0,
      max: null,
      price: 0
    };
    setConfig(prev => ({ ...prev, tiers: [...prev.tiers, newTier] }));
  };

  const removeTier = (id: string) => {
    setConfig(prev => ({ ...prev, tiers: prev.tiers.filter(t => t.id !== id) }));
  };

  const updateTier = (id: string, field: keyof DeliveryTier, value: any) => {
    setConfig(prev => ({
      ...prev,
      tiers: prev.tiers.map(t => t.id === id ? { ...t, [field]: value } : t)
    }));
  };

  if (isLoading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-mustard" size={40} />
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20 max-w-[1400px] mx-auto px-4">
      {/* Premium Header */}
      <div className="bg-slate-900 rounded-[32px] p-8 text-white flex justify-between items-center shadow-2xl shadow-slate-900/20 shrink-0 border border-white/5">
        <div className="flex items-center gap-6">
           <div className="w-14 h-14 rounded-[20px] bg-mustard flex items-center justify-center text-white shadow-xl shadow-mustard/20">
             <Truck size={30} />
           </div>
           <div>
             <h2 className="text-2xl font-black tracking-tight">Yetkazib berish sozlamalari</h2>
             <p className="text-white/40 font-bold text-xs uppercase tracking-[0.2em] mt-1">Rejim va narxlarni boshqarish paneli</p>
           </div>
        </div>
        <button 
          onClick={() => setShowConfirm(true)}
          disabled={!isDirty || isSaving}
          className={`px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center gap-3 shadow-xl ${
            !isDirty 
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60' 
              : saveSuccess 
                ? 'bg-green-500 text-white' 
                : 'bg-mustard text-white hover:scale-105 active:scale-95 shadow-mustard/20'
          }`}
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : saveSuccess ? <CheckCircle2 size={20} /> : <Save size={20} />}
          {saveSuccess ? "Muvaffaqiyatli saqlandi" : "O'zgarishlarni saqlash"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Fixed Mode Card */}
        <div 
          onClick={() => setConfig(prev => ({ ...prev, mode: 'fixed' }))}
          className={`p-10 rounded-[48px] border-2 transition-all flex flex-col gap-8 relative cursor-pointer min-h-[600px] ${
            config.mode === 'fixed' ? 'bg-white border-mustard shadow-2xl shadow-mustard/5' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-6">
              <div className={`w-14 h-14 rounded-[20px] flex items-center justify-center shadow-sm ${
                config.mode === 'fixed' ? 'bg-mustard text-white' : 'bg-white text-slate-400 border border-slate-100'
              }`}>
                <Hash size={28} />
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Qat'iy Narx Rejimi</h3>
            </div>
            {/* Switch */}
            <div className={`w-12 h-6 rounded-full transition-all flex items-center px-1 ${
              config.mode === 'fixed' ? 'bg-mustard' : 'bg-slate-300'
            }`}>
              <div className={`w-4 h-4 bg-white rounded-full transition-all shadow-md ${
                config.mode === 'fixed' ? 'translate-x-6' : 'translate-x-0'
              }`} />
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-8">
            {/* Detailed Info Section */}
            <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-100 flex flex-col gap-6">
               <div className="flex items-center gap-3 text-slate-700">
                 <HelpCircle size={20} className="text-blue-500" />
                 <span className="text-xs font-black uppercase tracking-[0.2em]">Batafsil ma'lumot</span>
               </div>
               
               <div className="space-y-4">
                 <p className="text-sm font-medium text-slate-600 leading-relaxed">
                   Bu usulda buyurtmaning umumiy summasi qancha bo'lishidan qat'i nazar, yetkazib berish narxi bir xil (o'zgarmas) bo'lib qolaveradi. Eng sodda va ko'p qo'llaniladigan usul.
                 </p>
                 
                 <div className="h-px bg-slate-200/50 w-full" />
                 
                 <div className="space-y-3">
                   <div className="flex items-center gap-2 text-mustard">
                     <Lightbulb size={18} />
                     <span className="text-[10px] font-black uppercase tracking-widest">Hayotiy Misol:</span>
                   </div>
                   <div className="bg-white/80 p-5 rounded-2xl border border-white shadow-sm">
                      <p className="text-[12px] font-bold text-slate-600 leading-relaxed">
                        Masalan, siz dastavka narxini <span className="text-slate-900 font-extrabold text-xs">15 000 so'm</span> deb belgiladingiz. 
                        Mijoz xoh <span className="text-slate-900 font-extrabold text-xs">50 000 so'mlik</span>, 
                        xoh <span className="text-slate-900 font-extrabold text-xs">1 000 000 so'mlik</span> narsa buyurtma qilsin — 
                        u baribir bir xil miqdorda to'lovni amalga oshiradi.
                      </p>
                   </div>
                 </div>
               </div>
            </div>

            {/* Input Section */}
            <div className="space-y-4 pt-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4">Belgilangan narxni kiriting</label>
                <div className="relative">
                    <input 
                      type="text"
                      inputMode="numeric"
                      value={formatPrice(config.fixedPrice)}
                      onChange={(e) => setConfig(prev => ({ ...prev, fixedPrice: parsePriceInput(e.target.value) }))}
                      className="w-full bg-white border-2 border-slate-100 rounded-[32px] pl-10 pr-20 py-8 text-4xl font-black text-slate-800 focus:border-mustard outline-none transition-all shadow-inner"
                      placeholder="0"
                    />
                    <span className="absolute right-10 top-1/2 -translate-y-1/2 text-xl font-black text-slate-300">UZS</span>
                </div>
            </div>
          </div>
        </div>

        {/* Tiered Mode Card */}
        <div 
          onClick={() => setConfig(prev => ({ ...prev, mode: 'tiered' }))}
          className={`p-10 rounded-[48px] border-2 transition-all flex flex-col gap-8 relative cursor-pointer min-h-[600px] ${
            config.mode === 'tiered' ? 'bg-white border-mustard shadow-2xl shadow-mustard/5' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-6">
              <div className={`w-14 h-14 rounded-[20px] flex items-center justify-center shadow-sm ${
                config.mode === 'tiered' ? 'bg-mustard text-white' : 'bg-white text-slate-400 border border-slate-100'
              }`}>
                <Layers size={28} />
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Summaga qarab Rejim</h3>
            </div>
            {/* Switch */}
            <div className={`w-12 h-6 rounded-full transition-all flex items-center px-1 ${
              config.mode === 'tiered' ? 'bg-mustard' : 'bg-slate-300'
            }`}>
              <div className={`w-4 h-4 bg-white rounded-full transition-all shadow-md ${
                config.mode === 'tiered' ? 'translate-x-6' : 'translate-x-0'
              }`} />
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-8">
            {/* Detailed Info Section */}
            <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-100 flex flex-col gap-6">
               <div className="flex items-center gap-3 text-slate-700">
                 <HelpCircle size={20} className="text-blue-500" />
                 <span className="text-xs font-black uppercase tracking-[0.2em]">Batafsil ma'lumot</span>
               </div>
               
               <div className="space-y-4">
                 <p className="text-sm font-medium text-slate-600 leading-relaxed">
                   Buyurtma summasiga qarab yetkazib berish narxining turli bosqichlarini belgilash imkoniyati. Masalan, mijoz ko'proq mahsulot olsa, unga chegirma yoki bepul dastavka taqdim etish mumkin.
                 </p>
                 
                 <div className="h-px bg-slate-200/50 w-full" />
                 
                 <div className="space-y-3">
                   <div className="flex items-center gap-2 text-mustard">
                     <Lightbulb size={18} />
                     <span className="text-[10px] font-black uppercase tracking-widest">Savdoni oshirish siri:</span>
                   </div>
                   <div className="bg-white/80 p-5 rounded-2xl border border-white shadow-sm space-y-3">
                      <p className="text-[11px] font-bold text-slate-600 leading-relaxed">
                        <span className="text-slate-900 font-extrabold">Shunday belgilashingiz mumkin:</span>
                      </p>
                      <div className="space-y-1.5 ml-2">
                        <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                          <ArrowRight size={12} className="text-mustard" />
                          <span>0 dan 150 000 gacha xaridga → 15 000 so'm</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-black text-green-600">
                          <ArrowRight size={12} className="text-mustard" />
                          <span>150 000 dan yuqori xaridga → 0 so'm (Bepul!)</span>
                        </div>
                      </div>
                   </div>
                 </div>
               </div>
            </div>

            {/* Input Section */}
            <div className="space-y-6">
                <div className="flex justify-between items-center px-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Narx qatlamlarini sozlash</h4>
                  <button 
                    onClick={(e) => { e.stopPropagation(); addTier(); }}
                    className="px-6 py-3 bg-slate-900 hover:bg-slate-800 rounded-2xl text-white transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest shadow-lg shadow-slate-900/10"
                  >
                    <Plus size={18} /> Qatlam Qo'shish
                  </button>
                </div>
                
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-3 custom-scrollbar">
                  {config.tiers.map((tier) => (
                    <div key={tier.id} className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 flex flex-wrap lg:flex-nowrap items-end gap-5 animate-in slide-in-from-left-4 duration-300 hover:bg-white hover:border-slate-200 group transition-all shadow-sm hover:shadow-md">
                      <div className="flex-1 min-w-[130px] space-y-2">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Summa (Dan)</label>
                        <div className="relative">
                          <input 
                            type="text"
                            inputMode="numeric"
                            value={formatPrice(tier.min)}
                            onChange={(e) => updateTier(tier.id, 'min', parsePriceInput(e.target.value))}
                            className="w-full bg-white border-2 border-slate-100 rounded-2xl py-3 px-4 text-sm font-black text-slate-700 focus:border-mustard outline-none transition-all"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div className="flex-1 min-w-[130px] space-y-2">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Summa (Gacha)</label>
                        <input 
                          type="text"
                          inputMode="numeric"
                          value={formatPrice(tier.max)}
                          onChange={(e) => updateTier(tier.id, 'max', e.target.value ? parsePriceInput(e.target.value) : null)}
                          className="w-full bg-white border-2 border-slate-100 rounded-2xl py-3 px-4 text-sm font-black text-slate-700 focus:border-mustard outline-none transition-all font-mono"
                          placeholder="CHEKSIZ"
                        />
                      </div>
                      <div className="flex-[1.8] min-w-[160px] space-y-2">
                        <label className="block text-[9px] font-black text-mustard uppercase tracking-widest ml-1">Yetkazib berish Narxi</label>
                        <div className="relative">
                          <input 
                            type="text"
                            inputMode="numeric"
                            value={formatPrice(tier.price)}
                            onChange={(e) => updateTier(tier.id, 'price', parsePriceInput(e.target.value))}
                            className="w-full bg-white border-2 border-mustard/20 rounded-2xl py-3 pl-4 pr-14 text-sm font-black text-slate-900 focus:border-mustard outline-none transition-all shadow-sm"
                            placeholder="0"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-300">UZS</span>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeTier(tier.id); }}
                        className="p-3.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all shadow-sm mb-0.5 border border-transparent hover:border-red-100"
                        title="Ushbu qatlamni o'chirish"
                      >
                        <Trash2 size={22} />
                      </button>
                    </div>
                  ))}

                  {config.tiers.length === 0 && (
                    <div className="py-24 text-center border-2 border-dashed border-slate-100 rounded-[48px] bg-slate-50/50">
                      <p className="text-xs font-black text-slate-300 uppercase tracking-[0.4em]">Hali hech qanday qatlam qo'shilmadi</p>
                    </div>
                  )}
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[64px] shadow-2xl p-14 text-center animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="w-24 h-24 rounded-[40px] bg-mustard/10 flex items-center justify-center mx-auto mb-10 text-mustard rotate-12 shadow-inner">
              <AlertCircle size={48} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Saqlaysizmi?</h3>
            <p className="text-sm font-bold text-slate-500 mb-12 leading-relaxed px-2">
              Yangi sozlamalar barcha yangi buyurtmalar uchun birdaniga amal qilishni boshlaydi.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleSave}
                className="w-full px-8 py-5 rounded-[28px] bg-slate-900 text-white font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all shadow-2xl shadow-slate-900/30 active:scale-95"
              >
                Ha, tasdiqlash
              </button>
              <button 
                onClick={() => setShowConfirm(false)}
                className="w-full px-8 py-5 rounded-[28px] bg-slate-50 text-slate-400 font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-100"
              >
                Yo'q, qaytish
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}} />
    </div>
  );
};

export default DeliveryPricingManager;
