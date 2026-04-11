import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { Plus, Trash2, Check, X, Image as ImageIcon, Loader2, Info } from 'lucide-react';
import Cropper from 'react-easy-crop';
import type { Point, Area } from 'react-easy-crop';

interface Banner {
  id: string;
  image_url: string;
  link: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

const BannersManager = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form state
  const [link, setLink] = useState('');
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState(true);
  
  // Crop state
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Modals state
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [statusConfirm, setStatusConfirm] = useState<{id: string, currentStatus: boolean} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .order('sort_order', { ascending: true });
        
      if (error) {
        // If the table doesn't exist yet, we catch it silently
        console.error('Fetch error:', error);
      } else {
        setBanners(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageSrc(reader.result?.toString() || null);
        if (!link) setLink('#'); // Rasm yuklanganda havolani oq srazi avtomatik '#' ga to'ldiradi
      });
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixelsTarget: Area) => {
    setCroppedAreaPixels(croppedAreaPixelsTarget);
  }, []);

  // Utility to create a cropped image
  const getCroppedImg = async (imageSrc: string, pixelCrop: Area): Promise<Blob> => {
    const image = new Image();
    image.src = imageSrc;
    await new Promise((resolve) => (image.onload = resolve));

    const canvas = document.createElement('canvas');
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error('No 2d context');

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob((file) => {
        if (file) resolve(file);
        else reject(new Error('Canvas is empty'));
      }, 'image/jpeg');
    });
  };

  const uploadAndSaveBanner = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    
    setIsUploading(true);
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      const fileExt = 'jpg';
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('banners')
        .upload(filePath, croppedImage);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('banners')
        .getPublicUrl(filePath);

      // Save to database
      const { error: insertError } = await supabase.from('banners').insert({
        image_url: publicUrlData.publicUrl,
        link,
        sort_order: sortOrder,
        is_active: isActive
      });

      if (insertError) throw insertError;

      // Close and refresh
      setIsModalOpen(false);
      resetForm();
      fetchBanners();
    } catch (error) {
      console.error('Error uploading banner:', error);
      alert('Xatolik yuz berdi! ' + (error as any).message);
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setImageSrc(null);
    setLink('');
    setSortOrder(0);
    setIsActive(true);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('banners').delete().eq('id', id);
      if (error) throw error;
      fetchBanners();
    } catch (err) {
      console.error(err);
      alert('Xatolik yuz berdi!');
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(null);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    setIsToggling(true);
    try {
      const { error } = await supabase
        .from('banners')
        .update({ is_active: !currentStatus })
        .eq('id', id);
      if (error) throw error;
      fetchBanners();
    } catch (err) {
      console.error(err);
      alert('Xatolik yuz berdi!');
    } finally {
      setIsToggling(false);
      setStatusConfirm(null);
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Bannerlar ro'yxati</h2>
          <p className="text-sm font-bold text-slate-500 mt-1">Mijoz mobil ilovasida ko'rinadigan reklamalar</p>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-slate-300" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, index) => {
              const banner = banners[index];
              
              // Agar bu uyada banner bo'lsa
              if (banner) {
                return (
                  <div key={banner.id} className="group rounded-[24px] border border-gray-100 bg-white overflow-hidden shadow-sm hover:shadow-md transition-all">
                    <div className="aspect-[16/9] w-full bg-slate-100 relative overflow-hidden">
                      <img src={banner.image_url} alt="Banner" className="w-full h-full object-cover" />
                      <div className="absolute top-3 right-3 flex gap-2 pointer-events-none">
                        <div className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest shadow-sm backdrop-blur-md border ${
                            banner.is_active 
                              ? 'bg-green-500/90 text-white border-green-600/50' 
                              : 'bg-white/90 text-slate-500 border-gray-200/50'
                          }`}>
                          {banner.is_active ? 'Faol' : 'Nofaol'}
                        </div>
                      </div>
                    </div>
                    <div className="p-4 flex items-center justify-between border-t border-gray-100 bg-slate-50/50">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-slate-600">ID: #{banner.sort_order}</span>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <button 
                          title="Faollik holati"
                          onClick={() => setStatusConfirm({id: banner.id, currentStatus: banner.is_active})}
                          className={`w-9 h-5 rounded-full px-0.5 flex items-center transition-colors shrink-0 ${banner.is_active ? 'bg-green-500' : 'bg-slate-300'}`}
                         >
                           <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${banner.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
                         </button>

                        <button title="O'chirish" onClick={() => setDeleteConfirm(banner.id)} className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }
              
              // Bo'sh joylar (Yangi qo'shish tugmalari)
              return (
                <button 
                  key={`empty-${index}`}
                  onClick={() => {
                    setSortOrder(banners.length + 1); // Avtomat ketma-ketlik
                    setIsModalOpen(true);
                  }} 
                  className="group rounded-[24px] border-2 border-dashed border-gray-200 bg-slate-50 hover:bg-slate-100 flex flex-col items-center justify-center aspect-[16/9] transition-all"
                >
                  <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Plus size={24} className="text-sidebarDark" />
                  </div>
                  <span className="text-[11px] font-black text-slate-400 group-hover:text-slate-600 uppercase tracking-widest transition-colors mb-1">Yangi qo'shish</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white">
               <h3 className="text-xl font-black text-slate-800 tracking-tight">Yangi banner qo'shish</h3>
               <button title="Yopish" onClick={() => { setIsModalOpen(false); resetForm(); }} className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200">
                 <X size={20} />
               </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
               <div className="space-y-2">
                 <label className="text-sm font-black text-slate-500 uppercase tracking-widest">Rasm (16:9 format)</label>
                 {!imageSrc ? (
                   <div className="w-full h-48 rounded-3xl border-2 border-dashed border-gray-200 bg-slate-50 flex flex-col items-center justify-center text-slate-400 cursor-pointer overflow-hidden relative hover:bg-slate-100 transition-colors">
                     <ImageIcon size={40} className="mb-3" />
                     <span className="text-sm font-bold">Rasmni tanlang</span>
                     <input title="Rasmni tanlang" type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                   </div>
                 ) : (
                   <div className="relative w-full aspect-[16/9] bg-slate-50 rounded-3xl overflow-hidden border border-gray-100">
                      <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={16 / 9}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                      />
                   </div>
                 )}
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="flex items-center gap-4 bg-slate-50/50 border border-gray-100 rounded-2xl p-4 select-none h-full">
                    <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center shrink-0">
                       <span className="text-xl font-black text-sidebarDark">#{sortOrder}</span>
                    </div>
                    <div className="flex flex-col">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Banner ID</span>
                       <span className="text-[11px] font-bold text-slate-500">Ilovadagi ketma-ketlik raqami</span>
                    </div>
                 </div>
                 
                 <div className="flex flex-col justify-center gap-2 bg-slate-50/50 border border-gray-100 rounded-2xl p-4 select-none h-full">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-1.5 text-slate-600">
                       <Info size={16} strokeWidth={2.5} />
                       <span className="text-sm font-black">Faol holat</span>
                     </div>
                     <button 
                      title="Faollik holati"
                      onClick={() => setIsActive(!isActive)}
                      className={`w-12 h-6 rounded-full px-1 flex items-center transition-colors shrink-0 ${isActive ? 'bg-sidebarDark' : 'bg-slate-200'}`}
                     >
                       <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-0'}`} />
                     </button>
                   </div>
                   <span className="text-[11px] font-bold text-slate-400 pl-[22px]">Banner mijozlarga ko'rinishi uchun</span>
                 </div>
               </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-slate-50/50 flex justify-end gap-3">
               <button 
                  onClick={() => { setIsModalOpen(false); resetForm(); }}
                  className="px-6 py-4 rounded-2xl bg-white border border-gray-200 font-black text-slate-600 text-xs uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
               >
                 Bekor qilish
               </button>
               <button 
                  onClick={uploadAndSaveBanner}
                  disabled={!imageSrc || isUploading}
                  className="px-10 py-4 rounded-2xl bg-sidebarDark text-white font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
               >
                 {isUploading ? <><Loader2 size={16} className="animate-spin" /> Saqlanmoqda...</> : <><Check size={16} /> Saqlash</>}
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200 border border-gray-100">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6 ring-4 ring-red-50">
                    <Trash2 size={28} strokeWidth={2} />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">Bannerni o'chirasizmi?</h3>
                <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">
                    Bu banner barcha tarmoqlardan va tizimdan butunlay olib tashlanadi. Buni ortga qaytarib bo'lmaydi.
                </p>
                <div className="flex w-full gap-3">
                    <button 
                      onClick={() => setDeleteConfirm(null)}
                      disabled={isDeleting}
                      className="flex-1 h-12 bg-slate-50 text-slate-600 font-bold rounded-2xl hover:bg-slate-100 transition-all border border-gray-100 disabled:opacity-50"
                    >
                      Bekor qilish
                    </button>
                    <button 
                      onClick={() => handleDelete(deleteConfirm)}
                      disabled={isDeleting}
                      className="flex-1 h-12 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/30 flex justify-center items-center disabled:opacity-50"
                    >
                      {isDeleting ? <Loader2 size={20} className="animate-spin" /> : 'O\'chirish'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Toggle Status Modal */}
      {statusConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200 border border-gray-100">
                <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-6 ring-4 ring-blue-50">
                    <Info size={28} strokeWidth={2} />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">Muhim o'zgartirish!</h3>
                <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">
                    {statusConfirm.currentStatus ? "Banner haqiqatdan ham mijozlar ilovasidan yashirilsinmi?" : "Banner rostdan faollashtirilib mijozlarga ko'rsatilsinmi?"}
                </p>
                <div className="flex w-full gap-3">
                    <button 
                      onClick={() => setStatusConfirm(null)}
                      disabled={isToggling}
                      className="flex-1 h-12 bg-slate-50 text-slate-600 font-bold rounded-2xl hover:bg-slate-100 transition-all border border-gray-100 disabled:opacity-50"
                    >
                      Bekor qilish
                    </button>
                    <button 
                      onClick={() => toggleStatus(statusConfirm.id, statusConfirm.currentStatus)}
                      disabled={isToggling}
                      className="flex-1 h-12 bg-blue-500 text-white font-bold rounded-2xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/30 flex justify-center items-center disabled:opacity-50"
                    >
                      {isToggling ? <Loader2 size={20} className="animate-spin" /> : 'Tasdiqlash'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default BannersManager;
