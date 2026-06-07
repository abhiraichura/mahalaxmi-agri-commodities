import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../hooks/useAuthStore';
import { Party, ContactPerson } from '../types';
import { ArrowLeft, Plus, Trash2, X, ChevronDown, Check, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

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
    otherContacts: []
  });

  const [gstVerified, setGstVerified] = useState(false);
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
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
          contactPerson: existing.contactPerson || ''
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

  const selectedProductNames = (form.productIds || [])
    .map(pid => products.find(p => p.id === pid)?.name)
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <button
          onClick={() => navigate('/parties/directory')}
          className="flex items-center gap-2 text-gray-600 hover:text-rose-600 mb-4 transition-colors"
        >
          <ArrowLeft size={18} />
          Back to Parties
        </button>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {id ? 'Edit Party' : 'Add New Party'}
        </h1>

        <form onSubmit={handleInitialSubmit} className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-200 space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Basic Information</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Legal Name *</label>
              <input
                type="text"
                value={form.legalName || ''}
                onChange={e => setForm({ ...form, legalName: e.target.value })}
                placeholder="Legal Name"
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
              <input
                type="text"
                value={form.name || ''}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Display Name (if different from legal name)"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
              <input
                type="text"
                value={form.contactPerson || ''}
                onChange={e => setForm({ ...form, contactPerson: e.target.value })}
                placeholder="Primary contact person name"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">This is for your directory only, not shown on contracts</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN (optional)</label>
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
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm uppercase"
                />
                {form.gstin && form.gstin.length === 15 && (
                  <button
                    type="button"
                    onClick={() => setGstVerified(true)}
                    className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-sm font-medium hover:bg-rose-100"
                  >
                    Verify
                  </button>
                )}
              </div>
              {gstVerified && (
                <span className="text-xs text-green-600 mt-1 block">GST Verified</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={form.phone || ''}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="Primary phone"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email || ''}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="Primary email"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Alternate Contacts</h2>
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">Directory Only</span>
            </div>
            <p className="text-xs text-gray-500">These details are strictly for your internal directory. Never shown on contracts or bills.</p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alternate Phone Numbers</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={altPhoneInput}
                  onChange={e => setAltPhoneInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAltPhone())}
                  placeholder="Add alternate phone"
                  className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                />
                <button
                  type="button"
                  onClick={addAltPhone}
                  className="px-3 py-2 bg-gray-100 rounded-xl hover:bg-gray-200"
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(form.alternatePhones || []).map(phone => (
                  <span key={phone} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm">
                    {phone}
                    <button type="button" onClick={() => removeAltPhone(phone)} className="text-gray-400 hover:text-red-500">
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alternate Emails</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="email"
                  value={altEmailInput}
                  onChange={e => setAltEmailInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAltEmail())}
                  placeholder="Add alternate email"
                  className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                />
                <button
                  type="button"
                  onClick={addAltEmail}
                  className="px-3 py-2 bg-gray-100 rounded-xl hover:bg-gray-200"
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(form.alternateEmails || []).map(email => (
                  <span key={email} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm">
                    {email}
                    <button type="button" onClick={() => removeAltEmail(email)} className="text-gray-400 hover:text-red-500">
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Other Contact Persons</label>
                <button
                  type="button"
                  onClick={addOtherContact}
                  className="flex items-center gap-1 text-sm text-rose-600 hover:text-rose-700"
                >
                  <Plus size={16} /> Add Person
                </button>
              </div>
              <div className="space-y-3">
                {otherContacts.map((contact, idx) => (
                  <div key={contact.id} className="grid grid-cols-12 gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="col-span-3">
                      <input
                        type="text"
                        value={contact.name}
                        onChange={e => updateOtherContact(idx, 'name', e.target.value)}
                        placeholder="Name"
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="text"
                        value={contact.role}
                        onChange={e => updateOtherContact(idx, 'role', e.target.value)}
                        placeholder="Role (e.g. Manager)"
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="text"
                        value={contact.phone}
                        onChange={e => updateOtherContact(idx, 'phone', e.target.value)}
                        placeholder="Phone"
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="email"
                        value={contact.email}
                        onChange={e => updateOtherContact(idx, 'email', e.target.value)}
                        placeholder="Email"
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                      />
                    </div>
                    <div className="col-span-1 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => removeOtherContact(idx)}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200 space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Address</h2>
            <div>
              <textarea
                value={form.address || ''}
                onChange={e => setForm({ ...form, address: e.target.value })}
                placeholder="Full Address"
                rows={3}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <input
                type="text"
                value={form.city || ''}
                onChange={e => setForm({ ...form, city: e.target.value })}
                placeholder="City"
                className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
              />
              <input
                type="text"
                value={form.state || ''}
                onChange={e => setForm({ ...form, state: e.target.value })}
                placeholder="State"
                className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
              />
              <div className="relative">
                <input
                  type="text"
                  value={form.pincode || ''}
                  onChange={e => handlePincodeChange(e.target.value)}
                  maxLength={6}
                  placeholder="Pincode"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                />
                {pincodeLoading && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">Looking up...</span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Products They Trade</h2>
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">Directory Only</span>
            </div>
            <p className="text-xs text-gray-500">Select products this party deals in. For your directory search only. Not shown on contracts.</p>

            <div className="relative" ref={productDropdownRef}>
              <button
                type="button"
                onClick={() => setProductDropdownOpen(!productDropdownOpen)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm flex items-center justify-between"
              >
                <span className={selectedProductNames.length ? 'text-gray-900' : 'text-gray-400'}>
                  {selectedProductNames.length ? selectedProductNames.join(', ') : 'Select products...'}
                </span>
                <ChevronDown size={16} className={`transition-transform ${productDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {productDropdownOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                  {products.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500">No products available</div>
                  ) : (
                    products.map(product => {
                      const isSelected = (form.productIds || []).includes(product.id);
                      return (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => toggleProduct(product.id)}
                          className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-gray-50 ${isSelected ? 'bg-rose-50 text-rose-700' : ''}`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-rose-600 border-rose-600' : 'border-gray-300'}`}>
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
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200 space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Other Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Party Type</label>
                <select
                  value={form.type || 'both'}
                  onChange={e => setForm({ ...form, type: e.target.value as any })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                >
                  <option value="both">Both Buyer & Seller</option>
                  <option value="buyer">Buyer Only</option>
                  <option value="seller">Seller Only</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PAN</label>
                <input
                  type="text"
                  value={form.pan || ''}
                  onChange={e => setForm({ ...form, pan: e.target.value.toUpperCase() })}
                  placeholder="PAN Number"
                  maxLength={10}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm uppercase"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/parties/directory')}
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700 transition-colors"
            >
              {id ? 'Update Party' : 'Add Party'}
            </button>
          </div>
        </form>

        {/* Duplicate Warning Modal */}
        {duplicateWarning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center shadow-xl">
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} className="text-amber-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Duplicate Found</h3>
              <p className="text-gray-600 mb-6">
                This {duplicateWarning.reason} already exists with <strong>{duplicateWarning.matchedName}</strong>. Are you sure you want to proceed?
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => setDuplicateWarning(null)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel / Edit
                </button>
                <button
                  onClick={executeSave}
                  className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors"
                >
                  {id ? 'Update Anyhow' : 'Create New Party Anyhow'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
