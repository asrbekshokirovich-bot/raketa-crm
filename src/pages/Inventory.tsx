import { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { 
  Box, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  Filter,
  Plus,
  Copy,
  Check,
  Package,
  Loader2,
  Trash2,
  XCircle,
  ChevronDown,
  Info,
  Apple,
  Coffee,
  Croissant,
  Beef,
  FlaskConical,
  Milk,
  Sparkles,
  Sprout,
  Baby,
  Dog,
  Candy
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';


interface StockItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  inStock: number;
  minStock: number;
  unit: string;
  price: number; 
  image?: string;
  lastUpdated: string;
  storeName?: string;
  store_id?: string;
  creatorName?: string;
  isListed?: boolean;
}

const Inventory = () => {
  const { user, activeStore } = useAuth();
  const [items, setItems] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [receiveMode, setReceiveMode] = useState<'existing' | 'new'>('existing');
  const [selectedSku, setSelectedSku] = useState('');
  const [quantity, setQuantity] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState(''); 
  const [copiedSku, setCopiedSku] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [existingSkuSearch, setExistingSkuSearch] = useState('');
  const [isSkuDropdownOpen, setIsSkuDropdownOpen] = useState(false);
  const [infoModalData, setInfoModalData] = useState<{name: string, sku: string, creatorName: string} | null>(null);
  
  const [scannerErrorGlow, setScannerErrorGlow] = useState(false);
  const [skuInputMode, setSkuInputMode] = useState<'scanner' | 'manual'>('scanner');

  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    category: 'Oziq-ovqat',
    unit: 'dona',
    minStock: 10
  });

  const [formError, setFormError] = useState<string>('');
  const [isErrorVisible, setIsErrorVisible] = useState(false);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showError = (msg: string) => {
    setFormError(msg);
    setIsErrorVisible(true);
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    errorTimeoutRef.current = setTimeout(() => {
      setIsErrorVisible(false);
    }, 4000);
  };

  // Fetch Inventory from Supabase
  const fetchInventory = async () => {
    setIsLoading(true);
    try {
      const [productsResponse, listingsResponse] = await Promise.all([
        supabase
          .from('products')
          .select(`
            *,
            stores(name),
            profiles(full_name)
          `)
          .order('last_updated', { ascending: false }),
        supabase
          .from('product_listings')
          .select('sku')
      ]);

      if (productsResponse.error) throw productsResponse.error;

      const listedSkus = new Set(listingsResponse.data?.filter(l => l.sku).map(l => l.sku) || []);

      if (productsResponse.data) {
        const mappedItems: StockItem[] = productsResponse.data.map((dbItem: any) => ({
          id: dbItem.id,
          sku: dbItem.sku || 'NO-SKU',
          name: dbItem.name,
          category: dbItem.category,
          inStock: dbItem.stock || 0,
          minStock: dbItem.min_stock || 10,
          unit: dbItem.unit || 'dona',
          price: dbItem.price || 0,
          image: dbItem.image_url,
          lastUpdated: dbItem.last_updated 
            ? new Date(dbItem.last_updated).toLocaleString('uz-UZ').replace(',', '')
            : 'Sana yo\'q',
          storeName: dbItem.stores?.name || 'Topilmadi',
          store_id: dbItem.store_id,
          creatorName: dbItem.profiles?.full_name || 'Noma\'lum',
          isListed: listedSkus.has(dbItem.sku || 'NO-SKU')
        }));
        setItems(mappedItems);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();

    // Enable Real-time for automated stock updates
    const channel = supabase
      .channel('inventory_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          fetchInventory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const processSkuSelection = (scannedCode: string) => {
    const globalRecords = items.filter(i => i.sku === scannedCode);

    if (globalRecords.length > 0) {
       // It exists somewhere globally! Route safely to 'existing' pane.
       setReceiveMode('existing');
       setSelectedSku(scannedCode);
       setExistingSkuSearch(scannedCode);
    } else {
       // Completely new SKU globally
       setReceiveMode('new');
       setNewProduct({
         name: '',
         sku: scannedCode,
         category: 'Oziq-ovqat',
         unit: 'dona',
         minStock: 10
       });
    }
  };

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
      
      // Reset buffer if typing normally (>100ms per keystroke)
      if (currentTime - lastKeyTime > 100) {
        barcodeBuffer = '';
        firstKeyTime = currentTime;
      }
      lastKeyTime = currentTime;

      // Track typing
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        barcodeBuffer += e.key;
        // DO NOT preventDefault here. Let characters enter normally.
      } else if (e.key === 'Enter' && barcodeBuffer.length >= 4) {
        
        // Check if the sequence was incredibly fast (scanner speed)
        const totalDuration = currentTime - firstKeyTime;
        if (totalDuration < 1000) { // 13 chars in 1 second is very fast
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
            setScannerErrorGlow(true);
            setTimeout(() => setScannerErrorGlow(false), 900);
            alert("Skanerdan foydalanish uchun, iltimos yuqoridagi 'Avtomat Skaner' rejimini tanlang!");
            return;
          }

          if (isModalOpen) {
            if (receiveMode === 'existing') {
              setExistingSkuSearch(scannedCode);
              const match = items.find(i => i.sku === scannedCode);
              if (match) {
                setSelectedSku(scannedCode);
              } else {
                setSelectedSku('');
              }
            } else {
              setNewProduct(prev => ({ ...prev, sku: scannedCode }));
            }
          } else {
            processSkuSelection(scannedCode);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isModalOpen, receiveMode]);

  const handleCopy = (sku: string) => {
    navigator.clipboard.writeText(sku);
    setCopiedSku(sku);
    setTimeout(() => setCopiedSku(null), 2000);
  };

  const calculateTotal = () => {
    const q = Number(quantity) || 0;
    const p = Number(pricePerUnit) || 0;
    return (q * p).toLocaleString('uz-UZ');
  };

  const handleReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (receiveMode === 'existing') {
        const item = items.find(i => i.sku === selectedSku && (activeStore === 'ALL' ? true : i.store_id === activeStore));
        
        if (!item) {
           // We do not have it locally, but it exists in the 'existing' pane so it MUST be global.
           const globalItem = items.find(i => i.sku === selectedSku);
           if (!globalItem) return;

           const { error } = await supabase
             .from('products')
             .insert([{
                sku: globalItem.sku,
                name: globalItem.name,
                category: globalItem.category,
                unit: globalItem.unit,
                min_stock: globalItem.minStock,
                stock: Number(quantity) || 0, // Safe default since we allow incremental additions
                price: Number(pricePerUnit) || globalItem.price,
                last_updated: new Date().toISOString(),
                store_id: activeStore === 'ALL' ? null : activeStore,
                created_by: user?.id
             }]);

           if (error) throw error;
           await fetchInventory();
           handleCloseModal();
           return;
        }

        const updateData: any = {
          last_updated: new Date().toISOString()
        };

        // If quantity is provided (not empty string), add to stock (incremental)
        if (quantity !== '') {
          const qty = Number(quantity);
          const newStock = item.inStock + qty;
          
          if (newStock < 0) {
            showError(`Xatolik: Omborda faqat ${item.inStock} ta qolgan! Siz ${Math.abs(qty)} ta ayira olmaysiz.`);
            return; // Prevent update
          }
          
          updateData.stock = newStock;
        }

        // If price is provided (not empty string), set price to that value
        if (pricePerUnit !== '') {
          updateData.price = Number(pricePerUnit);
        }

        // Only update if there are changes (beyond just last_updated)
        if (Object.keys(updateData).length > 1) {
          let query = supabase
            .from('products')
            .update(updateData)
            .eq('sku', selectedSku);

          if (item.store_id) {
             query = query.eq('store_id', item.store_id);
          } else if (activeStore !== 'ALL') {
             query = query.eq('store_id', activeStore);
          }

          const { error } = await query;

          if (error) throw error;
        }

        // Sync price to product listings
        if (pricePerUnit !== '') {
          const newPrice = Number(pricePerUnit);
          const { data: relatedListings, error: fetchErr } = await supabase
            .from('product_listings')
            .select('id, discount_percent')
            .eq('sku', selectedSku);
            
          if (!fetchErr && relatedListings && relatedListings.length > 0) {
            for (const cl of relatedListings) {
               const dp = Number(cl.discount_percent || 0);
               if (dp > 0) {
                   const discountAmount = newPrice * (dp / 100);
                   const finalPrice = newPrice - discountAmount;
                   await supabase
                     .from('product_listings')
                     .update({ price: finalPrice.toString(), original_price: newPrice.toString() })
                     .eq('id', cl.id);
               } else {
                   await supabase
                     .from('product_listings')
                     .update({ price: newPrice.toString(), original_price: null })
                     .eq('id', cl.id);
               }
            }
          }
        }
      } else {
        if ((user?.role === 'Owner' || user?.role === 'Admin') && activeStore === 'ALL') {
          showError("Asoschi (Owner) tizimga yangi tovar kiritishdan oldin tepadagi menyudan aniq bitta filialni tanlashi shart. 'Barcha Filiallar' rejimida tovar qo'shib bo'lmaydi.");
          return;
        }

        if (!newProduct.sku || newProduct.sku.trim() === '') {
          showError("Iltimos, shtrix kodni (SKU) kiriting!");
          return;
        }

        // Check if SKU already exists globally
        const skuExists = items.some(i => i.sku.trim().toLowerCase() === newProduct.sku.trim().toLowerCase());
        if (skuExists) {
          showError(`Ushbu SKU (${newProduct.sku.trim()}) tizimda allaqachon mavjud! Iltimos, "Mavjud SKU" bo'limidan foydalaning yoki boshqa kod kiriting.`);
          return;
        }

        const { error } = await supabase
          .from('products')
          .insert([{
            sku: newProduct.sku.trim(),
            name: newProduct.name,
            category: newProduct.category,
            stock: Number(quantity) || 0,
            min_stock: newProduct.minStock,
            unit: newProduct.unit,
            price: Number(pricePerUnit) || 0,
            last_updated: new Date().toISOString(),
            store_id: activeStore === 'ALL' ? null : activeStore,
            created_by: user?.id
          }]);

        if (error) throw error;
      }

      await fetchInventory(); // Refresh list
      handleCloseModal();
    } catch (err: any) {
      console.error('Receive error:', err);
      if (err?.code === '23505') {
        alert(`Bu shtrix-kod (${newProduct.sku || selectedSku}) tizimda allaqachon mavjud! Iltimos "Mavjud SKU" bo'limini tekshirib ko'ring.`);
      } else {
        alert('Xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
      }
    }
  };

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setDeleteConfirmId(null);
      await fetchInventory(); // Refresh list
    } catch (err) {
      console.error('Delete error:', err);
      alert('Mahsulotni o\'chirishda xatolik yuz berdi.');
    }
  };

  const resetModal = () => {
    setSelectedSku('');
    setExistingSkuSearch('');
    setQuantity('');
    setPricePerUnit('');
    setNewProduct({ name: '', sku: '', category: 'Oziq-ovqat', unit: 'dona', minStock: 10 });
  };

  const handleOpenModal = () => {
    resetModal();
    setReceiveMode('existing');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetModal();
  };

  const [filterStatus, setFilterStatus] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [storeViewFilter, setStoreViewFilter] = useState<'all' | 'my_store'>('all');

  // Compute filtered items
  const filteredItems = items
    .filter(item => {
      if (storeViewFilter === 'my_store') return item.store_id === user?.store_id;
      return true;
    })
    .filter(item => {
      if (filterStatus === 'in_stock') return item.inStock > item.minStock;
      if (filterStatus === 'low_stock') return item.inStock > 0 && item.inStock <= item.minStock;
      if (filterStatus === 'out_of_stock') return item.inStock === 0;
      return true;
    })
    .filter(item => 
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .reduce((acc, current) => {
      const existing = acc.find(i => i.sku === current.sku);
      if (existing) {
        existing.inStock += current.inStock;
        // Keep the latest timestamp
        // It's pre-formatted to Uzbek locale, but basic string comparision works or we can just leave it as it usually matches.
        // For safety, let's just leave the most recently updated item's values (which we already sorted by in DB)
        // Since we sort by last_updated DESC in the DB, the first `existing` we push is already the most recent!
      } else {
        acc.push({ ...current });
      }
      return acc;
    }, [] as any[]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Omborxona (Inventory)</h1>
          <p className="text-slate-500 text-sm mt-1">Tovar qoldiqlari, SKU va ombor zaxirasini real vaqtda boshqarish</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button 
            disabled={activeStore === 'ALL'}
            onClick={handleOpenModal}
            className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg ${
              activeStore === 'ALL' 
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none border border-slate-100' 
                : 'bg-sidebarDark hover:bg-slate-800 text-white shadow-slate-900/10'
            }`}
          >
            <Plus size={18} />
            <span>Yangi Tovar Qabul Qilish</span>
          </button>
          {activeStore === 'ALL' && (
            <p className="text-[10px] font-black text-brandRed uppercase tracking-widest animate-pulse">
              Filial tanlang!
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        <div 
          onClick={() => setFilterStatus('all')}
          className={`bg-white p-6 rounded-2xl shadow-sm flex items-center gap-4 cursor-pointer transition-all ${filterStatus === 'all' ? 'ring-2 ring-blue-500 shadow-md border-transparent scale-[1.02]' : 'border border-gray-100 opacity-70 hover:opacity-100 hover:border-blue-200'}`}
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <Box size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Jami SKU</p>
            <p className="text-2xl font-bold text-slate-900">{items.length} <span className="text-base font-normal text-slate-500">ta</span></p>
          </div>
        </div>

        <div 
          onClick={() => setFilterStatus('in_stock')}
          className={`bg-white p-6 rounded-2xl shadow-sm flex items-center gap-4 border-l-4 border-l-green-400 cursor-pointer transition-all ${filterStatus === 'in_stock' ? 'ring-2 ring-green-500 shadow-md border-transparent scale-[1.02]' : 'border border-gray-100 opacity-70 hover:opacity-100 hover:border-green-200'}`}
        >
          <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600 shrink-0">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Mavjud</p>
            <p className="text-2xl font-bold text-slate-900">
              {items.filter(i => i.inStock > i.minStock).length} <span className="text-base font-normal text-slate-500">ta</span>
            </p>
          </div>
        </div>

        <div 
          onClick={() => setFilterStatus('low_stock')}
          className={`bg-white p-6 rounded-2xl shadow-sm flex items-center gap-4 border-l-4 border-l-yellow-400 cursor-pointer transition-all ${filterStatus === 'low_stock' ? 'ring-2 ring-yellow-500 shadow-md border-transparent scale-[1.02]' : 'border border-gray-100 opacity-70 hover:opacity-100 hover:border-yellow-200'}`}
        >
          <div className="w-12 h-12 rounded-xl bg-yellow-50 flex items-center justify-center text-yellow-600 shrink-0">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Kam qolgan</p>
            <p className="text-2xl font-bold text-slate-900">
              {items.filter(i => i.inStock > 0 && i.inStock <= i.minStock).length} <span className="text-base font-normal text-slate-500">ta</span>
            </p>
          </div>
        </div>

        <div 
          onClick={() => setFilterStatus('out_of_stock')}
          className={`bg-white p-6 rounded-2xl shadow-sm flex items-center gap-4 border-l-4 border-l-red-500 cursor-pointer transition-all ${filterStatus === 'out_of_stock' ? 'ring-2 ring-red-500 shadow-md border-transparent scale-[1.02]' : 'border border-gray-100 opacity-70 hover:opacity-100 hover:border-red-200'}`}
        >
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600 shrink-0">
            <XCircle size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Tugagan</p>
            <p className="text-2xl font-bold text-slate-900">
              {items.filter(i => i.inStock === 0).length} <span className="text-base font-normal text-slate-500">ta</span>
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <Loader2 className="w-10 h-10 text-sidebarDark animate-spin mb-4" />
          <p className="text-slate-500 font-medium">Ma'lumotlar yuklanmoqda...</p>
        </div>
      ) : (
        <>
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

            <div className="flex gap-4 w-full md:w-auto flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                title="Qidirish"
                type="text" 
                placeholder="SKU yoki mahsulot nomi bo'yicha qidirish..." 
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-sidebarDark/10 outline-none bg-white transition-all shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => {
                  // Small delay to allow clicking a search result if needed
                  setTimeout(() => setSearchQuery(''), 200);
                }}
              />
            </div>
            <button title="Filtr" className="px-4 py-3 rounded-xl border border-gray-200 outline-none bg-white font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-2">
              <Filter size={18} />
              <span>Filter</span>
            </button>
          </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-left">SKU va Nomi</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-left">Kategoriya</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Qoldiq</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Narxi (1 birlik)</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right pr-20">Umumiy Summa</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-left pl-8">Holati</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Yangilangan</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredItems.length > 0 ? (
                  filteredItems
                    .map((item) => (
                    <tr key={item.id} className={`hover:bg-slate-50/50 transition-colors ${item.isListed === false ? 'bg-orange-50/40' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex-shrink-0 shadow-sm flex items-center justify-center border
                            ${item.category === 'Ichimliklar' ? 'bg-blue-50 border-blue-100 text-blue-500' : 
                              item.category === 'Oziq-ovqat' ? 'bg-orange-50 border-orange-100 text-orange-500' : 
                              item.category === 'Sut mahsulotlari' ? 'bg-cyan-50 border-cyan-100 text-cyan-600' : 
                              item.category === 'Poliz mahsulotlari' ? 'bg-yellow-50 border-yellow-100 text-yellow-600' : 
                              item.category === 'Shirinliklar' ? 'bg-pink-50 border-pink-100 text-pink-500' :
                              item.category === 'Mevalar' ? 'bg-green-50 border-green-100 text-green-500' :
                              item.category === 'Sabzavotlar' ? 'bg-emerald-50 border-emerald-100 text-emerald-500' :
                              item.category === 'Go\'sht' ? 'bg-red-50 border-red-100 text-red-500' :
                              item.category === 'Non va un' ? 'bg-amber-50 border-amber-100 text-amber-600' :
                              item.category === 'Bolalar oziq-ovqati' ? 'bg-indigo-50 border-indigo-100 text-indigo-500' :
                              item.category === 'Go\'zallik' ? 'bg-rose-50 border-rose-100 text-rose-500' :
                              item.category === 'Uy hayvonlari' ? 'bg-violet-50 border-violet-100 text-violet-500' :
                              item.category === 'Maishiy kimyo' ? 'bg-teal-50 border-teal-100 text-teal-500' : 
                              'bg-slate-50 border-slate-100 text-slate-400'}`}>
                            {item.category === 'Ichimliklar' ? <Coffee size={20} /> :
                             item.category === 'Oziq-ovqat' ? <Package size={20} /> :
                             item.category === 'Sut mahsulotlari' ? <Milk size={20} /> :
                             item.category === 'Shirinliklar' ? <Candy size={20} /> :
                             item.category === 'Mevalar' ? <Apple size={20} /> :
                             item.category === 'Sabzavotlar' ? <Sprout size={20} /> :
                             item.category === 'Go\'sht' ? <Beef size={20} /> :
                             item.category === 'Non va un' ? <Croissant size={20} /> :
                             item.category === 'Bolalar oziq-ovqati' ? <Baby size={20} /> :
                             item.category === 'Go\'zallik' ? <Sparkles size={20} /> :
                             item.category === 'Uy hayvonlari' ? <Dog size={20} /> :
                             item.category === 'Maishiy kimyo' ? <FlaskConical size={20} /> :
                             <Package size={20} />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-bold text-slate-900">{item.name}</p>
                              {item.isListed === false && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-orange-600 bg-orange-100 px-2 py-0.5 rounded border border-orange-200 shadow-sm" title="Ushbu tovar hali savdoga qo'yilmagan">
                                  <AlertTriangle size={10} strokeWidth={3} /> E'lonsiz
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 group">
                              <span className="text-[11px] font-mono font-black text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 flex items-center gap-2 shadow-sm transition-all group-hover:border-slate-200 group-hover:bg-white">
                                <span className="text-slate-400 font-normal tracking-normal mr-0.5">SKU/Barcode:</span>
                                {item.sku}
                                <button 
                                  onClick={() => handleCopy(item.sku)}
                                  className="text-slate-400 hover:text-sidebarDark transition-colors p-0.5 rounded hover:bg-slate-100"
                                  title="Nusxalash"
                                >
                                  {copiedSku === item.sku ? (
                                    <Check size={12} className="text-green-500 animate-in zoom-in duration-200" />
                                  ) : (
                                    <Copy size={12} className="group-hover:opacity-100 opacity-60 transition-opacity" />
                                  )}
                                </button>
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-slate-600 px-2 py-1 bg-slate-100 rounded-md">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-sm font-black ${
                          item.inStock === 0 ? 'text-red-500' : 
                          item.inStock <= item.minStock ? 'text-yellow-600' : 
                          'text-slate-900'
                        }`}>
                          {item.inStock} {item.unit}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-bold text-slate-600 text-nowrap">
                          {item.price.toLocaleString('uz-UZ')} sum
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right pr-20">
                        <span className="text-sm font-black text-sidebarDark">
                          {(item.inStock * item.price).toLocaleString('uz-UZ')}
                        </span>
                        <span className="ml-1 text-[9px] font-bold text-slate-400">sum</span>
                      </td>
                      <td className="px-6 py-4 pl-8">
                        {item.inStock === 0 ? (
                          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-100">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                            Tugagan
                          </span>
                        ) : item.inStock <= item.minStock ? (
                          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-yellow-600 bg-yellow-50 px-2.5 py-1 rounded-full border border-yellow-100">
                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-600 shadow-[0_0_8px_rgba(202,138,4,0.4)]" />
                            Kam qolmoqda
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-100">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-600" />
                            Mavjud
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                          {item.lastUpdated}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInfoModalData({ name: item.name, sku: item.sku, creatorName: item.creatorName || ''});
                            }}
                            className="text-slate-400 hover:text-blue-500 p-2 rounded-lg hover:bg-blue-50 transition-all"
                            title="Ma'lumot"
                          >
                            <Info size={18} />
                          </button>
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(item.id);
                            }}
                            className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-all"
                            title="O'chirish"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500 font-medium whitespace-nowrap">
                      Omborda topilmadi. Yangi mahsulot qo'shing.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-[550px] overflow-hidden border border-white/20 scale-in-center transition-transform">
            <div className="p-8 pt-10 pb-10">
              <div className="flex justify-between items-start mb-10 gap-4">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight whitespace-nowrap">Tovar Qabul Qilish</h2>
                  <p className="text-slate-400 text-sm mt-1 font-medium">Omborga yangi yuk kelganda hisobni yangilash</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-2xl">
                  <button 
                    type="button"
                    onClick={() => {
                      resetModal();
                      setIsErrorVisible(false); // Reset error state
                      setReceiveMode('existing');
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${receiveMode === 'existing' ? 'bg-white shadow-sm text-sidebarDark' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Mavjud SKU
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      resetModal();
                      setIsErrorVisible(false); // Reset error state
                      setReceiveMode('new');
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${receiveMode === 'new' ? 'bg-white shadow-sm text-sidebarDark' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Yangi SKU
                  </button>
                </div>
              </div>

              <form onSubmit={handleReceive} className="space-y-4">
                {receiveMode === 'new' && (
                  <div className="space-y-4">

                    <div className="grid grid-cols-2 gap-4">
                      
                      <div className="col-span-2">
                        <div className="flex justify-between items-end mb-1.5 ml-1">
                          <label className="block text-sm font-bold text-slate-700">Shtrix kod</label>
                          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                            <button
                              type="button"
                              onClick={() => setSkuInputMode('scanner')}
                              className={`px-3 py-1 rounded-md text-[10px] uppercase font-bold transition-all ${skuInputMode === 'scanner' ? 'bg-white text-brandRed shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                              Avtomat Skaner
                            </button>
                            <button
                              type="button"
                              onClick={() => setSkuInputMode('manual')}
                              className={`px-3 py-1 rounded-md text-[10px] uppercase font-bold transition-all ${skuInputMode === 'manual' ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                              Tahrirlash
                            </button>
                          </div>
                        </div>
                        <div className="relative">
                          <input 
                            id="sku-input"
                            title={skuInputMode === 'scanner' ? "Faqat o'qigich orqali" : "Shtrix kodni yozing..."}
                            type="text" 
                            required
                            readOnly={skuInputMode === 'scanner'}
                            autoFocus={skuInputMode === 'scanner'}
                            className={`w-full px-4 py-3 rounded-2xl border focus:outline-none focus:ring-2 focus:ring-sidebarDark/10 transition-all font-mono font-bold text-lg tracking-widest ${scannerErrorGlow ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] bg-red-50 text-red-600' : 'border-gray-200 text-slate-700 bg-white'}`}
                            placeholder={skuInputMode === 'scanner' ? "0000000000000" : "Shtrix kod raqamini kiriting..."}
                            value={newProduct.sku}
                            onChange={(e) => skuInputMode === 'manual' && setNewProduct({...newProduct, sku: e.target.value})}
                          />
                          {newProduct.sku && (
                            <button
                              type="button"
                              onClick={() => setNewProduct({...newProduct, sku: ''})}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 p-1.5 rounded-xl hover:bg-red-50 bg-white shadow-sm border border-slate-200 transition-all font-bold"
                              title="Shtrix kodni tozalash"
                            >
                              <XCircle size={18} />
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 mt-1.5 ml-1.5 uppercase tracking-wider">
                          Skanerdan foydalanish uchun 'Avtomat skaner'ni tanlang
                        </p>
                      </div>

                      <div className="col-span-2">
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Mahsulot nomi</label>
                        <input 
                          title="Ism"
                          type="text" 
                          required
                          className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-sidebarDark/10 outline-none transition-all"
                          placeholder="Masalan: Coca-Cola 1.5L..."
                          value={newProduct.name}
                          onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Kategoriya</label>
                        <select 
                          title="Kategoriya"
                          className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-sidebarDark/10 outline-none transition-all bg-white font-bold text-slate-700"
                          value={newProduct.category}
                          onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                        >
                          <option>Oziq-ovqat</option>
                          <option>Ichimliklar</option>
                          <option>Shirinliklar</option>
                          <option>Mevalar</option>
                          <option>Sabzavotlar</option>
                          <option>Go'sht</option>
                          <option>Sut mahsulotlari</option>
                          <option>Non va un</option>
                          <option>Maishiy kimyo</option>
                          <option>Bolalar oziq-ovqati</option>
                          <option>O'quv qurollari</option>
                          <option>Go'zallik</option>
                          <option>Uy hayvonlari</option>
                          <option>Boshqalar</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Birlik</label>
                        <select 
                          title="Birlik"
                          className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-sidebarDark/10 outline-none transition-all bg-white font-bold text-slate-700"
                          value={newProduct.unit}
                          onChange={(e) => setNewProduct({...newProduct, unit: e.target.value})}
                        >
                          <option value="dona">Dona</option>
                          <option value="kg">KG</option>
                          <option value="blok">Blok</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {receiveMode === 'existing' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Shtrix kod (Skanerlang yoki yozing)</label>
                      <div className="relative">
                        <input 
                          title="Shtrix kodni qidirish yoki skanerlang"
                          type="text" 
                          placeholder="Shtrix kodni kiriting..."
                          value={existingSkuSearch}
                          onChange={(e) => {
                            const val = e.target.value;
                            setExistingSkuSearch(val);
                            // Auto-select if match found
                            const match = items.find(i => i.sku === val);
                            if (match) {
                              setSelectedSku(val);
                            }
                          }}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-sidebarDark/10 outline-none transition-all font-mono font-bold text-lg tracking-widest text-slate-700 bg-white shadow-sm"
                        />
                        {existingSkuSearch && (
                          <button
                            title="Tozalash"
                            type="button"
                            onClick={() => { setExistingSkuSearch(''); setSelectedSku(''); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50"
                          >
                            <XCircle size={18} />
                          </button>
                        )}
                      </div>
                      {existingSkuSearch && !selectedSku && (
                        <p className="text-[10px] font-bold text-red-500 mt-1.5 ml-1.5 uppercase tracking-wider animate-pulse">
                          Mahsulot omborda topilmadi! Iltimos "Yangi SKU" bo'limiga o'ting.
                        </p>
                      )}
                    </div>

                    <div className="relative">
                      <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Mahsulot</label>
                      <div className="relative">
                        <button
                          title="Mahsulotlar ro'yxatini ochish"
                          type="button"
                          onClick={() => setIsSkuDropdownOpen(!isSkuDropdownOpen)}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-sidebarDark/10 outline-none transition-all bg-white font-bold text-slate-700 flex justify-between items-center shadow-sm"
                        >
                          <span className={selectedSku ? '' : 'text-slate-400 font-medium'}>
                            {selectedSku 
                              ? items.find(i => i.sku === selectedSku) ? `${selectedSku} - ${items.find(i => i.sku === selectedSku)?.name}` : selectedSku
                              : 'Qidirish yoki tanlash...'}
                          </span>
                          <ChevronDown size={20} className={`text-slate-400 transition-transform ${isSkuDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {isSkuDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-[110] py-1 animate-in slide-in-from-top-2 duration-200">
                            <ul className="max-h-[250px] overflow-y-auto custom-scrollbar">
                              <li
                                onClick={() => { setSelectedSku(''); setExistingSkuSearch(''); setIsSkuDropdownOpen(false); }}
                                className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm font-medium text-slate-500 border-b border-slate-50"
                              >
                                Tanlovni tozalash
                              </li>
                              {items.map(item => (
                                <li
                                  key={item.id}
                                  onClick={() => { 
                                    setSelectedSku(item.sku); 
                                    setExistingSkuSearch(item.sku);
                                    setIsSkuDropdownOpen(false); 
                                  }}
                                  className={`px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm font-bold border-b border-slate-50 transition-colors ${selectedSku === item.sku ? 'bg-sidebarDark/5 text-sidebarDark border-l-4 border-l-sidebarDark pl-3' : 'text-slate-700'}`}
                                >
                                  <div className="flex flex-col">
                                    <span>{item.name}</span>
                                    <span className="text-[10px] font-mono text-slate-400">{item.sku}</span>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {receiveMode === 'existing' && selectedSku && (() => {
                  let item = items.find(i => i.sku === selectedSku && (activeStore === 'ALL' ? true : i.store_id === activeStore));
                  const globalFallback = items.find(i => i.sku === selectedSku);
                  
                  if (!item && !globalFallback) return null;
                  
                  const displayItem = item || globalFallback!;

                  // Active store name lookup
                  const activeStoreName = activeStore === 'ALL' 
                    ? 'Barcha filiallar' 
                    : (items.find(i => i.store_id === activeStore)?.storeName || 'Sizdagi filial');

                  // Filter out activeStore to show other stores
                  const otherStores = items.filter(i => i.sku === selectedSku && i.store_id !== activeStore && i.inStock > 0);

                  return (
                    <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200/60 mb-4 flex flex-col gap-4 shadow-inner">
                      {/* Mahsulot nomi va SKU */}
                      <div className="flex items-start gap-4 border-b border-slate-200/60 pb-4">
                        <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-sidebarDark border border-slate-100 shrink-0">
                          <Package size={24} />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-black text-slate-900 leading-tight">{displayItem.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{displayItem.sku}</span>
                            <span className="text-[10px] font-bold text-blue-500 px-2 py-0.5 bg-blue-50 rounded-lg">{displayItem.category}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Narxi</span>
                          <span className="text-sm font-black text-sidebarDark bg-white px-3 py-1.5 rounded-xl border border-slate-200/60 shadow-sm">
                            {displayItem.price.toLocaleString('uz-UZ')} <span className="text-[10px] font-bold">uzs</span>
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                         {/* Existing Store Stock */}
                         <div className={`p-3.5 rounded-2xl border shadow-sm transition-all ${item && item.inStock > 0 ? 'bg-white border-slate-200/60' : 'bg-red-50 border-red-100'}`}>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Filialdagi qoldiq</span>
                            <div className="flex items-baseline gap-1">
                               <span className={`text-2xl font-black ${item && item.inStock > 0 ? 'text-sidebarDark' : 'text-red-500'}`}>{item ? item.inStock : 0}</span>
                               <span className="text-[11px] font-bold text-slate-500 uppercase">{displayItem.unit}</span>
                            </div>
                         </div>
                         {/* Global Stock Summary */}
                         <div className="bg-white p-3.5 rounded-2xl border border-slate-200/60 shadow-sm">
                            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-1.5">Umumiy (Barcha filial)</span>
                            <div className="flex items-baseline gap-1">
                               <span className="text-2xl font-black text-slate-900">
                                 {items.filter(i => i.sku === selectedSku).reduce((sum, i) => sum + i.inStock, 0)}
                               </span>
                               <span className="text-[11px] font-bold text-slate-500 uppercase">{displayItem.unit}</span>
                            </div>
                         </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                         {/* Current Store */}
                         <div className="bg-slate-100/50 p-3.5 rounded-2xl border border-dashed border-slate-300 shadow-sm">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Hozirgi qabul qilinayotgan filial:</span>
                            <p className="text-xs font-black text-sidebarDark" title={activeStoreName}>{activeStoreName}</p>
                         </div>
                      </div>

                      {/* Boshqa omborlarda mavjud qoldiqlar (agar bo'lsa) */}
                      {otherStores.length > 0 && (
                        <div className="pt-2">
                           <button 
                             type="button"
                             className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest flex items-center gap-1.5 hover:text-blue-700 transition-colors"
                             onClick={() => {
                               // Optional: could expand here, but for now just showing it exists
                             }}
                           >
                             Boshqa filiallarda ham mavjud (+{otherStores.length})
                           </button>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-6">
                  <div>
                    <div className="flex justify-between items-center mb-1.5 ml-1">
                      <label className="block text-sm font-bold text-slate-700">
                        {receiveMode === 'new' ? 'Narxi (1 birlik)' : 'Yangi narx'}
                      </label>
                      {receiveMode === 'existing' && selectedSku && (() => {
                        const item = items.find(i => i.sku === selectedSku);
                        if (!item) return null;
                        return (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200">
                            Amaldagi: <span className="text-slate-600 font-extrabold">{item.price.toLocaleString('uz-UZ')}</span> UZS
                          </span>
                        );
                      })()}
                    </div>
                    <div className="relative">
                      <input 
                        title="Narx"
                        type="number" 
                        required={receiveMode === 'new'}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-sidebarDark/10 outline-none transition-all pr-12 font-bold"
                        placeholder="Masalan: 5000"
                        value={pricePerUnit}
                        onChange={(e) => setPricePerUnit(e.target.value)}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase">uzs</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Miqdor o'zgarishi</label>
                    <div className="relative flex items-center h-[50px] bg-white rounded-2xl border border-gray-200 focus-within:ring-2 focus-within:ring-sidebarDark/10 transition-all overflow-hidden shadow-sm">
                      <button 
                        type="button" 
                        title="Ayrish"
                        onClick={() => {
                          const val = quantity.replace(/-/g, '');
                          if (val) setQuantity('-' + val);
                          else setQuantity('-');
                        }}
                        className="w-12 h-full flex items-center justify-center bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-500 hover:text-red-500 font-black text-lg border-r border-slate-200 transition-colors cursor-pointer select-none"
                      >
                        -
                      </button>
                      <input 
                        title="Miqdor"
                        type="number" 
                        required={receiveMode === 'new'}
                        className="flex-1 w-full px-2 h-full outline-none font-black text-center text-lg bg-transparent"
                        placeholder="0"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                      />
                      <button 
                        type="button" 
                        title="Qo'shish"
                        onClick={() => {
                          const val = quantity.replace(/-/g, '').replace(/^\+/, '');
                          if (val) setQuantity(val);
                        }}
                        className="w-12 h-full flex items-center justify-center bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-500 hover:text-green-500 font-black text-lg border-l border-slate-200 transition-colors cursor-pointer select-none"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {receiveMode === 'new' && (
                  <div className="bg-blue-50/50 p-5 rounded-3xl border border-blue-100/50 flex justify-between items-center mt-4">
                    <span className="text-sm font-bold text-slate-500 uppercase tracking-widest text-[10px]">Jami qabul summasi:</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black text-sidebarDark">{calculateTotal()}</span>
                      <span className="text-[10px] font-black text-slate-400 uppercase">uzs</span>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isErrorVisible ? 'max-h-24 opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0'}`}>
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl relative">
                    <div className="flex items-center gap-3">
                      <div className="bg-red-100 p-1.5 rounded-lg flex-shrink-0 animate-pulse">
                        <AlertTriangle className="text-red-500" size={18} />
                      </div>
                      <p className="text-red-700 font-medium text-sm leading-tight">
                        {formError}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-8">
                    <button 
                      type="button"
                      onClick={handleCloseModal}
                      className="px-6 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all border border-slate-100"
                    >
                      Bekor qilish
                    </button>
                  <button 
                    type="submit"
                    className="px-6 py-4 rounded-2xl font-bold text-white bg-sidebarDark hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 active:scale-[0.98]"
                  >
                    Qabulni yakunlash
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[40px] p-8 max-w-sm w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <Trash2 className="text-red-500" size={32} />
            </div>
            <h3 className="text-xl font-black text-sidebarDark text-center mb-2">Mahsulotni o'chirish?</h3>
            <p className="text-slate-500 text-center text-sm mb-8 leading-relaxed">
              Haqiqatdan ham ushbu mahsulotni ombordan butunlay o'chirib tashlamoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className="py-4 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all border border-slate-100"
              >
                Yo'q, qolsin
              </button>
              <button 
                onClick={() => handleDelete(deleteConfirmId!)}
                className="py-4 rounded-2xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-200 transition-all"
              >
                Ha, o'chirilsin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Modal */}
      {infoModalData && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl border border-slate-100 relative shadow-blue-900/10">
            <button title="Yopish" onClick={() => setInfoModalData(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-2 rounded-full transition-colors">
              <XCircle size={20} />
            </button>
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                <Info size={24} />
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Qo'shimcha Info</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Mahsulot nomi</p>
                <div className="font-bold text-slate-800 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  {infoModalData.name}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Qaysi do'konlarda mavjud?</p>
                <div className="font-bold text-blue-600 border border-blue-100 bg-blue-50 p-3.5 rounded-2xl flex flex-col gap-2">
                  {items.filter(i => i.sku === infoModalData.sku && i.inStock > 0).length > 0 ? (
                    items.filter(i => i.sku === infoModalData.sku && i.inStock > 0).map((storeRecord, index) => (
                      <div key={index} className="flex flex-col gap-1 bg-white p-3 rounded-xl border border-blue-200 shadow-sm">
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-1.5 text-sm text-blue-700">
                            <Box size={14} /> {storeRecord.storeName}
                          </span>
                          <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                            {storeRecord.inStock} {storeRecord.unit}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <span className="text-slate-500 font-medium">Hozircha hech qaysi omborda mavjud emas</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8">
              <button 
                onClick={() => setInfoModalData(null)}
                className="w-full py-4 rounded-2xl font-bold text-white bg-sidebarDark hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 active:scale-[0.98]"
              >
                Tushunarli
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
