import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './hooks/useAuthStore';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ContractList from './pages/ContractList';
import ContractForm from './pages/ContractForm';
import ContractView from './pages/ContractView';
import ProductList from './pages/ProductList';
import ProductForm from './pages/ProductForm';
import PartyDirectory from './pages/PartyDirectory';
import PartyForm from './pages/PartyForm';
import SettingsPage from './pages/SettingsPage';
import BrokerageBills from './pages/BrokerageBills';
import BillDetail from './pages/BillDetail';
import PartyLedger from './pages/PartyLedger';
import NotesPage from './pages/NotesPage';
import GulfFoodDirectory from './pages/GulfFoodDirectory';

function App() {
  const { user, loading, loadParties, loadProducts, loadContracts, loadSettings, loadNotes, loadBrokerageBills } = useAuthStore();

  useEffect(() => {
    if (user) {
      loadParties();
      loadProducts();
      loadContracts();
      loadSettings();
      loadNotes();
      loadBrokerageBills();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/contracts" element={<ContractList />} />
        <Route path="/contracts/new" element={<ContractForm />} />
        <Route path="/contracts/edit/:id" element={<ContractForm />} />
        <Route path="/contracts/:id" element={<ContractView />} />
        <Route path="/products" element={<ProductList />} />
        <Route path="/products/new" element={<ProductForm />} />
        <Route path="/products/edit/:id" element={<ProductForm />} />
        <Route path="/parties" element={<PartyDirectory />} />
        <Route path="/parties/new" element={<PartyForm />} />
        <Route path="/parties/edit/:id" element={<PartyForm />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/brokerage-bills" element={<BrokerageBills />} />
        <Route path="/brokerage-bills/:id" element={<BillDetail />} />
        <Route path="/party-ledger" element={<PartyLedger />} />
        <Route path="/notes" element={<NotesPage />} />
        <Route path="/gulf-food-directory" element={<GulfFoodDirectory />} />
      </Route>
    </Routes>
  );
}

export default App;
