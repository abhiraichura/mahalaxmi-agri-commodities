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
  /** edits made on the Contract Note review screen (flat field key -> text); see src/contractNote/mapping.ts */
  noteOverrides?: Record<string, string>;
  /** brokerage rate for THIS contract (starts as the product's default, can be changed per contract) */
  brokerage?: { buyer: BrokerageConfig; seller: BrokerageConfig };
  payments: Payment[];
  /** loading time in days, counted from the contract date (drives the loading reminders) */
  loadingDays?: number | null;
  /** payment is due this many days after loading (min to max; max empty = same as min) */
  paymentDaysMin?: number | null;
  paymentDaysMax?: number | null;
  /** the day the goods were really loaded (YYYY-MM-DD), set by the owner */
  loadedOn?: string | null;
  /** the day the payment was confirmed (YYYY-MM-DD), set by the owner */
  paymentReceivedOn?: string | null;
  /** "the buyer said Friday": silences that part of the reminders until that day */
  snooze?: { kind: 'loading' | 'payment'; until: string; note?: string } | null;
  /** true = no reminders for this contract */
  remindersOff?: boolean;
  /** the contract's diary: what happened and when */
  timeline?: TimelineEvent[];
  createdAt: any;
  updatedAt: any;
}

export interface TimelineEvent {
  id: string;
  /** the day it is about (YYYY-MM-DD) */
  date: string;
  /** when it was written down (milliseconds) */
  at: number;
  type: 'loaded' | 'not_loaded' | 'paid' | 'not_paid' | 'undo' | 'note';
  text: string;
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
  /** used on brokerage bills / invoices (all optional) */
  bankBranch?: string;
  bankAccountName?: string;
  invoiceStartNumber?: number;
  jurisdiction?: string;
  brokerageGstPercent?: number;
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
