import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Admins from './pages/Admins';
import ProductListings from './pages/ProductListings';
import Inventory from './pages/Inventory';
import Fulfillment from './pages/Fulfillment';
import Logistics from './pages/Logistics';
import Stores from './pages/Stores';
import AppManagement from './pages/AppManagement';
import { NotificationProvider } from './context/NotificationContext';

const Finance = () => <div className="p-8"><h1 className="text-2xl font-bold mb-4">Finance Portal</h1><p className="text-gray-600">Owner-only access module for tracking revenue and expenses.</p></div>;

const ProtectedRoute = ({ children, requireOwner = false }: { children: React.ReactNode, requireOwner?: boolean }) => {
  const { user } = useAuth();
  
  if (!user) return <Navigate to="/login" replace />;
  if (requireOwner && user.role !== 'Owner') return <Navigate to="/" replace />;
  
  return children;
};

const Home = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  
  if (user.role === 'Omborchi') return <Navigate to="/inventory" replace />;
  if (user.role === 'Sotuvchi') return <Navigate to="/orders" replace />;
  if (user.role === 'Manager') return <Navigate to="/stores" replace />;
  
  return <Dashboard />;
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <ProtectedRoute><Layout /></ProtectedRoute>,
    children: [
      { index: true, element: <Home /> },
      { path: "inventory", element: <Inventory /> },
      { path: "fulfillment", element: <Fulfillment /> },
      { path: "orders", element: <ProductListings /> },
      { path: "logistics", element: <Logistics /> },
      { path: "stores", element: <Stores /> },
      { 
        path: "app-management", 
        element: (
          <ProtectedRoute requireOwner={true}>
            <AppManagement />
          </ProtectedRoute>
        ) 
      },
      { 
        path: "finance", 
        element: (
          <ProtectedRoute requireOwner={true}>
            <Finance />
          </ProtectedRoute>
        ) 
      },
      { 
        path: "admins", 
        element: (
          <ProtectedRoute requireOwner={true}>
            <Admins />
          </ProtectedRoute>
        ) 
      },
    ]
  },
  { path: "/login", element: <Login /> }
]);

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <RouterProvider router={router} />
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
