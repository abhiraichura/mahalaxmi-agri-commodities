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
          <Route path="/" element={<Dashboard />} />
          <Route path="/contract/new" element={<ContractForm />} />
          <Route path="/contract/:id" element={<ContractView />} />
          <Route path="/contract/:id/edit" element={<ContractForm />} />
          <Route path="/parties" element={<PartyDirectory />} />
          <Route path="/party/new" element={<PartyForm />} />
          <Route path="/party/:id/edit" element={<PartyForm />} />
          <Route path="/products" element={<ProductManager />} />
          <Route path="/brokerage" element={<BrokerageBills />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
      <Toaster position="top-right" />
    </BrowserRouter>
  );
}

export default App;
