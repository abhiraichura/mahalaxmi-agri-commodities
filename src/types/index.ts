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
  // Product-specific brokerage (moved from party)
  buyerBrokerageType: 'percent' | 'flat';
  sellerBrokerageType: 'percent' | 'flat';
  buyerBrokeragePercent: number;
  sellerBrokeragePercent: number;
  buyerBrokerageFixed: number;
  sellerBrokerageFixed: number;
  createdAt: Date;
  updatedAt: Date;
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
  // Private fields (not shown on contract)
  contactPerson: string;
  altPhone: string;
  altEmail: string;
  remarks: string;
  notes: string;
  bankName: string;
  bankAccount: string;
  bankIfsc: string;
  createdAt: Date;
  updatedAt: Date;
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
  status: 'confirmed' | 'cancelled';
  // Separate brokerage for buyer and seller (copied from product)
  buyerBrokeragePercent: number;
  sellerBrokeragePercent: number;
  buyerBrokerageFixed: number;
  sellerBrokerageFixed: number;
  buyerBrokerageAmount: number;
  sellerBrokerageAmount: number;
  totalBrokerageAmount: number;
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
  status: 'pending' | 'paid' | 'partial';
  paidAmount: number;
  paymentDate?: string;
  paymentNotes?: string;
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
  nextContractNumber: number;
}
