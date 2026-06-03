import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, CompanySettings, Party, ProductSpec } from '../types';

interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;

  settings: CompanySettings;
  updateSettings: (settings: Partial<CompanySettings>) => void;

  parties: Party[];
  setParties: (parties: Party[]) => void;
  addParty: (party: Party) => void;
  updateParty: (id: string, party: Partial<Party>) => void;
  deleteParty: (id: string) => void;

  products: ProductSpec[];
  setProducts: (products: ProductSpec[]) => void;
  addProduct: (product: ProductSpec) => void;
  updateProduct: (id: string, product: Partial<ProductSpec>) => void;
  deleteProduct: (id: string) => void;

  currentYear: number;
  setCurrentYear: (year: number) => void;
}

const defaultSettings: CompanySettings = {
  name: 'MAHALAXMI AGRI COMMODITIES',
  legalName: 'Mahalaxmi Agri Commodities',
  gstin: '24ACEPR5988A1ZH',
  address: 'Tower A - 118 New Marketing Yard, Rajkot Morbi Highway',
  city: 'Rajkot',
  state: 'Gujarat',
  pincode: '360001',
  phone: '90330 00032 / 98255 00032',
  email: 'mahalaxmiagricommodities@gmail.com',
  logo: null,
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
  financialYearStart: 2020
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      setUser: (user) => set({ user }),

      settings: defaultSettings,
      updateSettings: (newSettings) => set({ 
        settings: { ...get().settings, ...newSettings } 
      }),

      parties: [],
      setParties: (parties) => set({ parties }),
      addParty: (party) => set({ parties: [...get().parties, party] }),
      updateParty: (id, updates) => set({
        parties: get().parties.map(p => p.id === id ? { ...p, ...updates } : p)
      }),
      deleteParty: (id) => set({
        parties: get().parties.filter(p => p.id !== id)
      }),

      products: [],
      setProducts: (products) => set({ products }),
      addProduct: (product) => set({ products: [...get().products, product] }),
      updateProduct: (id, updates) => set({
        products: get().products.map(p => p.id === id ? { ...p, ...updates } : p)
      }),
      deleteProduct: (id) => set({
        products: get().products.filter(p => p.id !== id)
      }),

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

// Auth store with Firebase
import { onAuthChange, signInWithGoogle, logoutUser } from '../utils/firebase';

interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  signIn: async () => {
    try {
      const result = await signInWithGoogle();
      if (result.user) {
        set({
          user: {
            uid: result.user.uid,
            email: result.user.email || '',
            displayName: result.user.displayName || '',
            role: 'admin',
            createdAt: new Date()
          }
        });
      }
    } catch (error) {
      console.error('Sign in error:', error);
    }
  },
  logout: async () => {
    await logoutUser();
    set({ user: null });
  }
}));

// Initialize auth listener
onAuthChange((firebaseUser) => {
  if (firebaseUser) {
    useAuthStore.setState({
      user: {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || '',
        role: 'admin',
        createdAt: new Date()
      },
      loading: false
    });
  } else {
    useAuthStore.setState({ user: null, loading: false });
  }
});
