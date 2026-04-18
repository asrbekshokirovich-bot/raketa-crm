import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import NotificationHistory from './NotificationHistory';

const Layout = () => {
  return (
    <div className="flex min-h-screen bg-bgSubtle">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col">
        <Navbar />
        <main className="flex-1 p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
      <NotificationHistory />
    </div>
  );
};

export default Layout;
