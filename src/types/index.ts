export interface SpecField {
  id: string;
  label: string;
  value: string;
  unit?: string;
  order?: number;
}

export interface ProductSpec {
  id: string;
  name: string;
  specs: SpecField[];
  defaultBrokerage: number;
  buyerBrokerageType?: 'percent' | 'fixed';
  sellerBrokerageType?: 'percent' | 'fixed';
  buyerBrokeragePercent?: number;
  sellerBrokeragePercent?: number;
  buyerBrokerageFixed?: number;
  sellerBrokerageFixed?: number;
  createdAt: any;
  updatedAt?: any;
}

export interface Party {
  id: string;
  name: string;
  legalName: string;
  gstin?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email?: string;
  pan?: string;
  type?: 'buyer' | 'seller' | 'both';
  contactPerson?: string;
  altPhone?: string;
  altEmail?: string;
  remarks?: string;
  notes?: string;
  bankName?: string;
  bankAccount?: string;
  bankIfsc?: string;
  brokeragePercent?: number;
  brokerageFixed?: number;
  productIds?: string[];
  createdAt: any;
  updatedAt?: any;
}

export interface Contract {
  id: string;
  contractNo: string;
  year: number;
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
  paymentTerms: string;
  gstPercent: number;
  otherTerms: string;
  notes: string;
  status: 'active' | 'completed' | 'cancelled';
  brokerageAmount: number;
  buyerBrokeragePercent?: number;
  sellerBrokeragePercent?: number;
  buyerBrokerageFixed?: number;
  sellerBrokerageFixed?: number;
  totalBrokerageAmount?: number;
  loadingDeadline?: string;
  createdAt: any;
  updatedAt?: any;
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
  nextContractNumber?: number;
  financialYears?: string[];
}

export interface BusinessNote {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: any;
  updatedAt?: any;
}

export interface LedgerEntry {
  id: string;
  partyId: string;
  date: string;
  type: 'contract' | 'payment_received' | 'payment_made' | 'adjustment';
  description: string;
  contractId?: string;
  debit: number;
  credit: number;
  balance: number;
  createdAt: any;
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user';
}
