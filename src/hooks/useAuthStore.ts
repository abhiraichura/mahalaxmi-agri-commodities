import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Party, ProductSpec, Contract, CompanySettings, Note, User } from '../types';

interface AppState {
  user: User | null;
  parties: Party[];
  products: ProductSpec[];
  contracts: Contract[];
  settings: CompanySettings | null;
  notes: Note[];
  gulfFoodParties: Party[];

  // Auth
  setUser: (user: User | null) => void;

  // Parties
  addParty: (party: Party) => Promise<void>;
  updateParty: (id: string, party: Partial<Party>) => Promise<void>;
  deleteParty: (id: string) => Promise<void>;

  // Products
  addProduct: (product: ProductSpec) => Promise<void>;
  updateProduct: (id: string, product: Partial<ProductSpec>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;

  // Contracts
  addContract: (contract: Contract) => Promise<void>;
  updateContract: (id: string, contract: Partial<Contract>) => Promise<void>;
  deleteContract: (id: string) => Promise<void>;

  // Settings
  updateSettings: (settings: Partial<CompanySettings>) => Promise<void>;

  // Notes
  addNote: (note: Note) => Promise<void>;
  updateNote: (id: string, note: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;

  // Gulf Food Parties
  addGulfFoodParty: (party: Party) => Promise<void>;
  updateGulfFoodParty: (id: string, party: Partial<Party>) => Promise<void>;
  deleteGulfFoodParty: (id: string) => Promise<void>;
}

// Helper to sort parties alphabetically by legalName
const sortPartiesAlphabetically = (parties: Party[]): Party[] => {
  return [...parties].sort((a, b) => 
    a.legalName.toLowerCase().localeCompare(b.legalName.toLowerCase())
  );
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      parties: [],
      products: [],
      contracts: [],
      settings: null,
      notes: [],
      gulfFoodParties: [],

      setUser: (user) => set({ user }),

      addParty: async (party) => {
        const current = get().parties;
        const updated = sortPartiesAlphabetically([...current, party]);
        set({ parties: updated });
      },

      updateParty: async (id, party) => {
        const current = get().parties;
        const updated = current.map(p => p.id === id ? { ...p, ...party } : p);
        set({ parties: sortPartiesAlphabetically(updated) });
      },

      deleteParty: async (id) => {
        const current = get().parties;
        set({ parties: sortPartiesAlphabetically(current.filter(p => p.id !== id)) });
      },

      addProduct: async (product) => {
        const current = get().products;
        set({ products: [...current, product] });
      },

      updateProduct: async (id, product) => {
        const current = get().products;
        set({ products: current.map(p => p.id === id ? { ...p, ...product } : p) });
      },

      deleteProduct: async (id) => {
        const current = get().products;
        set({ products: current.filter(p => p.id !== id) });
      },

      addContract: async (contract) => {
        const current = get().contracts;
        set({ contracts: [...current, contract] });
      },

      updateContract: async (id, contract) => {
        const current = get().contracts;
        set({ contracts: current.map(c => c.id === id ? { ...c, ...contract } : c) });
      },

      deleteContract: async (id) => {
        const current = get().contracts;
        set({ contracts: current.filter(c => c.id !== id) });
      },

      updateSettings: async (settings) => {
        const current = get().settings;
        set({ settings: { ...current, ...settings } as CompanySettings });
      },

      addNote: async (note) => {
        const current = get().notes;
        set({ notes: [...current, note] });
      },

      updateNote: async (id, note) => {
        const current = get().notes;
        set({ notes: current.map(n => n.id === id ? { ...n, ...note } : n) });
      },

      deleteNote: async (id) => {
        const current = get().notes;
        set({ notes: current.filter(n => n.id !== id) });
      },

      addGulfFoodParty: async (party) => {
        const current = get().gulfFoodParties;
        const updated = sortPartiesAlphabetically([...current, party]);
        set({ gulfFoodParties: updated });
      },

      updateGulfFoodParty: async (id, party) => {
        const current = get().gulfFoodParties;
        const updated = current.map(p => p.id === id ? { ...p, ...party } : p);
        set({ gulfFoodParties: sortPartiesAlphabetically(updated) });
      },

      deleteGulfFoodParty: async (id) => {
        const current = get().gulfFoodParties;
        set({ gulfFoodParties: sortPartiesAlphabetically(current.filter(p => p.id !== id)) });
      },
    }),
    {
      name: 'mahalaxmi-app-storage',
      partialize: (state) => ({
        parties: state.parties,
        products: state.products,
        contracts: state.contracts,
        settings: state.settings,
        notes: state.notes,
        gulfFoodParties: state.gulfFoodParties,
      }),
    }
  )
);
