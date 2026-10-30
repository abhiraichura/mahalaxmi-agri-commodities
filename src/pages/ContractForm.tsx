import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAppStore } from '../hooks/useAuthStore';
import { Save, ChevronDown, Plus, Check, BellRing, AlertTriangle, History, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { BrokerageConfig, Contract, Party, SpecField } from '../types';
import { reconcileOverrides } from '../contractNote/writeback';
import { brokerageAmount, goodsValue, productBrokerageDefaults } from '../billing/calc';
import { Page, Button, Picker } from '../ui';
import type { PickItem } from '../ui';
import QuickParty from '../components/QuickParty';
import { partyName } from '../utils/normalize';
import { dealHeadsUp, lastDealBetween } from '../crm/guards';
import { useNcdexRef } from '../rates/useNcdexRef';
import { clockIST } from '../ui/format';
import { addDays, cleanKey, fmtDay, parseLoadingDays, parsePaymentDays, termsOf, todayIST } from '../../server/reminders/plan.js';

const QUANTITY_UNITS = [
  { value: 'MT', label: 'Metric Ton (MT)', factor: 1000 },
  { value: 'KG', label: 'Kilogram (KG)', factor: 1 },
];

export default function ContractForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [query] = useSearchParams();
  const { parties, products, contracts, addContract, updateContract, settings, currentFinancialYear, setCurrentFinancialYear, loadParties } = useAppStore();

  useEffect(() => {
    if (loadParties) loadParties();
  }, [loadParties]);

  const [form, setForm] = useState({
    contractNo: '',
    date: todayIST(),
    sellerId: '',
    buyerId: '',
    productId: '',
    quantity: 0,
    quantityUnit: 'MT' as 'MT' | 'KG',
    price: 0,
    priceUnit: 'KG',
    deliveryLocation: '',
    deliveryAddress: '',
    packing: settings.defaultPacking || '40 KG Plain P.P. Nett Packing with Double Stitching',
    loadingCondition: settings.defaultLoadingCondition || 'Goods to be loaded within one week',
    loadingDeadline: '',
    paymentTerms: settings.defaultPaymentTerms || '3 to 4 days payment with 1% discount after delivery',
    gstPercent: settings.defaultGstPercent || 5,
    otherTerms: '',
    notes: '',
    status: 'confirmed' as 'draft' | 'confirmed' | 'cancelled' | 'completed',
    financialYear: currentFinancialYear
  });

  // The two small boxes that drive the reminders. They follow the printed sentence until you type in them yourself.
  const [loadDays, setLoadDays] = useState<string>(() => { const n = parseLoadingDays(settings.defaultLoadingCondition || 'Goods to be loaded within one week'); return n ? String(n) : ''; });
  const [payMin, setPayMin] = useState<string>(() => { const p = parsePaymentDays(settings.defaultPaymentTerms || '3 to 4 days payment with 1% discount after delivery'); return p ? String(p.min) : ''; });
  const [payMax, setPayMax] = useState<string>(() => { const p = parsePaymentDays(settings.defaultPaymentTerms || '3 to 4 days payment with 1% discount after delivery'); return p ? String(p.max) : ''; });
  const [loadTouched, setLoadTouched] = useState(false);
  const [payTouched, setPayTouched] = useState(false);
  const [deadlineManual, setDeadlineManual] = useState(false);

  const [fyDropdownOpen, setFyDropdownOpen] = useState(false);
  const [newFyInput, setNewFyInput] = useState('');
  const [showAddFy, setShowAddFy] = useState(false);

  const [selectedQualityId, setSelectedQualityId] = useState('');
  const [contractSpecs, setContractSpecs] = useState<SpecField[]>([]);

  // Brokerage for THIS contract: starts as the product's default, can be changed per contract
  type BrkInput = { type: 'percent' | 'fixed'; value: string };
  const toBrkInput = (c: BrokerageConfig): BrkInput => ({ type: c.type, value: c.value ? String(c.value) : '' });
  const [brk, setBrk] = useState<{ buyer: BrkInput; seller: BrkInput }>({
    buyer: { type: 'percent', value: '' },
    seller: { type: 'percent', value: '' },
  });
  const lastProductRef = useRef('');
  const pendingQuality = useRef<{ id: string; specs: SpecField[] } | null>(null);
  const [usedFrom, setUsedFrom] = useState<string | null>(null);

  const [quickParty, setQuickParty] = useState<{ side: 'seller' | 'buyer'; name: string } | null>(null);

  const existing = id ? contracts.find(c => c.id === id) : null;

  // "New deal" from a party's page arrives with that party already chosen
  const prefilled = useRef(false);
  useEffect(() => {
    if (id || prefilled.current || !parties.length) return;
    const s = query.get('seller'); const b = query.get('buyer');
    if (!s && !b) return;
    prefilled.current = true;
    setForm(f => ({ ...f, ...(s && parties.some(p => p.id === s) ? { sellerId: s } : {}), ...(b && parties.some(p => p.id === b) ? { buyerId: b } : {}) }));
  }, [id, query, parties]);

  useEffect(() => {
    if (existing) {
      setForm({
        contractNo: existing.contractNo || '',
        date: existing.date ? existing.date.split('T')[0] : new Date().toISOString().split('T')[0],
        sellerId: existing.sellerId || '',
        buyerId: existing.buyerId || '',
        productId: existing.productId || '',
        quantity: existing.quantity || 0,
        quantityUnit: (existing.quantityUnit as 'MT' | 'KG') || 'MT',
        price: existing.price || 0,
        priceUnit: existing.priceUnit || 'KG',
        deliveryLocation: existing.deliveryLocation || '',
        deliveryAddress: existing.deliveryAddress || '',
        packing: existing.packing || settings.defaultPacking || '',
        loadingCondition: existing.loadingCondition || settings.defaultLoadingCondition || '',
        loadingDeadline: existing.loadingDeadline || '',
        paymentTerms: existing.paymentTerms || settings.defaultPaymentTerms || '',
        gstPercent: existing.gstPercent || settings.defaultGstPercent || 5,
        otherTerms: existing.otherTerms || '',
        notes: existing.notes || '',
        status: existing.status || 'confirmed',
        financialYear: existing.financialYear || currentFinancialYear
      });

      // loading / payment boxes: what was saved, otherwise read from the printed sentences of this contract
      const savedLoad = existing.loadingDays != null && Number(existing.loadingDays) > 0 ? Number(existing.loadingDays) : null;
      const textLoad = parseLoadingDays(existing.loadingCondition || '');
      const shownLoad = savedLoad ?? textLoad;
      setLoadDays(shownLoad ? String(shownLoad) : '');
      setLoadTouched(savedLoad != null);
      const savedMin = existing.paymentDaysMin != null ? Number(existing.paymentDaysMin) : null;
      const savedMax = existing.paymentDaysMax != null ? Number(existing.paymentDaysMax) : null;
      const textPay = parsePaymentDays(existing.paymentTerms || '');
      const pMin = savedMin ?? savedMax ?? textPay?.min ?? null;
      const pMax = savedMax ?? savedMin ?? textPay?.max ?? null;
      setPayMin(pMin != null ? String(pMin) : '');
      setPayMax(pMax != null ? String(pMax) : '');
      setPayTouched(savedMin != null || savedMax != null);
      // a typed deadline that is not just "date + days" counts as typed by hand
      const exDate = cleanKey(existing.date);
      const exDead = cleanKey(existing.loadingDeadline);
      setDeadlineManual(!!(exDate && exDead && shownLoad && addDays(exDate, shownLoad) !== exDead) || !!(exDead && !shownLoad));

      // the contract's own brokerage (older contracts: the product's rate as it was saved with the contract)
      const savedBrk = existing.brokerage || productBrokerageDefaults(existing.product);
      setBrk({ buyer: toBrkInput(savedBrk.buyer), seller: toBrkInput(savedBrk.seller) });
      lastProductRef.current = existing.productId || '';

      setSelectedQualityId(existing.qualityId || '');
      if (existing.contractSpecs && existing.contractSpecs.length > 0) {
        setContractSpecs(existing.contractSpecs);
      } else if (existing.product?.qualities && existing.qualityId) {
        const q = existing.product.qualities.find(q => q.id === existing.qualityId);
        setContractSpecs(q ? q.specs.map(s => ({...s})) : []);
      } else if (existing.product?.specs) {
        setContractSpecs(existing.product.specs.map(s => ({...s})));
      } else {
        setContractSpecs([]);
      }
    } else {
      const fyContracts = contracts.filter(c => c.financialYear === currentFinancialYear);
      const maxNo = fyContracts.reduce((max, c) => {
        const num = parseInt(c.contractNo);
        return num > max ? num : max;
      }, 0);
      setForm(prev => ({ ...prev, contractNo: String(maxNo + 1).padStart(3, '0') }));
      setSelectedQualityId('');
      setContractSpecs([]);
    }
  }, [existing, contracts, currentFinancialYear, settings]);

  const selectedSeller = parties.find(p => p.id === form.sellerId);
  const selectedBuyer = parties.find(p => p.id === form.buyerId);
  const selectedProduct = products.find(p => p.id === form.productId);

  // Alphabetically sorted arrays
  const sortedSellers = useMemo(() => 
    parties.filter(p => p.type === 'seller' || p.type === 'both').sort((a, b) => (a.legalName || '').localeCompare(b.legalName || '')),
  [parties]);

  const sortedBuyers = useMemo(() => 
    parties.filter(p => p.type === 'buyer' || p.type === 'both').sort((a, b) => (a.legalName || '').localeCompare(b.legalName || '')),
  [parties]);

  const sortedProducts = useMemo(() => 
    [...products].sort((a, b) => (a.name || '').localeCompare(b.name || '')),
  [products]);

  const sortedQualities = useMemo(() => {
    if (!selectedProduct || !selectedProduct.qualities) return [];
    return [...selectedProduct.qualities].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [selectedProduct]);

  // Rest of calculations
  useEffect(() => {
    if (!existing && selectedProduct) {
      if (pendingQuality.current) {
        // the details of an earlier deal were just used: keep its quality and specs
        setSelectedQualityId(pendingQuality.current.id); setContractSpecs(pendingQuality.current.specs); pendingQuality.current = null;
      } else if (selectedProduct.qualities && selectedProduct.qualities.length > 0) {
        const firstQuality = selectedProduct.qualities[0];
        setSelectedQualityId(firstQuality.id);
        setContractSpecs(firstQuality.specs.map(s => ({...s})));
      } else if (selectedProduct.specs) {
        setSelectedQualityId('');
        setContractSpecs(selectedProduct.specs.map(s => ({...s})));
      } else {
        setSelectedQualityId('');
        setContractSpecs([]);
      }
    }
  }, [selectedProduct, existing]);

  // choosing a different product loads that product's default brokerage (editable below)
  useEffect(() => {
    if (!selectedProduct || lastProductRef.current === selectedProduct.id) return;
    lastProductRef.current = selectedProduct.id;
    const d = productBrokerageDefaults(selectedProduct);
    setBrk({ buyer: toBrkInput(d.buyer), seller: toBrkInput(d.seller) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProduct]);

  const handleQualityChange = (qId: string) => {
    setSelectedQualityId(qId);
    if (selectedProduct?.qualities) {
      const quality = selectedProduct.qualities.find(q => q.id === qId);
      if (quality) {
        setContractSpecs(quality.specs.map(s => ({...s})));
      }
    }
  };

  const updateContractSpec = (idx: number, value: string) => {
    const updated = [...contractSpecs];
    updated[idx] = { ...updated[idx], value };
    setContractSpecs(updated);
  };

  const brkConfig: { buyer: BrokerageConfig; seller: BrokerageConfig } = {
    buyer: { type: brk.buyer.type, value: Number(brk.buyer.value) || 0 },
    seller: { type: brk.seller.type, value: Number(brk.seller.value) || 0 },
  };
  const productDefaults = selectedProduct ? productBrokerageDefaults(selectedProduct) : null;
  const brkChanged = !!productDefaults && (
    brkConfig.buyer.type !== productDefaults.buyer.type || brkConfig.buyer.value !== productDefaults.buyer.value ||
    brkConfig.seller.type !== productDefaults.seller.type || brkConfig.seller.value !== productDefaults.seller.value
  );
  // value of the goods = quantity (in KG) / price unit (per KG, per MT, per Quintal ...) x price
  const goods = goodsValue(form.quantity, form.quantityUnit, form.price, form.priceUnit);

  const calculateBrokerages = () => {
    if (!selectedProduct || form.quantity <= 0 || form.price <= 0) {
      return { buyer: 0, seller: 0, total: 0 };
    }
    const buyerBrokerage = brokerageAmount(brkConfig.buyer, goods.value);
    const sellerBrokerage = brokerageAmount(brkConfig.seller, goods.value);
    return { buyer: buyerBrokerage, seller: sellerBrokerage, total: Math.round((buyerBrokerage + sellerBrokerage) * 100) / 100 };
  };

  const brokerages = calculateBrokerages();

  // the Indian financial year (April to March) that a date falls in
  const fyOfDate = (d: string) => { const y = Number(d.slice(0, 4)); const m = Number(d.slice(5, 7)); if (!y || !m) return ''; const a = m >= 4 ? y : y - 1; return `${a}-${a + 1}`; };
  const dateFy = fyOfDate(form.date);
  const useFinancialYear = (fy: string) => {
    if (!settings.financialYears.includes(fy)) {
      useAppStore.getState().updateSettings({ ...settings, financialYears: [...settings.financialYears, fy].sort() });
      useAppStore.getState().saveSettingsToFirebase();
    }
    setForm(f => ({ ...f, financialYear: fy }));
    setCurrentFinancialYear(fy);
  };

  const handleAddFinancialYear = () => {
    if (!newFyInput.match(/^\d{4}-\d{4}$/)) {
      toast.error('Format must be YYYY-YYYY (e.g. 2026-2027)');
      return;
    }
    const years = [...settings.financialYears, newFyInput].sort();
    const updated = { ...settings, financialYears: years };
    useAppStore.getState().updateSettings(updated);
    useAppStore.getState().saveSettingsToFirebase();
    setForm({ ...form, financialYear: newFyInput });
    setCurrentFinancialYear(newFyInput);
    setNewFyInput('');
    setShowAddFy(false);
    toast.success('Financial year added');
  };

  /** copy the terms of an earlier deal into this new contract (not its number, date or progress) */
  const applyDeal = (c: Contract) => {
    setForm(f => ({
      ...f,
      productId: c.productId || f.productId, quantity: c.quantity || 0, quantityUnit: (c.quantityUnit as 'MT' | 'KG') || f.quantityUnit,
      price: c.price || 0, priceUnit: c.priceUnit || 'KG',
      deliveryLocation: c.deliveryLocation || '', deliveryAddress: c.deliveryAddress || '', packing: c.packing || f.packing,
      loadingCondition: c.loadingCondition || f.loadingCondition, paymentTerms: c.paymentTerms || f.paymentTerms,
      gstPercent: c.gstPercent || f.gstPercent, otherTerms: c.otherTerms || '',
    }));
    const l = c.loadingDays != null && Number(c.loadingDays) > 0 ? Number(c.loadingDays) : parseLoadingDays(c.loadingCondition || '');
    setLoadDays(l ? String(l) : ''); setLoadTouched(c.loadingDays != null);
    const t = parsePaymentDays(c.paymentTerms || '');
    const pMin = c.paymentDaysMin != null ? Number(c.paymentDaysMin) : t?.min ?? null;
    const pMax = c.paymentDaysMax != null ? Number(c.paymentDaysMax) : t?.max ?? null;
    setPayMin(pMin != null ? String(pMin) : ''); setPayMax(pMax != null ? String(pMax) : ''); setPayTouched(c.paymentDaysMin != null);
    setDeadlineManual(false);
    const b = c.brokerage || productBrokerageDefaults(c.product);
    setBrk({ buyer: toBrkInput(b.buyer), seller: toBrkInput(b.seller) });
    lastProductRef.current = c.productId || '';
    const specs = (c.contractSpecs || []).map(x => ({ ...x }));
    pendingQuality.current = { id: c.qualityId || '', specs };
    setSelectedQualityId(c.qualityId || ''); setContractSpecs(specs);
    setUsedFrom(c.id);
  };

  // "Repeat this deal" arrives as /contracts/new?from=<contract id>
  const repeated = useRef(false);
  useEffect(() => {
    const from = query.get('from');
    if (id || !from || repeated.current || !contracts.length || !parties.length) return;
    const c = contracts.find(x => x.id === from);
    if (!c) return;
    repeated.current = true; prefilled.current = true;
    setForm(f => ({ ...f, sellerId: c.sellerId || f.sellerId, buyerId: c.buyerId || f.buyerId }));
    applyDeal(c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, query, contracts, parties]);

  const lastDeal = !id && !usedFrom && form.quantity === 0 ? lastDealBetween(contracts, form.sellerId, form.buyerId) : null;
  const ncdex = useNcdexRef(selectedProduct?.name || '');
  const heads = dealHeadsUp(form, contracts, parties, brokerages.total, todayIST(), id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.sellerId || !form.buyerId || !form.productId) {
      toast.error('Please select seller, buyer and product');
      return;
    }
    if (!form.contractNo.trim()) {
      toast.error('Contract number is required');
      return;
    }
    if (form.sellerId === form.buyerId) {
      toast.error('The seller and the buyer are the same party');
      return;
    }

    // loading and payment days (the boxes)
    const lDays = Number(loadDays);
    const loadingDays = loadDays.trim() !== '' && Number.isFinite(lDays) && lDays > 0 ? Math.round(lDays) : null;
    let pMin = payMin.trim() === '' ? null : Math.max(0, Math.round(Number(payMin)));
    let pMax = payMax.trim() === '' ? null : Math.max(0, Math.round(Number(payMax)));
    if (pMin != null && !Number.isFinite(pMin)) pMin = null;
    if (pMax != null && !Number.isFinite(pMax)) pMax = null;
    if (pMin == null && pMax != null) pMin = pMax;
    if (pMax == null && pMin != null) pMax = pMin;
    if (pMin != null && pMax != null && pMax < pMin) { const t = pMin; pMin = pMax; pMax = t; }
    const finalDeadline = deadlineManual ? (cleanKey(form.loadingDeadline) || '') : (loadingDays && cleanKey(form.date) ? addDays(cleanKey(form.date)!, loadingDays) : (cleanKey(form.loadingDeadline) || ''));

    const seller = parties.find(p => p.id === form.sellerId)!;
    const buyer = parties.find(p => p.id === form.buyerId)!;
    const product = products.find(p => p.id === form.productId)!;
    const year = parseInt(form.financialYear.split('-')[0]);

    const payload = {
      ...form,
      loadingDeadline: finalDeadline,
      loadingDays,
      paymentDaysMin: pMin,
      paymentDaysMax: pMax,
      id: id || uuidv4(),
      year,
      seller,
      buyer,
      product,
      brokerage: brkConfig,
      brokerageAmount: brokerages.total,
      buyerBrokerageAmount: brokerages.buyer,
      sellerBrokerageAmount: brokerages.seller,
      qualityId: selectedQualityId,
      qualityName: selectedProduct?.qualities?.find(q => q.id === selectedQualityId)?.name || '',
      contractSpecs: contractSpecs.filter(s => s.label.trim()),
      payments: existing?.payments || [],
      updatedAt: new Date().toISOString()
    };

    try {
      if (id) {
        // the printed note follows the contract: note edits for fields that just changed are dropped
        const keep = existing ? reconcileOverrides(existing, { ...existing, ...payload } as Contract, { defaultGstPercent: settings.defaultGstPercent }) : null;
        await updateContract(id, keep ? { ...payload, noteOverrides: keep } : payload);
        toast.success('Contract updated');
      } else {
        await addContract({ ...payload, createdAt: new Date().toISOString() });
        toast.success('Contract created');
      }
      navigate(`/contracts/${payload.id}`);
    } catch (err) {
      toast.error('Failed to save');
    }
  };

  // ---- the loading / payment boxes and what they mean in dates
  const dateKey = cleanKey(form.date);
  const loadNum = loadDays.trim() !== '' && Number(loadDays) > 0 ? Math.round(Number(loadDays)) : null;
  const autoDeadline = loadNum && dateKey ? addDays(dateKey, loadNum) : '';
  const shownDeadline = deadlineManual ? form.loadingDeadline : autoDeadline;
  const textLoad = parseLoadingDays(form.loadingCondition);
  const textPay = parsePaymentDays(form.paymentTerms);
  const minNum = payMin.trim() === '' || !Number.isFinite(Number(payMin)) ? null : Math.max(0, Math.round(Number(payMin)));
  const maxNum = payMax.trim() === '' || !Number.isFinite(Number(payMax)) ? null : Math.max(0, Math.round(Number(payMax)));
  const plan = termsOf({
    date: form.date, loadingDays: loadNum, loadingDeadline: deadlineManual ? form.loadingDeadline : '', loadingCondition: form.loadingCondition,
    paymentDaysMin: minNum, paymentDaysMax: maxNum, paymentTerms: form.paymentTerms,
  });
  const loadMismatch = loadNum && textLoad && textLoad !== loadNum ? textLoad : null;
  const payMismatch = textPay && minNum != null && (textPay.min !== Math.min(minNum, maxNum ?? minNum) || textPay.max !== Math.max(maxNum ?? minNum, minNum)) ? textPay : null;
  const dayWord = (n: number) => `${n} day${n === 1 ? '' : 's'}`;
  const payWord = plan.pay ? (plan.pay.min === plan.pay.max ? dayWord(plan.pay.min) : `${plan.pay.min} to ${plan.pay.max} days`) : '';

  const onLoadingText = (v: string) => {
    setForm(f => ({ ...f, loadingCondition: v }));
    if (!loadTouched) { const n = parseLoadingDays(v); setLoadDays(n ? String(n) : ''); }
  };
  const onPaymentText = (v: string) => {
    setForm(f => ({ ...f, paymentTerms: v }));
    if (!payTouched) { const p = parsePaymentDays(v); setPayMin(p ? String(p.min) : ''); setPayMax(p ? String(p.max) : ''); }
  };

  // a list you can search (seller, buyer, product, quality)
  const picker = (o: {
    label: string; required?: boolean; items: PickItem[]; selectedId: string; placeholder: string; onSelect: (id: string) => void;
    below?: React.ReactNode; recent?: string[]; onAdd?: (typed: string) => void; addLabel?: string; searchPlaceholder?: string;
  }) => (
    <Picker label={o.label} required={o.required} items={o.items} value={o.selectedId} placeholder={o.placeholder} onChange={o.onSelect}
      below={o.below} recent={o.recent} onAdd={o.onAdd} addLabel={o.addLabel} searchPlaceholder={o.searchPlaceholder} />
  );
  const partyItem = (p: Party): PickItem => ({
    id: p.id, title: partyName(p), sub: [p.city, p.phone].filter(Boolean).join(' · '),
    search: [p.name, p.gstin, p.contactPerson, ...(p.alternatePhones || [])].join(' '),
  });
  // the parties and products you used most recently come first
  const recentIds = (pick: (c: Contract) => string) => {
    const seen: string[] = [];
    for (const c of [...contracts].sort((a, b) => String(b.date).localeCompare(String(a.date)))) { const v = pick(c); if (v && !seen.includes(v)) seen.push(v); if (seen.length >= 5) break; }
    return seen;
  };
  const sellerItems = useMemo(() => sortedSellers.map(partyItem), [sortedSellers]); // eslint-disable-line react-hooks/exhaustive-deps
  const buyerItems = useMemo(() => sortedBuyers.map(partyItem), [sortedBuyers]); // eslint-disable-line react-hooks/exhaustive-deps

  const partyNote = (p?: { address?: string; city?: string; state?: string; gstin?: string }) => p ? (
    <div className="mt-2 px-3 py-2 bg-gray-50 rounded-xl text-xs text-gray-600 space-y-0.5 border border-gray-100">
      {p.address && <p>{p.address}</p>}
      {(p.city || p.state) && <p>{[p.city, p.state].filter(Boolean).join(', ')}</p>}
      {p.gstin && <p>GSTIN: {p.gstin}</p>}
    </div>
  ) : null;

  const card = 'card p-4 lg:p-5 space-y-4';
  const lbl = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <Page title={id ? `Edit contract ${form.contractNo}` : 'New contract'} back={id ? `/contracts/${id}` : '/contracts'} width="narrow">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Number, date, year */}
        <section className={card} aria-label="Contract details">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
            <label className="block">
              <span className={lbl}>Contract no. <span className="text-rose-600">*</span></span>
              <input value={form.contractNo} onChange={e => setForm({ ...form, contractNo: e.target.value })} placeholder="001" inputMode="numeric" className="input-field" />
            </label>
            <label className="block">
              <span className={lbl}>Date <span className="text-rose-600">*</span></span>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="input-field" />
            </label>
            <div className="relative col-span-2 lg:col-span-1">
              <span className={lbl}>Financial year</span>
              <button type="button" aria-label="Financial year" onClick={() => setFyDropdownOpen(!fyDropdownOpen)} className="input-field flex items-center justify-between text-left">
                <span>{form.financialYear}</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              {fyDropdownOpen && (
                <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                  {settings.financialYears.map(fy => (
                    <button
                      key={fy}
                      type="button"
                      onClick={() => { setForm({ ...form, financialYear: fy }); setCurrentFinancialYear(fy); setFyDropdownOpen(false); }}
                      className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 ${form.financialYear === fy ? 'bg-rose-50 text-rose-700 font-medium' : ''}`}
                    >
                      {fy}
                    </button>
                  ))}
                  <div className="border-t border-gray-100 px-4 py-2">
                    {!showAddFy ? (
                      <button type="button" onClick={() => setShowAddFy(true)} className="flex items-center gap-1 text-sm text-rose-700 hover:text-rose-800 py-1">
                        <Plus className="w-3.5 h-3.5" /> Add new year
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <input value={newFyInput} onChange={e => setNewFyInput(e.target.value)} placeholder="2026-2027" className="input-field !py-2 flex-1" />
                        <Button size="sm" variant="primary" onClick={handleAddFinancialYear}>Add</Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          {!id && dateFy && dateFy !== form.financialYear && (
            <p className="rounded-xl bg-amber-50 ring-1 ring-amber-100 px-3 py-2 text-[13px] text-amber-900 flex flex-wrap items-center gap-x-2 gap-y-1">
              This date falls in the financial year {dateFy}, but the contract is set to {form.financialYear}.
              <button type="button" onClick={() => useFinancialYear(dateFy)} className="font-semibold underline">Use {dateFy}</button>
            </p>
          )}
        </section>

        {/* Parties and goods */}
        <section className={card} aria-label="Parties and goods">
          <p className="section-label">Who and what</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {picker({
              label: 'Seller', required: true, items: sellerItems, selectedId: form.sellerId, placeholder: 'Select seller', searchPlaceholder: 'Name, city, phone or GSTIN',
              recent: recentIds(c => c.sellerId), onSelect: (pid) => setForm(f => ({ ...f, sellerId: pid })), below: partyNote(selectedSeller),
              onAdd: (typed) => setQuickParty({ side: 'seller', name: typed }), addLabel: 'Add a new seller',
            })}
            {picker({
              label: 'Buyer', required: true, items: buyerItems, selectedId: form.buyerId, placeholder: 'Select buyer', searchPlaceholder: 'Name, city, phone or GSTIN',
              recent: recentIds(c => c.buyerId), onSelect: (pid) => setForm(f => ({ ...f, buyerId: pid })), below: partyNote(selectedBuyer),
              onAdd: (typed) => setQuickParty({ side: 'buyer', name: typed }), addLabel: 'Add a new buyer',
            })}
          </div>

          {picker({
            label: 'Product', required: true, items: sortedProducts.map(p => ({ id: p.id, title: p.name, sub: (p.qualities || []).length ? `${p.qualities.length} qualit${p.qualities.length === 1 ? 'y' : 'ies'}` : '' })),
            selectedId: form.productId, placeholder: 'Select product', searchPlaceholder: 'Search product', recent: recentIds(c => c.productId),
            onSelect: (pid) => setForm(f => ({ ...f, productId: pid })),
          })}

          {selectedProduct && selectedProduct.qualities && selectedProduct.qualities.length > 0 && picker({
            label: 'Quality', items: sortedQualities.map(q => ({ id: q.id, title: q.name })), selectedId: selectedQualityId, placeholder: 'Select quality', searchPlaceholder: 'Search quality',
            onSelect: (qid) => handleQualityChange(qid),
          })}

          {contractSpecs.length > 0 && (
            <div>
              <span className={lbl}>Specifications <span className="font-normal text-gray-500">(you can change them for this contract)</span></span>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                {contractSpecs.map((spec, idx) => (
                  <label key={spec.id} className="flex gap-2 items-center">
                    <span className="text-sm text-gray-600 w-28 shrink-0">{spec.label}</span>
                    <input
                      value={spec.value}
                      onChange={e => updateContractSpec(idx, e.target.value)}
                      placeholder={spec.unit ? `Value (${spec.unit})` : 'Value'}
                      className="input-field !py-2 flex-1 min-w-0"
                    />
                    {spec.unit && <span className="text-xs text-gray-400 w-10">{spec.unit}</span>}
                  </label>
                ))}
              </div>
            </div>
          )}
        </section>

        {lastDeal && (
          <div className="rounded-2xl bg-sky-50 ring-1 ring-sky-100 p-3.5 flex items-start gap-3" role="status">
            <History size={18} className="text-sky-700 mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium text-gray-900">You dealt with them before: #{lastDeal.contractNo}</p>
              <p className="text-gray-600">{lastDeal.quantity} {lastDeal.quantityUnit} {lastDeal.product?.name} at ₹{Number(lastDeal.price || 0).toLocaleString('en-IN')} per {lastDeal.priceUnit}{lastDeal.deliveryLocation ? `, ${lastDeal.deliveryLocation}` : ''}</p>
            </div>
            <Button size="sm" variant="soft" onClick={() => applyDeal(lastDeal)}>Use these details</Button>
          </div>
        )}

        {/* Quantity, price, brokerage */}
        <section className={card} aria-label="Quantity and price">
          <p className="section-label">Quantity and price</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <span className={lbl}>Quantity</span>
              <div className="flex gap-2">
                <input
                  type="number" step="0.01" inputMode="decimal" aria-label="Quantity"
                  value={form.quantity || ''} placeholder="0"
                  onChange={e => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })}
                  className="input-field flex-1 min-w-0"
                />
                <select aria-label="Quantity unit" value={form.quantityUnit} onChange={e => setForm({ ...form, quantityUnit: e.target.value as 'MT' | 'KG' })} className="input-field !w-auto">
                  {QUANTITY_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
              </div>
              {form.quantity > 0 && form.quantityUnit === 'MT' && <p className="text-xs text-gray-500 mt-1">= {(form.quantity * 1000).toLocaleString('en-IN')} KG</p>}
            </div>
            <div>
              <span className={lbl}>Price</span>
              <div className="flex gap-2">
                <input
                  type="number" step="0.01" inputMode="decimal" aria-label="Price"
                  value={form.price || ''} placeholder="0"
                  onChange={e => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                  className="input-field flex-1 min-w-0"
                />
                <input aria-label="Price per" value={form.priceUnit} onChange={e => setForm({ ...form, priceUnit: e.target.value })} placeholder="per KG / MT / Quintal" className="input-field !w-32" />
              </div>
              {ncdex && (
                <p className="text-xs text-gray-500 mt-1" data-ncdex>
                  NCDEX {ncdex.name}: <b className="text-gray-700">₹{Math.round(ncdex.perQuintal).toLocaleString('en-IN')}</b> per quintal (₹{(Math.round(ncdex.perKg * 100) / 100).toLocaleString('en-IN')}/kg), {ncdex.changePct >= 0 ? '+' : ''}{ncdex.changePct}% · {ncdex.date === todayIST() ? `today ${clockIST(ncdex.atMs)}` : fmtDay(ncdex.date)}. For reference only.
                </p>
              )}
            </div>
          </div>

          {selectedProduct && (
            <div className="p-3 lg:p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-amber-900">Brokerage for this contract</p>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Starts from the usual rate of {selectedProduct.name}. Change it if this deal was agreed differently. It only affects this contract.
                  </p>
                </div>
                {brkChanged && productDefaults && (
                  <button type="button" onClick={() => setBrk({ buyer: toBrkInput(productDefaults.buyer), seller: toBrkInput(productDefaults.seller) })} className="text-xs text-amber-900 underline shrink-0 py-1">
                    Reset
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(['buyer', 'seller'] as const).map(side => {
                  const amount = side === 'buyer' ? brokerages.buyer : brokerages.seller;
                  return (
                    <div key={side} className="bg-white rounded-xl border border-amber-200 p-3">
                      <p className="text-xs font-medium text-gray-700 mb-2">{side === 'buyer' ? 'Buyer' : 'Seller'} brokerage</p>
                      <div className="flex gap-2">
                        <input
                          type="number" inputMode="decimal" step="0.01" min="0" aria-label={`${side} brokerage`}
                          value={brk[side].value}
                          onChange={e => setBrk({ ...brk, [side]: { ...brk[side], value: e.target.value } })}
                          placeholder="0"
                          className="input-field !py-2 flex-1 min-w-0"
                        />
                        <select
                          aria-label={`${side} brokerage type`}
                          value={brk[side].type}
                          onChange={e => setBrk({ ...brk, [side]: { ...brk[side], type: e.target.value as 'percent' | 'fixed' } })}
                          className="input-field !py-2 !w-auto"
                        >
                          <option value="percent">% of value</option>
                          <option value="fixed">Rs. fixed</option>
                        </select>
                      </div>
                      <p className="text-xs text-gray-600 mt-1.5">
                        = <strong>Rs. {amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong>
                        {productDefaults && (productDefaults[side].type !== brkConfig[side].type || productDefaults[side].value !== brkConfig[side].value) && (
                          <span className="text-amber-800"> (usual: {productDefaults[side].type === 'fixed' ? `Rs. ${productDefaults[side].value}` : `${productDefaults[side].value}%`})</span>
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
              {form.quantity > 0 && form.price > 0 ? (
                <p className="text-xs text-amber-900">
                  Goods value Rs. {goods.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })} · Total brokerage <strong>Rs. {brokerages.total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong>
                </p>
              ) : (
                <p className="text-xs text-amber-900">Enter the quantity and price to see the brokerage amount.</p>
              )}
              {goods.assumed && form.price > 0 && (
                <p className="text-xs text-red-700">The price unit &ldquo;{form.priceUnit}&rdquo; is not recognised, so the price is taken as per KG. Write it as KG, MT or Quintal.</p>
              )}
            </div>
          )}
        </section>

        {heads.length > 0 && (
          <section className="space-y-2" aria-label="Heads-up">
            {heads.map(h => (
              <div key={h.id} role="alert" className={`flex items-start gap-2.5 rounded-2xl px-3.5 py-3 text-sm ring-1 ${h.tone === 'red' ? 'bg-red-50 ring-red-200 text-red-900' : 'bg-amber-50 ring-amber-200 text-amber-900'}`}>
                {h.tone === 'red' ? <ShieldAlert size={17} className="mt-0.5 shrink-0 text-red-600" /> : <AlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-600" />}
                <span>{h.text}</span>
              </div>
            ))}
          </section>
        )}

        {/* Delivery and packing */}
        <section className={card} aria-label="Delivery and packing">
          <p className="section-label">Delivery and packing</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <label className="block">
              <span className={lbl}>Delivery location</span>
              <input value={form.deliveryLocation} onChange={e => setForm({ ...form, deliveryLocation: e.target.value })} placeholder="e.g. Unjha" className="input-field" />
            </label>
            <label className="block">
              <span className={lbl}>Delivery address</span>
              <input value={form.deliveryAddress} onChange={e => setForm({ ...form, deliveryAddress: e.target.value })} placeholder="Address will be provided by buyer" className="input-field" />
            </label>
          </div>
          <label className="block">
            <span className={lbl}>Packing</span>
            <input value={form.packing} onChange={e => setForm({ ...form, packing: e.target.value })} className="input-field" />
          </label>
        </section>

        {/* Loading and payment: the printed sentences and the two small boxes that drive the reminders */}
        <section className={`${card} ring-1 ring-rose-100`} aria-label="Loading and payment">
          <div className="flex items-center gap-2">
            <BellRing size={16} className="text-rose-700" />
            <p className="section-label !text-rose-700">Loading and payment · reminders</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <label className="block">
              <span className={lbl}>Loading condition <span className="font-normal text-gray-500">(printed on the contract)</span></span>
              <input value={form.loadingCondition} onChange={e => onLoadingText(e.target.value)} className="input-field" />
            </label>
            <label className="block">
              <span className={lbl}>Payment terms <span className="font-normal text-gray-500">(printed on the contract)</span></span>
              <input value={form.paymentTerms} onChange={e => onPaymentText(e.target.value)} className="input-field" />
            </label>
          </div>

          <div className="rounded-xl bg-rose-50/60 border border-rose-100 p-3 lg:p-4 space-y-3">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <span className={lbl}>Loading within</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min="1" max="180" inputMode="numeric" aria-label="Loading within days" placeholder="e.g. 10"
                    value={loadDays}
                    onChange={e => { setLoadDays(e.target.value); setLoadTouched(true); }}
                    className="input-field !w-24 text-center"
                  />
                  <span className="text-sm text-gray-700">days of the contract date</span>
                </div>
              </div>
              <div>
                <span className={lbl}>Payment</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="number" min="0" max="180" inputMode="numeric" aria-label="Payment from days" placeholder="3"
                    value={payMin}
                    onChange={e => { setPayMin(e.target.value); setPayTouched(true); }}
                    className="input-field !w-20 text-center"
                  />
                  <span className="text-sm text-gray-700">to</span>
                  <input
                    type="number" min="0" max="180" inputMode="numeric" aria-label="Payment to days" placeholder="4"
                    value={payMax}
                    onChange={e => { setPayMax(e.target.value); setPayTouched(true); }}
                    className="input-field !w-20 text-center"
                  />
                  <span className="text-sm text-gray-700">days after loading</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              <div>
                <span className={lbl}>Loading deadline</span>
                <input
                  type="date" aria-label="Loading deadline" value={shownDeadline}
                  onChange={e => { setForm({ ...form, loadingDeadline: e.target.value }); setDeadlineManual(!!e.target.value); }}
                  className="input-field"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {deadlineManual
                    ? <>Set by hand. <button type="button" onClick={() => { setDeadlineManual(false); setForm(f => ({ ...f, loadingDeadline: '' })); }} className="underline text-rose-700">Work it out from the days instead</button></>
                    : loadNum ? 'Worked out from the contract date and the days. Change it only if you agreed a different date.' : 'Fill in the days, or pick the date yourself.'}
                </p>
              </div>
              <div className="text-sm text-gray-700 space-y-1.5" aria-live="polite" data-testid="reminder-preview">
                {plan.deadline ? (
                  <>
                    <p><strong>Load by {fmtDay(plan.deadline)}</strong> <span className="text-gray-500">({dayWord(plan.loadingDays || 0)})</span></p>
                    <p className="text-gray-600">
                      I will ask you &ldquo;is it loaded?&rdquo;{plan.half && <> on <strong>{fmtDay(plan.half)}</strong> (half way)</>}{plan.half && plan.eve && ' and'}{plan.eve && <> {plan.half ? '' : 'on '}<strong>{fmtDay(plan.eve)}</strong> (the day before)</>}.
                    </p>
                  </>
                ) : <p className="text-gray-500">Fill in the loading days to get loading reminders.</p>}
                {plan.pay
                  ? <p className="text-gray-600">After you tell me the loading date, I will remind you to ask for payment <strong>{payWord} after loading</strong>.</p>
                  : <p className="text-gray-500">Fill in the payment days to get payment reminders.</p>}
                {form.status !== 'confirmed' && <p className="text-amber-700 text-xs">Reminders only run for Confirmed contracts.</p>}
              </div>
            </div>

            {(loadMismatch || payMismatch) && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900" role="status">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <div className="space-y-1">
                  {loadMismatch && (
                    <p>The printed loading line says about {dayWord(loadMismatch)}, the box says {dayWord(loadNum!)}. Reminders follow the box.{' '}
                      <button type="button" className="underline" onClick={() => { setLoadDays(String(loadMismatch)); setLoadTouched(false); }}>Use {dayWord(loadMismatch)}</button></p>
                  )}
                  {payMismatch && (
                    <p>The printed payment line says {payMismatch.min === payMismatch.max ? dayWord(payMismatch.min) : `${payMismatch.min} to ${payMismatch.max} days`}, the boxes say {minNum === (maxNum ?? minNum) ? dayWord(minNum!) : `${minNum} to ${maxNum} days`}. Reminders follow the boxes.{' '}
                      <button type="button" className="underline" onClick={() => { setPayMin(String(payMismatch.min)); setPayMax(String(payMismatch.max)); setPayTouched(false); }}>Use the printed days</button></p>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* The rest */}
        <section className={card} aria-label="Other">
          <p className="section-label">Other</p>
          <div className="grid grid-cols-2 gap-3 lg:gap-4">
            <label className="block">
              <span className={lbl}>GST %</span>
              <input type="number" step="0.01" inputMode="decimal" value={form.gstPercent} onChange={e => setForm({ ...form, gstPercent: parseFloat(e.target.value) || 0 })} className="input-field" />
            </label>
            <label className="block">
              <span className={lbl}>Status</span>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as 'draft' | 'confirmed' | 'cancelled' | 'completed' })} className="input-field">
                <option value="confirmed">Confirmed</option>
                <option value="draft">Draft</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className={lbl}>Other terms <span className="font-normal text-gray-500">(printed on the contract)</span></span>
            <textarea value={form.otherTerms} onChange={e => setForm({ ...form, otherTerms: e.target.value })} rows={2} className="input-field" />
          </label>
          <label className="block">
            <span className={lbl}>Internal notes <span className="font-normal text-gray-500">(only you see these)</span></span>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="input-field" />
          </label>
        </section>

        {/* Save bar: always in reach, never hidden behind the tabs */}
        <div className="sticky bottom-0 z-20 -mx-4 lg:mx-0 px-4 lg:px-0 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-[rgba(244,245,249,0.86)] backdrop-blur-xl border-t border-black/5 flex gap-3">
          <Button variant="secondary" className="flex-1 lg:flex-none lg:px-6" onClick={() => navigate(id ? `/contracts/${id}` : '/contracts')}>Cancel</Button>
          <Button type="submit" variant="primary" className="flex-[2] lg:flex-none lg:px-8" icon={<Save size={16} />}>{id ? 'Save changes' : 'Save contract'}</Button>
        </div>
      </form>

      <QuickParty open={!!quickParty} type={quickParty?.side || 'seller'} initialName={quickParty?.name || ''} onClose={() => setQuickParty(null)}
        onCreated={pid => setForm(f => (quickParty?.side === 'buyer' ? { ...f, buyerId: pid } : { ...f, sellerId: pid }))} />
    </Page>
  );
}
