import { useState } from 'react';
import { useAppStore } from '../hooks/useAuthStore';
import { Plus, Minus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { SpecField, ProductSpec } from '../types';

export default function ProductManager() {
  const { products, addProduct, updateProduct, deleteProduct } = useAppStore();
  const [editing, setEditing] = useState<ProductSpec | null>(null);
  const [name, setName] = useState('');
  const [brokerage, setBrokerage] = useState(0);
  const [specs, setSpecs] = useState<SpecField[]>([]);
  const [buyerBrokerageType, setBuyerBrokerageType] = useState<'percent' | 'fixed'>('percent');
  const [sellerBrokerageType, setSellerBrokerageType] = useState<'percent' | 'fixed'>('percent');
  const [buyerBrokeragePercent, setBuyerBrokeragePercent] = useState(0);
  const [sellerBrokeragePercent, setSellerBrokeragePercent] = useState(0);
  const [buyerBrokerageFixed, setBuyerBrokerageFixed] = useState(0);
  const [sellerBrokerageFixed, setSellerBrokerageFixed] = useState(0);

  const reset = () => {
    setName('');
    setBrokerage(0);
    setSpecs([]);
    setBuyerBrokerageType('percent');
    setSellerBrokerageType('percent');
    setBuyerBrokeragePercent(0);
    setSellerBrokeragePercent(0);
    setBuyerBrokerageFixed(0);
    setSellerBrokerageFixed(0);
    setEditing(null);
  };

  const startEdit = (p: ProductSpec) => {
    setEditing(p);
    setName(p.name);
    setBrokerage(p.defaultBrokerage);
    setSpecs(p.specs?.map(s => ({ ...s })) || []);
    setBuyerBrokerageType(p.buyerBrokerageType || 'percent');
    setSellerBrokerageType(p.sellerBrokerageType || 'percent');
    setBuyerBrokeragePercent(p.buyerBrokeragePercent || 0);
    setSellerBrokeragePercent(p.sellerBrokeragePercent || 0);
    setBuyerBrokerageFixed(p.buyerBrokerageFixed || 0);
    setSellerBrokerageFixed(p.sellerBrokerageFixed || 0);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Enter product name'); return; }

    const data = {
      name: name.trim(),
      defaultBrokerage: brokerage,
      specs: specs.map((s, i) => ({ ...s, order: i })),
      buyerBrokerageType,
      sellerBrokerageType,
      buyerBrokeragePercent,
      sellerBrokeragePercent,
      buyerBrokerageFixed,
      sellerBrokerageFixed,
    };

    if (editing) {
      await updateProduct(editing.id, data);
      toast.success('Updated');
    } else {
      await addProduct({ ...data, id: uuidv4(), createdAt: new Date().toISOString() } as ProductSpec);
      toast.success('Added');
    }
    reset();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    await deleteProduct(id);
    toast.success('Deleted');
  };

  const updateSpec = (i: number, field: keyof SpecField, value: string) => {
    const updated = [...specs];
    updated[i] = { ...updated[i], [field]: value };
    setSpecs(updated);
  };

  const addSpec = () => setSpecs([...specs, { id: uuidv4(), label: '', value: '', unit: '', order: specs.length }]);
  const removeSpec = (i: number) => setSpecs(specs.filter((_, idx) => idx !== i));

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Product Manager</h1>

      {/* Form */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 space-y-4">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Product Name *</label>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g., Coriander Seeds" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Default Brokerage (%)</label>
            <input type="number" value={brokerage} onChange={e => setBrokerage(parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs text-gray-500 block">Buyer Brokerage</label>
            <select value={buyerBrokerageType} onChange={e => setBuyerBrokerageType(e.target.value as any)}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm">
              <option value="percent">Percentage</option>
              <option value="fixed">Fixed Amount</option>
            </select>
            {buyerBrokerageType === 'percent' ? (
              <input type="number" value={buyerBrokeragePercent} onChange={e => setBuyerBrokeragePercent(parseFloat(e.target.value) || 0)}
                placeholder="%" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            ) : (
              <input type="number" value={buyerBrokerageFixed} onChange={e => setBuyerBrokerageFixed(parseFloat(e.target.value) || 0)}
                placeholder="Rs." className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            )}
          </div>
          <div className="space-y-2">
            <label className="text-xs text-gray-500 block">Seller Brokerage</label>
            <select value={sellerBrokerageType} onChange={e => setSellerBrokerageType(e.target.value as any)}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm">
              <option value="percent">Percentage</option>
              <option value="fixed">Fixed Amount</option>
            </select>
            {sellerBrokerageType === 'percent' ? (
              <input type="number" value={sellerBrokeragePercent} onChange={e => setSellerBrokeragePercent(parseFloat(e.target.value) || 0)}
                placeholder="%" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            ) : (
              <input type="number" value={sellerBrokerageFixed} onChange={e => setSellerBrokerageFixed(parseFloat(e.target.value) || 0)}
                placeholder="Rs." className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            )}
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Specifications</label>
          {specs.map((s, i) => (
            <div key={s.id || i} className="flex gap-2 mb-2">
              <input value={s.label} onChange={e => updateSpec(i, 'label', e.target.value)}
                placeholder="Label" className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
              <input value={s.value} onChange={e => updateSpec(i, 'value', e.target.value)}
                placeholder="Value" className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
              <input value={s.unit || ''} onChange={e => updateSpec(i, 'unit', e.target.value)}
                placeholder="Unit" className="w-24 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
              <button type="button" onClick={() => removeSpec(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                <Minus size={16} />
              </button>
            </div>
          ))}
          <button type="button" onClick={addSpec} className="flex items-center gap-1 text-sm text-rose-600 hover:text-rose-700 mt-2">
            <Plus size={16} /> Add Specification
          </button>
        </div>

        <div className="flex gap-3">
          <button onClick={handleSave} className="bg-rose-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-rose-700">
            {editing ? 'Update Product' : 'Add Product'}
          </button>
          {editing && (
            <button onClick={reset} className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {products.map(p => (
          <div key={p.id} className="bg-white rounded-2xl border border-gray-200 p-5 flex items-start justify-between hover:shadow-sm transition-shadow">
            <div>
              <h3 className="font-semibold text-gray-900">{p.name}</h3>
              <p className="text-sm text-gray-500 mt-1">Default brokerage: {p.defaultBrokerage}%</p>
              {p.specs && p.specs.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {p.specs.sort((a, b) => (a.order || 0) - (b.order || 0)).map(s => (
                    <span key={s.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
                      {s.label}: {s.value} {s.unit}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-3 mt-2 text-xs text-gray-500">
                <span>Buyer: {p.buyerBrokerageType === 'percent' ? `${p.buyerBrokeragePercent || 0}%` : `Rs.${p.buyerBrokerageFixed || 0}`}</span>
                <span>Seller: {p.sellerBrokerageType === 'percent' ? `${p.sellerBrokeragePercent || 0}%` : `Rs.${p.sellerBrokerageFixed || 0}`}</span>
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => startEdit(p)} className="p-2 hover:bg-gray-100 rounded-lg">
                <Pencil size={16} className="text-gray-600" />
              </button>
              <button onClick={() => handleDelete(p.id)} className="p-2 hover:bg-red-50 rounded-lg">
                <Trash2 size={16} className="text-red-500" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
          <p className="text-gray-500">No products yet</p>
        </div>
      )}
    </div>
  );
}
