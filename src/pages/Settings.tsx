import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../hooks/useAuthStore';
import { Upload, Save, Trash2, Plus, X, AlertTriangle, RefreshCw, Type, CheckCircle } from 'lucide-react';
import { clearAppCache, checkForUpdate, markVersionSeen } from '../utils/cacheManager';
import toast from 'react-hot-toast';
import { getStoredFont, saveFont, removeFont, onFontChange, type FontMeta } from '../contractNote/fontStore';
import { checkFont, parseFont } from '../contractNote/engine';
import { FONT_REF } from '../contractNote/data';
import { Page, Button } from '../ui';
import RemindersSettings from '../reminders/RemindersSettings';
import { useLocation } from 'react-router-dom';

export default function Settings() {
  const { settings, updateSettings, saveSettingsToFirebase, loadSettingsFromFirebase } = useAppStore();
  const [formData, setFormData] = useState(settings);
  const [logoPreview, setLogoPreview] = useState<string | null>(settings.logo);
  const [sigPreview, setSigPreview] = useState<string | null>(settings.signature);
  const [letterheadPreview, setLetterheadPreview] = useState<string | null>(settings.letterhead);
  const [newTerm, setNewTerm] = useState('');
  const [newFy, setNewFy] = useState('');
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const sigRef = useRef<HTMLInputElement>(null);
  const letterheadRef = useRef<HTMLInputElement>(null);
  const fontRef = useRef<HTMLInputElement>(null);
  const [fontMeta, setFontMeta] = useState<FontMeta | null | undefined>(undefined);
  const [fontBusy, setFontBusy] = useState(false);
  const boldRef = useRef<HTMLInputElement>(null);
  const [boldMeta, setBoldMeta] = useState<FontMeta | null | undefined>(undefined);

  useEffect(() => {
    loadSettingsFromFirebase();
  }, []);

  // /settings#reminders scrolls straight to the reminders
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' }), 60);
    return () => clearTimeout(t);
  }, [hash]);

  useEffect(() => {
    const load = () => getStoredFont().then(f => setFontMeta(f ? f.meta : null)).catch(() => setFontMeta(null));
    const loadBold = () => getStoredFont('bold').then(f => setBoldMeta(f ? f.meta : null)).catch(() => setBoldMeta(null));
    load();
    loadBold();
    const off = onFontChange(() => { load(); loadBold(); });
    return off;
  }, []);

  const handleBoldPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setFontBusy(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const font = await parseFont(bytes);
      const isBold = /bold/i.test((font.subfamilyName || '') + ' ' + (font.fullName || ''));
      if (!isBold && !confirm('This does not look like a Bold font (' + (font.fullName || file.name) + '). Use it anyway for the headings on bills?')) return;
      await saveFont(bytes, file.name, font.fullName, 'bold');
      toast.success('Verdana Bold saved. Bills will use it for headings.');
    } catch (err) {
      console.error(err);
      toast.error('Could not read or save that font file.');
    } finally {
      setFontBusy(false);
    }
  };

  const handleBoldRemove = async () => {
    if (!confirm('Remove Verdana Bold? Bill headings will use a thickened regular font instead.')) return;
    setFontBusy(true);
    try { await removeFont('bold'); toast.success('Bold font removed'); } catch { toast.error('Could not remove'); } finally { setFontBusy(false); }
  };

  const handleFontPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setFontBusy(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const font = await parseFont(bytes);
      const chk = checkFont(font, FONT_REF);
      if (!chk.ok && !confirm('This file is not identical to the font used in your contract design:\n\n- ' + chk.problems.join('\n- ') + '\n\nUse it anyway? (Spacing may differ from the original.)')) return;
      await saveFont(bytes, file.name, font.fullName);
      toast.success('Verdana saved. Contract notes are ready.');
    } catch (err) {
      console.error(err);
      toast.error('Could not read or save that font file.');
    } finally {
      setFontBusy(false);
    }
  };

  const handleFontRemove = async () => {
    if (!confirm('Remove the stored Verdana font? Contract notes cannot be created until you add it again.')) return;
    setFontBusy(true);
    try { await removeFont(); toast.success('Font removed'); } catch { toast.error('Could not remove'); } finally { setFontBusy(false); }
  };

  useEffect(() => {
    setFormData(settings);
    setLogoPreview(settings.logo);
    setSigPreview(settings.signature);
    setLetterheadPreview(settings.letterhead);
  }, [settings]);

  useEffect(() => {
    setUpdateAvailable(checkForUpdate());
  }, []);

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

  const removeImage = (type: 'logo' | 'signature' | 'letterhead') => {
    if (type === 'logo') { setLogoPreview(null); setFormData(prev => ({ ...prev, logo: '' })); }
    if (type === 'signature') { setSigPreview(null); setFormData(prev => ({ ...prev, signature: '' })); }
    if (type === 'letterhead') { setLetterheadPreview(null); setFormData(prev => ({ ...prev, letterhead: '' })); }
  };

  const handleSave = async () => {
    updateSettings(JSON.parse(JSON.stringify(formData))); // Firestore does not accept "undefined" values
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

  const handleUpdateNow = async () => {
    markVersionSeen();
    setUpdateAvailable(false);
    await clearAppCache();
  };

  const handleClearCache = async () => {
    if (confirm('This will clear the app cache and reload the page. Your data is safe. Continue?')) {
      await clearAppCache();
    }
  };

  return (
    <Page title="Settings" width="narrow">
      <div className="space-y-4 lg:space-y-5">
        <RemindersSettings />

        {/* Logo Upload */}
        <div className="card p-4 lg:p-6">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">Company Logo (max 500KB)</label>
            {logoPreview && (
              <button
                onClick={() => removeImage('logo')}
                className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
            )}
          </div>
          <div
            onClick={() => logoRef.current?.click()}
            className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer hover:border-rose-500 transition-colors overflow-hidden bg-gray-50"
          >
            {logoPreview ? <img src={logoPreview} className="w-full h-full object-contain" /> : <Upload className="w-6 h-6 text-gray-400" />}
          </div>
          <p className="text-xs text-gray-500 mt-2">PNG or JPG, max 500KB. Shows on contract top-left.</p>
          <input ref={logoRef} type="file" accept="image/*" onChange={e => handleImageUpload(e, 'logo')} className="hidden" />
        </div>

        {/* Letterhead Upload */}
        <div className="card p-4 lg:p-6">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">Letterhead (max 500KB)</label>
            {letterheadPreview && (
              <button
                onClick={() => removeImage('letterhead')}
                className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
            )}
          </div>
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
        <div className="card p-4 lg:p-6">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">Digital Signature (max 500KB, transparent PNG preferred)</label>
            {sigPreview && (
              <button
                onClick={() => removeImage('signature')}
                className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
            )}
          </div>
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
        <div className="card p-4 lg:p-6 space-y-4">
          <h3 className="font-semibold text-sm">Company Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Display Name</label>
              <input
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Legal Name</label>
              <input
                value={formData.legalName}
                onChange={e => setFormData({ ...formData, legalName: e.target.value })}
                className="input-field"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Address</label>
            <textarea
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              rows={2}
              className="input-field"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <input
              value={formData.city}
              onChange={e => setFormData({ ...formData, city: e.target.value })}
              placeholder="City"
              className="input-field"
            />
            <input
              value={formData.state}
              onChange={e => setFormData({ ...formData, state: e.target.value })}
              placeholder="State"
              className="input-field"
            />
            <input
              value={formData.pincode}
              onChange={e => setFormData({ ...formData, pincode: e.target.value })}
              placeholder="Pincode"
              className="input-field"
            />
            <input
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Phone"
              className="input-field"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input
              value={formData.gstin}
              onChange={e => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
              placeholder="GSTIN"
              className="input-field uppercase"
            />
            <input
              value={formData.pan}
              onChange={e => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
              placeholder="PAN"
              className="input-field uppercase"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              placeholder="Email"
              className="input-field"
            />
            <input
              value={formData.bankName}
              onChange={e => setFormData({ ...formData, bankName: e.target.value })}
              placeholder="Bank Name"
              className="input-field"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input
              value={formData.bankAccount}
              onChange={e => setFormData({ ...formData, bankAccount: e.target.value })}
              placeholder="Account Number"
              className="input-field"
            />
            <input
              value={formData.bankIfsc}
              onChange={e => setFormData({ ...formData, bankIfsc: e.target.value.toUpperCase() })}
              placeholder="IFSC Code"
              className="input-field uppercase"
            />
          </div>
        </div>

        {/* Brokerage bills & invoices */}
        <div className="card p-4 lg:p-6 space-y-4">
          <h3 className="font-semibold text-sm">Brokerage Bills &amp; Invoices</h3>
          <p className="text-xs text-gray-500">
            Printed on the bills and invoices together with the PAN and bank details above. The PAN you set here is the one on the bills.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Account holder name (as in the bank)</label>
              <input
                value={formData.bankAccountName || ''}
                onChange={e => setFormData({ ...formData, bankAccountName: e.target.value })}
                placeholder="e.g. MAHALAXMI AGRI COMMODITIES"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Bank branch</label>
              <input
                value={formData.bankBranch || ''}
                onChange={e => setFormData({ ...formData, bankBranch: e.target.value })}
                placeholder="e.g. Rajkot Main Branch"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Next invoice number starts at</label>
              <input
                type="number"
                min="1"
                inputMode="numeric"
                value={formData.invoiceStartNumber || ''}
                onChange={e => setFormData({ ...formData, invoiceStartNumber: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
                placeholder="1"
                className="input-field"
              />
              <p className="text-[11px] text-gray-400 mt-1">Numbers continue from the highest one already used. Use this to carry on from your paper books.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Subject to ___ Jurisdiction</label>
              <input
                value={formData.jurisdiction || ''}
                onChange={e => setFormData({ ...formData, jurisdiction: e.target.value })}
                placeholder="RAJKOT"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">GST on brokerage (%)</label>
              <input
                type="number"
                min="0"
                step="0.5"
                inputMode="decimal"
                value={formData.brokerageGstPercent || ''}
                onChange={e => setFormData({ ...formData, brokerageGstPercent: Math.max(0, Number(e.target.value) || 0) })}
                placeholder="0 (none)"
                className="input-field"
              />
              <p className="text-[11px] text-gray-400 mt-1">Leave empty if you do not charge GST on brokerage. It can also be changed on the Brokerage Bills screen.</p>
            </div>
          </div>
        </div>

        {/* Default Values */}
        <div className="card p-4 lg:p-6 space-y-4">
          <h3 className="font-semibold text-sm">Default Contract Values</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Default GST %</label>
              <input
                type="number"
                step="0.01"
                value={formData.defaultGstPercent}
                onChange={e => setFormData({ ...formData, defaultGstPercent: parseFloat(e.target.value) || 0 })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Default Payment Terms</label>
              <input
                value={formData.defaultPaymentTerms}
                onChange={e => setFormData({ ...formData, defaultPaymentTerms: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Default Loading Condition</label>
              <input
                value={formData.defaultLoadingCondition}
                onChange={e => setFormData({ ...formData, defaultLoadingCondition: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Default Packing</label>
              <input
                value={formData.defaultPacking}
                onChange={e => setFormData({ ...formData, defaultPacking: e.target.value })}
                className="input-field"
              />
            </div>
          </div>
        </div>

        {/* Financial Years */}
        <div className="card p-4 lg:p-6 space-y-4">
          <h3 className="font-semibold text-sm">Financial Years</h3>
          <div className="flex flex-wrap gap-2">
            {(formData.financialYears || []).map(fy => (
              <span key={fy} className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 text-rose-700 text-sm rounded-lg">
                {fy}
                <button onClick={() => removeFinancialYear(fy)} aria-label={`Remove ${fy}`} className="hover:text-rose-900 p-2 -m-1.5">
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
        <div className="card p-4 lg:p-6 space-y-4">
          <h3 className="font-semibold text-sm">Terms & Conditions</h3>
          <div className="space-y-2">
            {formData.termsAndConditions.map((term, idx) => (
              <div key={idx} className="flex items-start gap-2 p-3 bg-gray-50 rounded-xl">
                <span className="text-sm text-gray-600 flex-1">{term}</span>
                <button onClick={() => removeTerm(idx)} aria-label="Remove this term" className="p-2.5 -m-1 text-gray-400 hover:text-red-600">
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
              className="input-field flex-1 min-w-0"
            />
            <button
              onClick={addTerm}
              aria-label="Add term"
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Contract Note font */}
        <div className="card p-4 lg:p-6 space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2"><Type className="w-4 h-4" /> Contract Note font (Verdana)</h3>
          <p className="text-xs text-gray-500">
            The exact-format Contract Note is printed in Verdana, the font of your design. Add the font file once (regular <b>Verdana.ttf</b>).
            It is stored privately in your own Firebase, so your iPhone and the website both use it. Nothing is added to the public code.
          </p>
          {fontMeta ? (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 min-w-0 truncate">Added: {fontMeta.fullName || fontMeta.fileName} ({Math.round(fontMeta.size / 1024)} KB)</span>
            </div>
          ) : fontMeta === null ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              No font added yet. On Windows it is at <code>C:\Windows\Fonts\verdana.ttf</code>; on a Mac it is in Font Book (right-click Verdana, Show in Finder) or <code>/System/Library/Fonts/Supplemental/Verdana.ttf</code>.
            </div>
          ) : null}
          <div className="flex gap-2">
            <button
              onClick={() => fontRef.current?.click()}
              disabled={fontBusy}
              className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" /> {fontMeta ? 'Replace font' : 'Add Verdana font'}
            </button>
            {fontMeta && (
              <button onClick={handleFontRemove} disabled={fontBusy} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-700 bg-white border border-red-200 rounded-xl hover:bg-red-50 disabled:opacity-50">
                <Trash2 className="w-4 h-4" /> Remove
              </button>
            )}
          </div>
          <input ref={fontRef} type="file" accept=".ttf,.otf,font/ttf,font/otf,application/x-font-ttf" onChange={handleFontPick} className="hidden" />

          <div className="pt-3 mt-1 border-t border-gray-100 space-y-2">
            <p className="text-xs text-gray-500">
              <b>Optional:</b> add <b>Verdana Bold</b> (<code>verdanab.ttf</code>) for the headings on Brokerage Bills and Invoices. Without it, headings use a slightly thickened regular font.
            </p>
            {boldMeta && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 min-w-0 truncate">Added: {boldMeta.fullName || boldMeta.fileName} ({Math.round(boldMeta.size / 1024)} KB)</span>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => boldRef.current?.click()}
                disabled={fontBusy}
                className="flex items-center gap-2 px-4 py-2.5 bg-white text-rose-700 border border-rose-200 rounded-xl text-sm font-medium hover:bg-rose-50 disabled:opacity-50"
              >
                <Upload className="w-4 h-4" /> {boldMeta ? 'Replace Bold font' : 'Add Verdana Bold'}
              </button>
              {boldMeta && (
                <button onClick={handleBoldRemove} disabled={fontBusy} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-700 bg-white border border-red-200 rounded-xl hover:bg-red-50 disabled:opacity-50">
                  <Trash2 className="w-4 h-4" /> Remove
                </button>
              )}
            </div>
            <input ref={boldRef} type="file" accept=".ttf,.otf,font/ttf,font/otf,application/x-font-ttf" onChange={handleBoldPick} className="hidden" />
          </div>
        </div>

        {/* ─── SYSTEM SECTION ─── */}
        <div className="card p-4 lg:p-6 space-y-4">
          <h3 className="font-semibold text-sm">System</h3>

          {updateAvailable && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800">
                  A new version of the app is available.
                </p>
                <button
                  onClick={handleUpdateNow}
                  className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700"
                >
                  <RefreshCw className="w-4 h-4" />
                  Update Now
                </button>
              </div>
            </div>
          )}

          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Clear App Cache</p>
                <p className="text-xs text-gray-500 mt-1">
                  Delete cached files and load the latest version. Your contracts and parties are safe.
                </p>
              </div>
              <button
                onClick={handleClearCache}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-200 rounded-md hover:bg-red-50 flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
                Clear Cache
              </button>
            </div>
          </div>
        </div>

        <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] lg:bottom-0 z-20 -mx-4 lg:mx-0 px-4 lg:px-0 py-3 bg-gradient-to-t from-slate-50 via-slate-50 to-slate-50/0">
          <Button variant="primary" className="w-full lg:w-auto lg:px-8" icon={<Save size={16} />} onClick={handleSave}>Save settings</Button>
        </div>
      </div>
    </Page>
  );
}
