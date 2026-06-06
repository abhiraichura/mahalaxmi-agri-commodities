import { useState } from 'react';
import { useAppStore } from '../hooks/useAuthStore';
import { Plus, Trash2, Edit2, Save, X, ChevronDown } from 'lucide-react';
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

  const [specs, setSpecs] = useState([{ id: uuidv4(), label: '', value: '', unit: '', order: 0 }]);

  const resetForm = () => {
    setName('');
    setBrokerage({
      buyer: { type: 'percent', value: 0 },
      seller: { type: 'percent', value: 0 }
    });
    setSpecs([{ id: uuidv4(), label: '', value: '', unit: '', order: 0 }]);
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
    setSpecs(product.specs?.length > 0 ? product.specs : [{ id: uuidv4(), label: '', value: '', unit: '', order: 0 }]);
  };

  const addSpec = () => {
    setSpecs([...specs, { id: uuidv4(), label: '', value: '', unit: '', order: specs.length }]);
  };

  const updateSpec = (idx: number, field: string, value: string) => {
    const updated = [...specs];
    (updated[idx] as any)[field] = value;
    setSpecs(updated);
  };

  const removeSpec = (idx: number) => {
    setSpecs(specs.filter((_, i) => i !== idx));
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
      defaultBrokerage: brokerage.buyer.type === 'percent' ? brokerage.buyer.value : 0, // backward compat
      brokerage: brokerageData,
      specs: specs.filter(s => s.label.trim()),
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

          {/* Specifications */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Specifications</label>
            {specs.map((s, i) => (
              <div key={s.id} className="flex gap-2 mb-2">
                <input
                  value={s.label}
                  onChange={e => updateSpec(i, 'label', e.target.value)}
                  placeholder="Label"
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                />
                <input
                  value={s.value}
                  onChange={e => updateSpec(i, 'value', e.target.value)}
                  placeholder="Value"
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                />
                <input
                  value={s.unit}
                  onChange={e => updateSpec(i, 'unit', e.target.value)}
                  placeholder="Unit"
                  className="w-24 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                />
                <button onClick={() => removeSpec(i)} className="p-2 text-gray-400 hover:text-red-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button onClick={addSpec} className="text-sm text-rose-600 hover:text-rose-700 font-medium">
              + Add Specification
            </button>
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
          return (
            <div key={product.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{product.name}</h3>
                <p className="text-sm text-gray-500">
                  Buyer: {b.buyer?.value || b.buyerPercent || 0}{b.buyer?.type === 'fixed' || b.buyerFixed ? ' Rs.' : '%'} 
                  {' | '}
                  Seller: {b.seller?.value || b.sellerPercent || 0}{b.seller?.type === 'fixed' || b.sellerFixed ? ' Rs.' : '%'}
                </p>
                {product.specs && product.specs.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">{product.specs.length} specification(s)</p>
                )}
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
