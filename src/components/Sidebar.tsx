import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Wallet, 
  PlusCircle, 
  Truck, 
  LogOut, 
  Users, 
  Database, 
  ListChecks, 
  Store,
  Smartphone,
  UserCog
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const { user, logout } = useAuth();

  let navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Tovar Savdosi', path: '/orders', icon: <PlusCircle size={20} /> },
    { name: 'Omborxona', path: '/inventory', icon: <Database size={20} /> },
    { name: 'Buyurtmalar', path: '/fulfillment', icon: <ListChecks size={20} /> },
    { name: 'Yetkazib Berish', path: '/logistics', icon: <Truck size={20} /> },
    { name: "Do'konlar", path: '/stores', icon: <Store size={20} /> },
    { name: "Ilova boshqaruvi", path: '/app-management', icon: <Smartphone size={20} /> },
    { name: "Xodimlar", path: '/employees', icon: <UserCog size={20} /> },
  ];

  if (user?.role === 'Omborchi' || user?.role === 'Sotuvchi') {
    navItems = navItems.filter(item => !['Dashboard', 'Ilova boshqaruvi', 'Xodimlar'].includes(item.name));
  }

  // Hide admin sections from Manager
  if (user?.role === 'Manager') {
    navItems = navItems.filter(item => !['Ilova boshqaruvi', 'Xodimlar'].includes(item.name));
  }

  // Dynamically render privileged sections ONLY for true Owners
  if (user?.role === 'Owner') {
    // Insert Finance right after Dashboard (index 1)
    navItems.splice(1, 0, { name: 'Finance', path: '/finance', icon: <Wallet size={20} /> });
    // Push Admins to the very bottom
    navItems.push({ name: 'Admins', path: '/admins', icon: <Users size={20} /> });
  }

  return (
    <aside className="w-64 bg-sidebarDark text-gray-300 flex flex-col h-screen fixed">
      <div className="p-6 flex items-center gap-3">
        {/* Uses the uploaded roketa-icon.png from public folder */}
        <img src="/roketa-icon.png" alt="Raketa CRM" className="w-20 h-20 object-contain -ml-2" />
        <span className="text-3xl font-bold text-white tracking-wide -ml-2">RAKETA</span>
      </div>
      
      <div className="px-6 py-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Main Menu</p>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-2 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive ? 'bg-mustard text-sidebarDark font-bold shadow-md' : 'hover:bg-gray-800 hover:text-white font-medium'
              }`
            }
          >
            {item.icon}
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <button onClick={logout} className="flex items-center gap-3 px-4 py-3 w-full text-left text-red-400 hover:bg-red-400/10 rounded-xl transition-all font-medium">
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
