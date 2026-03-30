import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { ArrowLeft, Users, Package, TrendingUp, RotateCcw, Building2, Phone, MapPin, User as UserIcon } from 'lucide-react';

interface StoreDashboardProps {
  storeId: string;
  onBack: () => void;
}

export default function StoreDashboard({ storeId, onBack }: StoreDashboardProps) {
  const [store, setStore] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStoreData();
  }, [storeId]);

  const fetchStoreData = async () => {
    try {
      setIsLoading(true);
      
      const [storeRes, empRes, prodRes] = await Promise.all([
        supabase.from('stores').select('*').eq('id', storeId).single(),
        supabase.from('profiles').select('*').eq('store_id', storeId),
        supabase.from('products').select('*').eq('store_id', storeId)
      ]);

      if (storeRes.data) setStore(storeRes.data);
      if (empRes.data) setEmployees(empRes.data);
      if (prodRes.data) setProducts(prodRes.data);
      
    } catch(err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-slate-400 animate-in fade-in">
        <div className="w-12 h-12 rounded-full border-4 border-mustard/20 border-t-mustard animate-spin mb-4" />
        <p className="font-bold text-slate-500 animate-pulse">Do'kon ma'lumotlari yuklanmoqda...</p>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="p-10 text-center">
        <p className="text-red-500 font-bold text-lg">Xatolik: Do'kon topilmadi!</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-slate-100 rounded-lg hover:bg-slate-200">Ortga</button>
      </div>
    );
  }

  const totalValue = products.reduce((acc, curr) => acc + ((curr.stock || 0) * (curr.price || 0)), 0);

  return (
    <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
      
      {/* Top Navigation */}
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold transition-colors group px-1 py-1"
      >
        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
          <ArrowLeft size={18} />
        </div>
        Do'konlar ro'yxatiga qaytish
      </button>

      {/* Header Banner */}
      <div className="bg-white rounded-[32px] p-6 sm:p-8 flex flex-col md:flex-row gap-6 md:items-center justify-between border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-mustard/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        
        <div className="flex gap-5 items-center z-10">
          {store.image_url ? (
            <img src={store.image_url} alt={store.name} className="w-24 h-24 rounded-3xl object-cover shadow-sm bg-slate-50 border border-slate-100/50" />
          ) : (
            <div className="w-24 h-24 rounded-3xl bg-blue-50 text-blue-500 flex items-center justify-center">
              <Building2 size={40} className="drop-shadow-sm" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">{store.name}</h1>
              <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider ${
                store.status === 'Active' ? 'bg-green-100 text-green-700' : 
                store.status === '24/7' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
              }`}>
                {store.status}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 mt-3">
              <div className="flex items-center gap-2 text-slate-600">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center"><UserIcon size={12} /></div>
                <span className="text-sm font-semibold">{store.manager_name}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center"><Phone size={12} /></div>
                <span className="text-sm font-semibold">{store.manager_phone}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center"><MapPin size={12} /></div>
                <span className="text-sm font-semibold truncate max-w-[200px]" title={store.address}>{store.address}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Summary Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center">
            <Users size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-0.5">Xodimlar</p>
            <p className="text-2xl font-black text-slate-800">{employees.length} <span className="text-sm font-bold text-slate-400">ta</span></p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-14 h-14 rounded-2xl bg-mustard/20 text-yellow-600 flex items-center justify-center">
            <Package size={28} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-0.5">Xilma-xil Tovarlar</p>
            <p className="text-2xl font-black text-slate-800">{products.length} <span className="text-sm font-bold text-slate-400">tur / xil</span></p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow opacity-60">
          <div className="w-14 h-14 rounded-2xl bg-green-50 text-green-500 flex items-center justify-center">
            <TrendingUp size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-0.5">Sotilgan Tovarlar</p>
            <p className="text-2xl font-black text-slate-800">-- <span className="text-sm font-bold text-slate-400">ta</span></p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow opacity-60">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center">
            <RotateCcw size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-0.5">Qaytgan Tovarlar</p>
            <p className="text-2xl font-black text-slate-800">-- <span className="text-sm font-bold text-slate-400">ta</span></p>
          </div>
        </div>
      </div>

      {/* Main Content Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Employees Column */}
        <div className="lg:col-span-1 bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[500px]">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <Users size={18} className="text-slate-400" /> Biriktirilgan Xodimlar
            </h3>
          </div>
          <div className="p-3 overflow-y-auto flex-1 bg-slate-50/20">
            {employees.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <UserIcon size={24} className="text-slate-300" />
                </div>
                <p className="text-slate-500 font-medium text-sm">Hozircha xodimlar yo'q</p>
              </div>
            ) : (
              <div className="space-y-2">
                {employees.map(emp => (
                  <div key={emp.id} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-mustard/20 text-yellow-700 flex items-center justify-center font-bold text-lg">
                      {(emp.full_name || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm leading-tight mb-1">{emp.full_name}</p>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[10px] font-black uppercase tracking-wider">{emp.role}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Inventory Column */}
        <div className="lg:col-span-2 bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[500px]">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <Package size={18} className="text-slate-400" /> Do'kondagi Tovar Qoldiqlari
            </h3>
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-bold bg-mustard/20 text-yellow-700 px-3 py-1 rounded-lg">
                Jami qiymat: {totalValue.toLocaleString()} so'm
              </span>
              <span className="text-sm font-bold bg-mustard/20 text-yellow-700 px-3 py-1 rounded-lg">
                {products.length} xil maxsulot
              </span>
            </div>
          </div>
          
          <div className="overflow-y-auto flex-1">
            {products.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-slate-200">
                  <Package size={30} className="text-slate-300" />
                </div>
                <p className="text-slate-800 font-bold mb-1">Tovarlar mavjud emas</p>
                <p className="text-slate-400 font-medium text-sm">Bu filial omborida hozircha hech qanday maxsulot yo'q</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white/90 backdrop-blur-md shadow-sm z-10 border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-5 text-[11px] font-black tracking-wider text-slate-400 uppercase">Tovar Nomi / SKU</th>
                    <th className="py-3 px-5 text-[11px] font-black tracking-wider text-slate-400 uppercase">Qoldiq</th>
                    <th className="py-3 px-5 text-[11px] font-black tracking-wider text-slate-400 uppercase">O'lchov</th>
                    <th className="py-3 px-5 text-[11px] font-black tracking-wider text-slate-400 uppercase text-right">Narxi</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(product => (
                    <tr key={product.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-5">
                        <div className="font-bold text-slate-800 text-sm mb-0.5">{product.name}</div>
                        <div className="font-medium text-slate-400 text-xs">SKU: {product.sku}</div>
                      </td>
                      <td className="py-3 px-5">
                        <span className={`inline-flex font-bold text-sm px-2 py-1 rounded-lg ${
                          product.stock <= product.min_stock ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                        }`}>
                          {product.stock}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-sm font-semibold text-slate-600">
                        {product.unit}
                      </td>
                      <td className="py-3 px-5 text-right font-black text-slate-800 text-sm">
                        {product.price.toLocaleString()} s'om
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
