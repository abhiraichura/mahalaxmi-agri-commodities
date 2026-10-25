import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../hooks/useAuthStore';
import { Save, ChevronDown, Plus, Check, BellRing, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { BrokerageConfig, SpecField } from '../types';
import { brokerageAmount, goodsValue, productBrokerageDefaults } from '../billing/calc';
import { Page, Button } from '../ui';
import { addDays, cleanKey, fmtDay, parseLoadingDays, parsePaymentDays, termsOf, todayIST } from '../../server/reminders/plan.js';

const QUANTITY_UNITS = [
  { value: 'MT', label: 'Metric Ton (MT)', factor: 1000 },
  { value: 'KG', label: 'Kilogram (KG)', factor: 1 },
];

export default function ContractForm() {
  const { id } = useParams();
  const navigate = useNavigate();
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

  // Custom Dropdown States
  const [sellerDropdownOpen, setSellerDropdownOpen] = useState(false);
  const [buyerDropdownOpen, setBuyerDropdownOpen] = useState(false);
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const [qualityDropdownOpen, setQualityDropdownOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState<number>(-1);

  const sellerRef = useRef<HTMLDivElement>(null);
  const buyerRef = useRef<HTMLDivElement>(null);
  const productRef = useRef<HTMLDivElement>(null);
  const qualityRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sellerRef.current && !sellerRef.current.contains(e.target as Node)) setSellerDropdownOpen(false);
      if (buyerRef.current && !buyerRef.current.contains(e.target as Node)) setBuyerDropdownOpen(false);
      if (productRef.current && !productRef.current.contains(e.target as Node)) setProductDropdownOpen(false);
      if (qualityRef.current && !qualityRef.current.contains(e.target as Node)) setQualityDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Smart scrolling for keyboard navigation inside dropdowns
  useEffect(() => {
    if (highlightIndex >= 0) {
      const element = document.getElementById(`dropdown-item-${highlightIndex}`);
      if (element) {
        element.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightIndex]);

  const existing = id ? contracts.find(c => c.id === id) : null;

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

  // --- Generic Dropdown Logic for Keyboard Support ---
  const toggleDropdown = (isOpen: boolean, setIsOpen: (val: boolean) => void, items: any[], currentSelectedId: string | null) => {
    if (!isOpen) {
      const idx = items.findIndex(item => item.id === currentSelectedId);
      setHighlightIndex(idx >= 0 ? idx : 0);
    } else {
      setHighlightIndex(-1);
    }
    setIsOpen(!isOpen);
  };

  const handleDropdownKeyDown = (e: React.KeyboardEvent, isOpen: boolean, setIsOpen: (val: boolean) => void, items: any[], onSelect: (item: any) => void, currentSelectedId: string | null) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        const idx = items.findIndex(item => item.id === currentSelectedId);
        setHighlightIndex(idx >= 0 ? idx : 0);
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex(prev => (prev < items.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < items.length) {
          onSelect(items[highlightIndex]);
          setIsOpen(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  // Rest of calculations
  useEffect(() => {
    if (!existing && selectedProduct) {
      if (selectedProduct.qualities && selectedProduct.qualities.length > 0) {
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
        await updateContract(id, payload);
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

  // a drop-down list (seller, buyer, product, quality) with keyboard support
  const picker = (o: {
    label: string; required?: boolean; refEl: React.RefObject<HTMLDivElement>; open: boolean; setOpen: (v: boolean) => void;
    items: { id: string; name: string }[]; selectedId: string; placeholder: string; onSelect: (id: string) => void; below?: React.ReactNode;
  }) => (
    <div className="relative" ref={o.refEl}>
      <span className="block text-sm font-medium text-gray-700 mb-1">{o.label}{o.required && <span className="text-rose-600"> *</span>}</span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={o.open}
        aria-label={o.label}
        onClick={() => toggleDropdown(o.open, o.setOpen, o.items, o.selectedId)}
        onKeyDown={(e) => handleDropdownKeyDown(e, o.open, o.setOpen, o.items, (item) => o.onSelect(item.id), o.selectedId)}
        className="input-field flex items-center justify-between text-left min-h-[48px]"
      >
        <span className={o.selectedId ? 'text-gray-900 font-medium line-clamp-1' : 'text-gray-500'}>
          {o.items.find(p => p.id === o.selectedId)?.name || o.placeholder}
        </span>
        <ChevronDown size={16} className={`text-gray-400 flex-shrink-0 transition-transform ${o.open ? 'rotate-180' : ''}`} />
      </button>
      {o.open && (
        <div role="listbox" className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-auto py-1">
          {o.items.length === 0 && <p className="px-4 py-3 text-sm text-gray-500">Nothing to pick yet.</p>}
          {o.items.map((p, index) => {
            const isSelected = o.selectedId === p.id;
            const isHighlighted = highlightIndex === index;
            return (
              <button
                key={p.id}
                id={`dropdown-item-${index}`}
                type="button"
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setHighlightIndex(index)}
                onClick={() => { o.onSelect(p.id); o.setOpen(false); }}
                className={`w-full px-4 py-3 text-left text-sm flex items-center justify-between transition-colors ${isSelected ? 'bg-rose-50 text-rose-700 font-medium' : isHighlighted ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <span className="truncate pr-2">{p.name}</span>
                {isSelected && <Check size={14} className="text-rose-600 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
      {o.below}
    </div>
  );

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
        </section>

        {/* Parties and goods */}
        <section className={card} aria-label="Parties and goods">
          <p className="section-label">Who and what</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {picker({
              label: 'Seller', required: true, refEl: sellerRef, open: sellerDropdownOpen, setOpen: setSellerDropdownOpen,
              items: sortedSellers.map(p => ({ id: p.id, name: p.legalName })), selectedId: form.sellerId, placeholder: 'Select seller',
              onSelect: (pid) => setForm(f => ({ ...f, sellerId: pid })), below: partyNote(selectedSeller),
            })}
            {picker({
              label: 'Buyer', required: true, refEl: buyerRef, open: buyerDropdownOpen, setOpen: setBuyerDropdownOpen,
              items: sortedBuyers.map(p => ({ id: p.id, name: p.legalName })), selectedId: form.buyerId, placeholder: 'Select buyer',
              onSelect: (pid) => setForm(f => ({ ...f, buyerId: pid })), below: partyNote(selectedBuyer),
            })}
          </div>

          {picker({
            label: 'Product', required: true, refEl: productRef, open: productDropdownOpen, setOpen: setProductDropdownOpen,
            items: sortedProducts.map(p => ({ id: p.id, name: p.name })), selectedId: form.productId, placeholder: 'Select product',
            onSelect: (pid) => setForm(f => ({ ...f, productId: pid })),
          })}

          {selectedProduct && selectedProduct.qualities && selectedProduct.qualities.length > 0 && picker({
            label: 'Quality', refEl: qualityRef, open: qualityDropdownOpen, setOpen: setQualityDropdownOpen,
            items: sortedQualities.map(q => ({ id: q.id, name: q.name })), selectedId: selectedQualityId, placeholder: 'Select quality',
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
        <div className="sticky bottom-0 z-20 -mx-4 lg:mx-0 px-4 lg:px-0 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-slate-50 via-slate-50 to-slate-50/0 flex gap-3">
          <Button variant="secondary" className="flex-1 lg:flex-none lg:px-6" onClick={() => navigate(id ? `/contracts/${id}` : '/contracts')}>Cancel</Button>
          <Button type="submit" variant="primary" className="flex-[2] lg:flex-none lg:px-8" icon={<Save size={16} />}>{id ? 'Save changes' : 'Save contract'}</Button>
        </div>
      </form>
    </Page>
  );
}
