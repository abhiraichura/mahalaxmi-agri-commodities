import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './hooks/useAuthStore';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import AllContracts from './pages/AllContracts';
import ContractForm from './pages/ContractForm';
import ContractView from './pages/ContractView';
import PartyDirectory from './pages/PartyDirectory';
import PartyForm from './pages/PartyForm';
import ProductManager from './pages/ProductManager';
import BrokerageBills from './pages/BrokerageBills';
import PartyLedger from './pages/PartyLedger';
import Notes from './pages/Notes';
import Settings from './pages/Settings';
import Login from './pages/Login';

function App() {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
          <Route path="/parties" element={<PartyDirectory />} />
          <Route path="/parties/new" element={<PartyForm />} />
          <Route path="/parties/edit/:id" element={<PartyForm />} />
          <Route path="/products" element={<ProductManager />} />
          <Route path="/bills" element={<BrokerageBills />} />
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
