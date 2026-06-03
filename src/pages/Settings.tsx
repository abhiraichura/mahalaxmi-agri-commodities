import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../hooks/useAuthStore';
import { Upload, Building2, Save, Trash2, Plus, X, Key, PenTool } from 'lucide-react';
import { setDocData, COLLECTIONS, db } from '../utils/firebase';
import { doc, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function Settings() {
  const { settings, updateSettings, user, saveSettingsToFirebase } = useAppStore();
  const [formData, setFormData] = useState(settings);
  const [logoPreview, setLogoPreview] = useState(settings.logo);
  const [sigPreview, setSigPreview] = useState(settings.signature);
  const [logoLoading, setLogoLoading] = useState(false);
  const [sigLoading, setSigLoading] = useState(false);
  const [newTerm, setNewTerm] = useState('');
  const [gstApiKey, setGstApiKey] = useState(localStorage.getItem('gst_api_key') || '');
  const logoRef = useRef<HTMLInputElement>(null);
  const sigRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'signature') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) { toast.error('Image must be under 500KB'); return; }

    const setLoading = type === 'logo' ? setLogoLoading : setSigLoading;
    const setPreview = type === 'logo' ? setLogoPreview : setSigPreview;
    const field = type === 'logo' ? 'logo' : 'signature';

    setLoading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const result = reader.result as string;
      setPreview(result);
      setFormData(prev => ({ ...prev, [field]: result }));
      if (user?.uid) {
        try {
          await setDoc(doc(db, type === 'logo' ? COLLECTIONS.LOGOS : COLLECTIONS.SIGNATURES, user.uid), {
            image: result, updatedAt: new Date()
          });
          toast.success(`${type === 'logo' ? 'Logo' : 'Signature'} saved!`);
        } catch (e) { toast.error('Failed to save'); }
      }
      setLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    updateSettings(formData);
    localStorage.setItem('gst_api_key', gstApiKey);
    try {
      await saveSettingsToFirebase();
      toast.success('Settings saved!');
    } catch (e) { toast.success('Settings saved locally'); }
  };

  const addTerm = () => {
    if (newTerm.trim()) {
      setFormData({ ...formData, termsAndConditions: [...formData.termsAndConditions, newTerm.trim()] });
      setNewTerm('');
    }
  };

  const removeTerm = (index: number) => {
    setFormData({ ...formData, termsAndConditions: formData.termsAndConditions.filter((_, i) => i !== index) });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage company details, branding, and preferences</p>
      </div>

      {/* GST API Key */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Key className="w-5 h-5 text-amber-600" /> GST Verification API Key
        </h2>
        <div className="space-y-3">
          <input type="text" value={gstApiKey} onChange={e => setGstApiKey(e.target.value)}
            placeholder="Enter your GST API key from gstincheck.co.in"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          <p className="text-xs text-gray-500">
            Get free API key at <a href="https://gstincheck.co.in" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline font-medium">gstincheck.co.in</a>
            . Enter your email and they will send you a key (20 free verifications).
          </p>
        </div>
      </div>

      {/* Company Branding */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-rose-600" /> Company Branding
        </h2>

        <div className="space-y-6">
          {/* Logo Upload */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Company Logo <span className="text-xs text-gray-400 font-normal">(max 500KB)</span></label>
            <div className="flex items-center gap-4">
              <div onClick={() => logoRef.current?.click()}
                className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer hover:border-rose-500 transition-colors overflow-hidden bg-gray-50">
                {logoPreview ? <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" /> : <Upload className="w-6 h-6 text-gray-400" />}
              </div>
              <div>
                <button onClick={() => logoRef.current?.click()} disabled={logoLoading}
                  className="px-4 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 disabled:opacity-50">
                  {logoLoading ? 'Uploading...' : 'Upload Logo'}
                </button>
                <p className="text-xs text-gray-500 mt-1">PNG or JPG, max 500KB. Shows on contract top-left.</p>
              </div>
              <input ref={logoRef} type="file" accept="image/*" onChange={e => handleImageUpload(e, 'logo')} className="hidden" />
            </div>
          </div>

          {/* Digital Signature Upload */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Digital Signature <span className="text-xs text-gray-400 font-normal">(max 500KB, transparent PNG preferred)</span></label>
            <div className="flex items-center gap-4">
              <div onClick={() => sigRef.current?.click()}
                className="w-32 h-16 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer hover:border-rose-500 transition-colors overflow-hidden bg-gray-50">
                {sigPreview ? <img src={sigPreview} alt="Signature" className="w-full h-full object-contain" /> : <PenTool className="w-6 h-6 text-gray-400" />}
              </div>
              <div>
                <button onClick={() => sigRef.current?.click()} disabled={sigLoading}
                  className="px-4 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 disabled:opacity-50">
                  {sigLoading ? 'Uploading...' : 'Upload Signature'}
                </button>
                <p className="text-xs text-gray-500 mt-1">Upload your scanned signature. Shows on contract footer.</p>
              </div>
              <input ref={sigRef} type="file" accept="image/*" onChange={e => handleImageUpload(e, 'signature')} className="hidden" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div><label className="text-sm font-medium text-gray-700 mb-2 block">Display Name</label>
              <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700 mb-2 block">Legal Name</label>
              <input value={formData.legalName} onChange={e => setFormData({ ...formData, legalName: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" /></div>
          </div>

          <div><label className="text-sm font-medium text-gray-700 mb-2 block">Address</label>
            <textarea value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} rows={2} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none" /></div>

          <div className="grid md:grid-cols-3 gap-4">
            <div><label className="text-sm font-medium text-gray-700 mb-2 block">City</label>
              <input value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700 mb-2 block">State</label>
              <input value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700 mb-2 block">Pincode</label>
              <input value={formData.pincode} onChange={e => setFormData({ ...formData, pincode: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" /></div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div><label className="text-sm font-medium text-gray-700 mb-2 block">Phone</label>
              <input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700 mb-2 block">Email</label>
              <input value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" /></div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div><label className="text-sm font-medium text-gray-700 mb-2 block">GSTIN</label>
              <input value={formData.gstin} onChange={e => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })} maxLength={15} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm uppercase" /></div>
            <div><label className="text-sm font-medium text-gray-700 mb-2 block">PAN</label>
              <input value={formData.pan} onChange={e => setFormData({ ...formData, pan: e.target.value.toUpperCase() })} maxLength={10} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm uppercase" /></div>
          </div>
        </div>
      </div>

      {/* Default Settings */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Default Contract Settings</h2>
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div><label className="text-sm font-medium text-gray-700 mb-2 block">Default GST %</label>
              <input type="number" step="0.01" value={formData.defaultGstPercent} onChange={e => setFormData({ ...formData, defaultGstPercent: parseFloat(e.target.value) })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700 mb-2 block">Financial Year Start</label>
              <input type="number" value={formData.financialYearStart} onChange={e => setFormData({ ...formData, financialYearStart: parseInt(e.target.value) })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" /></div>
          </div>
          <div><label className="text-sm font-medium text-gray-700 mb-2 block">Default Payment Terms</label>
            <input value={formData.defaultPaymentTerms} onChange={e => setFormData({ ...formData, defaultPaymentTerms: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" /></div>
          <div><label className="text-sm font-medium text-gray-700 mb-2 block">Default Loading Condition</label>
            <input value={formData.defaultLoadingCondition} onChange={e => setFormData({ ...formData, defaultLoadingCondition: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" /></div>
          <div><label className="text-sm font-medium text-gray-700 mb-2 block">Default Packing</label>
            <input value={formData.defaultPacking} onChange={e => setFormData({ ...formData, defaultPacking: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" /></div>
        </div>
      </div>

      {/* Terms & Conditions */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Terms & Conditions</h2>
        <div className="space-y-3">
          {formData.termsAndConditions.map((term, index) => (
            <div key={index} className="flex items-start gap-2">
              <span className="text-sm text-gray-500 mt-2">{index + 1}.</span>
              <p className="flex-1 text-sm text-gray-700 py-2">{term}</p>
              <button onClick={() => removeTerm(index)} className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          <div className="flex gap-2 mt-4">
            <input value={newTerm} onChange={e => setNewTerm(e.target.value)} placeholder="Add new term..." onKeyPress={e => e.key === 'Enter' && addTerm()}
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            <button onClick={addTerm} className="px-4 py-3 bg-rose-50 text-rose-700 rounded-xl text-sm font-medium hover:bg-rose-100"><Plus className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* Bank Details */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Bank Details</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div><label className="text-sm font-medium text-gray-700 mb-2 block">Bank Name</label>
            <input value={formData.bankName} onChange={e => setFormData({ ...formData, bankName: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" /></div>
          <div><label className="text-sm font-medium text-gray-700 mb-2 block">Account Number</label>
            <input value={formData.bankAccount} onChange={e => setFormData({ ...formData, bankAccount: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" /></div>
          <div><label className="text-sm font-medium text-gray-700 mb-2 block">IFSC Code</label>
            <input value={formData.bankIfsc} onChange={e => setFormData({ ...formData, bankIfsc: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" /></div>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} className="px-8 py-3 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700 transition-colors flex items-center gap-2">
          <Save className="w-4 h-4" /> Save All Settings
        </button>
      </div>
    </div>
  );
}
