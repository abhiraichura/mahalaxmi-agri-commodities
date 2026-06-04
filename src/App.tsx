import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AllContracts from './pages/AllContracts';
import ContractForm from './pages/ContractForm';
import ContractView from './pages/ContractView';
import PartyDirectory from './pages/PartyDirectory';
import PartyForm from './pages/PartyForm';
import ProductManager from './pages/ProductManager';
import BrokerageBills from './pages/BrokerageBills';
import Settings from './pages/Settings';
import { useAuthStore } from './hooks/useAuthStore';
import { useEffect } from 'react';
import { useAppStore } from './hooks/useAuthStore';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}

function AppInitializer({ children }: { children: React.ReactNode }) {
  const { loadSettingsFromFirebase, loadParties, loadProducts, loadContracts } = useAppStore();

  useEffect(() => {
    loadSettingsFromFirebase();
    loadParties();
    loadProducts();
    loadContracts();
  }, []);

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInitializer>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/contracts" element={<ProtectedRoute><Layout><AllContracts /></Layout></ProtectedRoute>} />
          <Route path="/contract/new" element={<ProtectedRoute><Layout><ContractForm /></Layout></ProtectedRoute>} />
          <Route path="/contract/:id" element={<ProtectedRoute><Layout><ContractView /></Layout></ProtectedRoute>} />
          <Route path="/contract/:id/edit" element={<ProtectedRoute><Layout><ContractForm /></Layout></ProtectedRoute>} />
          <Route path="/parties" element={<ProtectedRoute><Layout><PartyDirectory /></Layout></ProtectedRoute>} />
          <Route path="/party/new" element={<ProtectedRoute><Layout><PartyForm /></Layout></ProtectedRoute>} />
          <Route path="/party/:id/edit" element={<ProtectedRoute><Layout><PartyForm /></Layout></ProtectedRoute>} />
          <Route path="/products" element={<ProtectedRoute><Layout><ProductManager /></Layout></ProtectedRoute>} />
          <Route path="/brokerage" element={<ProtectedRoute><Layout><BrokerageBills /></Layout></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
        </Routes>
      </AppInitializer>
    </BrowserRouter>
  );
}
