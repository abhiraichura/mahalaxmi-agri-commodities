export interface Party {
  id: string;
  name: string;
  legalName: string;
  gstin: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone?: string;
  email?: string;
  type?: 'seller' | 'buyer' | 'both';
  pan?: string;
  altPhone?: string;
  altEmail?: string;
  contactPerson?: string;
  bankName?: string;
  bankAccount?: string;
  bankIfsc?: string;
  remarks?: string;
  notes?: string;
  brokeragePercent?: number;
  brokerageFixed?: number;
  productIds?: string[];
  products?: string[];
  createdAt?: any;
  updatedAt?: any;
}

export interface SpecField {
  label: string;
  value: string;
  unit?: string;
  order?: number;
  id?: string;
}

export interface ProductSpec {
  id: string;
  name: string;
  specs: SpecField[];
  defaultBrokerage?: number;
  buyerBrokerageType?: 'percent' | 'fixed';
  sellerBrokerageType?: 'percent' | 'fixed';
  buyerBrokeragePercent?: number;
  sellerBrokeragePercent?: number;
  buyerBrokerageFixed?: number;
  sellerBrokerageFixed?: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface Contract {
  id: string;
  contractNo: string;
  year: number;
  date: string;
  seller: Party;
  buyer: Party;
  sellerId?: string;
  buyerId?: string;
  product: ProductSpec;
  productId?: string;
  quantity: number;
  quantityUnit: string;
  price: number;
  priceUnit: string;
  deliveryLocation: string;
  deliveryAddress?: string;
  packing: string;
  loadingCondition: string;
  paymentTerms: string;
  gstPercent: number;
  otherTerms?: string;
  notes?: string;
  status: 'active' | 'completed' | 'cancelled';
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
}

export interface BusinessNote {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  createdAt?: any;
  updatedAt?: any;
}
