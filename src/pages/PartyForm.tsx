import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../hooks/useAuthStore';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, X, Save, Trash2 } from 'lucide-react';

interface ContactPerson {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
}

export default function PartyForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { parties, products, addParty, updateParty, deleteParty } = useAppStore();
  const isEdit = !!id;
  const existing = isEdit ? parties.find(p => p.id === id) : null;

  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [gstin, setGstin] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setStateField] = useState('');
  const [pincode, setPincode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [pan, setPan] = useState('');
  const [type, setType] = useState<'buyer' | 'seller' | 'both'>('both');
  const [productIds, setProductIds] = useState<string[]>([]);

  // Internal fields
  const [contactPerson, setContactPerson] = useState('');
  const [alternatePhones, setAlternatePhones] = useState<string[]>([]);
  const [alternateEmails, setAlternateEmails] = useState<string[]>([]);
  const [otherContacts, setOtherContacts] = useState<ContactPerson[]>([]);

  // Pincode loading state
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeError, setPincodeError] = useState('');

  useEffect(() => {
    if (existing) {
      setName(existing.name || '');
      setLegalName(existing.legalName || '');
      setGstin(existing.gstin || '');
      setAddress(existing.address || '');
      setCity(existing.city || '');
      setStateField(existing.state || '');
      setPincode(existing.pincode || '');
      setPhone(existing.phone || '');
      setEmail(existing.email || '');
      setPan(existing.pan || '');
      setType(existing.type || 'both');
      setProductIds(existing.productIds || []);
      setContactPerson(existing.contactPerson || '');
      setAlternatePhones(existing.alternatePhones || []);
      setAlternateEmails(existing.alternateEmails || []);
      setOtherContacts(existing.otherContacts || []);
    }
  }, [existing]);

  // PINCODE AUTO-FILL - Fixed implementation
  useEffect(() => {
    const fetchPincodeData = async () => {
      // Only fetch when pincode is exactly 6 digits
      if (pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
        setPincodeError('');
        return;
      }

      // Don't refetch if we already have data for this pincode
      if (existing?.pincode === pincode && city && state) {
        return;
      }

      setPincodeLoading(true);
      setPincodeError('');

      try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
        const data = await response.json();

        if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice && data[0].PostOffice.length > 0) {
          const postOffice = data[0].PostOffice[0];
          setCity(postOffice.District || postOffice.Name || '');
          setStateField(postOffice.State || '');
          // Country is always India for Indian pincodes
          setPincodeError('');
        } else {
          setPincodeError('Invalid pincode or no data found');
        }
      } catch (error) {
        console.error('Pincode fetch error:', error);
        setPincodeError('Failed to fetch pincode data. Please enter manually.');
      } finally {
        setPincodeLoading(false);
      }
    };

    // Debounce the pincode fetch
    const timeoutId = setTimeout(() => {
      fetchPincodeData();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [pincode]);

  const toggleProduct = (productId: string) => {
    setProductIds(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const addAlternatePhone = () => setAlternatePhones([...alternatePhones, '']);
  const updateAlternatePhone = (idx: number, val: string) => {
    const updated = [...alternatePhones];
    updated[idx] = val;
    setAlternatePhones(updated);
  };
  const removeAlternatePhone = (idx: number) => setAlternatePhones(alternatePhones.filter((_, i) => i !== idx));

  const addAlternateEmail = () => setAlternateEmails([...alternateEmails, '']);
  const updateAlternateEmail = (idx: number, val: string) => {
    const updated = [...alternateEmails];
    updated[idx] = val;
    setAlternateEmails(updated);
  };
  const removeAlternateEmail = (idx: number) => setAlternateEmails(alternateEmails.filter((_, i) => i !== idx));

  const addOtherContact = () => setOtherContacts([...otherContacts, { id: uuidv4(), name: '', role: '', phone: '', email: '' }]);
  const updateOtherContact = (id: string, field: string, val: string) => {
    setOtherContacts(otherContacts.map(c => c.id === id ? { ...c, [field]: val } : c));
  };
  const removeOtherContact = (id: string) => setOtherContacts(otherContacts.filter(c => c.id !== id));

  const handleSave = async () => {
    if (!legalName.trim()) {
      toast.error('Legal name is required');
      return;
    }

    const payload = {
      id: id || uuidv4(),
      name: name || legalName,
      legalName,
      gstin,
      address,
      city,
      state: state,
      pincode,
      phone,
      email,
      pan,
      type,
      productIds,
      contactPerson,
      alternatePhones: alternatePhones.filter(p => p.trim()),
      alternateEmails: alternateEmails.filter(e => e.trim()),
      otherContacts,
      createdAt: isEdit ? existing?.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      if (isEdit) {
        await updateParty(id!, payload);
        toast.success('Party updated');
      } else {
        await addParty(payload as any);
        toast.success('Party added');
      }
      navigate('/parties');
    } catch {
      toast.error('Failed to save');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this party?')) return;
    await deleteParty(id!);
    toast.success('Deleted');
    navigate('/parties');
  };

  return (
    <div className="max-w-3xl mx-auto pt-16 lg:pt-8 px-4 lg:px-8 pb-20">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/parties')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">{isEdit ? 'Edit Party' : 'Add Party'}</h1>
        {isEdit && (
          <button onClick={handleDelete} className="ml-auto flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Legal Name *</label>
            <input value={legalName} onChange={e => setLegalName(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Same as legal name if empty" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
            <input value={gstin} onChange={e => setGstin(e.target.value.toUpperCase())} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PAN</label>
            <input value={pan} onChange={e => setPan(e.target.value.toUpperCase())} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          </div>
        </div>

        {/* Address with Pincode Auto-fill */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <textarea value={address} onChange={e => setAddress(e.target.value)} rows={2} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
            <div className="relative">
              <input 
                value={pincode} 
                onChange={e => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                placeholder="6 digits"
                maxLength={6}
                className={`w-full px-3 py-2 bg-gray-50 border rounded-xl text-sm ${pincodeError ? 'border-red-300' : 'border-gray-200'}`} 
              />
              {pincodeLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            {pincodeError && <p className="text-xs text-red-500 mt-1">{pincodeError}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input 
              value={city} 
              onChange={e => setCity(e.target.value)} 
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
            <input 
              value={state} 
              onChange={e => setStateField(e.target.value)} 
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" 
            />
          </div>
        </div>

        {/* Contact */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          </div>
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Party Type</label>
          <div className="flex gap-3">
            {(['buyer', 'seller', 'both'] as const).map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  type === t 
                    ? 'bg-rose-600 text-white border-rose-600' 
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {t === 'buyer' ? 'Buyer' : t === 'seller' ? 'Seller' : 'Both'}
              </button>
            ))}
          </div>
        </div>

        {/* Products */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Products</label>
          <div className="flex flex-wrap gap-2">
            {products.map(product => (
              <button
                key={product.id}
                onClick={() => toggleProduct(product.id)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  productIds.includes(product.id)
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {product.name}
              </button>
            ))}
          </div>
        </div>

        {/* Contact Person */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Primary Contact Person</label>
          <input value={contactPerson} onChange={e => setContactPerson(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
        </div>

        {/* Alternate Phones */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Alternate Phones</label>
            <button onClick={addAlternatePhone} className="text-sm text-rose-600 hover:text-rose-700">
              <Plus className="w-4 h-4 inline" /> Add
            </button>
          </div>
          {alternatePhones.map((phone, idx) => (
            <div key={idx} className="flex gap-2 mb-2">
              <input value={phone} onChange={e => updateAlternatePhone(idx, e.target.value)} className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
              <button onClick={() => removeAlternatePhone(idx)} className="p-2 text-gray-400 hover:text-red-600"><X className="w-4 h-4" /></button>
            </div>
          ))}
        </div>

        {/* Alternate Emails */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Alternate Emails</label>
            <button onClick={addAlternateEmail} className="text-sm text-rose-600 hover:text-rose-700">
              <Plus className="w-4 h-4 inline" /> Add
            </button>
          </div>
          {alternateEmails.map((email, idx) => (
            <div key={idx} className="flex gap-2 mb-2">
              <input value={email} onChange={e => updateAlternateEmail(idx, e.target.value)} className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
              <button onClick={() => removeAlternateEmail(idx)} className="p-2 text-gray-400 hover:text-red-600"><X className="w-4 h-4" /></button>
            </div>
          ))}
        </div>

        {/* Other Contacts */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Other Contacts (Manager, Logistic, etc.)</label>
            <button onClick={addOtherContact} className="text-sm text-rose-600 hover:text-rose-700">
              <Plus className="w-4 h-4 inline" /> Add
            </button>
          </div>
          {otherContacts.map(contact => (
            <div key={contact.id} className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2 p-3 bg-gray-50 rounded-xl">
              <input value={contact.name} onChange={e => updateOtherContact(contact.id, 'name', e.target.value)} placeholder="Name" className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" />
              <input value={contact.role} onChange={e => updateOtherContact(contact.id, 'role', e.target.value)} placeholder="Role" className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" />
              <input value={contact.phone} onChange={e => updateOtherContact(contact.id, 'phone', e.target.value)} placeholder="Phone" className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" />
              <div className="flex gap-2">
                <input value={contact.email} onChange={e => updateOtherContact(contact.id, 'email', e.target.value)} placeholder="Email" className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" />
                <button onClick={() => removeOtherContact(contact.id)} className="p-2 text-gray-400 hover:text-red-600"><X className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700">
            <Save className="w-4 h-4" /> {isEdit ? 'Update Party' : 'Save Party'}
          </button>
          <button onClick={() => navigate('/parties')} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
