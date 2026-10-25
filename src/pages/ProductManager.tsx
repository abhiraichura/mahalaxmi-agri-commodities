import { useState } from 'react';
import { useAppStore } from '../hooks/useAuthStore';
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { Quality, SpecField } from '../types';
import { Page, Button, EmptyState } from '../ui';

export default function ProductManager() {
  const { products, addProduct, updateProduct, deleteProduct } = useAppStore();
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');

  const [brokerage, setBrokerage] = useState({
    buyer: { type: 'percent' as 'percent' | 'fixed', value: 0 },
    seller: { type: 'percent' as 'percent' | 'fixed', value: 0 }
  });

  const [qualities, setQualities] = useState<Quality[]>([]);

  const resetForm = () => {
    setName('');
    setBrokerage({
      buyer: { type: 'percent', value: 0 },
      seller: { type: 'percent', value: 0 }
    });
    setQualities([]);
    setEditing(null);
  };

  const startEdit = (product: any) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setEditing(product.id);
    setName(product.name);
    const b = product.brokerage || {
      buyer: { type: 'percent', value: product.defaultBrokerage || 0 },
      seller: { type: 'percent', value: product.defaultBrokerage || 0 }
    };
    setBrokerage({
      buyer: { type: b.buyer?.type || 'percent', value: b.buyer?.value || b.buyerPercent || 0 },
      seller: { type: b.seller?.type || 'percent', value: b.seller?.value || b.sellerPercent || 0 }
    });

    // Backward compat: if no qualities but has specs, create default quality
    if (product.qualities && product.qualities.length > 0) {
      setQualities(product.qualities);
    } else if (product.specs && product.specs.length > 0) {
      setQualities([{ id: uuidv4(), name: 'Standard', specs: product.specs }]);
    } else {
      setQualities([]);
    }
  };

  const addQuality = () => {
    const newQuality: Quality = {
      id: uuidv4(),
      name: '',
      specs: [{ id: uuidv4(), label: '', value: '', unit: '', order: 0 }]
    };
    setQualities([...qualities, newQuality]);
  };

  const updateQualityName = (id: string, name: string) => {
    setQualities(qualities.map(q => q.id === id ? { ...q, name } : q));
  };

  const removeQuality = (id: string) => {
    setQualities(qualities.filter(q => q.id !== id));
  };

  const addSpecToQuality = (qualityId: string) => {
    setQualities(qualities.map(q => {
      if (q.id !== qualityId) return q;
      return {
        ...q,
        specs: [...q.specs, { id: uuidv4(), label: '', value: '', unit: '', order: q.specs.length }]
      };
    }));
  };

  const updateSpecInQuality = (qualityId: string, specIdx: number, field: keyof SpecField, value: string) => {
    setQualities(qualities.map(q => {
      if (q.id !== qualityId) return q;
      const newSpecs = [...q.specs];
      newSpecs[specIdx] = { ...newSpecs[specIdx], [field]: value };
      return { ...q, specs: newSpecs };
    }));
  };

  const removeSpecFromQuality = (qualityId: string, specIdx: number) => {
    setQualities(qualities.map(q => {
      if (q.id !== qualityId) return q;
      return { ...q, specs: q.specs.filter((_, i) => i !== specIdx) };
    }));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Product name required');
      return;
    }

    const brokerageData = {
      buyer: { type: brokerage.buyer.type, value: brokerage.buyer.value },
      seller: { type: brokerage.seller.type, value: brokerage.seller.value },
      buyerPercent: brokerage.buyer.type === 'percent' ? brokerage.buyer.value : 0,
      buyerFixed: brokerage.buyer.type === 'fixed' ? brokerage.buyer.value : 0,
      sellerPercent: brokerage.seller.type === 'percent' ? brokerage.seller.value : 0,
      sellerFixed: brokerage.seller.type === 'fixed' ? brokerage.seller.value : 0,
    };

    const payload = {
      id: editing || uuidv4(),
      name,
      qualities: qualities.filter(q => q.name.trim()).map(q => ({
        ...q,
        specs: q.specs.filter(s => s.label.trim())
      })),
      specs: [], // deprecated, kept for backward compat
      defaultBrokerage: brokerage.buyer.type === 'percent' ? brokerage.buyer.value : 0,
      brokerage: brokerageData,
      createdAt: editing ? products.find(p => p.id === editing)?.createdAt : new Date().toISOString()
    };

    try {
      if (editing) {
        await updateProduct(editing, payload);
        toast.success('Product updated');
      } else {
        await addProduct(payload as any);
        toast.success('Product added');
      }
      resetForm();
    } catch {
      toast.error('Failed to save');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    await deleteProduct(id);
    toast.success('Deleted');
  };

  // a plain function (not a component) so the field keeps focus while you type
  const brokerageField = ({ 
    label, 
    type, 
    value, 
    onTypeChange, 
    onValueChange 
  }: { 
    label: string; 
    type: 'percent' | 'fixed'; 
    value: number; 
    onTypeChange: (t: 'percent' | 'fixed') => void;
    onValueChange: (v: number) => void;
  }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex gap-2">
        <select
          value={type}
          aria-label={`${label} type`}
          onChange={e => onTypeChange(e.target.value as 'percent' | 'fixed')}
          className="input-field !w-auto"
        >
          <option value="percent">Percentage (%)</option>
          <option value="fixed">Fixed Amount (Rs.)</option>
        </select>
        <input
          type="number"
          step={type === 'percent' ? '0.01' : '1'}
          value={value}
          onChange={e => onValueChange(parseFloat(e.target.value) || 0)}
          placeholder={type === 'percent' ? 'e.g. 2.5' : 'e.g. 5000'}
          aria-label={label}
          inputMode="decimal"
          className="input-field flex-1 min-w-0"
        />
      </div>
      <p className="text-xs text-gray-500">
        {type === 'percent' ? 'Percentage of total value' : 'Fixed amount per contract'}
      </p>
    </div>
  );

  return (
    <Page title="Products" subtitle="Usual brokerage and quality specifications for each product" width="narrow">
      <div className="card p-4 lg:p-6 mb-5">
        <h3 className="font-semibold text-sm mb-4">{editing ? 'Edit product' : 'Add product'}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Coriander Seeds"
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {brokerageField({
              label: 'Buyer Brokerage',
              type: brokerage.buyer.type,
              value: brokerage.buyer.value,
              onTypeChange: t => setBrokerage(prev => ({ ...prev, buyer: { ...prev.buyer, type: t } })),
              onValueChange: v => setBrokerage(prev => ({ ...prev, buyer: { ...prev.buyer, value: v } })),
            })}
            {brokerageField({
              label: 'Seller Brokerage',
              type: brokerage.seller.type,
              value: brokerage.seller.value,
              onTypeChange: t => setBrokerage(prev => ({ ...prev, seller: { ...prev.seller, type: t } })),
              onValueChange: v => setBrokerage(prev => ({ ...prev, seller: { ...prev.seller, value: v } })),
            })}
          </div>

          {/* Qualities Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">Qualities</label>
              <Button size="sm" variant="soft" icon={<Plus size={16} />} onClick={addQuality}>Add quality</Button>
            </div>

            {qualities.length === 0 && (
              <p className="text-sm text-gray-500">No qualities added. Add a quality to define specifications.</p>
            )}

            <div className="space-y-3">
              {qualities.map((quality) => (
                <div key={quality.id} className="border border-gray-200 rounded-xl p-3 lg:p-4 space-y-3 bg-gray-50/50">
                  <div className="flex items-center gap-2">
                    <input
                      value={quality.name}
                      onChange={e => updateQualityName(quality.id, e.target.value)}
                      placeholder="Quality Name (e.g. Z-black, Semi)"
                      className="input-field flex-1 min-w-0 font-medium"
                    />
                    <button
                      type="button"
                      aria-label="Remove this quality"
                      onClick={() => removeQuality(quality.id)}
                      className="p-3 text-gray-400 hover:text-red-600 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-500">Specifications</p>
                    {quality.specs.map((spec, idx) => (
                      <div key={spec.id} className="flex flex-wrap sm:flex-nowrap gap-2">
                        <input
                          value={spec.label}
                          onChange={e => updateSpecInQuality(quality.id, idx, 'label', e.target.value)}
                          placeholder="Label (e.g. FFA)"
                          className="input-field !py-2 flex-1 min-w-[40%]"
                        />
                        <input
                          value={spec.value}
                          onChange={e => updateSpecInQuality(quality.id, idx, 'value', e.target.value)}
                          placeholder="Value"
                          className="input-field !py-2 flex-1 min-w-[40%]"
                        />
                        <input
                          value={spec.unit}
                          onChange={e => updateSpecInQuality(quality.id, idx, 'unit', e.target.value)}
                          placeholder="Unit"
                          className="input-field !py-2 !w-24 flex-1 sm:flex-none"
                        />
                        <button
                          type="button"
                          aria-label="Remove this specification"
                          onClick={() => removeSpecFromQuality(quality.id, idx)}
                          className="p-3 text-gray-400 hover:text-red-600 rounded-lg"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    <Button size="sm" variant="ghost" icon={<Plus size={14} />} onClick={() => addSpecToQuality(quality.id)}>Add specification</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="primary" icon={<Save size={16} />} onClick={handleSave}>{editing ? 'Update product' : 'Save product'}</Button>
            {editing && <Button variant="secondary" onClick={resetForm}>Cancel</Button>}
          </div>
        </div>
      </div>

      <p className="section-label mb-2">Your products ({products.length})</p>
      {products.length === 0 && <div className="card"><EmptyState title="No products yet">Add your first product above.</EmptyState></div>}
      <div className="space-y-3">
        {products.map(product => {
          const b = product.brokerage || {
            buyer: { type: 'percent', value: product.defaultBrokerage || 0 },
            seller: { type: 'percent', value: product.defaultBrokerage || 0 }
          };
          const qualityCount = product.qualities?.length || 0;
          return (
            <div key={product.id} className="card p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold">{product.name}</h3>
                <p className="text-sm text-gray-500">
                  Buyer: {b.buyer?.value || b.buyerPercent || 0}{b.buyer?.type === 'fixed' || b.buyerFixed ? ' Rs.' : '%'} 
                  {' | '}
                  Seller: {b.seller?.value || b.sellerPercent || 0}{b.seller?.type === 'fixed' || b.sellerFixed ? ' Rs.' : '%'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {qualityCount > 0 ? `${qualityCount} quality(ies)` : 'No qualities'}
                  {product.specs?.length > 0 && !qualityCount ? ` | ${product.specs.length} spec(s) (legacy)` : ''}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => startEdit(product)} aria-label={`Edit ${product.name}`} className="p-3 text-gray-500 hover:text-sky-700 hover:bg-sky-50 rounded-lg">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(product.id)} aria-label={`Delete ${product.name}`} className="p-3 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Page>
  );
}
