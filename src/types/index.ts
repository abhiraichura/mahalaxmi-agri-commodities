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
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductSpec {
  id: string;
  name: string;
  specs: SpecField[];
  defaultBrokerage: number;
  createdAt: Date;
}

export interface SpecField {
  id: string;
  label: string;
  value: string;
  unit: string;
  order: number;
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
  status: 'draft' | 'confirmed' | 'cancelled' | 'completed';
  type: 'buyer_copy' | 'seller_copy' | 'broker_copy';
  brokerageAmount: number;
  createdAt: Date;
  updatedAt: Date;
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
  generatedAt: Date;
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
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user';
  createdAt: Date;
}

export interface GSTVerificationResponse {
  valid: boolean;
  gstin: string;
  legalName: string;
  tradeName: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  status: string;
  constitution: string;
  registrationDate: string;
  error?: string;
}
