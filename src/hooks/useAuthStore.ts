import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Party, ProductSpec, Contract, CompanySettings, Note, BrokerageBill, BillPayment } from '../types';
import {
  addDoc, updateDocData, deleteDocData, getColData, subscribeCol,
  COLLECTIONS, db, Timestamp, setDocData
} from '../utils/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

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
  letterhead: null,
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
  financialYears: ['2024-2025', '2025-2026']
};

interface AppState {
  user: any;
  setUser: (user: any) => void;

  settings: CompanySettings;
  updateSettings: (settings: Partial<<CompanySettings>) => void;
  saveSettingsToFirebase: () => Promise<void>;
  loadSettingsFromFirebase: () => Promise<void>;

  parties: Party[];
  setParties: (parties: Party[]) => void;
  addParty: (party: Party) => Promise<void>;
  updateParty: (id: string, party: Partial<<Party>) => Promise<void>;
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
  updateContract: (id: string, contract: Partial<<Contract>) => Promise<void>;
  deleteContract: (id: string) => Promise<void>;
  loadContracts: () => Promise<void>;

  notes: Note[];
  setNotes: (notes: Note[]) => void;
  addNote: (note: Note) => Promise<void>;
  updateNote: (id: string, note: Partial<<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  loadNotes: () => Promise<void>;

  currentFinancialYear: string;
  setCurrentFinancialYear: (year: string) => void;

  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useAppStore = create<<AppState>()(
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
            const loaded = { ...defaultSettings, ...data[0] };
            if (!loaded.financialYears || loaded.financialYears.length === 0) {
              loaded.financialYears = defaultSettings.financialYears;
            }
            set({ settings: loaded });
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
          parties: get().parties.map(p => p.id === id ? { ...p, ...updates, updatedAt: Timestamp.now() } : p)
        });
      },
      deleteParty: async (id) => {
        await deleteDocData(COLLECTIONS.PARTIES, id);
        set({ parties: get().parties.filter(p => p.id !== id) });
      },
      loadParties: async () => {
        const data = await getColData(COLLECTIONS.PARTIES);
        const normalized = (data as Party[]).map(p => ({
          ...p,
          productIds: p.productIds || [],
          alternatePhones: p.alternatePhones || [],
          alternateEmails: p.alternateEmails || [],
          otherContacts: p.otherContacts || [],
          contactPerson: p.contactPerson || ''
        }));
        set({ parties: normalized });
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
        const normalized = (data as ProductSpec[]).map(p => ({
          ...p,
          qualities: p.qualities || [],
          specs: p.specs || []
        }));
        set({ products: normalized });
      },

      contracts: [],
      setContracts: (contracts) => set({ contracts }),
      addContract: async (contract) => {
        await addDoc(COLLECTIONS.CONTRACTS, contract.id, contract);
        set({ contracts: [contract, ...get().contracts] });
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
        const normalized = (data as Contract[]).map(c => ({
          ...c,
          financialYear: c.financialYear || `${c.year}-${c.year + 1}`,
          loadingDeadline: c.loadingDeadline || '',
          payments: c.payments || [],
          buyerBrokerageAmount: c.buyerBrokerageAmount || 0,
          sellerBrokerageAmount: c.sellerBrokerageAmount || 0,
          qualityId: c.qualityId || '',
          qualityName: c.qualityName || '',
          contractSpecs: c.contractSpecs || []
        }));
        set({ contracts: normalized });
      },

      notes: [],
      setNotes: (notes) => set({ notes }),
      addNote: async (note) => {
        await addDoc(COLLECTIONS.NOTES, note.id, note);
        set({ notes: [note, ...get().notes] });
      },
      updateNote: async (id, updates) => {
        await updateDocData(COLLECTIONS.NOTES, id, updates);
        set({
          notes: get().notes.map(n => n.id === id ? { ...n, ...updates, updatedAt: Timestamp.now() } : n)
        });
      },
      deleteNote: async (id) => {
        await deleteDocData(COLLECTIONS.NOTES, id);
        set({ notes: get().notes.filter(n => n.id !== id) });
      },
      loadNotes: async () => {
        const data = await getColData(COLLECTIONS.NOTES);
        set({ notes: data as Note[] });
      },

      currentFinancialYear: '2025-2026',
      setCurrentFinancialYear: (year) => set({ currentFinancialYear: year })
    }),
    {
      name: 'mahalaxmi-app-storage',
      partialize: (state) => ({
        settings: state.settings,
        currentFinancialYear: state.currentFinancialYear
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

export const useAuthStore = create<<AuthState>((set) => ({
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
