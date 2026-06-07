import { useState } from 'react';
import { useAppStore } from '../hooks/useAuthStore';
import { Plus, Trash2, Edit2, Save, X, ChevronDown, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

export default function ProductManager() {
  const { products, addProduct, updateProduct, deleteProduct } = useAppStore();
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');

  // Brokerage state: each has type (percent/fixed) and value
  const [brokerage, setBrokerage] = useState({
    buyer: { type: 'percent' as 'percent' | 'fixed', value: 0 },
    seller: { type: 'percent' as 'percent' | 'fixed', value: 0 }
  });

  // Qualities state - each quality has multiple specs
  const [qualities, setQualities] = useState<QualityForm[]>([]);
  const [expandedQuality, setExpandedQuality] = useState<string | null>(null);

  interface SpecForm {
    id: string;
    label: string;
    value: string;
    unit: string;
    order: number;
  }

  interface QualityForm {
    id: string;
    name: string;
    specs: SpecForm[];
    order: number;
  }

  const resetForm = () => {
    setName('');
    setBrokerage({
      buyer: { type: 'percent', value: 0 },
      seller: { type: 'percent', value: 0 }
    });
    setQualities([]);
    setExpandedQuality(null);
    setEditing(null);
  };

  const startEdit = (product: any) => {
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
    // Migrate old specs to default quality if no qualities exist
    if (product.qualities && product.qualities.length > 0) {
      setQualities(product.qualities);
    } else if (product.specs && product.specs.length > 0) {
      setQualities([{
        id: uuidv4(),
        name: 'Default',
        specs: product.specs.map((s: any, i: number) => ({ ...s, order: i })),
        order: 0
      }]);
    } else {
      setQualities([]);
    }
  };

  const addQuality = () => {
    const newQuality: QualityForm = {
      id: uuidv4(),
      name: '',
      specs: [{ id: uuidv4(), label: '', value: '', unit: '', order: 0 }],
      order: qualities.length
    };
    setQualities([...qualities, newQuality]);
    setExpandedQuality(newQuality.id);
  };

  const updateQualityName = (qualityId: string, name: string) => {
    setQualities(qualities.map(q => q.id === qualityId ? { ...q, name } : q));
  };

  const removeQuality = (qualityId: string) => {
    setQualities(qualities.filter(q => q.id !== qualityId));
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

  const updateSpec = (qualityId: string, specIdx: number, field: string, value: string) => {
    setQualities(qualities.map(q => {
      if (q.id !== qualityId) return q;
      const updatedSpecs = [...q.specs];
      (updatedSpecs[specIdx] as any)[field] = value;
      return { ...q, specs: updatedSpecs };
    }));
  };

  const removeSpec = (qualityId: string, specIdx: number) => {
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

    // Filter out empty qualities and specs
    const cleanedQualities = qualities
      .filter(q => q.name.trim())
      .map(q => ({
        ...q,
        specs: q.specs.filter(s => s.label.trim())
      }))
      .filter(q => q.specs.length > 0);

    // Also keep backward-compat specs array (flatten first quality specs)
    const backwardSpecs = cleanedQualities.length > 0 ? cleanedQualities[0].specs : [];

    const payload = {
      id: editing || uuidv4(),
      name,
      defaultBrokerage: brokerage.buyer.type === 'percent' ? brokerage.buyer.value : 0, // backward compat
      brokerage: brokerageData,
      qualities: cleanedQualities,
      specs: backwardSpecs, // backward compat for old code
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

  const BrokerageField = ({ 
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
          onChange={e => onTypeChange(e.target.value as 'percent' | 'fixed')}
          className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
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
          className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
        />
      </div>
      <p className="text-xs text-gray-500">
        {type === 'percent' ? 'Percentage of total value' : 'Fixed amount per contract'}
      </p>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto pt-16 lg:pt-8 px-4 lg:px-8 pb-8">
      <h1 className="text-2xl font-bold mb-6">Products</h1>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
        <h3 className="font-semibold text-sm mb-4">{editing ? 'Edit Product' : 'Add Product'}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Coriander Seeds"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
          </div>

          {/* Brokerage Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BrokerageField
              label="Buyer Brokerage"
              type={brokerage.buyer.type}
              value={brokerage.buyer.value}
              onTypeChange={t => setBrokerage(prev => ({ ...prev, buyer: { ...prev.buyer, type: t } }))}
              onValueChange={v => setBrokerage(prev => ({ ...prev, buyer: { ...prev.buyer, value: v } }))}
            />
            <BrokerageField
              label="Seller Brokerage"
              type={brokerage.seller.type}
              value={brokerage.seller.value}
              onTypeChange={t => setBrokerage(prev => ({ ...prev, seller: { ...prev.seller, type: t } }))}
              onValueChange={v => setBrokerage(prev => ({ ...prev, seller: { ...prev.seller, value: v } }))}
            />
          </div>

          {/* Qualities Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Qualities & Specifications</label>
              <button onClick={addQuality} className="text-sm text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1">
                <Plus className="w-4 h-4" /> Add Quality
              </button>
            </div>

            {qualities.length === 0 && (
              <p className="text-sm text-gray-400 italic">No qualities added yet. Click "Add Quality" to start.</p>
            )}

            <div className="space-y-3">
              {qualities.map((quality, qIdx) => (
                <div key={quality.id} className="border border-gray-200 rounded-xl overflow-hidden">
                  {/* Quality Header */}
                  <div 
                    className="flex items-center gap-2 p-3 bg-gray-50 cursor-pointer"
                    onClick={() => setExpandedQuality(expandedQuality === quality.id ? null : quality.id)}
                  >
                    {expandedQuality === quality.id ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    <input
                      value={quality.name}
                      onChange={e => updateQualityName(quality.id, e.target.value)}
                      placeholder={`Quality Name (e.g. Z-Black, Semi)`}
                      className="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm"
                      onClick={e => e.stopPropagation()}
                    />
                    <span className="text-xs text-gray-400">{quality.specs.length} spec(s)</span>
                    <button 
                      onClick={e => { e.stopPropagation(); removeQuality(quality.id); }}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Quality Specs */}
                  {expandedQuality === quality.id && (
                    <div className="p-3 space-y-2">
                      {quality.specs.map((s, sIdx) => (
                        <div key={s.id} className="flex gap-2">
                          <input
                            value={s.label}
                            onChange={e => updateSpec(quality.id, sIdx, 'label', e.target.value)}
                            placeholder="Label (e.g. FFA)"
                            className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                          />
                          <input
                            value={s.value}
                            onChange={e => updateSpec(quality.id, sIdx, 'value', e.target.value)}
                            placeholder="Value"
                            className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                          />
                          <input
                            value={s.unit}
                            onChange={e => updateSpec(quality.id, sIdx, 'unit', e.target.value)}
                            placeholder="Unit"
                            className="w-24 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                          />
                          <button onClick={() => removeSpec(quality.id, sIdx)} className="p-2 text-gray-400 hover:text-red-600">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button onClick={() => addSpecToQuality(quality.id)} className="text-sm text-rose-600 hover:text-rose-700 font-medium">
                        + Add Specification
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700"
            >
              <Save className="w-4 h-4" /> {editing ? 'Update' : 'Save'}
            </button>
            {editing && (
              <button onClick={resetForm} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200">
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {products.map(product => {
          const b = product.brokerage || {
            buyer: { type: 'percent', value: product.defaultBrokerage || 0 },
            seller: { type: 'percent', value: product.defaultBrokerage || 0 }
          };
          const qualityCount = product.qualities?.length || 0;
          const specCount = product.qualities 
            ? product.qualities.reduce((sum: number, q: any) => sum + (q.specs?.length || 0), 0)
            : (product.specs?.length || 0);
          return (
            <div key={product.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{product.name}</h3>
                <p className="text-sm text-gray-500">
                  Buyer: {b.buyer?.value || b.buyerPercent || 0}{b.buyer?.type === 'fixed' || b.buyerFixed ? ' Rs.' : '%'} 
                  {' | '}
                  Seller: {b.seller?.value || b.sellerPercent || 0}{b.seller?.type === 'fixed' || b.sellerFixed ? ' Rs.' : '%'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {qualityCount > 0 ? `${qualityCount} quality(ies), ${specCount} total spec(s)` : `${specCount} specification(s)`}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => startEdit(product)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(product.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
