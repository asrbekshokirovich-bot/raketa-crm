import { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import EmojiPicker from 'emoji-picker-react';
import { Loader2, Plus, Send, X, Trash2, Image as ImageIcon, Film, Clock, User, MessageCircle, Smartphone, Smile } from 'lucide-react';

interface Announcement {
  id: string;
  content: string;
  media_url: string | null;
  media_type: 'image' | 'video' | null;
  created_at: string;
  status: string;
}

const AnnouncementsManager = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{id: string, mediaUrl: string | null} | null>(null);
  const [sendConfirm, setSendConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  useEffect(() => {
    // Scroll to bottom when announcements change
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [announcements]);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: true }); // Newest at bottom

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (err) {
      console.error('Error fetching announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
      alert("Faqat rasm yoki video yuklash mumkin!");
      return;
    }

    setMediaFile(file);
    setMediaType(isVideo ? 'video' : 'image');
    setPreviewUrl(URL.createObjectURL(file));
  };

  const removeMedia = () => {
    setMediaFile(null);
    setPreviewUrl(null);
    setMediaType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    if (!content.trim() && !mediaFile) return;

    setIsSending(true);
    let mediaUrl = null;

    try {
      // 1. Upload Media
      if (mediaFile) {
        const fileExt = mediaFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `post_media/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('announcements')
          .upload(filePath, mediaFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('announcements')
          .getPublicUrl(filePath);

        mediaUrl = publicUrlData.publicUrl;
      }

      // 2. Save Announcement
      const newAnnouncement = {
        content: content.trim() || null,
        media_url: mediaUrl,
        media_type: mediaType,
        status: 'sent',
      };

      const { data, error } = await supabase
        .from('announcements')
        .insert([newAnnouncement])
        .select()
        .single();

      if (error) throw error;

      // 3. Update Local State
      setAnnouncements((prev) => [...prev, data]);
      
      // 4. Clear Composer
      setContent('');
      removeMedia();
      setShowEmoji(false);

    } catch (err) {
      console.error('Error sending announcement:', err);
      alert('Yuborishda xatolik yuz berdi. Baza to\'g\'ri sozlanganligini tekshiring.');
    } finally {
      setIsSending(false);
    }
  };

  const executeDelete = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);

    const { id, mediaUrl } = deleteConfirm;

    try {
      if (mediaUrl) {
        try {
          const urlObj = new URL(mediaUrl);
          const pathParts = urlObj.pathname.split('/');
          const objectPath = pathParts.slice(pathParts.indexOf('announcements') + 1).join('/');
          
          if (objectPath) {
            await supabase.storage.from('announcements').remove([objectPath]);
          }
        } catch (e) {
             console.error("Storage parse error:", e);
        }
      }

      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatMessageTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
  };

  const formatMessageDate = (dateStr: string) => {
      const d = new Date(dateStr);
      return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  return (
    <>
    {/* Send Confirmation Modal */}
    {sendConfirm && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200 border border-gray-100">
              <div className="w-16 h-16 bg-sidebarDark/10 text-sidebarDark rounded-full flex items-center justify-center mb-6 ring-4 ring-sidebarDark/5">
                  <Send size={28} strokeWidth={2} className="ml-1" />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">Xabar yuborilsinmi?</h3>
              <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">
                  Ushbu e'lon barcha mijozlarga jo'natiladi. Tasdiqlaysizmi?
              </p>
              <div className="flex w-full gap-3">
                  <button 
                    onClick={() => setSendConfirm(false)}
                    className="flex-1 h-12 bg-slate-50 text-slate-600 font-bold rounded-2xl hover:bg-slate-100 transition-all border border-gray-100"
                  >
                    Bekor qilish
                  </button>
                  <button 
                    onClick={() => {
                        setSendConfirm(false);
                        handleSend();
                    }}
                    className="flex-1 h-12 bg-sidebarDark text-white font-bold rounded-2xl hover:bg-sidebarDark/90 transition-all shadow-lg shadow-sidebarDark/30 flex justify-center items-center"
                  >
                    Tasdiqlash
                  </button>
              </div>
          </div>
      </div>
    )}

    {/* Delete Confirmation Modal */}
    {deleteConfirm && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200 border border-gray-100">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6 ring-4 ring-red-50">
                  <Trash2 size={28} strokeWidth={2} />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">E'lon o'chirilsinmi?</h3>
              <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">
                  Diqqat! Ushbu e'lon barcha mijozlarning ilovasidan darhol g'oyib bo'ladi va tizimdan butunlay o'chib ketadi. Buni ortga qaytarib bo'lmaydi.
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
                    onClick={executeDelete}
                    disabled={isDeleting}
                    className="flex-1 h-12 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/30 disabled:opacity-50 flex justify-center items-center gap-2"
                  >
                    {isDeleting ? <Loader2 size={16} className="animate-spin"/> : null} 
                    O'chirish
                  </button>
              </div>
          </div>
      </div>
    )}

    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 duration-500">
      
      {/* LEFT: COMPOSER AREA */}
      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden flex flex-col p-8 col-span-1 h-[600px] relative">
         <div className="mb-6">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
               <div className="w-10 h-10 rounded-2xl bg-sidebarDark/5 flex items-center justify-center text-sidebarDark">
                  <MessageCircle size={20} />
               </div>
               Yangi e'lon yuborish
            </h2>
            <p className="text-sm font-bold text-slate-400 mt-2">Ushbu bo'limdan yozgan xabarlaringiz mijozlarga rasm va video ko'rinishida yetib boradi.</p>
         </div>

         <div className="flex-1 flex flex-col mt-4">
             {/* Preview Box */}
             {previewUrl && (
                  <div className="relative w-fit mb-6 animate-in fade-in zoom-in-95 duration-200 group">
                      <button 
                          onClick={removeMedia}
                          title="Faylni olib tashlash"
                          aria-label="Faylni olib tashlash"
                          className="absolute -top-3 -right-3 w-8 h-8 bg-white border border-gray-100 rounded-full flex items-center justify-center shadow-lg text-slate-400 hover:text-red-500 transition-colors z-10"
                      >
                          <X size={16} strokeWidth={3} />
                      </button>
                      <div className="h-48 rounded-3xl overflow-hidden border-4 border-slate-50 relative bg-black/5 shadow-inner">
                          {mediaType === 'image' ? (
                              <img src={previewUrl} alt="preview" className="h-full object-cover" />
                          ) : (
                              <div className="h-full w-60 flex items-center justify-center bg-slate-900">
                                  <Film size={40} className="text-white/60" />
                              </div>
                          )}
                          <div className="absolute bottom-3 left-3 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-xl text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2 shadow-lg">
                              {mediaType === 'image' ? <ImageIcon size={12} /> : <Film size={12} />}
                              {mediaType === 'image' ? 'Rasm' : 'Video'} biriktirildi
                          </div>
                      </div>
                  </div>
              )}

              {/* Textarea */}
              <div className="flex-1 bg-slate-50 rounded-[32px] p-2 border border-gray-100 flex flex-col shadow-[inset_0_2px_6px_rgba(0,0,0,0.02)] transition-all focus-within:ring-4 focus-within:ring-sidebarDark/5 focus-within:bg-white mb-6">
                  <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="E'lon matnini yozing (yoki tanlangan rasmga izoh qoldiring)..."
                      className="flex-1 bg-transparent px-6 py-5 outline-none text-base text-slate-700 font-medium resize-none"
                  />
                  <div className="px-4 pb-2 text-[11px] font-black tracking-widest uppercase text-slate-300 flex justify-between items-center">
                      <span></span>
                      <span className={content.length > 500 ? 'text-orange-400' : ''}>{content.length} ta belgi</span>
                  </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-4 relative">
                  
                  {/* Emoji Picker Popup */}
                  {showEmoji && (
                      <div className="absolute bottom-[calc(100%+1.5rem)] left-0 z-50 shadow-2xl rounded-3xl overflow-hidden border border-gray-100 animate-in fade-in slide-in-from-bottom-4">
                          <EmojiPicker 
                              onEmojiClick={(e) => {
                                  setContent(prev => prev + e.emoji);
                                  setShowEmoji(false);
                              }}
                              searchPlaceholder="Kulgich qidirish"
                              width={320}
                              height={380}
                          />
                      </div>
                  )}

                  <button 
                      onClick={() => setShowEmoji(!showEmoji)}
                      className={`h-14 px-5 rounded-2xl flex items-center justify-center transition-all border shadow-sm ${
                        showEmoji 
                          ? 'bg-slate-800 text-white border-slate-700' 
                          : 'text-slate-400 bg-slate-50 hover:bg-slate-100 hover:text-slate-700 border-gray-100'
                      }`}
                      title="Emoji qo'shish"
                  >
                      <Smile size={24} />
                  </button>

                  <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*,video/*"
                      onChange={handleFileSelect}
                      title="Media yuklash"
                      aria-label="Media yuklash"
                  />
                  <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="h-14 px-6 rounded-2xl flex items-center gap-3 text-slate-500 font-black tracking-widest uppercase text-xs bg-slate-50 hover:bg-slate-100 transition-all border border-gray-100 shadow-sm"
                  >
                      <Plus size={18} strokeWidth={3} />
                      Media yuklash
                  </button>
                  
                  <button 
                      onClick={() => setSendConfirm(true)}
                      disabled={isSending || (!content.trim() && !mediaFile)}
                      className="h-14 flex-1 rounded-2xl bg-sidebarDark text-white flex items-center justify-center gap-3 font-black tracking-widest uppercase text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 shadow-lg shadow-sidebarDark/20"
                  >
                      {isSending ? (
                         <><Loader2 size={20} className="animate-spin" /> Yuborilmoqda...</>
                      ) : (
                         <>Xabarni yuborish <Send size={18} /></>
                      )}
                  </button>
              </div>
         </div>
      </div>

      {/* RIGHT: APP PREVIEW AREA */}
      <div className="col-span-1 flex justify-center bg-transparent relative h-full">
         {/* Phone Frame Mockup */}
         <div className="w-[340px] h-[640px] bg-white rounded-[50px] border-[12px] border-slate-900 shadow-2xl relative flex flex-col overflow-hidden ring-2 ring-slate-200 shrink-0 -mt-8">
             
             {/* Side Buttons (Visual Only) */}
             <div className="absolute top-[120px] -left-[14px] w-1 h-12 bg-slate-800 rounded-l-md"></div>
             <div className="absolute top-[180px] -left-[14px] w-1 h-12 bg-slate-800 rounded-l-md"></div>
             <div className="absolute top-[150px] -right-[14px] w-1 h-16 bg-slate-800 rounded-r-md"></div>

             {/* Dynamic Island */}
             <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[100px] h-[28px] bg-black rounded-full z-30 flex items-center justify-between px-2 shadow-sm">
                 <div className="w-2.5 h-2.5 rounded-full bg-slate-800/80 shadow-inner"></div>
                 <div className="w-2.5 h-2.5 rounded-full bg-slate-800/80 shadow-inner"></div>
             </div>

             {/* Phone Header */}
             <div className="bg-white/95 backdrop-blur-sm pt-10 pb-3 px-5 border-b border-gray-100 shadow-sm z-20 flex items-center justify-center relative">
                 <h3 className="font-black text-slate-800 text-[15px] tracking-tight">Roketa Market</h3>
             </div>

             {/* Phone Feed */}
             <div 
                ref={feedRef}
                className="flex-1 bg-[#F5F7FA] overflow-y-auto p-4 flex flex-col gap-4 pb-12 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
              >
                {loading ? (
                  <div className="flex-1 flex items-center justify-center">
                     <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
                  </div>
                ) : announcements.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-300 gap-4">
                    <MessageCircle size={32} strokeWidth={1.5} className="text-slate-200" />
                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-300 text-center px-8">Feed bo'sh. Xabarlar bu yerda ko'rinadi</p>
                  </div>
                ) : (
                  announcements.map((post, index) => {
                      let showDate = false;
                      if (index === 0) showDate = true;
                      else {
                          const prevDate = new Date(announcements[index-1].created_at).toDateString();
                          const currDate = new Date(post.created_at).toDateString();
                          if (prevDate !== currDate) showDate = true;
                      }

                      return (
                        <div key={post.id} className="flex flex-col gap-3 group">
                          {showDate && (
                              <div className="flex justify-center my-1 z-10 sticky top-2">
                                  <span className="px-3 py-1 bg-black/10 backdrop-blur-md rounded-full text-[9px] font-black tracking-widest text-slate-600 uppercase shadow-sm">
                                      {formatMessageDate(post.created_at)}
                                  </span>
                              </div>
                          )}
                          
                          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden relative pb-0 transition-transform">
                                {/* Delete Button overlay on hover */}
                                <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => setDeleteConfirm({id: post.id, mediaUrl: post.media_url})}
                                        title="Ushbu e'lonni o'chirish"
                                        aria-label="Ushbu e'lonni o'chirish"
                                        className="w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white shadow-sm border border-gray-100 transition-all"
                                    >
                                        <Trash2 size={12} strokeWidth={2.5} />
                                    </button>
                                </div>

                                {/* Media */}
                                {post.media_url && (
                                    <div className="bg-slate-100/50 p-1">
                                        {post.media_type === 'image' ? (
                                            <img src={post.media_url} alt="post media" className="w-full rounded-xl max-h-[300px] object-cover" />
                                        ) : (
                                            <video 
                                                src={post.media_url} 
                                                className="w-full rounded-xl max-h-[300px] object-contain bg-black"
                                                controls
                                            />
                                        )}
                                    </div>
                                )}

                                {/* Content text */}
                                {(post.content || !post.media_url) && (
                                    <div className="px-4 py-3 whitespace-pre-wrap break-words text-[13px] text-slate-700 font-medium leading-relaxed">
                                        {post.content || <i className="text-slate-300">...</i>}
                                    </div>
                                )}

                                {/* Footer (Time) */}
                                <div className="px-4 pb-2 pt-1 flex justify-end">
                                    <span className="text-[9px] font-black text-slate-300 flex items-center gap-1 uppercase tracking-widest">
                                        <Clock size={9} />
                                        {formatMessageTime(post.created_at)}
                                    </span>
                                </div>
                          </div>
                        </div>
                      );
                  })
                )}
             </div>

             {/* Bottom Swipe Indicator */}
             <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 h-1 bg-slate-900 rounded-full z-20"></div>
         </div>
      </div>
    </div>
    </>
  );
};

export default AnnouncementsManager;
