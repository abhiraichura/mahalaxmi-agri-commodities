export interface Party {
  id: string;
  name: string;
  legalName: string;
  gstin: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  pan: string;
  type: 'buyer' | 'seller' | 'both';
  brokeragePercent: number;
  brokerageFixed: number;
  productIds: string[]; // NEW: products this party deals in
  createdAt: any;
  updatedAt: any;
}

export interface SpecField {
  id: string;
  label: string;
  value: string;
  unit: string;
  order: number;
}

export interface BrokerageConfig {
  type: 'percent' | 'fixed';
  value: number;
}

export interface ProductBrokerage {
  buyer: BrokerageConfig;
  seller: BrokerageConfig;
  // backward compat fields
  buyerPercent?: number;
  buyerFixed?: number;
  sellerPercent?: number;
  sellerFixed?: number;
}

export interface ProductSpec {
  id: string;
  name: string;
  specs: SpecField[];
  defaultBrokerage: number; // kept for backward compatibility
  brokerage: ProductBrokerage;
  createdAt: any;
}

export interface Contract {
  id: string;
  contractNo: string;
  year: number;
  financialYear: string; // NEW: e.g. "2025-2026"
  date: string;
  sellerId: string;
  seller: Party;
  buyerId: string;
  buyer: Party;
  productId: string;
  product: ProductSpec;
  quantity: number;
  quantityUnit: string;
  price: number;
  priceUnit: string;
  deliveryLocation: string;
  deliveryAddress: string;
  packing: string;
  loadingCondition: string;
  loadingDeadline: string; // NEW: date by which goods must be loaded
  paymentTerms: string;
  gstPercent: number;
  otherTerms: string;
  notes: string;
  status: 'draft' | 'confirmed' | 'cancelled' | 'completed';
  brokerageAmount: number;
  payments: Payment[]; // NEW: for ledger tracking
  createdAt: any;
  updatedAt: any;
}

export interface Payment {
  id: string;
  date: string;
  amount: number;
  mode: 'cash' | 'cheque' | 'bank_transfer' | 'upi' | 'other';
  reference: string;
  notes: string;
  createdAt: any;
}

export interface BrokerageBill {
  id: string;
  month: number;
  year: number;
  partyId: string;
  party: Party;
  contracts: Contract[];
  totalBrokerage: number;
  totalQuantity: number;
  generatedAt: any;
  status: 'pending' | 'sent' | 'paid';
}

export interface CompanySettings {
  name: string;
  legalName: string;
  gstin: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  logo: string | null;
  signature: string | null;
  letterhead: string | null; // NEW: letterhead image for print reference
  pan: string;
  bankName: string;
  bankAccount: string;
  bankIfsc: string;
  termsAndConditions: string[];
  defaultGstPercent: number;
  defaultPaymentTerms: string;
  defaultLoadingCondition: string;
  defaultPacking: string;
  financialYearStart: number;
  financialYears: string[]; // NEW: list of available years like ["2025-2026", "2026-2027"]
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: any;
  updatedAt: any;
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user';
}
