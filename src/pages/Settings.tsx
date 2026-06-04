import { useState, useRef } from 'react';
import { useAppStore } from '../hooks/useAuthStore';
import { Upload, Plus, X, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Settings() {
  const { settings, updateSettings, saveSettingsToFirebase } = useAppStore();
  const [formData, setFormData] = useState({ ...settings });
  const [logoPreview, setLogoPreview] = useState(settings.logo);
  const [sigPreview, setSigPreview] = useState(settings.signature);
  const [newTerm, setNewTerm] = useState('');
  const [newFY, setNewFY] = useState('');
  const logoRef = useRef<HTMLInputElement>(null);
  const sigRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'signature') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) { toast.error('Max 500KB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      if (type === 'logo') { setLogoPreview(result); setFormData(prev => ({ ...prev, logo: result })); }
      else { setSigPreview(result); setFormData(prev => ({ ...prev, signature: result })); }
    };
    reader.readAsDataURL(file);
  };

  const addTerm = () => {
    if (!newTerm.trim()) return;
    setFormData(prev => ({ ...prev, termsAndConditions: [...prev.termsAndConditions, newTerm.trim()] }));
    setNewTerm('');
  };

  const removeTerm = (i: number) => {
    setFormData(prev => ({ ...prev, termsAndConditions: prev.termsAndConditions.filter((_, idx) => idx !== i) }));
  };

  const addFinancialYear = () => {
    if (!newFY.trim() || !/^\d{4}-\d{4}$/.test(newFY.trim())) {
      toast.error('Format: 2026-2027');
      return;
    }
    const years = formData.financialYears || [];
    if (years.includes(newFY.trim())) { toast.error('Already exists'); return; }
    setFormData(prev => ({ ...prev, financialYears: [...years, newFY.trim()] }));
    setNewFY('');
    toast.success('Financial year added');
  };

  const removeFinancialYear = (fy: string) => {
    setFormData(prev => ({ ...prev, financialYears: (prev.financialYears || []).filter(f => f !== fy) }));
  };

  const handleSave = async () => {
    updateSettings(formData);
    await saveSettingsToFirebase();
    toast.success('Settings saved');
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <button onClick={handleSave} className="flex items-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-rose-700">
          <Save size={16} /> Save
        </button>
      </div>

      {/* Images */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Branding</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-2 block">Company Logo</label>
            <div onClick={() => logoRef.current?.click()}
              className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer hover:border-rose-500 transition-colors overflow-hidden bg-gray-50">
              {logoPreview ? <img src={logoPreview} className="w-full h-full object-contain" /> : <Upload size={20} className="text-gray-400" />}
            </div>
            <input ref={logoRef} type="file" accept="image/*" onChange={e => handleImageUpload(e, 'logo')} className="hidden" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-2 block">Digital Signature</label>
            <div onClick={() => sigRef.current?.click()}
              className="w-32 h-16 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer hover:border-rose-500 transition-colors overflow-hidden bg-gray-50">
              {sigPreview ? <img src={sigPreview} className="w-full h-full object-contain" /> : <Upload size={20} className="text-gray-400" />}
            </div>
            <input ref={sigRef} type="file" accept="image/*" onChange={e => handleImageUpload(e, 'signature')} className="hidden" />
          </div>
        </div>
      </div>

      {/* Company Info */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Company Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-xs text-gray-500 mb-1 block">Display Name</label>
            <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" /></div>
          <div><label className="text-xs text-gray-500 mb-1 block">Legal Name</label>
            <input value={formData.legalName} onChange={e => setFormData({ ...formData, legalName: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" /></div>
        </div>
        <div><label className="text-xs text-gray-500 mb-1 block">Address</label>
          <input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" /></div>
        <div className="grid grid-cols-3 gap-4">
          <div><label className="text-xs text-gray-500 mb-1 block">City</label>
            <input value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" /></div>
          <div><label className="text-xs text-gray-500 mb-1 block">State</label>
            <input value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" /></div>
          <div><label className="text-xs text-gray-500 mb-1 block">Pincode</label>
            <input value={formData.pincode} onChange={e => setFormData({ ...formData, pincode: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-xs text-gray-500 mb-1 block">Phone</label>
            <input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" /></div>
          <div><label className="text-xs text-gray-500 mb-1 block">Email</label>
            <input value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-xs text-gray-500 mb-1 block">GSTIN</label>
            <input value={formData.gstin} onChange={e => setFormData({ ...formData, gstin: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" /></div>
          <div><label className="text-xs text-gray-500 mb-1 block">PAN</label>
            <input value={formData.pan} onChange={e => setFormData({ ...formData, pan: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" /></div>
        </div>
      </div>

      {/* Financial Years */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Financial Years</h2>
        <div className="flex gap-2">
          <input value={newFY} onChange={e => setNewFY(e.target.value)}
            placeholder="2026-2027" className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          <button onClick={addFinancialYear} className="flex items-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-rose-700">
            <Plus size={16} /> Add Year
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(formData.financialYears || []).map(fy => (
            <span key={fy} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-sm">
              {fy}
              <button onClick={() => removeFinancialYear(fy)} className="hover:text-red-500"><X size={14} /></button>
            </span>
          ))}
        </div>
        {(!formData.financialYears || formData.financialYears.length === 0) && (
          <p className="text-sm text-gray-400">No financial years added. Add years like 2025-2026, 2026-2027.</p>
        )}
      </div>

      {/* Defaults */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Defaults</h2>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-xs text-gray-500 mb-1 block">Default GST %</label>
            <input type="number" value={formData.defaultGstPercent} onChange={e => setFormData({ ...formData, defaultGstPercent: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" /></div>
          <div><label className="text-xs text-gray-500 mb-1 block">Default Packing</label>
            <input value={formData.defaultPacking} onChange={e => setFormData({ ...formData, defaultPacking: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" /></div>
        </div>
        <div><label className="text-xs text-gray-500 mb-1 block">Default Payment Terms</label>
          <input value={formData.defaultPaymentTerms} onChange={e => setFormData({ ...formData, defaultPaymentTerms: e.target.value })}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" /></div>
        <div><label className="text-xs text-gray-500 mb-1 block">Default Loading Condition</label>
          <input value={formData.defaultLoadingCondition} onChange={e => setFormData({ ...formData, defaultLoadingCondition: e.target.value })}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" /></div>
      </div>

      {/* Bank */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Bank Details</h2>
        <div className="grid grid-cols-3 gap-4">
          <div><label className="text-xs text-gray-500 mb-1 block">Bank Name</label>
            <input value={formData.bankName} onChange={e => setFormData({ ...formData, bankName: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" /></div>
          <div><label className="text-xs text-gray-500 mb-1 block">Account Number</label>
            <input value={formData.bankAccount} onChange={e => setFormData({ ...formData, bankAccount: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" /></div>
          <div><label className="text-xs text-gray-500 mb-1 block">IFSC</label>
            <input value={formData.bankIfsc} onChange={e => setFormData({ ...formData, bankIfsc: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" /></div>
        </div>
      </div>

      {/* Terms */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Terms & Conditions</h2>
        <div className="flex gap-2">
          <input value={newTerm} onChange={e => setNewTerm(e.target.value)}
            placeholder="Add a term" className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            onKeyDown={e => e.key === 'Enter' && addTerm()} />
          <button onClick={addTerm} className="bg-rose-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-rose-700">Add</button>
        </div>
        <div className="space-y-2">
          {formData.termsAndConditions.map((term, i) => (
            <div key={i} className="flex items-start gap-2 bg-gray-50 rounded-lg p-3">
              <span className="text-sm text-gray-700 flex-1">{i + 1}. {term}</span>
              <button onClick={() => removeTerm(i)} className="text-red-500 hover:text-red-700"><X size={16} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
