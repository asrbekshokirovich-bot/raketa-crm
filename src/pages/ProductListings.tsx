import { useState, useRef, useEffect } from 'react';
import { Plus, Search, Image as ImageIcon, Edit2, CheckCircle2, Hash, Loader2, Trash2, PauseCircle, PlayCircle, Box, AlertTriangle, XCircle } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

interface Listing {
  id: string;
  sku: string;
  name: string;
  price: string;
  description: string;
  category: string;
  status: 'Active' | 'Draft' | 'Pending';
  image_url?: string;
  images?: string[];
  original_price?: string | null;
  discount_percent?: string | null;
  author_name?: string | null;
  author_role?: string | null;
  author_email?: string | null;
  store_id?: string | null;
  author_store_id?: string | null;
  author_store_name?: string | null;
  stores?: { name: string };
  created_at: string;
  stock?: number;
  min_stock?: number;
}

const ProductCard = ({ listing, onDelete, onToggleStatus, onEdit }: { listing: Listing; onDelete: (id: string, e: React.MouseEvent) => void; onToggleStatus: (id: string, e: React.MouseEvent) => void; onEdit: (listing: Listing, e: React.MouseEvent) => void }) => {
  const images = listing.images && listing.images.length > 0
    ? listing.images
    : (listing.image_url ? [listing.image_url] : []);

  const [currentIndex, setCurrentIndex] = useState(0);

  const formatPrice = (p: string | null | undefined) => {
    if (!p) return '';
    const numStr = p.toString().replace(/uzs/i, '').replace(/,/g, '').replace(/\s/g, '');
    const num = Number(numStr);
    if (isNaN(num)) return p;
    return `${num.toLocaleString('uz-UZ')} UZS`;
  };
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isHovered && images.length > 1) {
      interval = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % images.length);
      }, 2500);
    } else {
      setCurrentIndex(0);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isHovered, images.length]);

  // Stock checks
  const isOutOfStock = listing.stock === 0;
  const isRunningLow = !isOutOfStock && listing.stock !== undefined && listing.min_stock !== undefined && listing.stock <= listing.min_stock;

  const cardClasses = isOutOfStock
    ? 'border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.15)] bg-red-50/40 ring-red-400/30'
    : isRunningLow
      ? 'border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.15)] bg-yellow-50/40 ring-yellow-400/30'
      : 'border-white/40 bg-white/70 hover:-translate-y-2 ring-slate-900/5 hover:shadow-2xl';

  return (
    <div
      className={`group backdrop-blur-sm rounded-[32px] border shadow-sm transition-all duration-500 overflow-hidden flex flex-col h-full ring-1 cursor-pointer ${cardClasses}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="p-2 pb-0">
        <div className="aspect-square rounded-[24px] bg-slate-100 relative overflow-hidden">
          {images.length > 0 ? (
            <>
              {images.map((imgSrc, idx) => (
                <img
                  key={idx}
                  src={imgSrc}
                  alt={`${listing.name} - Rasm ${idx + 1}`}
                  className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-in-out group-hover:scale-110 ${idx === currentIndex
                      ? 'opacity-100'
                      : 'opacity-0'
                    }`}
                />
              ))}
              {images.length > 1 && (
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
                  {images.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-4 bg-white shadow-sm' : 'w-1.5 bg-white/50 backdrop-blur-sm'
                        }`}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
              <ImageIcon size={40} strokeWidth={1} />
            </div>
          )}

          {/* Discount Badge */}
          {listing.discount_percent && (
            <div className="absolute bottom-3 left-3 z-30">
              <span className="bg-red-600 text-white text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-lg shadow-red-600/30 border border-red-500">
                {listing.discount_percent}% Chegirma
              </span>
            </div>
          )}

          <div className="absolute top-2 left-2">
            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter flex items-center gap-1 shadow-sm backdrop-blur-md ${listing.status === 'Active' ? 'bg-green-500/90 text-white' : 'bg-slate-500/90 text-white'
              }`}>
              {listing.status === 'Active' ? <CheckCircle2 size={8} /> : <PauseCircle size={8} />}
              {listing.status === 'Active' ? 'FAOL' : "TO'XTATILGAN"}
            </span>
          </div>

          {/* Stock Badges */}
          {isOutOfStock && (
            <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 text-[8px] font-black uppercase tracking-wider text-red-600 bg-red-50/90 px-2 py-0.5 rounded-full border border-red-200 backdrop-blur-md shadow-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
              Tugagan
            </div>
          )}
          {isRunningLow && (
            <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 text-[8px] font-black uppercase tracking-wider text-yellow-600 bg-yellow-50/90 px-2 py-0.5 rounded-full border border-yellow-200 backdrop-blur-md shadow-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(202,138,4,0.4)]" />
              Kam qolmoqda ({listing.stock})
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pb-5 pt-3 flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-1.5 slice-x-1 relative">
          <span className="text-[10px] font-black text-brandRed uppercase tracking-widest leading-none bg-red-50 px-2 py-1 rounded-md">{listing.category}</span>

          {/* Author Badge */}
          {listing.author_name && (
            <div className="relative group/author">
              <button
                className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 px-2 py-1 rounded-md transition-colors border border-slate-100 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
              >
                <div className="w-5 h-5 rounded-full bg-mustard text-sidebarDark font-black flex items-center justify-center text-[9px] shadow-sm">
                  {listing.author_name.charAt(0).toUpperCase()}
                </div>
                <span className="text-[10px] font-bold tracking-tight">{listing.author_name.split(' ')[0]}</span>
              </button>

              {/* Detailed Tooltip/Popover on Hover */}
              <div className="absolute right-0 bottom-full mb-2 w-56 bg-sidebarDark text-white p-3 rounded-xl shadow-xl shadow-slate-900/20 opacity-0 invisible group-hover/author:opacity-100 group-hover/author:visible transition-all duration-200 z-[70] origin-bottom-right scale-95 group-hover/author:scale-100 pointer-events-none group-hover/author:pointer-events-auto">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-white mb-0.5 whitespace-nowrap">
                    <span className="text-slate-400 font-medium">E'lonni kiritdi:</span> {listing.author_name}
                  </span>
                  <div className="flex justify-between items-center bg-white/5 px-2 py-1 flex-1 rounded-md mt-1">
                    <span className="text-[10px] text-slate-400">Lavozimi:</span>
                    <span className="text-[10px] font-bold text-mustard">{listing.author_role}</span>
                  </div>
                  <div className="flex justify-between items-center bg-white/5 px-2 py-1 flex-1 rounded-md mt-0.5">
                    <span className="text-[10px] text-slate-400">Login:</span>
                    <span className="text-[10px] text-slate-300 truncate max-w-[100px]" title={listing.author_email || ""}>{listing.author_email}</span>
                  </div>
                  <div className="flex justify-between items-center bg-white/5 px-2 py-1 flex-1 rounded-md mt-0.5">
                    <span className="text-[10px] text-slate-400">Hodim filiali:</span>
                    <span className="text-[10px] font-bold text-slate-200 truncate max-w-[100px]" title={listing.author_store_name || "Asosiy filial"}>{listing.author_store_name || "Asosiy filial"}</span>
                  </div>
                  <div className="flex justify-between items-center bg-white/5 px-2 py-1 flex-1 rounded-md mt-0.5">
                    <span className="text-[10px] text-slate-400">Maxsulot filiali:</span>
                    <span className="text-[10px] font-bold text-slate-200 truncate max-w-[100px]" title={listing.stores?.name || "Asosiy filial"}>{listing.stores?.name || "Asosiy filial"}</span>
                  </div>
                </div>
                {/* Tail pointer */}
                <div className="absolute right-4 -bottom-1 w-2 h-2 bg-sidebarDark rotate-45"></div>
              </div>
            </div>
          )}
        </div>

        <h3 className="font-black text-slate-900 text-base mb-1.5 mt-1 line-clamp-1 group-hover:text-brandRed transition-colors tracking-tight">
          {listing.name}
        </h3>

        <p className="text-xs text-slate-500 font-semibold line-clamp-2 leading-relaxed mb-4 flex-1">
          {listing.description}
        </p>

        <div className="flex items-end justify-between gap-2 border-t border-slate-50 pt-3">
          <div className="flex flex-col">
            <span className="text-[8px] font-bold text-slate-400 uppercase mb-0.5">Narxi</span>
            <div className="flex flex-col">
              {listing.original_price && (
                <span className="text-xs font-bold text-slate-400 line-through decoration-red-500 mb-0.5">
                  {formatPrice(listing.original_price)}
                </span>
              )}
              <span className="text-sm font-black text-slate-900 whitespace-nowrap leading-none mt-1">{formatPrice(listing.price)}</span>
            </div>
          </div>

          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button
              onClick={(e) => onToggleStatus(listing.id, e)}
              className={`w-7 h-7 flex items-center justify-center rounded-full transition-all ${listing.status === 'Active'
                  ? 'bg-orange-50 text-orange-500 hover:bg-orange-500 hover:text-white'
                  : 'bg-green-50 text-green-500 hover:bg-green-500 hover:text-white'
                }`}
              title={listing.status === 'Active' ? "Sotuvni to'xtatish" : "Sotuvni tiklash"}
            >
              {listing.status === 'Active' ? <PauseCircle size={12} /> : <PlayCircle size={12} />}
            </button>
            <button
              onClick={(e) => onDelete(listing.id, e)}
              className="w-7 h-7 flex items-center justify-center bg-red-50 text-red-500 hover:bg-brandRed hover:text-white rounded-full transition-all"
              title="O'chirish"
            >
              <Trash2 size={12} />
            </button>
            <button
              onClick={(e) => onEdit(listing, e)}
              className="w-7 h-7 flex items-center justify-center bg-slate-50 text-slate-500 hover:bg-mustard hover:text-sidebarDark rounded-full transition-all" title="Tahrirlash">
              <Edit2 size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProductListings = () => {
  const { user, activeStore } = useAuth();

  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [pauseConfirmId, setPauseConfirmId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Hali tanlanmagan');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('0');
  const [unit, setUnit] = useState('dona');
  const [productOriginStoreId, setProductOriginStoreId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Discount State
  const [priceType, setPriceType] = useState<'chegirmasiz' | 'chegirmalik' | null>(null);
  const [discountPercent, setDiscountPercent] = useState('');
  const [isDiscountConfirmed, setIsDiscountConfirmed] = useState(false);
  const [formError, setFormError] = useState<string>('');
  const [formErrorType, setFormErrorType] = useState<'error'|'warning'>('error');
  const [isErrorVisible, setIsErrorVisible] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const showError = (msg: string, type: 'error'|'warning' = 'error') => {
    setFormError(msg);
    setFormErrorType(type);
    setIsErrorVisible(true);
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    errorTimeoutRef.current = setTimeout(() => {
      setIsErrorVisible(false);
    }, 4000);
  };

  // Edit Modal State
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editPriceType, setEditPriceType] = useState<'chegirmasiz' | 'chegirmalik' | null>(null);
  const [editDiscountPercent, setEditDiscountPercent] = useState('');
  const [editExistingImages, setEditExistingImages] = useState<string[]>([]);
  const [editNewImages, setEditNewImages] = useState<File[]>([]);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  const handleEditOpen = (listing: Listing, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingListing(listing);
    setEditDescription(listing.description || '');
    setEditPriceType(listing.discount_percent && Number(listing.discount_percent) > 0 ? 'chegirmalik' : 'chegirmasiz');
    setEditDiscountPercent(listing.discount_percent || '');
    const exImages = listing.images && listing.images.length > 0 ? listing.images : (listing.image_url ? [listing.image_url] : []);
    setEditExistingImages(exImages);
    setEditNewImages([]);
    setIsErrorVisible(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingListing) return;

    setIsEditSubmitting(true);
    let errorMsg = '';

    try {
      if (!editDescription.trim()) {
        errorMsg = "Iltimos, e'lon matnini kiriting.";
        throw new Error(errorMsg);
      }

      const isDiscountValid = editPriceType === 'chegirmalik' ? (Number(editDiscountPercent) > 0 && Number(editDiscountPercent) <= 100) : true;
      if (!isDiscountValid) {
        errorMsg = "Chegirma foizi 1 dan 100 gacha bo'lishi shart.";
        throw new Error(errorMsg);
      }

      if (editExistingImages.length + editNewImages.length === 0) {
        errorMsg = "Kamida bitta rasm bo'lishi shart.";
        throw new Error(errorMsg);
      }

      const { data: prodData, error: prodErr } = await supabase
        .from('products')
        .select('price')
        .eq('sku', editingListing.sku)
        .single();

      if (prodErr || !prodData) {
        throw new Error("Ombor bazasidan tovar narxini olishda xatolik yuz berdi.");
      }

      const basePrice = Number(prodData.price);
      let finalPrice = basePrice;
      let finalOriginalPrice: string | null = null;
      let finalDiscountPercent = null;

      if (editPriceType === 'chegirmalik' && editDiscountPercent) {
        const dp = Number(editDiscountPercent);
        const discountAmount = basePrice * (dp / 100);
        finalPrice = basePrice - discountAmount;
        finalOriginalPrice = basePrice.toString();
        finalDiscountPercent = editDiscountPercent;
      }

      const uploadedImageUrls: string[] = [];
      for (const file of editNewImages) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `listings/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        uploadedImageUrls.push(publicUrl);
      }

      const combinedImages = [...editExistingImages, ...uploadedImageUrls];
      const mainImageUrl = combinedImages.length > 0 ? combinedImages[0] : null;

      const { error: updateError } = await supabase
        .from('product_listings')
        .update({
          description: editDescription,
          discount_percent: finalDiscountPercent,
          price: finalPrice.toString(),
          original_price: finalOriginalPrice,
          images: combinedImages,
          image_url: mainImageUrl
        })
        .eq('id', editingListing.id);

      if (updateError) throw updateError;

      setEditingListing(null);
      fetchListings();
      showSuccess("E'lon muvaffaqiyatli tahrirlandi!");

    } catch (err: any) {
      console.error(err);
      showError(err.message || "E'lonni saqlashda noma'lum xatolik yuz berdi.");
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const fetchListings = async () => {
    try {
      setIsLoadingListings(true);
      
      let listingQuery = supabase
        .from('product_listings')
        .select('*, stores!store_id(name)')
        .order('created_at', { ascending: false });

      const { data: listingsData, error: listingsError } = await listingQuery;

      if (listingsError) throw listingsError;

      let productQuery = supabase
        .from('products')
        .select('sku, store_id, stock, min_stock');

      const { data: productsData, error: productsError } = await productQuery;

      if (productsError) throw productsError;

      if (listingsData && productsData) {
        const merged = listingsData.map(l => {
          const prod = productsData.find(p => p.sku === l.sku && (!l.store_id || p.store_id === l.store_id));
          return {
            ...l,
            stock: prod?.stock ?? 0,
            min_stock: prod?.min_stock ?? 0
          };
        });
        setListings(merged);
      } else if (listingsData) {
        setListings(listingsData);
      }
    } catch (err) {
      console.error('Listings yuklashda xatolik:', err);
    } finally {
      setIsLoadingListings(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [activeStore]);

  const [scannerErrorGlow, setScannerErrorGlow] = useState(false);
  const [skuInputMode, setSkuInputMode] = useState<'scanner' | 'manual'>('scanner');

  // Global Barcode Scanner Listener
  useEffect(() => {
    if (!isModalOpen) return;

    let barcodeBuffer = '';
    let lastKeyTime = Date.now();
    let firstKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore functional keys
      if (e.key === 'Escape' || e.key === 'Tab') return;

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 100) {
        barcodeBuffer = '';
        firstKeyTime = currentTime;
      }
      lastKeyTime = currentTime;

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        barcodeBuffer += e.key;
      } else if (e.key === 'Enter' && barcodeBuffer.length >= 4) {
        const totalDuration = currentTime - firstKeyTime;
        if (totalDuration < 1000) {
          e.preventDefault();
          e.stopPropagation();
          
          const scannedCode = barcodeBuffer;
          barcodeBuffer = '';

          // REMOVE visually leaked scanner characters from focused inputs safely in React
          const activeEl = document.activeElement;
          setTimeout(() => {
            const isInput = activeEl instanceof HTMLInputElement && activeEl.id !== 'sku-input' && activeEl.type !== 'radio' && activeEl.type !== 'checkbox';
            const isTextArea = activeEl instanceof HTMLTextAreaElement;

            if (isInput || isTextArea) {
              const el = activeEl as HTMLInputElement | HTMLTextAreaElement;
              const prototype = isInput ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype;
              const nativeSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
              
              if (nativeSetter) {
                if (el.value.endsWith(scannedCode)) {
                  nativeSetter.call(el, el.value.slice(0, -scannedCode.length));
                  el.dispatchEvent(new Event('input', { bubbles: true }));
                } else if (el.value === scannedCode) {
                  nativeSetter.call(el, '');
                  el.dispatchEvent(new Event('input', { bubbles: true }));
                }
              }
            }
          }, 50);

          if (skuInputMode === 'manual') {
            showError(`Skanerdan foydalanish uchun, iltimos yuqoridagi "SKANER" rejimiga o'tkazing!`, 'warning');
            return;
          }

          setSku(prevSku => {
             if (prevSku && prevSku !== scannedCode) {
               setScannerErrorGlow(true);
               setTimeout(() => setScannerErrorGlow(false), 600);
               return prevSku;
             }
             
             setTimeout(() => handleScannerInput(scannedCode), 0);
             return scannedCode;
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isModalOpen]);

  const handleDeleteListing = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const handleToggleStatus = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPauseConfirmId(id);
  };

  const showSuccess = (msg: string) => {
    setSuccessToast(msg);
    if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    successTimeoutRef.current = setTimeout(() => {
      setSuccessToast(null);
    }, 3000);
  };

  const confirmToggle = async () => {
    if (!pauseConfirmId) return;
    const targetListing = listings.find(l => l.id === pauseConfirmId);
    if (!targetListing) return;

    const newStatus = targetListing.status === 'Active' ? 'Draft' : 'Active';

    try {
      const { error } = await supabase
        .from('product_listings')
        .update({ status: newStatus })
        .eq('id', pauseConfirmId);

      if (error) throw error;

      setListings(prev => prev.map(l => l.id === pauseConfirmId ? { ...l, status: newStatus } : l));
      setPauseConfirmId(null);
      showSuccess(`E'lon ${newStatus === 'Active' ? 'faollashtirildi' : "sotuvi to'xtatildi"}!`);
    } catch (err) {
      console.error("Statusni o'zgartirishda xatolik:", err);
      showError("Statusni o'zgartirishda xatolik yuz berdi.");
      setPauseConfirmId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      const { error } = await supabase.from('product_listings').delete().eq('id', deleteConfirmId);
      if (error) throw error;
      setListings(prev => prev.filter(l => l.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error("O'chirishda xatolik:", err);
      showError("E'lonni o'chirishda xatolik yuz berdi.");
      setDeleteConfirmId(null);
    }
  };

  const handleScannerInput = async (scannedCode: string) => {
    const upperVal = scannedCode.toUpperCase();
    
    // Clear dependent fields
    setName('');
    setCategory('Hali tanlanmagan');
    setPrice('');
    setQuantity('0');
    setUnit('dona');
    setPriceType(null);
    setDiscountPercent('');
    setIsDiscountConfirmed(false);
    setIsErrorVisible(false);

    // Duplicate Check
    const existingListing = listings.find(l => l.sku === upperVal);
    if (existingListing) {
      showError(`Bunday shtrix kod (${upperVal}) bilan tovar allaqachon savdoga qo'yilgan!`, 'warning');
      return;
    }

    setIsLoading(true);
    try {
      let query = supabase
        .from('products')
        .select('*')
        .eq('sku', upperVal)
        .limit(1);

      const { data, error } = await query.maybeSingle();

      if (data && !error) {
        setName(data.name);
        setCategory(data.category);
        setPrice(data.price.toString());
        setQuantity(data.stock.toString());
        setUnit(data.unit || 'dona');
        setProductOriginStoreId(data.store_id || null);
      } else {
        showError(`Omborda bunday shtrix kod (${upperVal}) topilmadi! O'zgartirib qayta urib ko'ring.`);
      }
    } catch (err) {
      console.error('Error fetching SKU:', err);
    } finally {
      setIsLoading(false);
    }
  };


  const resetForm = () => {
    setSku('');
    setName('');
    setPrice('');
    setCategory('Hali tanlanmagan');
    setDescription('');
    setQuantity('0');
    setUnit('dona');
    setProductOriginStoreId(null);
    setIsLoading(false);
    setPriceType(null);
    setDiscountPercent('');
    setImages([]);
    setIsDiscountConfirmed(false);
    setIsErrorVisible(false);
    setFormError('');
  };

  // Original Calculations (Top Block)
  const originalPriceNum = Number(price) || 0;
  const quantityNum = Number(quantity) || 0;
  const originalTotal = originalPriceNum * quantityNum;
  const isDataLoaded = !!name;

  const isDuplicateSku = sku ? listings.some(l => l.sku === sku.toUpperCase()) : false;

  const checkFormBlock = (e?: React.MouseEvent | React.FocusEvent | React.ChangeEvent | any) => {
    if (activeStore === 'ALL') {
      if (e && e.preventDefault) e.preventDefault();
      showError(`Iltimos, e'lon berish yoki tahrirlashdan oldin bitta filialni tanlang! (Barcha filiallar rejimi yopiq)`, 'warning');
      return true;
    }
    if (isDuplicateSku) {
      if (e && e.preventDefault) e.preventDefault();
      showError(`Bunday SKU (${sku.toUpperCase()}) bilan tovar allaqachon savdoga qo'yilgan! Boshqa SKU kiriting.`, 'warning');
      return true;
    }
    if (!sku || (!isDataLoaded && !isLoading)) {
      if (e && e.preventDefault) e.preventDefault();
      showError(`Iltimos, shtrix kodni kiriting!`);
      return true;
    }
    return false;
  };

  // Discount Calculations (Bottom Block)
  const discountPercentNum = Number(discountPercent) || 0;
  const discountedUnitPrice = originalPriceNum * (1 - discountPercentNum / 100);
  const discountedTotal = discountedUnitPrice * quantityNum;
  const isDiscountValid = priceType === 'chegirmalik' ? (discountPercentNum >= 1 && discountPercentNum <= 100) : true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsErrorVisible(false);
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);

    if (checkFormBlock(e)) return;

    if (!isDataLoaded) {
      showError("SKU kodini kiriting");
      return;
    }
    if (!priceType) {
      showError("Iltimos, majburiy 'Narx turi'ni tanlang (Chegirmasiz yoki Chegirmalik).");
      return;
    }
    if (priceType === 'chegirmalik' && (!isDiscountValid || !isDiscountConfirmed)) {
      showError(!isDiscountConfirmed ? "Iltimos, chegirma foizini tasdiqlang." : "Chegirma foizi noto'g'ri!");
      return;
    }
    if (!description.trim()) {
      showError("Iltimos, mahsulot tavsifini yozing.");
      return;
    }
    if (images.length === 0) {
      showError("Iltimos, kamida 1 ta rasm yuklang.");
      return;
    }

    setIsSubmitting(true);
    try {
      const uploadedFileUrls: string[] = [];

      // Upload images
      for (const file of images) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('listings')
          .upload(fileName, file);

        if (uploadError) {
          console.error("Rasm yuklashda xatolik:", uploadError);
          continue; // if one fails, try others or we could throw
        }

        const { data } = supabase.storage.from('listings').getPublicUrl(fileName);
        if (data?.publicUrl) {
          uploadedFileUrls.push(data.publicUrl);
        }
      }

      const finalPrice = priceType === 'chegirmalik' && isDiscountConfirmed
        ? `${discountedUnitPrice.toLocaleString('en-US')} UZS`
        : `${Number(price).toLocaleString('en-US')} UZS`;

      const newListing = {
        sku: sku.toUpperCase(),
        name: name,
        price: finalPrice,
        description: description,
        category: category,
        status: 'Active',
        image_url: uploadedFileUrls.length > 0 ? uploadedFileUrls[0] : null,
        images: uploadedFileUrls.length > 0 ? uploadedFileUrls : null,
        original_price: priceType === 'chegirmalik' && isDiscountConfirmed ? `${Number(price).toLocaleString('en-US')} UZS` : null,
        discount_percent: priceType === 'chegirmalik' && isDiscountConfirmed ? discountPercent : null,
        author_name: user?.fullName || null,
        author_role: user?.role || null,
        author_email: user?.email || null,
        store_id: productOriginStoreId,
        author_store_id: activeStore === 'ALL' ? null : activeStore,
        author_store_name: activeStore === 'ALL' ? "Barcha filiallar" : (await supabase.from('stores').select('name').eq('id', activeStore).single()).data?.name || "Asosiy filial",
      };

      const { error: insertError } = await supabase
        .from('product_listings')
        .insert(newListing);

      if (insertError) throw insertError;

      // Finish & Refresh
      await fetchListings();
      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      console.error("Saqlashda xatolik:", err);
      showError("Xato: " + (err?.message || JSON.stringify(err) || "Noma'lum xatolik"));
    } finally {
      setIsSubmitting(true);
      setIsSubmitting(false); // Make sure it's fully off
    }
  };

  const [filterStatus, setFilterStatus] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock' | 'active' | 'paused'>('all');
  const [storeViewFilter, setStoreViewFilter] = useState<'all' | 'my_store'>('all');

  const filteredListings = listings
    .filter(listing => {
      if (storeViewFilter === 'my_store') return listing.store_id === user?.store_id;
      return true;
    })
    .filter(listing => {
      if (filterStatus === 'in_stock') return (listing.stock || 0) > (listing.min_stock || 0);
      if (filterStatus === 'low_stock') return (listing.stock || 0) > 0 && (listing.stock || 0) <= (listing.min_stock || 0);
      if (filterStatus === 'out_of_stock') return listing.stock === 0;
      if (filterStatus === 'active') return listing.status === 'Active';
      if (filterStatus === 'paused') return listing.status !== 'Active';
      return true;
    })
    .filter(listing =>
      !searchQuery ||
      (listing.sku && listing.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (listing.name && listing.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-end bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tovar Savdosi</h1>
          <p className="text-slate-500 text-sm mt-1">Mijozlar uchun yangi mahsulot e'lonlarini boshqarish va yuklash</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="bg-mustard hover:bg-yellow-500 text-sidebarDark px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-yellow-400/20"
        >
          <Plus size={20} strokeWidth={3} />
          <span>Yangi E'lon</span>
        </button>
      </div>

      {/* Mini Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <div
          onClick={() => setFilterStatus('all')}
          className={`bg-white p-4 rounded-xl shadow-sm flex items-center gap-3 cursor-pointer transition-all ${filterStatus === 'all' ? 'ring-2 ring-blue-500 shadow-md scale-[1.02]' : 'border border-gray-100 opacity-70 hover:opacity-100 hover:border-blue-200'}`}
        >
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <Box size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Jami E'lon</p>
            <p className="text-xl font-black text-slate-900 leading-tight">{listings.length}</p>
          </div>
        </div>

        <div
          onClick={() => setFilterStatus('active')}
          className={`bg-white p-4 rounded-xl shadow-sm flex items-center gap-3 cursor-pointer transition-all border-l-4 border-l-emerald-500 ${filterStatus === 'active' ? 'ring-2 ring-emerald-500 shadow-md scale-[1.02]' : 'border-t border-r border-b border-gray-100 opacity-70 hover:opacity-100 hover:border-emerald-200'}`}
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <PlayCircle size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Faol</p>
            <p className="text-xl font-black text-slate-900 leading-tight">
              {listings.filter(i => i.status === 'Active').length}
            </p>
          </div>
        </div>

        <div
          onClick={() => setFilterStatus('paused')}
          className={`bg-white p-4 rounded-xl shadow-sm flex items-center gap-3 cursor-pointer transition-all border-l-4 border-l-slate-500 ${filterStatus === 'paused' ? 'ring-2 ring-slate-500 shadow-md scale-[1.02]' : 'border-t border-r border-b border-gray-100 opacity-70 hover:opacity-100 hover:border-slate-200'}`}
        >
          <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600 shrink-0">
            <PauseCircle size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">To'xtatilgan</p>
            <p className="text-xl font-black text-slate-900 leading-tight">
              {listings.filter(i => i.status !== 'Active').length}
            </p>
          </div>
        </div>

        <div
          onClick={() => setFilterStatus('in_stock')}
          className={`bg-white p-4 rounded-xl shadow-sm flex items-center gap-3 cursor-pointer transition-all border-l-4 border-l-green-400 ${filterStatus === 'in_stock' ? 'ring-2 ring-green-500 shadow-md scale-[1.02]' : 'border-t border-r border-b border-gray-100 opacity-70 hover:opacity-100 hover:border-green-200'}`}
        >
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600 shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Mavjud</p>
            <p className="text-xl font-black text-slate-900 leading-tight">
              {listings.filter(i => (i.stock || 0) > (i.min_stock || 0)).length}
            </p>
          </div>
        </div>

        <div
          onClick={() => setFilterStatus('low_stock')}
          className={`bg-white p-4 rounded-xl shadow-sm flex items-center gap-3 cursor-pointer transition-all border-l-4 border-l-yellow-400 ${filterStatus === 'low_stock' ? 'ring-2 ring-yellow-500 shadow-md scale-[1.02]' : 'border-t border-r border-b border-gray-100 opacity-70 hover:opacity-100 hover:border-yellow-200'}`}
        >
          <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center text-yellow-600 shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kam</p>
            <p className="text-xl font-black text-slate-900 leading-tight">
              {listings.filter(i => (i.stock || 0) > 0 && (i.stock || 0) <= (i.min_stock || 0)).length}
            </p>
          </div>
        </div>

        <div
          onClick={() => setFilterStatus('out_of_stock')}
          className={`bg-white p-4 rounded-xl shadow-sm flex items-center gap-3 cursor-pointer transition-all border-l-4 border-l-red-500 ${filterStatus === 'out_of_stock' ? 'ring-2 ring-red-500 shadow-md scale-[1.02]' : 'border-t border-r border-b border-gray-100 opacity-70 hover:opacity-100 hover:border-red-200'}`}
        >
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-600 shrink-0">
            <XCircle size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tugagan</p>
            <p className="text-xl font-black text-slate-900 leading-tight">
              {listings.filter(i => i.stock === 0).length}
            </p>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-4">
        {/* Store View Toggles */}
        {user?.role !== 'Owner' && user?.role !== 'Admin' && (
        <div className="flex bg-slate-100 p-1.5 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setStoreViewFilter('all')}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg font-bold text-sm transition-all focus:outline-none ${storeViewFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Umumiy tovarlar
          </button>
          <button
            onClick={() => setStoreViewFilter('my_store')}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg font-bold text-sm transition-all focus:outline-none ${storeViewFilter === 'my_store' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Filial tovari
          </button>
        </div>
        )}

        <div className="relative flex-1 w-full md:w-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="E'lonlarni qidirish..."
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-yellow-400 outline-none bg-white transition-all shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Grid View - More columns for narrower cards */}
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
        {isLoadingListings ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 size={40} className="mb-4 animate-spin text-mustard" />
            <p className="text-sm font-semibold animate-pulse text-slate-500">Mahsulotlar yuklanmoqda...</p>
          </div>
        ) : filteredListings.length > 0 ? (
          filteredListings.map((listing) => (
            <ProductCard key={listing.id} listing={listing} onDelete={handleDeleteListing} onToggleStatus={handleToggleStatus} onEdit={handleEditOpen} />
          ))
        ) : (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400">
            <Search size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-medium">Hech qanday natija topilmadi.</p>
          </div>
        )}
      </div>

      {/* Modal Placeholder (Basic structure to be expanded) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-sidebarDark/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          {/* Main Modal */}
          <div className="bg-white rounded-[32px] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
            <div className="p-5 md:p-6 overflow-y-auto overflow-x-hidden">
              <h2 className="text-xl font-bold text-slate-900 mb-0.5">Yangi Tovar Joylash</h2>
              <p className="text-slate-500 text-sm mb-4">Mijozlar mobil qurilmalarda ko'radigan barcha ma'lumotlarni kiriting.</p>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* LEFT COLUMN: Data Inputs */}
                  <div className="space-y-3 border-r-0 md:border-r border-slate-100 md:pr-4">
                    {/* SKU Input - Clean & Professional */}
                    <div className={`bg-white p-3 rounded-2xl transition-all group ${(!isDataLoaded && sku.length > 0 && !isLoading) ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)] ring-1 ring-red-500' : 'border border-slate-200'} ${scannerErrorGlow ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] bg-red-50 text-red-600' : ''}`}>
                      <div className="flex justify-between items-end mb-1.5 ml-1">
                        <label htmlFor="sku-input" className="block text-xs font-bold text-slate-900 flex items-center gap-2">
                          <Hash size={12} className="text-brandRed" />
                          Shtrix Kod
                        </label>
                        <div className="flex gap-1 bg-slate-50 p-0.5 rounded-lg border border-slate-100">
                          <button
                            type="button"
                            onClick={() => setSkuInputMode('scanner')}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all uppercase ${skuInputMode === 'scanner' ? 'bg-white text-brandRed shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                            Skaner
                          </button>
                          <button
                            type="button"
                            onClick={() => setSkuInputMode('manual')}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all uppercase ${skuInputMode === 'manual' ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                            Qo'lda
                          </button>
                        </div>
                      </div>
                      <div className="relative">
                        <input
                          id="sku-input"
                          type="text"
                          readOnly={skuInputMode === 'scanner'}
                          value={sku}
                          onChange={(e) => skuInputMode === 'manual' && setSku(e.target.value)}
                          onPaste={(e) => {
                            if (skuInputMode === 'manual') {
                              const pastedText = e.clipboardData.getData('text').trim();
                              if (pastedText) {
                                setTimeout(() => handleScannerInput(pastedText), 50);
                              }
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              // Manually trigger the fetch logic
                              if (skuInputMode === 'manual') handleScannerInput(sku);
                            }
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-0 focus:border-brandRed outline-none transition-all font-mono font-bold text-sm tracking-widest uppercase placeholder:text-slate-300 bg-slate-50/30 group-focus-within:bg-white"
                          placeholder={skuInputMode === 'scanner' ? "0000000000000" : "Shtrix kodni yozing..."}
                          title={skuInputMode === 'scanner' ? "Faqat Skaner orqali!" : "Klaviaturada yozib Enter bosing"}
                        />
                        {sku && (
                          <button
                            type="button"
                            onClick={() => {
                              resetForm();
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 p-1.5 rounded-xl hover:bg-red-50 bg-white shadow-sm border border-slate-200 transition-all font-bold"
                            title="Tozalash va boshidan boshlash"
                          >
                            <XCircle size={16} />
                          </button>
                        )}
                        {!sku && isLoading && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 size={16} className="text-brandRed animate-spin" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Compact Info Grid - Professional Black Labels */}
                    <div className="grid grid-cols-12 gap-x-2 gap-y-3 px-1">
                      <div className="col-span-12">
                        <label htmlFor="product-name" className="block text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-1 ml-1">Mahsulot nomi</label>
                        <input
                          id="product-name"
                          type="text"
                          value={name}
                          readOnly
                          className={`w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-bold outline-none cursor-not-allowed text-sm ${isDataLoaded ? 'text-slate-900' : 'text-slate-400 italic'}`}
                          placeholder="Avtomat to'ldiriladi..."
                          title="Mahsulot nomi (SKU asosida)"
                        />
                      </div>

                      <div className="col-span-5">
                        <label htmlFor="product-category" className="block text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-1 ml-1">Kategoriya</label>
                        <input
                          id="product-category"
                          type="text"
                          value={category}
                          readOnly
                          className={`w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-bold outline-none cursor-not-allowed text-sm ${isDataLoaded ? 'text-slate-900' : 'text-slate-400 italic'}`}
                          title="Kategoriya (SKU asosida)"
                          placeholder="Kategoriya..."
                        />
                      </div>

                      <div className="col-span-7">
                        <label htmlFor="product-price" className="block text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-1 ml-1">Sotish Narxi (1 {unit})</label>
                        <div className="relative">
                          <input
                            id="product-price"
                            type="text"
                            value={price ? Number(price).toLocaleString('en-US') : ''}
                            readOnly
                            className={`w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-bold outline-none cursor-not-allowed pr-10 text-sm ${isDataLoaded ? 'text-slate-900' : 'text-slate-400'}`}
                            title="Sotish narxi (SKU asosida)"
                            placeholder="0"
                          />
                          <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold ${isDataLoaded ? 'text-brandRed' : 'text-slate-400'}`}>UZS</span>
                        </div>
                      </div>

                      <div className="col-span-4">
                        <label htmlFor="product-stock" className="block text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-1 ml-1">Omborda</label>
                        <div className="relative">
                          <input
                            id="product-stock"
                            type="text"
                            value={quantity}
                            readOnly
                            className={`w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-bold outline-none cursor-not-allowed pr-10 text-sm ${isDataLoaded ? 'text-slate-900' : 'text-slate-400'}`}
                            title="Mavjud tovar miqdori"
                            placeholder="0"
                          />
                          <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase ${isDataLoaded ? 'text-brandRed' : 'text-slate-400'}`}>{unit}</span>
                        </div>
                      </div>

                      <div className="col-span-8">
                        <label className="block text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-1 ml-1">Umumiy Qiymat</label>
                        <div className="px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 flex items-center justify-between h-[38px]">
                          <span className={`text-sm font-bold tracking-tight ${isDataLoaded ? 'text-slate-800' : 'text-slate-400'}`}>
                            {originalTotal.toLocaleString('en-US')} UZS
                          </span>
                          <div className={`w-1.5 h-1.5 rounded-full ${isDataLoaded ? 'bg-slate-400' : 'bg-slate-200'}`} />
                        </div>
                      </div>
                    </div>

                    {/* Narx Turi - Mandatory Selection */}
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                      <label className="block text-[11px] font-extrabold text-slate-900 uppercase tracking-widest ml-1">
                        Narx turi (Majburiy)
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            if (checkFormBlock(e)) return;
                            setPriceType('chegirmasiz'); setIsDiscountConfirmed(false); setDiscountPercent(''); setIsErrorVisible(false);
                          }}
                          className={`p-2 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 focus:outline-none ${priceType === 'chegirmasiz'
                            ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                            }`}
                        >
                          <span className="text-[11px] font-bold uppercase tracking-wide">Chegirmasiz</span>
                          <span className={`text-[8px] font-medium opacity-70 ${priceType === 'chegirmasiz' ? 'text-white' : 'text-slate-400'}`}>Asosiy narx saqlanadi</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            if (checkFormBlock(e)) return;
                            setPriceType('chegirmalik'); setIsDiscountConfirmed(false);
                          }}
                          className={`p-2 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 focus:outline-none ${priceType === 'chegirmalik'
                            ? 'border-green-500 bg-green-500 text-white shadow-md shadow-green-200'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                            }`}
                        >
                          <span className="text-[11px] font-bold uppercase tracking-wide">Chegirmalik</span>
                          <span className={`text-[8px] font-medium opacity-70 ${priceType === 'chegirmalik' ? 'text-white' : 'text-slate-400'}`}>Yangi narx kiritish</span>
                        </button>
                      </div>
                    </div>

                    {/* Chegirmalik Section - Edit Mode */}
                    {priceType === 'chegirmalik' && !isDiscountConfirmed && (
                      <div className="p-3 rounded-2xl bg-green-500/[0.03] border-2 border-green-500/10 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-12 gap-3">
                          {/* Discount Percent Input */}
                          <div className="col-span-12 md:col-span-5 flex flex-col">
                            <label htmlFor="discount-percent" className="block text-[11px] font-bold text-green-600 uppercase tracking-widest mb-1 ml-1 leading-tight">Chegirma (%)</label>
                            <div className="relative mt-auto">
                              <input
                                id="discount-percent"
                                type="number"
                                min="0"
                                max="100"
                                value={discountPercent}
                                onChange={(e) => setDiscountPercent(e.target.value)}
                                className={`w-full px-3 py-2 rounded-xl border-2 bg-white font-bold outline-none transition-all pr-8 text-sm ${!isDiscountValid ? 'border-red-500 ring-4 ring-red-50' : 'border-green-500/20 focus:border-green-500 focus:ring-4 focus:ring-green-500/5'}`}
                                placeholder="0"
                                title="Chegirma foizini kiriting"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-green-600">%</span>
                            </div>
                          </div>

                          {/* Resulting Unit Price */}
                          <div className="col-span-12 md:col-span-7 flex flex-col">
                            <label className="block text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-1 ml-1">Sotuv Narxi (Yangi)</label>
                            <div className="px-3 py-2 rounded-xl border-2 border-slate-200 bg-white flex items-center justify-between h-[38px] mt-auto">
                              <span className="text-sm font-black text-slate-800 tracking-tight">
                                {discountedUnitPrice.toLocaleString('en-US')} UZS
                              </span>
                            </div>
                          </div>

                          {/* Resulting Total Sum */}
                          <div className="col-span-12">
                            <label className="block text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-1 ml-1">Jami Summa (Chegirma bilan)</label>
                            <div className="px-3 py-2 rounded-xl border-2 border-green-500/20 bg-white flex items-center justify-between shadow-sm">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter leading-none mb-0.5">Yakuniy Summa</span>
                                <span className="text-base font-black text-green-600 tracking-tight">
                                  {discountedTotal.toLocaleString('en-US')} UZS
                                </span>
                              </div>
                              <div className="h-8 w-8 rounded-xl bg-green-500/5 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                              </div>
                            </div>
                            {!isDiscountValid && (
                              <p className="text-[9px] text-red-500 font-bold mt-1 ml-1 animate-pulse italic">
                                * Mintaqa yaroqsiz!
                              </p>
                            )}
                          </div>

                          {/* Confirm Button */}
                          <div className="col-span-12 mt-1">
                            <button
                              type="button"
                              onClick={() => setIsDiscountConfirmed(true)}
                              disabled={!isDiscountValid || !discountPercent}
                              className={`w-full py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm ${!isDiscountValid || !discountPercent
                                ? 'bg-green-500/10 text-green-600/40 cursor-not-allowed'
                                : 'bg-green-500 text-white shadow-sm shadow-green-500/20 hover:bg-green-600 active:scale-[0.98]'
                                }`}
                            >
                              <CheckCircle2 size={16} />
                              Chegirmani Tasdiqlash
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Chegirmalik Section - Confirmed & Compact */}
                    {priceType === 'chegirmalik' && isDiscountConfirmed && (
                      <div className="p-3.5 rounded-2xl bg-green-500/[0.04] border-2 border-green-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-1">
                          <div>
                            <span className="text-[9px] font-bold text-green-600 uppercase tracking-widest block mb-1">Chegirma</span>
                            <span className="text-sm font-black text-green-700 bg-white px-2 py-0.5 rounded-md border border-green-500/10 shadow-sm">{discountPercent}%</span>
                          </div>
                          <div className="w-[1px] h-8 bg-green-500/20 hidden sm:block" />
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">1 {unit}</span>
                            <span className="text-sm font-bold text-slate-800">{discountedUnitPrice.toLocaleString('en-US')} UZS</span>
                          </div>
                          <div className="w-[1px] h-8 bg-green-500/20 hidden sm:block" />
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Yangi Jami</span>
                            <span className="text-base font-black text-green-600">{discountedTotal.toLocaleString('en-US')} UZS</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsDiscountConfirmed(false)}
                          className="self-end sm:self-auto p-2.5 bg-white text-green-600 hover:bg-green-50 rounded-xl border border-green-500/30 transition-all shadow-sm group shrink-0"
                          title="Chegirmani o'zgartirish"
                        >
                          <Edit2 size={16} className="group-hover:scale-110 transition-transform" />
                        </button>
                      </div>
                    )}

                  </div>

                  {/* RIGHT COLUMN: Description & Media */}
                  <div className="space-y-4 flex flex-col">
                    {/* Description - Made slightly taller to fit side */}
                    <div className="flex-none">
                      <label htmlFor="product-description" className="block text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-1 ml-1">Tavsif (Description)</label>
                      <textarea
                        id="product-description"
                        value={description}
                        onChange={(e) => {
                          if (checkFormBlock(e)) return;
                          setDescription(e.target.value);
                          setIsErrorVisible(false);
                        }}
                        onFocus={(e) => {
                          if (checkFormBlock(e)) return;
                          setIsErrorVisible(false);
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-green-500/20 focus:border-green-500/50 outline-none transition-all text-sm min-h-[90px] font-medium resize-y bg-slate-50/30 focus:bg-white"
                        placeholder="Mahsulot haqida to'liq va jozibador ma'lumot qoldiring. Mijozlar aynan shu yerdagi ta'rifga qarab xarid qilishadi..."
                        title="Tavsif yozing"
                      />
                    </div>

                    {/* Image Upload Area - Flexible height to fill remaining space */}
                    <div className="flex flex-col gap-2 flex-1">
                      <label
                        onClick={(e) => {
                          if (checkFormBlock(e)) return;
                          if (images.length >= 4) {
                            e.preventDefault();
                            showError("Maksimal 4 ta rasm yuklash mumkin!");
                          }
                        }}
                        className={`border border-dashed border-gray-300 rounded-2xl py-6 flex flex-col items-center justify-center transition-all group ${images.length >= 4
                          ? 'opacity-60 cursor-not-allowed bg-slate-100 grayscale'
                          : 'cursor-pointer hover:border-mustard hover:bg-mustard/5 bg-slate-50/50 text-slate-400'
                          }`}
                      >
                        <input
                          type="file"
                          multiple
                          accept="image/png, image/jpeg"
                          className="hidden"
                          disabled={images.length >= 4}
                          onChange={(e) => {
                            if (e.target.files) {
                              const newFiles = Array.from(e.target.files);
                              if (images.length + newFiles.length > 4) {
                                showError("Maksimal 4 ta rasm yuklash mumkin!");
                                return;
                              }
                              setImages(prev => [...prev, ...newFiles].slice(0, 4));
                              setIsErrorVisible(false);
                            }
                            // clear input
                            e.target.value = '';
                          }}
                        />
                        <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center mb-2 group-hover:scale-110 group-hover:bg-mustard group-hover:text-sidebarDark group-hover:border-mustard transition-all">
                          <Plus size={20} strokeWidth={2.5} />
                        </div>
                        <span className="text-sm font-bold text-slate-700">Asosiy rasmni yuklash</span>
                        <span className="text-[10px] mt-1 font-medium text-slate-500">Katta hajmli 1:1 sifatdagi surat!</span>
                        <span className="text-[9px] mt-0.5 font-bold italic opacity-60">PNG, JPG (Max. 4 ta)</span>
                      </label>

                      {/* Image Thumbnails Previews */}
                      {images.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-1">
                          {images.map((img, idx) => (
                            <div key={idx} className="relative w-14 h-14 rounded-xl shadow-sm border border-slate-200 overflow-hidden group shrink-0 bg-slate-100 animate-in fade-in zoom-in duration-200">
                              <img src={URL.createObjectURL(img)} alt={`Upload preview ${idx + 1}`} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setImages(images.filter((_, i) => i !== idx)); }}
                                className="absolute top-1 right-1 w-4 h-4 bg-red-500/90 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-sm"
                                title="Rasmni o'chirish"
                              >
                                <span className="text-[10px] font-black leading-none mt-[-1px]">&times;</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Form wide actions */}
                <div className="pt-2">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        resetForm();
                        setIsModalOpen(false);
                      }}
                      className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all border border-gray-100 text-sm"
                    >
                      Bekor qilish
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`flex-1 px-4 py-3 rounded-xl font-bold transition-all outline-none text-sm ${!priceType || (priceType === 'chegirmalik' && (!isDiscountValid || !isDiscountConfirmed)) || !isDataLoaded || !description.trim() || images.length === 0 || isSubmitting
                        ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                        : 'bg-mustard text-sidebarDark shadow-sm shadow-yellow-400/20 hover:bg-yellow-500 active:scale-95'
                        }`}
                    >
                      {isSubmitting ? "Chiqarilmoqda..." : "E'lonni chiqarish"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* External Toast-style Error Message - Dropping from Top */}
          <div
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-[110] w-full max-w-md px-4 transition-all duration-500 ease-out pointer-events-none flex justify-center ${isErrorVisible ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-12 opacity-0 scale-95'
              }`}
          >
            <div className={`bg-white rounded-2xl shadow-2xl p-4 flex items-center justify-center gap-3 w-full backdrop-blur-md border ${formErrorType === 'warning' ? 'shadow-orange-500/10 border-orange-200' : 'shadow-red-500/10 border-red-100'}`}>
              <AlertTriangle size={20} className={`shrink-0 ${formErrorType === 'warning' ? 'text-orange-500' : 'text-red-500'}`} />
              <p className={`text-sm font-bold ${formErrorType === 'warning' ? 'text-orange-600' : 'text-red-600'}`}>{formError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Edit Listing Modal */}
      {editingListing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-3xl overflow-hidden border border-white/20 scale-in-center transition-transform">
            <div className="p-8 pt-10 pb-10 relative">
              <div className="flex justify-between items-start mb-8 pr-12">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Tahrirlash</h2>
                  <p className="text-slate-500 text-sm mt-1 font-medium bg-slate-100/50 inline-block px-3 py-1 rounded-lg border border-slate-200/60 mt-2">{editingListing.name} ({editingListing.sku})</p>
                </div>
                <button
                  type="button"
                  title="Yopish"
                  aria-label="Yopish"
                  onClick={() => { setEditingListing(null); setIsErrorVisible(false); }}
                  className="absolute top-8 right-8 bg-slate-100 hover:bg-slate-200 text-slate-500 p-2 rounded-full transition-colors"
                >
                  <XCircle size={24} />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                  {/* LEFT: Pricing */}
                  <div className="space-y-5 flex flex-col">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-2 ml-1">E'lon Narxi Turi</label>
                      <div className="bg-slate-100/50 p-1.5 rounded-2xl flex border border-slate-200/50">
                        <button
                          type="button"
                          onClick={() => setEditPriceType('chegirmasiz')}
                          className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${editPriceType === 'chegirmasiz'
                              ? 'bg-white text-sidebarDark shadow-sm scale-100'
                              : 'text-slate-500 hover:text-slate-700 scale-95 hover:scale-100'
                            }`}
                        >
                          💸 Odatdagi narx
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditPriceType('chegirmalik')}
                          className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${editPriceType === 'chegirmalik'
                              ? 'bg-white text-brandRed shadow-sm scale-100'
                              : 'text-slate-500 hover:text-slate-700 scale-95 hover:scale-100'
                            }`}
                        >
                          🔥 Chegirmalik
                        </button>
                      </div>
                    </div>

                    {editPriceType === 'chegirmalik' && editingListing && (() => {
                      const rawPrice = String(editingListing.original_price || editingListing.price || 0);
                      const basePrice = Number(rawPrice.replace(/[^\d]/g, '')) || 0;
                      const dp = Number(editDiscountPercent || 0);
                      const finalPrice = basePrice - (basePrice * dp / 100);

                      return (
                        <div className="bg-orange-50/50 p-5 rounded-3xl border border-orange-100/50 animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
                          <div className="flex justify-between items-center text-sm font-bold text-slate-500 bg-white/50 px-3 py-2 rounded-xl">
                            <span className="uppercase text-[10px] tracking-wider">Asl narxi (Ombor)</span>
                            <span className="text-slate-700 font-black">{basePrice.toLocaleString('uz-UZ')} UZS</span>
                          </div>

                          <div>
                            <label htmlFor="edit-discount" className="block text-xs font-bold text-orange-800 mb-2">Yangi chegirma foizi (%)</label>
                            <input
                              id="edit-discount"
                              type="number"
                              min="1"
                              max="100"
                              value={editDiscountPercent}
                              onChange={(e) => setEditDiscountPercent(e.target.value)}
                              className="w-full px-4 py-3 rounded-2xl border border-orange-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all font-black text-center text-lg bg-white text-orange-700"
                              placeholder="0"
                            />
                          </div>

                          <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-orange-100 shadow-sm">
                            <span className="text-[11px] font-bold text-orange-800 uppercase tracking-wider">Sotuvdagi yangi narx</span>
                            <span className="text-xl font-black text-green-600">{finalPrice.toLocaleString('uz-UZ')} UZS</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* RIGHT: Text & Media */}
                  <div className="space-y-5 flex flex-col">
                    <div>
                      <label htmlFor="edit-description" className="block text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-2 ml-1">Tavsif (Description)</label>
                      <textarea
                        id="edit-description"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-green-500/20 focus:border-green-500/50 outline-none transition-all text-sm min-h-[110px] font-medium resize-none bg-slate-50/30 focus:bg-white"
                        placeholder="Mahsulot haqida ma'lumot qoldiring..."
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-2 ml-1">Rasmlar (Min: 1, Max: 4)</label>

                      <div className="flex flex-wrap gap-3 mb-3">
                        {/* Existing Images */}
                        {editExistingImages.map((imgUrl, idx) => (
                          <div key={`ex-${idx}`} className="relative w-16 h-16 rounded-xl shadow-sm border border-slate-200 overflow-hidden group">
                            <img src={imgUrl} alt={`E'lonning eski rasmi ${idx + 1}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setEditExistingImages(editExistingImages.filter((_, i) => i !== idx))}
                              className="absolute top-1 right-1 w-5 h-5 bg-red-500/90 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-sm"
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                        {/* New Uploaded */}
                        {editNewImages.map((file, idx) => (
                          <div key={`new-${idx}`} className="relative w-16 h-16 rounded-xl shadow-sm border border-blue-200 overflow-hidden group">
                            <img src={URL.createObjectURL(file)} alt={`Yangi yuklangan rasm ${idx + 1}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setEditNewImages(editNewImages.filter((_, i) => i !== idx))}
                              className="absolute top-1 right-1 w-5 h-5 bg-red-500/90 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-sm"
                            >
                              &times;
                            </button>
                          </div>
                        ))}

                        {/* Upload Button */}
                        {(editExistingImages.length + editNewImages.length) < 4 && (
                          <label className="w-16 h-16 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-mustard transition-colors group">
                            <input
                              type="file"
                              title="Rasm yuklash"
                              aria-label="Rasm yuklash"
                              multiple
                              accept="image/png, image/jpeg"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files) {
                                  const newFiles = Array.from(e.target.files);
                                  const totalAllowed = 4 - (editExistingImages.length + editNewImages.length);
                                  const filesToAdd = newFiles.slice(0, totalAllowed);
                                  setEditNewImages(prev => [...prev, ...filesToAdd]);
                                }
                                e.target.value = '';
                              }}
                            />
                            <Plus className="text-slate-400 group-hover:text-mustard" size={24} />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                </div>

                <div className="pt-6 border-t border-slate-100 flex gap-4">
                  <button
                    type="button"
                    onClick={() => { setEditingListing(null); setIsErrorVisible(false); }}
                    className="flex-1 py-4 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold rounded-2xl transition-colors"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="submit"
                    disabled={isEditSubmitting}
                    className={`flex-1 py-4 font-bold rounded-2xl transition-all shadow-lg ${isEditSubmitting
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                        : 'bg-mustard text-sidebarDark shadow-yellow-400/20 hover:bg-yellow-500 active:scale-95'
                      }`}
                  >
                    {isEditSubmitting ? "Saqlanmoqda..." : "O'zgarishlarni Saqlash"}
                  </button>
                </div>

              </form>
            </div>

            {/* Edit Error Post */}
            <div
              className={`absolute bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 transition-all duration-500 ease-out pointer-events-none flex justify-center ${isErrorVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                }`}
            >
              <div className="bg-white rounded-2xl shadow-2xl shadow-red-500/20 border-l-4 border-red-500 p-4 flex items-center justify-center gap-3 w-full backdrop-blur-md">
                <span className="text-xl">⚠️</span>
                <p className="text-sm text-red-600 font-bold">{formError}</p>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-sidebarDark/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">E'lonni o'chirish</h3>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">Haqiqatan ham ushbu e'lonni butunlay o'chirib tashlamoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all border border-gray-100"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-3 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                >
                  O'chirish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pause Confirmation Modal */}
      {pauseConfirmId && (() => {
        const targetListing = listings.find(l => l.id === pauseConfirmId);
        const willPause = targetListing?.status === 'Active';
        return (
          <div className="fixed inset-0 bg-sidebarDark/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-[24px] w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-6 text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${willPause ? 'bg-orange-50 text-orange-500' : 'bg-green-50 text-green-500'}`}>
                  {willPause ? <PauseCircle size={32} /> : <PlayCircle size={32} />}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{willPause ? "Sotuvni to'xtatish" : "Sotuvni faollashtirish"}</h3>
                <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                  {willPause
                    ? "Haqiqatan ham ushbu e'lonni sotuvdan to'xtatmoqchimisiz? U mijozlar ilovasida ko'rinmay qoladi."
                    : "Haqiqatan ham ushbu e'lonni faollashtirmoqchimisiz? U yana mijozlar ilovasida sotilishi boshlanadi."}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setPauseConfirmId(null)}
                    className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all border border-gray-100"
                  >
                    Bekor qilish
                  </button>
                  <button
                    onClick={confirmToggle}
                    className={`flex-1 px-4 py-3 rounded-xl font-bold text-white transition-all shadow-lg ${willPause ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20' : 'bg-green-500 hover:bg-green-600 shadow-green-500/20'
                      }`}
                  >
                    Tasdiqlash
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Top Success Toast (Tomchi effekt) */}
      <div
        className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 pointer-events-none flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-2xl shadow-xl shadow-green-500/20 font-bold max-w-sm w-full backdrop-blur-md border border-green-400/50 ${successToast ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-full opacity-0 scale-95'
          }`}
      >
        <CheckCircle2 size={20} className="shrink-0" />
        <p className="text-sm">{successToast}</p>
      </div>
    </div>
  );
};

export default ProductListings;
