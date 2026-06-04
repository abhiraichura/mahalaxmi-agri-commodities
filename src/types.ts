export interface Party {
  id: string;
  legalName: string;
  name?: string;
  gstin?: string;
  address: string;
  city: string;
  state: string;
  pincode?: string;
  phone?: string;
  email?: string;
  products?: string[];
  createdAt?: any;
  updatedAt?: any;
}

export interface ProductSpec {
  id: string;
  name: string;
  specs?: { label: string; value: string; unit?: string }[];
  createdAt?: any;
}

export interface Contract {
  id: string;
  contractNo: string;
  date: string;
  financialYear: string;
  status: 'active' | 'completed' | 'cancelled';
  seller: Party;
  buyer: Party;
  product: ProductSpec;
  quantity: number;
  quantityUnit: string;
  price: number;
  priceUnit: string;
  deliveryLocation: string;
  deliveryAddress: string;
  packing: string;
  loadingCondition: string;
  loadingDeadline?: string;
  paymentTerms: string;
  gstPercent: number;
  otherTerms?: string;
  brokerageAmount?: number;
  brokeragePercent?: number;
  totalValue?: number;
  createdAt?: any;
  updatedAt?: any;
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

export interface BrokerageBill {
  id: string;
  month: number;
  year: number;
  party: Party;
  contracts: Contract[];
  totalQuantity: number;
  totalBrokerage: number;
  status: 'pending' | 'paid';
  createdAt?: any;
}

export interface LedgerEntry {
  id: string;
  partyId: string;
  date: string;
  type: 'contract' | 'payment' | 'adjustment';
  description: string;
  contractId?: string;
  debit: number;
  credit: number;
  balance: number;
  financialYear: string;
  createdAt?: any;
}
