import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore, useAppStore } from './hooks/useAuthStore';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ContractForm from './pages/ContractForm';
import ContractView from './pages/ContractView';
import Parties from './pages/Parties';
import PartyDirectory from './pages/PartyDirectory';
import PartyForm from './pages/PartyForm';
import ProductManager from './pages/ProductManager';
import BrokerageBills from './pages/BrokerageBills';
import Settings from './pages/Settings';
import Login from './pages/Login';
import LoadingScreen from './components/LoadingScreen';
import Notes from './pages/Notes';
import PartyLedger from './pages/PartyLedger';
import AllContracts from './pages/AllContracts';
import GulfFoodDirectory from './pages/GulfFoodDirectory';
import MessageGenerator from './pages/MessageGenerator';

function App() {
  const { user, loading } = useAuthStore();
  const { loadContracts, loadParties, loadProducts, loadSettingsFromFirebase, loadNotes } = useAppStore();

  // Load all data globally once user is logged in
  useEffect(() => {
    if (user) {
      loadContracts();
      loadParties();
      loadProducts();
      loadSettingsFromFirebase();
      loadNotes();
    }
  }, [user]);

  if (loading) return <LoadingScreen />;

  if (!user) {
    return (
      <>
        <Login />
        <Toaster position="top-right" />
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
          
          {/* Parties & Directories Routing */}
          <Route path="/parties" element={<Parties />} />
          <Route path="/parties/directory" element={<PartyDirectory />} />
          <Route path="/parties/new" element={<PartyForm />} />
          <Route path="/parties/edit/:id" element={<PartyForm />} />
          <Route path="/parties/gulfood" element={<GulfFoodDirectory />} />
          <Route path="/gulfood" element={<Navigate to="/parties/gulfood" replace />} />

          <Route path="/products" element={<ProductManager />} />
          <Route path="/message-generator" element={<MessageGenerator />} />
          <Route path="/brokerage" element={<BrokerageBills />} />
          <Route path="/ledger" element={<PartyLedger />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
      <Toaster position="top-right" />
    </BrowserRouter>
  );
}

export default App;
