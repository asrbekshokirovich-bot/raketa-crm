import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Admins from './pages/Admins';
import ProductListings from './pages/ProductListings';
import Inventory from './pages/Inventory';
import Fulfillment from './pages/Fulfillment';
import Logistics from './pages/Logistics';

// New Pages
import Stores from './pages/Stores';
import AppManagement from './pages/AppManagement';
import Employees from './pages/Employees';

const Finance = () => <div className="p-8"><h1 className="text-2xl font-bold mb-4">Finance Portal</h1><p className="text-gray-600">Owner-only access module for tracking revenue and expenses.</p></div>;

const ProtectedRoute = ({ children, requireOwner = false }: { children: React.ReactNode, requireOwner?: boolean }) => {
  const { user } = useAuth();
  
  if (!user) return <Navigate to="/login" />;
  if (requireOwner && user.role !== 'Owner') return <Navigate to="/" />;
  
  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        
        {/* Core Sections */}
        <Route path="inventory" element={<Inventory />} />
        <Route path="fulfillment" element={<Fulfillment />} />
        <Route path="orders" element={<ProductListings />} />
        <Route path="logistics" element={<Logistics />} />
        
        {/* New Added Modules */}
        <Route path="stores" element={<Stores />} />
        
        <Route path="app-management" element={
          <ProtectedRoute requireOwner={true}>
            <AppManagement />
          </ProtectedRoute>
        } />
        
        <Route path="employees" element={
          <ProtectedRoute requireOwner={true}>
            <Employees />
          </ProtectedRoute>
        } />
        
        {/* Protected Finance Route */}
        <Route path="finance" element={
          <ProtectedRoute requireOwner={true}>
            <Finance />
          </ProtectedRoute>
        } />
        
        {/* Protected Admins Route */}
        <Route path="admins" element={
          <ProtectedRoute requireOwner={true}>
            <Admins />
          </ProtectedRoute>
        } />
      </Route>
      <Route path="/login" element={<Login />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
