import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../hooks/useAuthStore';
import { Upload, Save, Trash2, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Settings() {
  const { settings, updateSettings, saveSettingsToFirebase, loadSettingsFromFirebase } = useAppStore();
  const [formData, setFormData] = useState(settings);
  const [logoPreview, setLogoPreview] = useState<string | null>(settings.logo);
  const [sigPreview, setSigPreview] = useState<string | null>(settings.signature);
  const [letterheadPreview, setLetterheadPreview] = useState<string | null>(settings.letterhead);
  const [newTerm, setNewTerm] = useState('');
  const [newFy, setNewFy] = useState('');
  const logoRef = useRef<HTMLInputElement>(null);
  const sigRef = useRef<HTMLInputElement>(null);
  const letterheadRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSettingsFromFirebase();
  }, []);

  useEffect(() => {
    setFormData(settings);
    setLogoPreview(settings.logo);
    setSigPreview(settings.signature);
    setLetterheadPreview(settings.letterhead);
  }, [settings]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'signature' | 'letterhead') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      toast.error('Max 500KB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      if (type === 'logo') setLogoPreview(result);
      if (type === 'signature') setSigPreview(result);
      if (type === 'letterhead') setLetterheadPreview(result);
      setFormData(prev => ({ ...prev, [type]: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    updateSettings(formData);
    await saveSettingsToFirebase();
    toast.success('Settings saved');
  };

  const addTerm = () => {
    if (!newTerm.trim()) return;
    setFormData(prev => ({ ...prev, termsAndConditions: [...prev.termsAndConditions, newTerm.trim()] }));
    setNewTerm('');
  };

  const removeTerm = (idx: number) => {
    setFormData(prev => ({ ...prev, termsAndConditions: prev.termsAndConditions.filter((_, i) => i !== idx) }));
  };

  const addFinancialYear = () => {
    if (!newFy.match(/^\d{4}-\d{4}$/)) {
      toast.error('Format: YYYY-YYYY');
      return;
    }
    const years = [...(formData.financialYears || []), newFy].sort();
    setFormData(prev => ({ ...prev, financialYears: years }));
    setNewFy('');
    toast.success('Year added');
  };

  const removeFinancialYear = (fy: string) => {
    setFormData(prev => ({ ...prev, financialYears: (prev.financialYears || []).filter(y => y !== fy) }));
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="space-y-6">
        {/* Logo Upload */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">Company Logo (max 500KB)</label>
          <div
            onClick={() => logoRef.current?.click()}
            className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer hover:border-rose-500 transition-colors overflow-hidden bg-gray-50"
          >
            {logoPreview ? <img src={logoPreview} className="w-full h-full object-contain" /> : <Upload className="w-6 h-6 text-gray-400" />}
          </div>
          <p className="text-xs text-gray-500 mt-2">PNG or JPG, max 500KB. Shows on contract top-left.</p>
          <input ref={logoRef} type="file" accept="image/*" onChange={e => handleImageUpload(e, 'logo')} className="hidden" />
        </div>

        {/* Letterhead Upload - NEW */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">Letterhead (max 500KB)</label>
          <div
            onClick={() => letterheadRef.current?.click()}
            className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer hover:border-rose-500 transition-colors overflow-hidden bg-gray-50"
          >
            {letterheadPreview ? (
              <img src={letterheadPreview} className="w-full h-full object-contain" />
            ) : (
              <div className="text-center">
                <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                <p className="text-xs text-gray-500">Upload your pre-printed letterhead</p>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            This will leave the top area blank in PDFs so you can print on your physical letterhead.
          </p>
          <input ref={letterheadRef} type="file" accept="image/*" onChange={e => handleImageUpload(e, 'letterhead')} className="hidden" />
        </div>

        {/* Digital Signature Upload */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">Digital Signature (max 500KB, transparent PNG preferred)</label>
          <div
            onClick={() => sigRef.current?.click()}
            className="w-32 h-16 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer hover:border-rose-500 transition-colors overflow-hidden bg-gray-50"
          >
            {sigPreview ? <img src={sigPreview} className="w-full h-full object-contain" /> : <Upload className="w-6 h-6 text-gray-400" />}
          </div>
          <p className="text-xs text-gray-500 mt-2">Upload your scanned signature. Shows on contract footer.</p>
          <input ref={sigRef} type="file" accept="image/*" onChange={e => handleImageUpload(e, 'signature')} className="hidden" />
        </div>

        {/* Company Details */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold text-sm">Company Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Display Name</label>
              <input
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Legal Name</label>
              <input
                value={formData.legalName}
                onChange={e => setFormData({ ...formData, legalName: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Address</label>
            <textarea
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              rows={2}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <input
              value={formData.city}
              onChange={e => setFormData({ ...formData, city: e.target.value })}
              placeholder="City"
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
            <input
              value={formData.state}
              onChange={e => setFormData({ ...formData, state: e.target.value })}
              placeholder="State"
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
            <input
              value={formData.pincode}
              onChange={e => setFormData({ ...formData, pincode: e.target.value })}
              placeholder="Pincode"
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
            <input
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Phone"
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input
              value={formData.gstin}
              onChange={e => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
              placeholder="GSTIN"
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm uppercase"
            />
            <input
              value={formData.pan}
              onChange={e => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
              placeholder="PAN"
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm uppercase"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              placeholder="Email"
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
            <input
              value={formData.bankName}
              onChange={e => setFormData({ ...formData, bankName: e.target.value })}
              placeholder="Bank Name"
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input
              value={formData.bankAccount}
              onChange={e => setFormData({ ...formData, bankAccount: e.target.value })}
              placeholder="Account Number"
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
            <input
              value={formData.bankIfsc}
              onChange={e => setFormData({ ...formData, bankIfsc: e.target.value.toUpperCase() })}
              placeholder="IFSC Code"
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm uppercase"
            />
          </div>
        </div>

        {/* Default Values */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold text-sm">Default Contract Values</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Default GST %</label>
              <input
                type="number"
                step="0.01"
                value={formData.defaultGstPercent}
                onChange={e => setFormData({ ...formData, defaultGstPercent: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Default Payment Terms</label>
              <input
                value={formData.defaultPaymentTerms}
                onChange={e => setFormData({ ...formData, defaultPaymentTerms: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Default Loading Condition</label>
              <input
                value={formData.defaultLoadingCondition}
                onChange={e => setFormData({ ...formData, defaultLoadingCondition: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Default Packing</label>
              <input
                value={formData.defaultPacking}
                onChange={e => setFormData({ ...formData, defaultPacking: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
              />
            </div>
          </div>
        </div>

        {/* Financial Years - NEW */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold text-sm">Financial Years</h3>
          <div className="flex flex-wrap gap-2">
            {(formData.financialYears || []).map(fy => (
              <span key={fy} className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 text-rose-700 text-sm rounded-lg">
                {fy}
                <button onClick={() => removeFinancialYear(fy)} className="hover:text-rose-900">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newFy}
              onChange={e => setNewFy(e.target.value)}
              placeholder="2026-2027"
              className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
            <button
              onClick={addFinancialYear}
              className="flex items-center gap-1 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold text-sm">Terms & Conditions</h3>
          <div className="space-y-2">
            {formData.termsAndConditions.map((term, idx) => (
              <div key={idx} className="flex items-start gap-2 p-3 bg-gray-50 rounded-xl">
                <span className="text-sm text-gray-600 flex-1">{term}</span>
                <button onClick={() => removeTerm(idx)} className="p-1 text-gray-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newTerm}
              onChange={e => setNewTerm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTerm()}
              placeholder="Add new term..."
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
            <button
              onClick={addTerm}
              className="flex items-center gap-1 px-4 py-3 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-3 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700"
        >
          <Save className="w-4 h-4" /> Save Settings
        </button>
      </div>
    </div>
  );
}
