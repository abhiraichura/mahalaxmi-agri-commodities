import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './hooks/useAuthStore';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ContractForm from './pages/ContractForm';
import ContractView from './pages/ContractView';
import PartyDirectory from './pages/PartyDirectory';
import PartyForm from './pages/PartyForm';
import ProductManager from './pages/ProductManager';
import BrokerageBills from './pages/BrokerageBills';
import Settings from './pages/Settings';
import Login from './pages/Login';
import LoadingScreen from './components/LoadingScreen';
import Notes from './pages/Notes';
import PartyLedger from './pages/PartyLedger';

function App() {
  const { user, loading } = useAuthStore();

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
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/contracts" element={<Dashboard />} />
          <Route path="/contracts/new" element={<ContractForm />} />
          <Route path="/contracts/edit/:id" element={<ContractForm />} />
          <Route path="/contracts/:id" element={<ContractView />} />
          <Route path="/parties" element={<PartyDirectory />} />
          <Route path="/parties/new" element={<PartyForm />} />
          <Route path="/parties/edit/:id" element={<PartyForm />} />
          <Route path="/ledger/:partyId" element={<PartyLedger />} />
          <Route path="/products" element={<ProductManager />} />
          <Route path="/bills" element={<BrokerageBills />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
      <Toaster position="top-right" />
    </BrowserRouter>
  );
}

export default App;
