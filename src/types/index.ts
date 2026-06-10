// src/types/index.ts
export interface ContactPerson {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
}

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
  productIds: string[];
  contactPerson: string;
  alternatePhones: string[];
  alternateEmails: string[];
  otherContacts: ContactPerson[];
  notes?: string;
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

export interface Quality {
  id: string;
  name: string;
  specs: SpecField[];
}

export interface BrokerageConfig {
  type: 'percent' | 'fixed';
  value: number;
}

export interface ProductBrokerage {
  buyer: BrokerageConfig;
  seller: BrokerageConfig;
  buyerPercent?: number;
  buyerFixed?: number;
  sellerPercent?: number;
  sellerFixed?: number;
}

export interface ProductSpec {
  id: string;
  name: string;
  qualities: Quality[];
  specs: SpecField[];
  defaultBrokerage: number;
  brokerage: ProductBrokerage;
  createdAt: any;
}

export interface Contract {
  id: string;
  contractNo: string;
  year: number;
  financialYear: string;
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
  loadingDeadline: string;
  paymentTerms: string;
  gstPercent: number;
  otherTerms: string;
  notes: string;
  status: 'draft' | 'confirmed' | 'cancelled' | 'completed';
  brokerageAmount: number;
  buyerBrokerageAmount: number;
  sellerBrokerageAmount: number;
  qualityId?: string;
  qualityName?: string;
  contractSpecs?: SpecField[];
  payments: Payment[];
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

export interface BillPayment {
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
  status: 'pending' | 'paid' | 'partial';
  payments: BillPayment[];
  paidAmount: number;
  balanceAmount: number;
  billType: 'buyer' | 'seller';
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
  letterhead: string | null;
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
  financialYears: string[];
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
