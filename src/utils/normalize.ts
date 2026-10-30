// Real data is never as tidy as test data: an old party may have no phone, no legal name or no city, and a contract keeps
// a copy of its parties and product from the day it was made. Calling .toLowerCase() or .localeCompare() on a missing
// text is what made the Parties screen go blank. Everything that comes out of the database is cleaned here once, so no
// page has to guard every single field.
import type { Contract, Note, Party, ProductSpec } from '../types';

/** a value as text, never undefined or null */
export const str = (v: unknown): string => (v == null ? '' : typeof v === 'string' ? v : String(v));
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/** the name to show for a party: the legal name, else the short name, else a dash */
export const partyName = (p?: Partial<Party> | null): string => str(p?.legalName).trim() || str(p?.name).trim() || '—';

export function normalizeParty(p: Partial<Party> & { id?: string }): Party {
  const legal = str(p.legalName);
  const name = str(p.name);
  return {
    ...(p as Party),
    id: str(p.id),
    // a party saved with only one of the two names still has both
    name: name || legal,
    legalName: legal || name,
    gstin: str(p.gstin),
    address: str(p.address),
    city: str(p.city),
    state: str(p.state),
    pincode: str(p.pincode),
    phone: str(p.phone),
    email: str(p.email),
    pan: str(p.pan),
    type: p.type === 'buyer' || p.type === 'seller' || p.type === 'both' ? p.type : 'both',
    contactPerson: str(p.contactPerson),
    notes: str(p.notes),
    productIds: arr<string>(p.productIds),
    alternatePhones: arr<string>(p.alternatePhones).map(str),
    alternateEmails: arr<string>(p.alternateEmails).map(str),
    otherContacts: arr<Party['otherContacts'][number]>(p.otherContacts).map(c => ({ ...c, id: str(c?.id), name: str(c?.name), role: str(c?.role), phone: str(c?.phone), email: str(c?.email) })),
  };
}

export function normalizeProduct(p: Partial<ProductSpec> & { id?: string }): ProductSpec {
  return {
    ...(p as ProductSpec),
    id: str(p.id),
    name: str(p.name),
    qualities: arr<ProductSpec['qualities'][number]>(p.qualities).map(q => ({ ...q, id: str(q?.id), name: str(q?.name), specs: arr(q?.specs) })),
    specs: arr<ProductSpec['specs'][number]>(p.specs),
  };
}

export function normalizeContract(c: Partial<Contract> & { id?: string }): Contract {
  const year = Number(c.year) || new Date().getFullYear();
  return {
    ...(c as Contract),
    id: str(c.id),
    contractNo: str(c.contractNo),
    year,
    financialYear: str(c.financialYear) || `${year}-${year + 1}`,
    date: str(c.date),
    sellerId: str(c.sellerId),
    buyerId: str(c.buyerId),
    productId: str(c.productId),
    // the copies of the parties and the product made on the day of the contract
    seller: normalizeParty({ ...(c.seller || {}), id: str(c.seller?.id) || str(c.sellerId) }),
    buyer: normalizeParty({ ...(c.buyer || {}), id: str(c.buyer?.id) || str(c.buyerId) }),
    product: normalizeProduct({ ...(c.product || {}), id: str(c.product?.id) || str(c.productId) }),
    quantity: Number(c.quantity) || 0,
    quantityUnit: str(c.quantityUnit) || 'MT',
    price: Number(c.price) || 0,
    priceUnit: str(c.priceUnit) || 'KG',
    deliveryLocation: str(c.deliveryLocation),
    deliveryAddress: str(c.deliveryAddress),
    packing: str(c.packing),
    loadingCondition: str(c.loadingCondition),
    loadingDeadline: str(c.loadingDeadline),
    paymentTerms: str(c.paymentTerms),
    otherTerms: str(c.otherTerms),
    notes: str(c.notes),
    gstPercent: Number(c.gstPercent) || 0,
    status: c.status === 'draft' || c.status === 'cancelled' || c.status === 'completed' ? c.status : 'confirmed',
    brokerageAmount: Number(c.brokerageAmount) || 0,
    buyerBrokerageAmount: Number(c.buyerBrokerageAmount) || 0,
    sellerBrokerageAmount: Number(c.sellerBrokerageAmount) || 0,
    qualityId: str(c.qualityId),
    qualityName: str(c.qualityName),
    contractSpecs: arr(c.contractSpecs),
    payments: arr(c.payments),
    timeline: arr(c.timeline),
    files: arr(c.files),
  };
}

export function normalizeNote(n: Partial<Note> & { id?: string }): Note {
  return {
    ...(n as Note),
    id: str(n.id),
    title: str(n.title),
    content: str(n.content),
    tags: arr<string>(n.tags).map(str),
    pinned: n.pinned === true,
    checklist: arr<any>(n.checklist).filter(c => c && typeof c === 'object').map((c, i) => ({ id: str(c.id) || `c${i}`, text: str(c.text), done: c.done === true })),
    link: n.link && typeof n.link === 'object' && (n.link.type === 'contract' || n.link.type === 'party') && n.link.id ? { type: n.link.type, id: str(n.link.id), label: str(n.link.label) } : null,
  };
}
