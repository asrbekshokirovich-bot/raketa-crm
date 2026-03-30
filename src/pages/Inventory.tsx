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
  Info
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
  const [isSkuDropdownOpen, setIsSkuDropdownOpen] = useState(false);
  const [infoModalData, setInfoModalData] = useState<{name: string, storeName: string, creatorName: string} | null>(null);

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
  }, []);

  const handleCopy = (sku: string) => {
    navigator.clipboard.writeText(sku);
    setCopiedSku(sku);
    setTimeout(() => setCopiedSku(null), 2000);
  };
  
  const generateRandomId = (category: string) => {
    const prefix = (category || 'GEN').substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
    const digits = Math.floor(10000 + Math.random() * 90000).toString();
    const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26)); 
    return `${prefix}-${digits}${letter}`;
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
        const item = items.find(i => i.sku === selectedSku);
        if (!item) return;

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
          const { error } = await supabase
            .from('products')
            .update(updateData)
            .eq('sku', selectedSku);

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
        if (user?.role === 'Owner' && activeStore === 'ALL') {
          showError("Asoschi (Owner) tizimga yangi tovar kiritishdan oldin tepadagi menyudan aniq bitta filialni tanlashi shart. 'Barcha Filiallar' rejimida tovar qo'shib bo'lmaydi.");
          return;
        }

        const randomID = generateRandomId(newProduct.category);
        const { error } = await supabase
          .from('products')
          .insert([{
            sku: randomID,
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
    } catch (err) {
      console.error('Receive error:', err);
      alert('Xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
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
    );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Omborxona (Inventory)</h1>
          <p className="text-slate-500 text-sm mt-1">Tovar qoldiqlari, SKU va ombor zaxirasini real vaqtda boshqarish</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleOpenModal}
            className="bg-sidebarDark hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-slate-900/10"
          >
            <Plus size={18} />
            <span>Yangi Tovar Qabul Qilish</span>
          </button>
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
            {user?.role !== 'Owner' && (
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
                              item.category === 'O\'quv qurollari' ? 'bg-purple-50 border-purple-100 text-purple-500' : 
                              item.category === 'Maishiy kimyo' ? 'bg-teal-50 border-teal-100 text-teal-500' : 
                              'bg-slate-50 border-slate-100 text-slate-400'}`}>
                            <Package size={20} />
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
                              setInfoModalData({ name: item.name, storeName: item.storeName || '', creatorName: item.creatorName || ''});
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
                          <option>Sut mahsulotlari</option>
                          <option>Poliz mahsulotlari</option>
                          <option>O'quv qurollari</option>
                          <option>Maishiy kimyo</option>
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
                  <div className="relative">
                    <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Mahsulotni tanlang (SKU)</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsSkuDropdownOpen(!isSkuDropdownOpen)}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-sidebarDark/10 outline-none transition-all bg-white font-bold text-slate-700 flex justify-between items-center"
                      >
                        <span className={selectedSku ? '' : 'text-slate-400 font-medium'}>
                          {selectedSku 
                            ? items.find(i => i.sku === selectedSku) ? `${selectedSku} - ${items.find(i => i.sku === selectedSku)?.name}` : selectedSku
                            : 'SKU tanlang...'}
                        </span>
                        <ChevronDown size={20} className={`text-slate-400 transition-transform ${isSkuDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {isSkuDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-[110] py-1">
                          {/* ~48px per item, max 4 items = ~195px */}
                          <ul className="max-h-[195px] overflow-y-auto custom-scrollbar">
                            <li
                              onClick={() => { setSelectedSku(''); setIsSkuDropdownOpen(false); }}
                              className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm font-medium text-slate-500 border-b border-slate-50"
                            >
                              SKU tanlang...
                            </li>
                            {items.map(item => (
                              <li
                                key={item.sku}
                                onClick={() => { setSelectedSku(item.sku); setIsSkuDropdownOpen(false); }}
                                className={`px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm font-bold border-b border-slate-50 transition-colors ${selectedSku === item.sku ? 'bg-sidebarDark/5 text-sidebarDark border-l-4 border-l-sidebarDark pl-3' : 'text-slate-700'}`}
                              >
                                {item.sku} - {item.name}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {receiveMode === 'existing' && selectedSku && (() => {
                  const item = items.find(i => i.sku === selectedSku);
                  if (!item) return null;
                  return (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 mb-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Erkin Qoldiq (Ombor)</span>
                        <div className="flex items-baseline gap-1">
                           <span className="text-xl font-black text-sidebarDark">{item.inStock}</span>
                           <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">{item.unit}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Oxirgi yangilanish</span>
                        <span className="text-sm font-bold text-slate-700">{new Date(item.lastUpdated).toLocaleString('uz-UZ').replace(',', '')}</span>
                      </div>
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
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Qaysi filialga tegishli?</p>
                <div className="font-black text-blue-600 border border-blue-100 bg-blue-50 p-3.5 rounded-2xl flex items-center gap-2">
                  <Box size={18} /> {infoModalData.storeName}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Kim qo'shgan (Xodim)?</p>
                <div className="font-bold text-slate-700 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex items-center gap-2">
                   {infoModalData.creatorName}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
