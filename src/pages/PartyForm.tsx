import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Search, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { useAppStore } from '../hooks/useAuthStore';
import type { Party, ContactPerson } from '../types';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

export default function PartyForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { parties, products, addParty, updateParty, loadParties, loadProducts } = useAppStore();
  const [gstLoading, setGstLoading] = useState(false);
  const [gstVerified, setGstVerified] = useState(false);

  const existing = id ? parties.find(p => p.id === id) : null;

  const [form, setForm] = useState({
    name: '', legalName: '', gstin: '', address: '', city: '', state: '', pincode: '',
    phone: '', email: '', pan: '', type: 'buyer' as 'buyer' | 'seller' | 'both',
    contactPerson: '', alternateNumbers: [] as string[], alternateEmails: [] as string[],
    contacts: [] as ContactPerson[], productIds: [] as string[]
  });

  const [newAltNumber, setNewAltNumber] = useState('');
  const [newAltEmail, setNewAltEmail] = useState('');
  const [newContact, setNewContact] = useState({ name: '', designation: '', phone: '', email: '' });

  useEffect(() => { loadParties(); loadProducts(); }, []);

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name || '',
        legalName: existing.legalName,
        gstin: existing.gstin,
        address: existing.address,
        city: existing.city,
        state: existing.state,
        pincode: existing.pincode,
        phone: existing.phone,
        email: existing.email,
        pan: existing.pan,
        type: existing.type,
        contactPerson: existing.contactPerson || '',
        alternateNumbers: existing.alternateNumbers || [],
        alternateEmails: existing.alternateEmails || [],
        contacts: existing.contacts || [],
        productIds: existing.productIds || []
      });
    }
  }, [existing]);

  const verifyGST = async () => {
    if (form.gstin.length !== 15) { toast.error('Enter valid 15-digit GSTIN'); return; }
    setGstLoading(true);
    try {
      const res = await fetch(`https://sheet.gstincheck.co.in/check/${form.gstin}`);
      const data = await res.json();
      if (data?.taxpayerInfo) {
        const info = data.taxpayerInfo;
        const addr = info.pradr?.addr || {};
        setForm(prev => ({
          ...prev,
          legalName: info.lgnm || prev.legalName,
          address: `${addr.bno || ''} ${addr.st || ''} ${addr.loc || ''}`.trim(),
          city: addr.city || addr.dst || '',
          state: addr.stcd || '',
          pincode: addr.pncd || ''
        }));
        setGstVerified(true);
        toast.success('GST verified!');
      } else { toast.error('Could not verify'); }
    } catch (e) { toast.error('Service unavailable'); }
    setGstLoading(false);
  };

  const addAltNumber = () => {
    if (!newAltNumber.trim()) return;
    setForm(prev => ({ ...prev, alternateNumbers: [...prev.alternateNumbers, newAltNumber.trim()] }));
    setNewAltNumber('');
  };

  const removeAltNumber = (idx: number) => {
    setForm(prev => ({ ...prev, alternateNumbers: prev.alternateNumbers.filter((_, i) => i !== idx) }));
  };

  const addAltEmail = () => {
    if (!newAltEmail.trim()) return;
    setForm(prev => ({ ...prev, alternateEmails: [...prev.alternateEmails, newAltEmail.trim()] }));
    setNewAltEmail('');
  };

  const removeAltEmail = (idx: number) => {
    setForm(prev => ({ ...prev, alternateEmails: prev.alternateEmails.filter((_, i) => i !== idx) }));
  };

  const addContact = () => {
    if (!newContact.name.trim()) return;
    const contact: ContactPerson = {
      id: uuidv4(),
      name: newContact.name,
      designation: newContact.designation,
      phone: newContact.phone,
      email: newContact.email
    };
    setForm(prev => ({ ...prev, contacts: [...prev.contacts, contact] }));
    setNewContact({ name: '', designation: '', phone: '', email: '' });
  };

  const removeContact = (contactId: string) => {
    setForm(prev => ({ ...prev, contacts: prev.contacts.filter(c => c.id !== contactId) }));
  };

  const toggleProduct = (productId: string) => {
    setForm(prev => ({
      ...prev,
      productIds: prev.productIds.includes(productId)
        ? prev.productIds.filter(pid => pid !== productId)
        : [...prev.productIds, productId]
    }));
  };

  const handleSubmit = async () => {
    if (!form.legalName || !form.gstin) { toast.error('Legal name and GSTIN required'); return; }
    const partyProducts = products.filter(p => form.productIds.includes(p.id));
    const party: Party = {
      id: id || uuidv4(),
      name: form.name,
      legalName: form.legalName,
      gstin: form.gstin,
      address: form.address,
      city: form.city,
      state: form.state,
      pincode: form.pincode,
      phone: form.phone,
      email: form.email,
      pan: form.pan,
      type: form.type,
      contactPerson: form.contactPerson,
      alternateNumbers: form.alternateNumbers,
      alternateEmails: form.alternateEmails,
      contacts: form.contacts,
      productIds: form.productIds,
      products: partyProducts,
      createdAt: existing?.createdAt || new Date(),
      updatedAt: new Date()
    };
    try {
      if (id) { await updateParty(id, party); toast.success('Updated!'); }
      else { await addParty(party); toast.success('Added!'); }
      navigate('/parties');
    } catch (e) { toast.error('Failed to save'); }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => navigate('/parties')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{id ? 'Edit Party' : 'Add New Party'}</h1>
        <div className="space-y-4">
          {/* GSTIN */}
          <div className="flex gap-2">
            <input value={form.gstin} onChange={e => setForm({ ...form, gstin: e.target.value.toUpperCase() })} maxLength={15}
              placeholder="GSTIN *" className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm uppercase" />
            <button onClick={verifyGST} disabled={gstLoading || form.gstin.length !== 15}
              className="px-4 py-3 bg-rose-50 text-rose-700 rounded-xl text-sm font-medium disabled:opacity-50 flex items-center gap-2">
              <Search className="w-4 h-4" /> {gstLoading ? '...' : 'Verify'}
            </button>
          </div>
          {gstVerified && <div className="flex items-center gap-2 text-sm text-green-600"><CheckCircle2 className="w-4 h-4" /> Gst Verified</div>}

          {/* Basic Info */}
          <input value={form.legalName} onChange={e => setForm({ ...form, legalName: e.target.value })} placeholder="Legal Name *" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Display Name" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Address" rows={2} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none" />
          <div className="grid md:grid-cols-3 gap-4">
            <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="City" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            <input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} placeholder="State" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            <input value={form.pincode} onChange={e => setForm({ ...form, pincode: e.target.value })} placeholder="Pincode" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          </div>

          {/* Contact Person */}
          <div className="border-t border-gray-100 pt-4 mt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Primary Contact</h3>
            <input value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })}
              placeholder="Contact Person Name" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm mb-3" />
            <div className="grid md:grid-cols-2 gap-4">
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Primary Phone" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
              <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Primary Email" type="email" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            </div>
          </div>

          {/* Alternate Numbers */}
          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Alternate Numbers</h3>
            <div className="flex gap-2 mb-2">
              <input value={newAltNumber} onChange={e => setNewAltNumber(e.target.value)} placeholder="Add alternate number"
                className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
              <button onClick={addAltNumber} className="px-4 py-2 bg-gray-100 rounded-xl text-sm font-medium hover:bg-gray-200">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.alternateNumbers.map((num, i) => (
                <span key={i} className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm text-gray-700 flex items-center gap-2">
                  {num}
                  <button onClick={() => removeAltNumber(i)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          </div>

          {/* Alternate Emails */}
          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Alternate Emails</h3>
            <div className="flex gap-2 mb-2">
              <input value={newAltEmail} onChange={e => setNewAltEmail(e.target.value)} placeholder="Add alternate email"
                className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
              <button onClick={addAltEmail} className="px-4 py-2 bg-gray-100 rounded-xl text-sm font-medium hover:bg-gray-200">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.alternateEmails.map((em, i) => (
                <span key={i} className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm text-gray-700 flex items-center gap-2">
                  {em}
                  <button onClick={() => removeAltEmail(i)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          </div>

          {/* Other Contacts (Manager, Logistic Manager etc.) */}
          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Other Contacts (Manager, Logistic Manager, etc.)</h3>
            <div className="grid md:grid-cols-2 gap-3 mb-3">
              <input value={newContact.name} onChange={e => setNewContact({ ...newContact, name: e.target.value })} placeholder="Name" className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
              <input value={newContact.designation} onChange={e => setNewContact({ ...newContact, designation: e.target.value })} placeholder="Designation (e.g. Manager)" className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
              <input value={newContact.phone} onChange={e => setNewContact({ ...newContact, phone: e.target.value })} placeholder="Phone" className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
              <input value={newContact.email} onChange={e => setNewContact({ ...newContact, email: e.target.value })} placeholder="Email" className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            </div>
            <button onClick={addContact} className="px-4 py-2 bg-gray-100 rounded-xl text-sm font-medium hover:bg-gray-200 flex items-center gap-2 mb-3">
              <Plus className="w-4 h-4" /> Add Contact
            </button>
            <div className="space-y-2">
              {form.contacts.map(contact => (
                <div key={contact.id} className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{contact.name} <span className="text-xs text-gray-500">({contact.designation})</span></p>
                    <p className="text-xs text-gray-500">{contact.phone} {contact.email && `| ${contact.email}`}</p>
                  </div>
                  <button onClick={() => removeContact(contact.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>

          {/* PAN & Type */}
          <div className="grid md:grid-cols-2 gap-4">
            <input value={form.pan} onChange={e => setForm({ ...form, pan: e.target.value.toUpperCase() })} maxLength={10} placeholder="PAN" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm uppercase" />
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as 'buyer' | 'seller' | 'both' })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm">
              <option value="buyer">Buyer</option>
              <option value="seller">Seller</option>
              <option value="both">Both</option>
            </select>
          </div>

          {/* Products */}
          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Products They Trade</h3>
            <p className="text-xs text-gray-400 mb-3">Select multiple products from your catalogue. This is only for your directory reference.</p>
            <div className="grid md:grid-cols-2 gap-2">
              {products.map(prod => (
                <label key={prod.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${
                  form.productIds.includes(prod.id) ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-gray-50 border-gray-200 text-gray-700'
                }`}>
                  <input type="checkbox" checked={form.productIds.includes(prod.id)} onChange={() => toggleProduct(prod.id)} className="w-4 h-4 accent-rose-600" />
                  <span className="text-sm font-medium">{prod.name}</span>
                </label>
              ))}
            </div>
            {products.length === 0 && (
              <p className="text-sm text-gray-400">No products in catalogue yet. Add products in Product Manager first.</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-100 mt-6">
          <button onClick={() => navigate('/parties')} className="px-6 py-3 text-gray-600 font-medium">Cancel</button>
          <button onClick={handleSubmit} className="px-8 py-3 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700 flex items-center gap-2">
            <Save className="w-4 h-4" /> {id ? 'Update' : 'Save'} Party
          </button>
        </div>
      </div>
    </div>
  );
}
