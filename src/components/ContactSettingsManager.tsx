import React, { useState, useEffect } from 'react';
import { Phone, Send, Check, Loader2, X, CheckCircle2 } from 'lucide-react';
import { supabase } from '../services/supabase';

const ContactSettingsManager = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.from('app_settings').select('*');
      if (error) throw error;
      
      if (data) {
        const phoneSetting = data.find(s => s.key === 'contact_phone');
        const telegramSetting = data.find(s => s.key === 'contact_telegram');
        
        if (phoneSetting) setPhoneNumber(formatPhoneNumber(phoneSetting.value));
        if (telegramSetting) setTelegramUsername(telegramSetting.value);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const formatPhoneNumber = (value: string) => {
    const raw = value.replace(/\D/g, '').substring(0, 9);
    let formatted = '';
    if (raw.length > 0) {
      formatted += raw.substring(0, 2);
    }
    if (raw.length > 2) {
      formatted += ' ' + raw.substring(2, 5);
    }
    if (raw.length > 5) {
      formatted += ' ' + raw.substring(5, 7);
    }
    if (raw.length > 7) {
      formatted += ' ' + raw.substring(7, 9);
    }
    return formatted;
  };

  const handleSave = async () => {
    const rawPhone = phoneNumber.replace(/\D/g, '');
    if (rawPhone.length !== 9) {
       setSaveError(true);
       return;
    }

    setIsSaving(true);
    try {
      const { error: phoneError } = await supabase
        .from('app_settings')
        .upsert({ key: 'contact_phone', value: rawPhone }, { onConflict: 'key' });
        
      if (phoneError) throw phoneError;
      
      const { error: tgError } = await supabase
        .from('app_settings')
        .upsert({ key: 'contact_telegram', value: telegramUsername }, { onConflict: 'key' });
        
      if (tgError) throw tgError;
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert("Xatolik yuz berdi!");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-8 animate-in fade-in duration-500">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Aloqa qilinadigan manzillar</h2>
        <p className="text-sm font-bold text-slate-500 mt-2">
          Mijozlar sarmoya yoki yordam uchun qaysi raqam va profil orqali bog'lanishlarini ko'rsating.
        </p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* Phone Number Field */}
        <div className="bg-slate-50 p-6 rounded-3xl border border-gray-100 relative group transition-all hover:bg-slate-100/50 hover:shadow-sm">
           <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 block mb-3">
             Telefon raqam
           </label>
           <div className="relative flex items-center">
             <div className="absolute left-5 top-1/2 -translate-y-1/2 w-10 h-10 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center z-10">
               <Phone size={18} />
             </div>
             
             {/* Static +998 text */}
             <div className="absolute left-16 top-1/2 -translate-y-1/2 mt-[2px] pl-2 flex items-center text-lg font-black text-slate-500 z-10 pointer-events-none">
                +998
             </div>

             <input 
               type="text" 
               inputMode="numeric"
               value={phoneNumber}
               onChange={(e) => {
                 setPhoneNumber(formatPhoneNumber(e.target.value));
               }}
               placeholder="00 000 00 00"
               className={`w-full pl-32 pr-14 py-5 bg-white border rounded-[24px] outline-none transition-all text-lg font-black text-slate-800 shadow-sm
                 ${phoneNumber.replace(/\D/g, '').length > 0 && phoneNumber.replace(/\D/g, '').length < 9 
                    ? 'border-red-300 focus:ring-4 focus:ring-red-500/10 focus:border-red-500' 
                    : phoneNumber.replace(/\D/g, '').length === 9 
                      ? 'border-green-300 focus:ring-4 focus:ring-green-500/10 focus:border-green-500'
                      : 'border-gray-200 focus:ring-4 focus:ring-sidebarDark/10 focus:border-sidebarDark'
                 }
               `}
             />

             {/* Validation icon */}
             <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center justify-center z-10 pointer-events-none">
                {phoneNumber.replace(/\D/g, '').length > 0 && phoneNumber.replace(/\D/g, '').length < 9 && (
                    <X size={20} className="text-red-500" />
                )}
                {phoneNumber.replace(/\D/g, '').length === 9 && (
                    <CheckCircle2 size={20} className="text-green-500" />
                )}
             </div>
           </div>
           <p className="text-xs text-slate-400 font-bold mt-4 px-2">Ilovadagi "Bog'lanish" tugmasi bosilganda shu raqamga qo'ng'iroq ketadi.</p>
        </div>

        {/* Telegram Username Field */}
        <div className="bg-slate-50 p-6 rounded-3xl border border-gray-100 relative group transition-all hover:bg-slate-100/50 hover:shadow-sm">
           <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 block mb-3">
             Telegram Nik (Username)
           </label>
           <div className="relative">
             <div className="absolute left-5 top-1/2 -translate-y-1/2 w-10 h-10 bg-blue-100 text-blue-500 rounded-2xl flex items-center justify-center translate-x-[-1px]">
               <Send size={18} />
             </div>
             <input 
               type="text" 
               value={telegramUsername}
               onChange={(e) => {
                 let val = e.target.value;
                 if (!val.startsWith('@') && val.length > 0) val = '@' + val;
                 setTelegramUsername(val);
               }}
               placeholder="@roketa_admin"
               className="w-full pl-20 pr-6 py-5 bg-white border border-gray-200 rounded-[24px] outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-lg font-black text-slate-800 shadow-sm"
             />
           </div>
           <p className="text-xs text-slate-400 font-bold mt-4 px-2">Kuryerlar yoki mijozlar telegramdan yozishganda ushbu profil ochiladi.</p>
        </div>

        <div className="pt-6">
           <button 
             onClick={handleSave}
             disabled={isSaving}
             className="w-full md:w-auto px-12 py-5 rounded-2xl bg-sidebarDark text-white font-black uppercase tracking-widest text-sm hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
           >
             {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
             Saqlash
           </button>
        </div>

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
                    Yangi aloqa ma'lumotlari muvaffaqiyatli saqlandi va barcha tarmoqlarga uzatildi.
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

      {/* Error Modal */}
      {saveError && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200 border border-gray-100">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6 ring-4 ring-red-50">
                    <X size={32} strokeWidth={2} />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">Noto'g'ri raqam!</h3>
                <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">
                    Iltimos, telefon raqamini to'liq O'zbekiston standarti (9 xonali son) asosida kiriting. Chala yoki xato raqam saqlanmaydi.
                </p>
                <div className="flex w-full">
                    <button 
                      onClick={() => setSaveError(false)}
                      className="w-full h-12 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/30 flex justify-center items-center"
                    >
                      Qaytadan kiritish
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ContactSettingsManager;
