// src/pages/PartyForm.tsx
import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../hooks/useAuthStore';
import { Party, ContactPerson } from '../types';
import { Plus, Trash2, X, ChevronDown, Check, AlertTriangle, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { Page, Button, Badge, Sheet, Field } from '../ui';

const emptyContact: ContactPerson = {
  id: '',
  name: '',
  role: '',
  phone: '',
  email: ''
};

export default function PartyForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { parties, products, addParty, updateParty, loadParties } = useAppStore();

  const [form, setForm] = useState<Partial<Party>>({
    legalName: '',
    name: '',
    gstin: '',
    address: '',
    city: '',
    state: 'Gujarat',
    pincode: '',
    phone: '',
    email: '',
    pan: '',
    type: 'both',
    productIds: [],
    contactPerson: '',
    alternatePhones: [],
    alternateEmails: [],
    otherContacts: [],
    notes: ''
  });

  const [gstVerified, setGstVerified] = useState(false);
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [altPhoneInput, setAltPhoneInput] = useState('');
  const [altEmailInput, setAltEmailInput] = useState('');
  const [otherContacts, setOtherContacts] = useState<ContactPerson[]>([]);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  
  // Duplicate Check State
  const [duplicateWarning, setDuplicateWarning] = useState<{
    show: boolean;
    matchedName: string;
    reason: string;
  } | null>(null);

  const productDropdownRef = useRef<HTMLDivElement>(null);
  const typeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      const existing = parties.find(p => p.id === id);
      if (existing) {
        setForm({
          ...existing,
          productIds: existing.productIds || [],
          alternatePhones: existing.alternatePhones || [],
          alternateEmails: existing.alternateEmails || [],
          otherContacts: existing.otherContacts || [],
          contactPerson: existing.contactPerson || '',
          notes: existing.notes || ''
        });
        setOtherContacts(existing.otherContacts || []);
      }
    }
  }, [id, parties]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (productDropdownRef.current && !productDropdownRef.current.contains(e.target as Node)) {
        setProductDropdownOpen(false);
      }
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(e.target as Node)) {
        setTypeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePincodeChange = async (value: string) => {
    setForm(prev => ({ ...prev, pincode: value }));
    if (value.length === 6 && /^\d{6}$/.test(value)) {
      setPincodeLoading(true);
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${value}`);
        const data = await res.json();
        if (data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
          const office = data[0].PostOffice[0];
          setForm(prev => ({
            ...prev,
            city: office.District || prev.city,
            state: office.State || prev.state,
          }));
          toast.success('City & state auto-filled');
        }
      } catch (err) {
        console.error('Pincode lookup failed', err);
      } finally {
        setPincodeLoading(false);
      }
    }
  };

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.legalName) {
      toast.error('Legal name is required');
      return;
    }

    const cleanPhone = form.phone?.replace(/\s/g, '');
    const cleanGst = form.gstin?.replace(/\s/g, '')?.toUpperCase();

    let dupPhoneParty = null;
    let dupGstParty = null;

    if (cleanPhone) {
      dupPhoneParty = parties.find(p => p.id !== id && p.phone?.replace(/\s/g, '') === cleanPhone);
    }
    
    if (cleanGst) {
      dupGstParty = parties.find(p => p.id !== id && p.gstin?.replace(/\s/g, '')?.toUpperCase() === cleanGst);
    }

    if (dupPhoneParty || dupGstParty) {
      const matchedName = dupPhoneParty ? dupPhoneParty.legalName : dupGstParty!.legalName;
      const reason = dupPhoneParty ? 'contact number' : 'GST number';
      setDuplicateWarning({ show: true, matchedName, reason });
      return;
    }

    executeSave();
  };

  const executeSave = async () => {
    const partyData: Party = {
      id: id || crypto.randomUUID(),
      name: form.name || form.legalName!,
      legalName: form.legalName!,
      gstin: form.gstin?.toUpperCase() || '',
      address: form.address || '',
      city: form.city || '',
      state: form.state || 'Gujarat',
      pincode: form.pincode || '',
      phone: form.phone || '',
      email: form.email || '',
      pan: form.pan || '',
      type: form.type || 'both',
      productIds: form.productIds || [],
      contactPerson: form.contactPerson || '',
      alternatePhones: form.alternatePhones || [],
      alternateEmails: form.alternateEmails || [],
      otherContacts: otherContacts.filter(c => c.name.trim()),
      notes: form.notes || '',
      createdAt: id ? (parties.find(p => p.id === id)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      if (id) {
        await updateParty(id, partyData);
        toast.success('Party updated');
      } else {
        await addParty(partyData);
        toast.success('Party added');
      }
      await loadParties();
      navigate(-1);
    } catch (err) {
      toast.error('Failed to save');
      console.error(err);
    } finally {
      setDuplicateWarning(null);
    }
  };

  const toggleProduct = (productId: string) => {
    const current = form.productIds || [];
    if (current.includes(productId)) {
      setForm({ ...form, productIds: current.filter(id => id !== productId) });
    } else {
      setForm({ ...form, productIds: [...current, productId] });
    }
  };

  const addAltPhone = () => {
    if (!altPhoneInput.trim()) return;
    const current = form.alternatePhones || [];
    if (!current.includes(altPhoneInput.trim())) {
      setForm({ ...form, alternatePhones: [...current, altPhoneInput.trim()] });
    }
    setAltPhoneInput('');
  };

  const removeAltPhone = (phone: string) => {
    setForm({ ...form, alternatePhones: (form.alternatePhones || []).filter(p => p !== phone) });
  };

  const addAltEmail = () => {
    if (!altEmailInput.trim()) return;
    const current = form.alternateEmails || [];
    if (!current.includes(altEmailInput.trim())) {
      setForm({ ...form, alternateEmails: [...current, altEmailInput.trim()] });
    }
    setAltEmailInput('');
  };

  const removeAltEmail = (email: string) => {
    setForm({ ...form, alternateEmails: (form.alternateEmails || []).filter(e => e !== email) });
  };

  const addOtherContact = () => {
    setOtherContacts([...otherContacts, { ...emptyContact, id: crypto.randomUUID() }]);
  };

  const updateOtherContact = (index: number, field: keyof ContactPerson, value: string) => {
    const updated = [...otherContacts];
    updated[index] = { ...updated[index], [field]: value };
    setOtherContacts(updated);
  };

  const removeOtherContact = (index: number) => {
    setOtherContacts(otherContacts.filter((_, i) => i !== index));
  };

  // Alphabetically sort products for the dropdown mapping
  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [products]);

  const selectedProductNames = (form.productIds || [])
    .map(pid => products.find(p => p.id === pid)?.name)
    .filter(Boolean);

  const card = 'card p-4 lg:p-5 space-y-4';
  const lbl = 'block text-sm font-medium text-gray-700 mb-1';
  const chipX = 'inline-flex items-center justify-center w-11 h-11 -my-2 -mr-1 rounded-full text-gray-400 hover:text-red-600';
  const optionBase = 'w-full px-4 py-2.5 min-h-[44px] text-left text-sm flex items-center justify-between hover:bg-gray-50';

  return (
    <Page title={id ? 'Edit Party' : 'Add New Party'} back="/parties/directory" width="narrow">
      <form onSubmit={handleInitialSubmit} className="space-y-4">
        <section className={card} aria-label="Basic Information">
          <h2 className="section-label">Basic Information</h2>

          <Field label={<>Legal Name <span className="text-rose-600">*</span></>}>
            <input
              type="text"
              value={form.legalName || ''}
              onChange={e => setForm({ ...form, legalName: e.target.value })}
              placeholder="Legal Name"
              required
              className="input-field"
            />
          </Field>

          <Field label="Display Name">
            <input
              type="text"
              value={form.name || ''}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Display Name (if different from legal name)"
              className="input-field"
            />
          </Field>

          <Field label="Contact Person" hint="This is for your directory only, not shown on contracts">
            <input
              type="text"
              value={form.contactPerson || ''}
              onChange={e => setForm({ ...form, contactPerson: e.target.value })}
              placeholder="Primary contact person name"
              className="input-field"
            />
          </Field>

          <div>
            <span className={lbl}>GSTIN (optional)</span>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.gstin || ''}
                onChange={e => {
                  setForm({ ...form, gstin: e.target.value.toUpperCase() });
                  setGstVerified(false);
                }}
                maxLength={15}
                placeholder="GSTIN (optional)"
                aria-label="GSTIN"
                className="input-field flex-1 min-w-0 uppercase"
              />
              {form.gstin && form.gstin.length === 15 && (
                <Button variant="soft" onClick={() => setGstVerified(true)}>Verify</Button>
              )}
            </div>
            {gstVerified && (
              <span className="text-xs text-emerald-700 mt-1 block">GST Verified</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
            <Field label="Phone">
              <input
                type="text"
                value={form.phone || ''}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="Primary phone"
                inputMode="tel"
                className="input-field"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={form.email || ''}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="Primary email"
                className="input-field"
              />
            </Field>
          </div>
        </section>

        <section className={card} aria-label="Alternate Contacts">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h2 className="section-label">Alternate Contacts</h2>
              <Badge tone="amber">Directory Only</Badge>
            </div>
            <p className="mt-1.5 text-xs text-gray-500">These details are strictly for your internal directory. Never shown on contracts or bills.</p>
          </div>

          <div>
            <span className={lbl}>Alternate Phone Numbers</span>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={altPhoneInput}
                onChange={e => setAltPhoneInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAltPhone())}
                placeholder="Add alternate phone"
                aria-label="Alternate phone number"
                inputMode="tel"
                className="input-field flex-1 min-w-0"
              />
              <Button variant="secondary" className="px-3.5" onClick={addAltPhone} aria-label="Add alternate phone" icon={<Plus size={18} />} />
            </div>
            <div className="flex flex-wrap gap-x-2 gap-y-3">
              {(form.alternatePhones || []).map(phone => (
                <span key={phone} className="inline-flex items-center gap-1 pl-3 pr-1 py-1.5 bg-gray-100 rounded-full text-sm">
                  {phone}
                  <button type="button" onClick={() => removeAltPhone(phone)} aria-label={`Remove ${phone}`} className={chipX}>
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <span className={lbl}>Alternate Emails</span>
            <div className="flex gap-2 mb-2">
              <input
                type="email"
                value={altEmailInput}
                onChange={e => setAltEmailInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAltEmail())}
                placeholder="Add alternate email"
                aria-label="Alternate email"
                className="input-field flex-1 min-w-0"
              />
              <Button variant="secondary" className="px-3.5" onClick={addAltEmail} aria-label="Add alternate email" icon={<Plus size={18} />} />
            </div>
            <div className="flex flex-wrap gap-x-2 gap-y-3">
              {(form.alternateEmails || []).map(email => (
                <span key={email} className="inline-flex items-center gap-1 pl-3 pr-1 py-1.5 bg-gray-100 rounded-full text-sm max-w-full">
                  <span className="truncate">{email}</span>
                  <button type="button" onClick={() => removeAltEmail(email)} aria-label={`Remove ${email}`} className={`${chipX} shrink-0`}>
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-sm font-medium text-gray-700">Other Contact Persons</span>
              <Button variant="soft" onClick={addOtherContact} icon={<Plus size={16} />}>Add Person</Button>
            </div>
            <div className="space-y-3">
              {otherContacts.map((contact, idx) => (
                <div key={contact.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="section-label">Person {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeOtherContact(idx)}
                      aria-label={`Remove contact person ${idx + 1}`}
                      className="inline-flex items-center justify-center w-11 h-11 -my-2 -mr-2 rounded-full text-gray-400 hover:text-red-600"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      value={contact.name}
                      onChange={e => updateOtherContact(idx, 'name', e.target.value)}
                      placeholder="Name"
                      aria-label={`Contact person ${idx + 1} name`}
                      className="input-field"
                    />
                    <input
                      type="text"
                      value={contact.role}
                      onChange={e => updateOtherContact(idx, 'role', e.target.value)}
                      placeholder="Role (e.g. Manager)"
                      aria-label={`Contact person ${idx + 1} role`}
                      className="input-field"
                    />
                    <input
                      type="text"
                      value={contact.phone}
                      onChange={e => updateOtherContact(idx, 'phone', e.target.value)}
                      placeholder="Phone"
                      aria-label={`Contact person ${idx + 1} phone`}
                      inputMode="tel"
                      className="input-field"
                    />
                    <input
                      type="email"
                      value={contact.email}
                      onChange={e => updateOtherContact(idx, 'email', e.target.value)}
                      placeholder="Email"
                      aria-label={`Contact person ${idx + 1} email`}
                      className="input-field"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={card} aria-label="Address">
          <h2 className="section-label">Address</h2>
          <Field label="Full Address">
            <textarea
              value={form.address || ''}
              onChange={e => setForm({ ...form, address: e.target.value })}
              placeholder="Full Address"
              rows={3}
              className="input-field resize-none"
            />
          </Field>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 lg:gap-4">
            <Field label="City">
              <input
                type="text"
                value={form.city || ''}
                onChange={e => setForm({ ...form, city: e.target.value })}
                placeholder="City"
                className="input-field"
              />
            </Field>
            <Field label="State">
              <input
                type="text"
                value={form.state || ''}
                onChange={e => setForm({ ...form, state: e.target.value })}
                placeholder="State"
                className="input-field"
              />
            </Field>
            <Field label="Pincode" className="col-span-2 sm:col-span-1">
              <div className="relative">
                <input
                  type="text"
                  value={form.pincode || ''}
                  onChange={e => handlePincodeChange(e.target.value)}
                  maxLength={6}
                  placeholder="Pincode"
                  inputMode="numeric"
                  className="input-field"
                />
                {pincodeLoading && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">Looking up...</span>
                )}
              </div>
            </Field>
          </div>
        </section>

        <section className={card} aria-label="Products They Trade">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h2 className="section-label">Products They Trade</h2>
              <Badge tone="amber">Directory Only</Badge>
            </div>
            <p className="mt-1.5 text-xs text-gray-500">Select products this party deals in. For your directory search only. Not shown on contracts.</p>
          </div>

          <div className="relative" ref={productDropdownRef}>
            <button
              type="button"
              onClick={() => setProductDropdownOpen(!productDropdownOpen)}
              aria-label="Select products"
              aria-expanded={productDropdownOpen}
              className="input-field flex items-center justify-between gap-2 text-left"
            >
              <span className={`truncate ${selectedProductNames.length ? 'text-gray-900' : 'text-gray-400'}`}>
                {selectedProductNames.length ? selectedProductNames.join(', ') : 'Select products...'}
              </span>
              <ChevronDown size={16} className={`shrink-0 text-gray-400 transition-transform ${productDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {productDropdownOpen && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                {sortedProducts.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-500">No products available</div>
                ) : (
                  sortedProducts.map(product => {
                    const isSelected = (form.productIds || []).includes(product.id);
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => toggleProduct(product.id)}
                        className={`${optionBase} !justify-start gap-2 ${isSelected ? 'bg-rose-50 text-rose-700' : ''}`}
                      >
                        <div className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center ${isSelected ? 'bg-rose-600 border-rose-600' : 'border-gray-300'}`}>
                          {isSelected && <Check size={12} className="text-white" />}
                        </div>
                        {product.name}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </section>

        <section className={card} aria-label="Other Details">
          <h2 className="section-label">Other Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
            <div>
              <span className={lbl}>Party Type</span>
              <div className="relative" ref={typeDropdownRef}>
                <button
                  type="button"
                  onClick={() => setTypeDropdownOpen(!typeDropdownOpen)}
                  aria-label="Party type"
                  aria-expanded={typeDropdownOpen}
                  className="input-field flex items-center justify-between text-left"
                >
                  <span className="text-gray-900">
                    {form.type === 'both' ? 'Both Buyer & Seller' : form.type === 'buyer' ? 'Buyer Only' : 'Seller Only'}
                  </span>
                  <ChevronDown size={16} className={`shrink-0 text-gray-400 transition-transform ${typeDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {typeDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 overflow-hidden">
                    <button type="button" onClick={() => { setForm({...form, type: 'both'}); setTypeDropdownOpen(false); }} className={`${optionBase} ${form.type === 'both' ? 'bg-rose-50 text-rose-700 font-medium' : 'text-gray-700'}`}>
                      Both Buyer & Seller {form.type === 'both' && <Check size={14} className="text-rose-600" />}
                    </button>
                    <button type="button" onClick={() => { setForm({...form, type: 'buyer'}); setTypeDropdownOpen(false); }} className={`${optionBase} ${form.type === 'buyer' ? 'bg-rose-50 text-rose-700 font-medium' : 'text-gray-700'}`}>
                      Buyer Only {form.type === 'buyer' && <Check size={14} className="text-rose-600" />}
                    </button>
                    <button type="button" onClick={() => { setForm({...form, type: 'seller'}); setTypeDropdownOpen(false); }} className={`${optionBase} ${form.type === 'seller' ? 'bg-rose-50 text-rose-700 font-medium' : 'text-gray-700'}`}>
                      Seller Only {form.type === 'seller' && <Check size={14} className="text-rose-600" />}
                    </button>
                  </div>
                )}
              </div>
            </div>
            <Field label="PAN">
              <input
                type="text"
                value={form.pan || ''}
                onChange={e => setForm({ ...form, pan: e.target.value.toUpperCase() })}
                placeholder="PAN Number"
                maxLength={10}
                className="input-field uppercase"
              />
            </Field>
          </div>

          <Field label="Internal Party Notes (Optional)" hint="These notes are completely private and only visible in your directory view.">
            <textarea
              value={form.notes || ''}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Add private notes to remember details about this party..."
              rows={3}
              className="input-field resize-none"
            />
          </Field>
        </section>

        {/* Save bar: always in reach, never hidden behind the tabs */}
        <div className="sticky bottom-0 z-20 -mx-4 lg:mx-0 px-4 lg:px-0 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-slate-50 via-slate-50 to-slate-50/0 flex gap-3">
          <Button variant="secondary" className="flex-1 lg:flex-none lg:px-6" onClick={() => navigate('/parties/directory')}>Cancel</Button>
          <Button type="submit" variant="primary" className="flex-[2] lg:flex-none lg:px-8" icon={<Save size={16} />}>{id ? 'Update Party' : 'Add Party'}</Button>
        </div>
      </form>

      {/* Duplicate Warning Sheet */}
      <Sheet
        open={!!duplicateWarning}
        onClose={() => setDuplicateWarning(null)}
        title="Duplicate Found"
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button variant="secondary" className="flex-1" onClick={() => setDuplicateWarning(null)}>Cancel / Edit</Button>
            <Button variant="primary" className="flex-1" onClick={executeSave}>{id ? 'Update Anyhow' : 'Create New Party Anyhow'}</Button>
          </div>
        }
      >
        {duplicateWarning && (
          <div className="flex items-start gap-3 pb-2">
            <span className="w-10 h-10 shrink-0 bg-amber-50 rounded-full flex items-center justify-center">
              <AlertTriangle size={20} className="text-amber-500" />
            </span>
            <p className="text-sm text-gray-600 pt-2">
              This {duplicateWarning.reason} already exists with <strong>{duplicateWarning.matchedName}</strong>. Are you sure you want to proceed?
            </p>
          </div>
        )}
      </Sheet>
    </Page>
  );
}
