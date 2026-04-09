import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { supabaseAdmin } from '../services/supabaseAdmin';
import { useAuth } from '../context/AuthContext';
import { Shield, Plus, Trash2, Edit2, Eye, EyeOff, Copy, Check, Lock, Search, Store } from 'lucide-react';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  store_id?: string | null;
  phone?: string | null;
  password_hint?: string;
  created_at: string;
}

interface StoreItem {
  id: string;
  name: string;
}

const Admins = () => {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<Profile[]>([]);
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ fullName: '', username: '', password: '', role: 'Manager', storeId: '', phone: '' });
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState({ id: '', fullName: '', username: '', role: '', storeId: '', password: '', lastPass: '', phone: '' });
  const [showEditPass, setShowEditPass] = useState(false);
  const [showLastPass, setShowLastPass] = useState(false);

  // Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<{ id: string; name: string } | null>(null);

  // View Card State
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [cardAdmin, setCardAdmin] = useState<Profile | null>(null);
  const [showCardPass, setShowCardPass] = useState(false);
  const [copiedId, setCopiedId] = useState<'username' | 'password' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    // Fetch stores
    const { data: storesData } = await supabase.from('stores').select('id, name').order('name');
    if (storesData) setStores(storesData);
    
    // Fetch profiles
    const { data: adminsData, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (!error) {
      setAdmins(adminsData || []);
    }
    setLoading(false);
  };

  const fetchAdminsOnly = async () => {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (!error) {
      setAdmins(data || []);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    if (user?.role !== 'Owner') {
      setSubmitError("Faqat Owner hisobi yangi xodim qo'sha oladi!");
      return;
    }

    setIsSubmitting(true);
    try {
      const computedEmail = `${newAdmin.username}@raketa.uz`;
      const { data: userData, error } = await supabaseAdmin.auth.admin.createUser({
        email: computedEmail,
        password: newAdmin.password,
        email_confirm: true,
        user_metadata: {
          full_name: newAdmin.fullName,
          role: newAdmin.role,
          password: newAdmin.password
        }
      });

      if (error) throw error;

      // Update store_id manually in profiles since trigger won't catch custom columns right away
      if (userData?.user?.id) {
        const { error: profileError } = await supabaseAdmin.from('profiles')
          .update({ store_id: newAdmin.storeId || null, phone: newAdmin.phone || null })
          .eq('id', userData.user.id);
          
        if (profileError) console.error("Profile update error:", profileError.message);
      }
        // Sync store's manager info if it's a Manager
        if (newAdmin.role === 'Manager' && newAdmin.storeId) {
          const { error: storeSyncError } = await supabaseAdmin.from('stores')
            .update({ manager_name: newAdmin.fullName, manager_phone: newAdmin.phone || '' })
            .eq('id', newAdmin.storeId);
          if (storeSyncError) console.error("Store sync error:", storeSyncError.message);
        }
      setIsModalOpen(false);
      setNewAdmin({ fullName: '', username: '', password: '', role: 'Manager', storeId: '', phone: '' });
      fetchAdminsOnly();

    } catch (err: any) {
      setSubmitError("Xatolik: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setIsSubmitting(true);

    try {
      const computedEmail = `${editingAdmin.username}@raketa.uz`;

      // 1. O'zgarishlarni to'g'ridan-to'g'ri `profiles` jadvaliga yozamiz (bu trigger orqali ham update bo'ladi lekin ishonch uchun)
      const { error: profileError } = await supabaseAdmin.from('profiles')
        .update({ 
          store_id: editingAdmin.storeId || null,
          phone: editingAdmin.phone || null
        })
        .eq('id', editingAdmin.id);

      if (profileError) throw new Error("Profilni yangilashda xatolik: " + profileError.message);

      // Store table synchronization
      if (editingAdmin.role === 'Manager' && editingAdmin.storeId) {
        const { error: storeSyncError } = await supabaseAdmin.from('stores')
          .update({ manager_name: editingAdmin.fullName, manager_phone: editingAdmin.phone || '' })
          .eq('id', editingAdmin.storeId);
        if (storeSyncError) console.error("Store edit sync error:", storeSyncError.message);
      }

      // 2. Parol, Email va asosiy ma'lumotlarni Auth orqali yozamiz, toki Trigger to'g'ri sinxronlasin
      const authUpdates: any = {
        email: computedEmail,
        email_confirm: true,
        user_metadata: {
          full_name: editingAdmin.fullName,
          role: editingAdmin.role
        }
      };
      
      if (editingAdmin.password) {
        authUpdates.password = editingAdmin.password;
      }

      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        editingAdmin.id,
        authUpdates
      );

      if (authError && !authError.message.includes('same email')) {
        // If it's just complaining about same email or something minor, we might ignore, but let's throw by default.
        // Wait, if it fails, we throw. 
        console.error("Auth update error, might be ignored if email didn't change:", authError);
        // We actually only want to throw if it's a real error. Let's throw just in case.
        throw authError;
      }

      setIsEditModalOpen(false);
      fetchAdminsOnly();
    } catch (err: any) {
      setSubmitError("Xatolik: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'username' | 'password') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(type);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDelete = (admin: Profile) => {
    setAdminToDelete({ id: admin.id, name: admin.full_name });
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!adminToDelete || !user) return;
    
    if (user.role.toLowerCase() !== 'owner') {
      alert("Faqat Owner xodimlarni o'chira oladi!");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(adminToDelete.id);
      if (error) {
        alert("O'chirishda xatolik: " + error.message);
      } else {
        await supabaseAdmin.from('profiles').delete().eq('id', adminToDelete.id);
        fetchAdminsOnly();
        setIsDeleteModalOpen(false);
        setAdminToDelete(null);
      }
    } catch (err: any) {
      alert("Kutilmagan xatolik: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAdmins = admins.filter(admin => 
    admin.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    admin.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStoreName = (storeId?: string | null) => {
    if (!storeId) return <span className="text-gray-400 text-xs italic">Biriktirilmagan</span>;
    const store = stores.find(s => s.id === storeId);
    return store ? <span className="text-gray-900 font-medium">{store.name}</span> : <span className="text-gray-400 text-xs italic">Topilmadi</span>;
  };

  if (user?.role !== 'Owner') {
    return (
      <div className="p-8 max-w-7xl mx-auto flex flex-col items-center justify-center h-[60vh] text-center">
        <Shield size={64} className="text-red-500 mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Ruxsat etilmagan</h1>
        <p className="text-gray-500">Sizda xodimlar ro'yxatini ko'rish va qo'shish huquqi yo'q. Faqat Asoschi (Owner) kira oladi.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Xodimlar ro'yxati</h1>
          <p className="text-gray-500 mt-1">Tizim foydalanuvchilari va do'kon xodimlarini boshqarish</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Qidirish (Ism yoki Rol)..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none transition-all"
            />
          </div>
          <button 
            onClick={() => {
              setSubmitError('');
              setNewAdmin({ fullName: '', username: '', password: '', role: 'Manager', storeId: '', phone: '' });
              setIsModalOpen(true);
            }}
            className="whitespace-nowrap bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-yellow-500/20"
          >
            <Plus size={20} />
            Yangi Xodim
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-100 text-sm text-gray-500 uppercase tracking-wider">
                <th className="p-4 font-semibold">T/R</th>
                <th className="p-4 font-semibold">Ism Familiya</th>
                <th className="p-4 font-semibold">Biriktirilgan Filial</th>
                <th className="p-4 font-semibold">Rol (Vazifasi)</th>
                <th className="p-4 font-semibold text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAdmins.length > 0 ? filteredAdmins.map((admin, index) => (
                <tr key={admin.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 text-gray-500">{index + 1}</td>
                  <td className="p-4 font-medium text-gray-900">{admin.full_name}</td>
                  <td className="p-4">{getStoreName(admin.store_id)}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                      admin.role === 'Owner' ? 'bg-zinc-100 text-zinc-900' : 'bg-blue-50 text-blue-600'
                    }`}>
                      {admin.role}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2 text-blue-500">
                      <button 
                        onClick={() => {
                          setCardAdmin(admin);
                          setIsCardModalOpen(true);
                        }}
                        title="Ma'lumotlarni ko'rish"
                        className="p-2 text-gray-400 hover:text-green-500 transition-colors bg-gray-50 hover:bg-green-50 rounded-lg"
                      >
                        <Eye size={18} />
                      </button>
                      <button 
                        onClick={() => {
                          setSubmitError('');
                          setEditingAdmin({ 
                            id: admin.id, 
                            fullName: admin.full_name, 
                            username: admin.email.split('@')[0],
                            role: admin.role, 
                            storeId: admin.store_id || '',
                            password: '',
                            lastPass: admin.password_hint || '',
                            phone: admin.phone || ''
                          });
                          setIsEditModalOpen(true);
                        }}
                        title="Tahrirlash"
                        className="p-2 text-gray-400 hover:text-blue-500 transition-colors bg-gray-50 hover:bg-blue-50 rounded-lg"
                      >
                        <Edit2 size={18} />
                      </button>
                      {admin.role !== 'Owner' && (
                        <button 
                          onClick={() => handleDelete(admin)}
                          title="O'chirish"
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors bg-gray-50 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="p-20 text-center">
                    <div className="flex flex-col items-center text-gray-400">
                      <Search size={48} className="mb-4 opacity-20" />
                      <p className="text-lg">Hech qanday xodim topilmadi</p>
                      {searchTerm && <button onClick={() => setSearchTerm('')} className="mt-2 text-yellow-600 font-medium hover:underline">Qidiruvni tozalash</button>}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Yangi Xodim Qo'shish</h2>
            <form onSubmit={handleAddAdmin} className="space-y-4">
              {submitError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm border border-red-100">
                  {submitError}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Qaysi filialda ishlaydi?</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Store size={18} className="text-gray-400" />
                  </div>
                  <select 
                    required 
                    title="Filialni tanlang" 
                    value={newAdmin.storeId} 
                    onChange={e => setNewAdmin({...newAdmin, storeId: e.target.value})} 
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-yellow-400 outline-none bg-white font-medium text-slate-700 appearance-none"
                  >
                    <option value="" disabled>Filial (do'kon) ni tanlang</option>
                    {stores
                      .filter(store => newAdmin.role !== 'Manager' || !admins.some(a => a.role === 'Manager' && a.store_id === store.id))
                      .map(store => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To'liq ismi</label>
                <input required type="text" value={newAdmin.fullName} onChange={e => setNewAdmin({...newAdmin, fullName: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-yellow-400 outline-none" minLength={4} maxLength={30} placeholder="Ism Familiya" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon raqami</label>
                <input required type="text" value={newAdmin.phone} onChange={e => setNewAdmin({...newAdmin, phone: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-yellow-400 outline-none" minLength={9} maxLength={17} placeholder="+998 90 123 45 67" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Login (username)</label>
                <div className="flex gap-2">
                  <input autoComplete="off" required type="text" value={newAdmin.username} onChange={e => setNewAdmin({...newAdmin, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')})} className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-yellow-400 outline-none" minLength={3} maxLength={30} placeholder="xodim_login" />
                  <div className="inline-flex items-center px-4 rounded-xl border border-gray-200 bg-slate-50 text-slate-400 text-sm font-medium whitespace-nowrap">@raketa.uz</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kirish paroli</label>
                <div className="relative">
                  <input autoComplete="new-password" required type={showPass ? "text" : "password"} value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} className="w-full px-4 py-3 pr-10 rounded-xl border border-gray-200 focus:ring-2 focus:ring-yellow-400 outline-none" placeholder="••••••••" minLength={6} maxLength={20} />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute inset-y-0 right-3 flex items-center text-gray-400">
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vazifasi (Role)</label>
                <select title="Rolni tanlang" value={newAdmin.role} onChange={e => setNewAdmin({...newAdmin, role: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-yellow-400 outline-none bg-white font-medium text-slate-700">
                  <option value="Manager">Manager (Menejer)</option>
                  <option value="Sotuvchi">Sotuvchi (Sotuvchi)</option>
                  <option value="Omborchi">Omborchi (Omborchi)</option>
                </select>
              </div>
              
              <div className="flex gap-3 mt-8 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium transition-colors">Bekor qilish</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-3 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-white font-medium transition-colors shadow-lg shadow-yellow-500/20 flex justify-center items-center">
                  {isSubmitting ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div> : "Saqlash (Qo'shish)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Xodimni Tahrirlash</h2>
            <form onSubmit={handleEditAdmin} className="space-y-4">
              {submitError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm border border-red-100">
                  {submitError}
                </div>
              )}

              {editingAdmin.role !== 'Owner' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Biriktirilgan filial</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <Store size={18} className="text-gray-400" />
                    </div>
                    <select 
                      required 
                      title="Filialni tanlang" 
                      value={editingAdmin.storeId} 
                      onChange={e => setEditingAdmin({...editingAdmin, storeId: e.target.value})} 
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-yellow-400 outline-none bg-white font-medium text-slate-700 appearance-none"
                    >
                      <option value="" disabled>Filial (do'kon) ni tanlang</option>
                      {stores
                        .filter(store => editingAdmin.role !== 'Manager' || !admins.some(a => a.role === 'Manager' && a.store_id === store.id && a.id !== editingAdmin.id))
                        .map(store => (
                        <option key={store.id} value={store.id}>{store.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To'liq ismi</label>
                <input required type="text" value={editingAdmin.fullName} onChange={e => setEditingAdmin({...editingAdmin, fullName: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-yellow-400 outline-none" minLength={4} maxLength={30} placeholder="Ism Familiya" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon raqami</label>
                <input required type="text" value={editingAdmin.phone} onChange={e => setEditingAdmin({...editingAdmin, phone: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-yellow-400 outline-none" minLength={9} maxLength={17} placeholder="+998 90 123 45 67" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Login (username)</label>
                <div className="flex gap-2">
                  <input autoComplete="off" required type="text" value={editingAdmin.username} onChange={e => setEditingAdmin({...editingAdmin, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')})} className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-yellow-400 outline-none" minLength={3} maxLength={30} placeholder="xodim_login" />
                  <div className="inline-flex items-center px-4 rounded-xl border border-gray-200 bg-slate-50 text-slate-400 text-sm font-medium whitespace-nowrap">@raketa.uz</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vazifasi (Role)</label>
                {editingAdmin.role === 'Owner' ? (
                  <div className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-slate-50 flex items-center justify-between text-slate-500">
                    <span className="font-semibold">Asoschi (Owner)</span>
                    <Lock size={16} className="opacity-40" />
                  </div>
                ) : (
                  <select title="Rolni tanlang" value={editingAdmin.role} onChange={e => setEditingAdmin({...editingAdmin, role: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-yellow-400 outline-none bg-white font-medium text-slate-700">
                    <option value="Manager">Manager (Menejer)</option>
                    <option value="Sotuvchi">Sotuvchi (Sotuvchi)</option>
                    <option value="Omborchi">Omborchi (Omborchi)</option>
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Yangi parol (ixtiyoriy)</label>
                <div className="relative">
                  <input autoComplete="new-password" type={showEditPass ? "text" : "password"} value={editingAdmin.password} onChange={e => setEditingAdmin({...editingAdmin, password: e.target.value})} className="w-full px-4 py-3 pr-10 rounded-xl border border-gray-200 focus:ring-2 focus:ring-yellow-400 outline-none" placeholder="O'zgartirish uchun yozing..." minLength={6} maxLength={20} />
                  <button type="button" onClick={() => setShowEditPass(!showEditPass)} className="absolute inset-y-0 right-3 flex items-center text-gray-400">
                    {showEditPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {editingAdmin.lastPass && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Eski (Oxirgi) parol</label>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-gray-700">
                      {showLastPass ? editingAdmin.lastPass : "••••••••"}
                    </span>
                    <button type="button" onClick={() => setShowLastPass(!showLastPass)} className="text-gray-400 hover:text-gray-600 transition-colors">
                      {showLastPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}
              
              <div className="flex gap-3 mt-8 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 px-4 py-3 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium transition-colors">Bekor qilish</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors shadow-lg shadow-blue-500/20 flex justify-center items-center">
                  {isSubmitting ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div> : "O'zgarishlarni Saqlash"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && adminToDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} />
            </div>
            <h2 className="text-xl font-bold mb-2 text-gray-800">Xodimni o'chirish</h2>
            <p className="text-gray-500 mb-6">
              Rostdan ham <span className="font-semibold text-gray-900">{adminToDelete.name}</span> ni tizimdan butunlay o'chirib tashlamoqchimisiz?
            </p>
            
            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={() => setIsDeleteModalOpen(false)} 
                className="flex-1 px-4 py-3 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium transition-colors"
                disabled={isSubmitting}
              >
                Yo'q, qolsin
              </button>
              <button 
                type="button" 
                onClick={confirmDelete}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-colors shadow-lg shadow-red-500/20 flex justify-center items-center"
              >
                {isSubmitting ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div> : "Ha, o'chirilsin"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extreme Minimalist Member Card Modal */}
      {isCardModalOpen && cardAdmin && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="bg-white rounded-[1.5rem] w-full max-w-sm overflow-hidden shadow-2xl relative border border-zinc-200">
            <div className="p-8">
              <h2 className="text-2xl font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">Xodim Ma'lumotlari</h2>
              
              <div className="space-y-4">
                {/* Store Affiliation */}
                <div className="space-y-1.5 border border-dashed border-mustard/50 bg-yellow-50/50 p-3 rounded-xl mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center shrink-0">
                    <Store size={18} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Biriktirilgan Filial</label>
                    {getStoreName(cardAdmin.store_id)}
                  </div>
                </div>

                {/* Full Name Section */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">To'liq ismi</label>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <p className="font-medium text-slate-700">{cardAdmin.full_name}</p>
                  </div>
                </div>

                {/* Username Section */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center pl-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Login (username)</label>
                    <button 
                      onClick={() => copyToClipboard(cardAdmin.email.split('@')[0], 'username')}
                      className="text-slate-400 hover:text-slate-900 transition-colors"
                    >
                      {copiedId === 'username' ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex items-center">
                      <p className="font-medium text-slate-700">{cardAdmin.email.split('@')[0]}</p>
                    </div>
                    <div className="bg-slate-50 px-4 rounded-xl border border-slate-100 flex items-center text-slate-400 text-sm font-medium whitespace-nowrap">
                      @raketa.uz
                    </div>
                  </div>
                </div>

                {/* Role Section */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Vazifasi (Role)</label>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <p className="font-medium text-slate-700">{cardAdmin.role}</p>
                  </div>
                </div>

                {/* Password Section */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center pl-1">
                    <div className="flex items-center gap-2">
                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Parol</label>
                       <button onClick={() => setShowCardPass(!showCardPass)} className="text-slate-400 hover:text-slate-900 transition-colors">
                          {showCardPass ? <EyeOff size={12} /> : <Eye size={12} />}
                       </button>
                    </div>
                    <button 
                      onClick={() => copyToClipboard(cardAdmin.password_hint || '', 'password')}
                      className="text-slate-400 hover:text-slate-900 transition-colors"
                    >
                      {copiedId === 'password' ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                    </button>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <p className="font-mono text-lg font-bold text-slate-800 tracking-wider">
                      {showCardPass ? (cardAdmin.password_hint || "••••••••") : "••••••••"}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-10 flex gap-3">
                <button 
                  onClick={() => {
                    setIsCardModalOpen(false);
                    setShowCardPass(false);
                  }}
                  className="flex-1 py-3.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-all active:scale-[0.98]"
                >
                  Yopish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admins;
