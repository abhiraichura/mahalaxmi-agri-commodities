import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Party, ProductSpec, Contract, CompanySettings } from '../types';
import { 
  addDoc, updateDocData, deleteDocData, getColData,
  COLLECTIONS, db, setDocData
} from '../utils/firebase';

const defaultSettings: CompanySettings = {
  name: 'MAHALAXMI AGRI COMMODITIES',
  legalName: 'Mahalaxmi Agri Commodities',
  gstin: '24ACEPR5988A1ZH',
  address: 'Tower A - 118 New Marketing Yard, Rajkot Morbi Highway, Bedi',
  city: 'Rajkot',
  state: 'Gujarat',
  pincode: '360001',
  phone: '90330 00032 / 98255 00032',
  email: 'mahalaxmiagricommodities@gmail.com',
  logo: null,
  signature: null,
  pan: 'ACEPR5988A',
  bankName: '',
  bankAccount: '',
  bankIfsc: '',
  termsAndConditions: [
    'Goods to be loaded within stipulated time as per contract.',
    'After dispatching of goods, intimation must be given to us.',
    'If any bargain cancelled due to time limit, loading condition or Govt. restriction, our brokerage will be charged as usual.',
    'This contract is subject to responsibility of both parties and effected as a broker of both parties without any liabilities.',
    'We have full power to settle all claims amicably which will bind both buyer and seller equally.'
  ],
  defaultGstPercent: 5,
  defaultPaymentTerms: '3 to 4 days payment with 1% discount after delivery',
  defaultLoadingCondition: 'Goods to be loaded within one week',
  defaultPacking: '40 KG Plain P.P. Nett Packing with Double Stitching',
  financialYearStart: 2020,
  nextContractNumber: 1
};

interface AppState {
  user: any;
  setUser: (user: any) => void;

  settings: CompanySettings;
  updateSettings: (settings: Partial<CompanySettings>) => void;
  saveSettingsToFirebase: () => Promise<void>;
  loadSettingsFromFirebase: () => Promise<void>;

  parties: Party[];
  setParties: (parties: Party[]) => void;
  addParty: (party: Party) => Promise<void>;
  updateParty: (id: string, party: Partial<Party>) => Promise<void>;
  deleteParty: (id: string) => Promise<void>;
  loadParties: () => Promise<void>;

  products: ProductSpec[];
  setProducts: (products: ProductSpec[]) => void;
  addProduct: (product: ProductSpec) => Promise<void>;
  updateProduct: (id: string, product: Partial<ProductSpec>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  loadProducts: () => Promise<void>;

  contracts: Contract[];
  setContracts: (contracts: Contract[]) => void;
  addContract: (contract: Contract) => Promise<void>;
  updateContract: (id: string, contract: Partial<Contract>) => Promise<void>;
  deleteContract: (id: string) => Promise<void>;
  loadContracts: () => Promise<void>;

  currentYear: number;
  setCurrentYear: (year: number) => void;

  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      setUser: (user) => set({ user }),

      loading: true,
      setLoading: (loading) => set({ loading }),

      settings: defaultSettings,
      updateSettings: (newSettings) => set({ 
        settings: { ...get().settings, ...newSettings } 
      }),
      saveSettingsToFirebase: async () => {
        try {
          await setDocData(COLLECTIONS.SETTINGS, 'main', get().settings);
        } catch (e) { console.error(e); }
      },
      loadSettingsFromFirebase: async () => {
        try {
          const data = await getColData(COLLECTIONS.SETTINGS);
          if (data && data.length > 0) {
            set({ settings: { ...defaultSettings, ...data[0] } });
          }
        } catch (e) { console.error(e); }
      },

      parties: [],
      setParties: (parties) => set({ parties }),
      addParty: async (party) => {
        await addDoc(COLLECTIONS.PARTIES, party.id, party);
        set({ parties: [...get().parties, party] });
      },
      updateParty: async (id, updates) => {
        await updateDocData(COLLECTIONS.PARTIES, id, updates);
        set({
          parties: get().parties.map(p => p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p)
        });
      },
      deleteParty: async (id) => {
        await deleteDocData(COLLECTIONS.PARTIES, id);
        set({ parties: get().parties.filter(p => p.id !== id) });
      },
      loadParties: async () => {
        const data = await getColData(COLLECTIONS.PARTIES);
        set({ parties: data as Party[] });
      },

      products: [],
      setProducts: (products) => set({ products }),
      addProduct: async (product) => {
        await addDoc(COLLECTIONS.PRODUCTS, product.id, product);
        set({ products: [...get().products, product] });
      },
      updateProduct: async (id, updates) => {
        await updateDocData(COLLECTIONS.PRODUCTS, id, updates);
        set({
          products: get().products.map(p => p.id === id ? { ...p, ...updates } : p)
        });
      },
      deleteProduct: async (id) => {
        await deleteDocData(COLLECTIONS.PRODUCTS, id);
        set({ products: get().products.filter(p => p.id !== id) });
      },
      loadProducts: async () => {
        const data = await getColData(COLLECTIONS.PRODUCTS);
        set({ products: data as ProductSpec[] });
      },

      contracts: [],
      setContracts: (contracts) => set({ contracts }),
      addContract: async (contract) => {
        await addDoc(COLLECTIONS.CONTRACTS, contract.id, contract);
        set({ contracts: [contract, ...get().contracts] });
        const nextNum = (get().settings.nextContractNumber || 1) + 1;
        set({ settings: { ...get().settings, nextContractNumber: nextNum } });
      },
      updateContract: async (id, updates) => {
        await updateDocData(COLLECTIONS.CONTRACTS, id, updates);
        set({
          contracts: get().contracts.map(c => c.id === id ? { ...c, ...updates } : c)
        });
      },
      deleteContract: async (id) => {
        await deleteDocData(COLLECTIONS.CONTRACTS, id);
        set({ contracts: get().contracts.filter(c => c.id !== id) });
      },
      loadContracts: async () => {
        const data = await getColData(COLLECTIONS.CONTRACTS);
        set({ contracts: data as Contract[] });
      },

      currentYear: new Date().getFullYear(),
      setCurrentYear: (year) => set({ currentYear: year })
    }),
    {
      name: 'mahalaxmi-app-storage',
      partialize: (state) => ({ 
        settings: state.settings, 
        currentYear: state.currentYear 
      })
    }
  )
);

// Auth store
import { loginUser, logoutUser, onAuthChange } from '../utils/firebase';

interface AuthState {
  user: any;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  signIn: async (email, password) => {
    const result = await loginUser(email, password);
    if (result.user) {
      set({ user: { uid: result.user.uid, email: result.user.email }, loading: false });
    }
  },
  logout: async () => {
    await logoutUser();
    set({ user: null });
  }
}));

onAuthChange((firebaseUser: any) => {
  useAuthStore.setState({ 
    user: firebaseUser ? { uid: firebaseUser.uid, email: firebaseUser.email } : null, 
    loading: false 
  });
});
