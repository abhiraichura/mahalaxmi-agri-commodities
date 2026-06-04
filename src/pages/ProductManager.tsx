import { useState } from 'react';
import { useAppStore } from '../hooks/useAuthStore';
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

export default function ProductManager() {
  const { products, addProduct, updateProduct, deleteProduct } = useAppStore();
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [brokerage, setBrokerage] = useState(0);
  const [specs, setSpecs] = useState([{ id: uuidv4(), label: '', value: '', unit: '', order: 0 }]);

  const resetForm = () => {
    setName('');
    setBrokerage(0);
    setSpecs([{ id: uuidv4(), label: '', value: '', unit: '', order: 0 }]);
    setEditing(null);
  };

  const startEdit = (product: any) => {
    setEditing(product.id);
    setName(product.name);
    setBrokerage(product.defaultBrokerage || 0);
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
    const payload = {
      id: editing || uuidv4(),
      name,
      defaultBrokerage: brokerage,
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

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Products</h1>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
        <h3 className="font-semibold text-sm mb-4">{editing ? 'Edit Product' : 'Add Product'}</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g., Coriander Seeds"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Brokerage (%)</label>
              <input
                type="number"
                step="0.01"
                value={brokerage}
                onChange={e => setBrokerage(parseFloat(e.target.value))}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
              />
            </div>
          </div>

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
        {products.map(product => (
          <div key={product.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{product.name}</h3>
              <p className="text-sm text-gray-500">Brokerage: {product.defaultBrokerage}%</p>
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
        ))}
      </div>
    </div>
  );
}
