import { useState, useRef } from 'react';
import { useAppStore } from '../hooks/useAuthStore';
import { Save, Upload, X, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Settings() {
  const { settings, updateSettings, saveSettingsToFirebase } = useAppStore();
  const [formData, setFormData] = useState({ ...settings });
  const [saving, setSaving] = useState(false);
  const [newYear, setNewYear] = useState('');
  const logoRef = useRef<HTMLInputElement>(null);
  const sigRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(settings.logo);
  const [sigPreview, setSigPreview] = useState<string | null>(settings.signature);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'signature') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      toast.error('File too large. Max 500KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (type === 'logo') {
        setLogoPreview(result);
        setFormData(prev => ({ ...prev, logo: result }));
      } else {
        setSigPreview(result);
        setFormData(prev => ({ ...prev, signature: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      updateSettings(formData);
      await saveSettingsToFirebase();
      toast.success('Settings saved');
    } catch (err) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const addFinancialYear = () => {
    if (!newYear.match(/^\d{4}-\d{4}$/)) {
      toast.error('Format: 2026-2027');
      return;
    }
    const years = [...(formData.financialYears || []), newYear];
    setFormData(prev => ({ ...prev, financialYears: years }));
    setNewYear('');
    toast.success('Year added');
  };

  const removeFinancialYear = (year: string) => {
    const years = (formData.financialYears || []).filter(y => y !== year);
    setFormData(prev => ({ ...prev, financialYears: years }));
  };

  const addTerm = () => {
    setFormData(prev => ({
      ...prev,
      termsAndConditions: [...(prev.termsAndConditions || []), '']
    }));
  };

  const updateTerm = (index: number, value: string) => {
    const terms = [...(formData.termsAndConditions || [])];
    terms[index] = value;
    setFormData(prev => ({ ...prev, termsAndConditions: terms }));
  };

  const removeTerm = (index: number) => {
    const terms = (formData.termsAndConditions || []).filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, termsAndConditions: terms }));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Company profile and defaults</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
        {/* Logo Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Company Logo (max 500KB)</label>
          <div
            onClick={() => logoRef.current?.click()}
            className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer hover:border-rose-500 transition-colors overflow-hidden bg-gray-50"
          >
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <Upload className="w-6 h-6 text-gray-400" />
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">PNG or JPG, max 500KB. Shows on contract top-left.</p>
          <input ref={logoRef} type="file" accept="image/*" onChange={e => handleImageUpload(e, 'logo')} className="hidden" />
        </div>

        {/* Digital Signature Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Digital Signature (max 500KB, transparent PNG preferred)</label>
          <div
            onClick={() => sigRef.current?.click()}
            className="w-32 h-16 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer hover:border-rose-500 transition-colors overflow-hidden bg-gray-50"
          >
            {sigPreview ? (
              <img src={sigPreview} alt="Signature" className="w-full h-full object-contain" />
            ) : (
              <Upload className="w-5 h-5 text-gray-400" />
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">Upload your scanned signature. Shows on contract footer.</p>
          <input ref={sigRef} type="file" accept="image/*" onChange={e => handleImageUpload(e, 'signature')} className="hidden" />
        </div>

        {/* Company Details */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Display Name</label>
            <input
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Legal Name</label>
            <input
              value={formData.legalName}
              onChange={e => setFormData({ ...formData, legalName: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
          <textarea
            value={formData.address}
            onChange={e => setFormData({ ...formData, address: e.target.value })}
            rows={2}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none resize-none"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
            <input
              value={formData.city}
              onChange={e => setFormData({ ...formData, city: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">State</label>
            <input
              value={formData.state}
              onChange={e => setFormData({ ...formData, state: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Pincode</label>
            <input
              value={formData.pincode}
              onChange={e => setFormData({ ...formData, pincode: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
            <input
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">GSTIN</label>
            <input
              value={formData.gstin}
              onChange={e => setFormData({ ...formData, gstin: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm uppercase focus:ring-2 focus:ring-rose-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">PAN</label>
            <input
              value={formData.pan}
              onChange={e => setFormData({ ...formData, pan: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm uppercase focus:ring-2 focus:ring-rose-500 outline-none"
            />
          </div>
        </div>

        {/* Financial Years */}
        <div className="border-t border-gray-100 pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Financial Years</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {(formData.financialYears || []).map(year => (
              <span key={year} className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-lg text-sm text-gray-700">
                {year}
                <button onClick={() => removeFinancialYear(year)} className="text-gray-400 hover:text-red-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newYear}
              onChange={e => setNewYear(e.target.value)}
              placeholder="2026-2027"
              className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
            />
            <button
              onClick={addFinancialYear}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        </div>

        {/* Default Terms */}
        <div className="border-t border-gray-100 pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Default Terms</label>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">Default GST %</label>
                <input
                  type="number"
                  value={formData.defaultGstPercent}
                  onChange={e => setFormData({ ...formData, defaultGstPercent: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Default Packing</label>
                <input
                  value={formData.defaultPacking}
                  onChange={e => setFormData({ ...formData, defaultPacking: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500">Default Payment Terms</label>
              <input
                value={formData.defaultPaymentTerms}
                onChange={e => setFormData({ ...formData, defaultPaymentTerms: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Default Loading Condition</label>
              <input
                value={formData.defaultLoadingCondition}
                onChange={e => setFormData({ ...formData, defaultLoadingCondition: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Terms & Conditions</label>
            <button
              onClick={addTerm}
              className="flex items-center gap-1 text-sm text-rose-600 hover:text-rose-700 font-medium"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
          <div className="space-y-2">
            {(formData.termsAndConditions || []).map((term, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={term}
                  onChange={e => updateTerm(i, e.target.value)}
                  placeholder={`Term ${i + 1}`}
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                />
                <button
                  onClick={() => removeTerm(i)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
