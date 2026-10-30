// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore, useAppStore } from './hooks/useAuthStore';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ContractForm from './pages/ContractForm';
import ContractView from './pages/ContractView';
import Parties from './pages/Parties';
import PartyProfile from './pages/PartyProfile';
import PartyForm from './pages/PartyForm';
import ProductManager from './pages/ProductManager';
import Settings from './pages/Settings';
import Login from './pages/Login';
import LoadingScreen from './components/LoadingScreen';
import AllContracts from './pages/AllContracts';
import GulfFoodDirectory from './pages/GulfFoodDirectory';
import Messages from './pages/Messages';
import Money from './pages/Money';
import Planner from './pages/Planner';
import { ToHub } from './ui';
import NcdexAutomation from './pages/NcdexAutomation';
import RatesDesk from './pages/RatesDesk';
import { startBillSync } from './utils/billStore';

// notifications inside the app: a small frosted-glass pill under the top bar
const TOASTER = {
  position: 'top-center' as const,
  containerStyle: { top: 'calc(env(safe-area-inset-top) + 58px)' },
  toastOptions: {
    duration: 3500,
    style: {
      background: 'rgba(255,255,255,0.86)', backdropFilter: 'saturate(180%) blur(20px)', WebkitBackdropFilter: 'saturate(180%) blur(20px)',
      color: '#16161d', borderRadius: '18px', padding: '10px 16px', fontSize: '14px', fontWeight: 500, maxWidth: '92vw',
      boxShadow: '0 10px 34px rgba(20,20,40,0.16), 0 0 0 1px rgba(60,60,67,0.08)',
    },
    success: { iconTheme: { primary: '#12a150', secondary: '#fff' } },
    error: { iconTheme: { primary: '#d92d20', secondary: '#fff' }, duration: 5000 },
  },
};

function App() {
  const { user, loading } = useAuthStore();
  const { loadContracts, loadParties, loadProducts, loadSettingsFromFirebase, loadNotes } = useAppStore();

  useEffect(() => {
    if (user) {
      loadContracts();
      loadParties();
      loadProducts();
      loadSettingsFromFirebase();
      loadNotes();
    }
  }, [user]);

  // brokerage-bill payments / adjustments are kept in Firestore and shared live between devices
  useEffect(() => {
    if (!user) return;
    return startBillSync();
  }, [user]);

  // when the iPhone app (or a browser tab) comes back to the front, fetch what changed on the other device
  useEffect(() => {
    if (!user) return;
    let last = Date.now();
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || Date.now() - last < 30_000) return;
      last = Date.now();
      loadContracts();
      loadParties();
      loadProducts();
      loadNotes();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [user]);

  if (loading) return <LoadingScreen />;

  if (!user) {
    return (
      <>
        <Login />
        <Toaster {...TOASTER} />
      </>
    );
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/contracts" element={<AllContracts />} />
          <Route path="/contracts/new" element={<ContractForm />} />
          <Route path="/contracts/edit/:id" element={<ContractForm />} />
          <Route path="/contracts/:id" element={<ContractView />} />
          
          <Route path="/parties" element={<Parties />} />
          <Route path="/parties/directory" element={<Navigate to="/parties" replace />} />
          <Route path="/parties/new" element={<PartyForm />} />
          <Route path="/parties/edit/:id" element={<PartyForm />} />
          <Route path="/parties/gulfood" element={<GulfFoodDirectory />} />
          <Route path="/parties/:id" element={<PartyProfile />} />
          <Route path="/gulfood" element={<Navigate to="/parties/gulfood" replace />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/broadcast" element={<ToHub to="/messages" tab="broadcast" />} />

          <Route path="/products" element={<ProductManager />} />
          <Route path="/message-generator" element={<ToHub to="/messages" tab="rate" />} />
          <Route path="/party-message" element={<ToHub to="/messages" tab="party" />} />
          <Route path="/custom-message" element={<ToHub to="/messages" tab="custom" />} />
          <Route path="/ncdex-automation" element={<NcdexAutomation />} />
          <Route path="/rates" element={<RatesDesk />} />
          <Route path="/money" element={<Money />} />
          <Route path="/brokerage" element={<ToHub to="/money" tab="bills" />} />
          <Route path="/ledger" element={<ToHub to="/money" tab="ledger" />} />
          <Route path="/planner" element={<Planner />} />
          <Route path="/notes" element={<ToHub to="/planner" tab="notes" />} />
          <Route path="/todos" element={<ToHub to="/planner" tab="tasks" />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
      <Toaster {...TOASTER} />
    </BrowserRouter>
  );
}

export default App;
