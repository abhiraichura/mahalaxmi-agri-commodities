import { useState } from 'react';
import { useAppStore } from '../hooks/useAuthStore';
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

export default function ProductManager() {
  const { products, addProduct, updateProduct, deleteProduct } = useAppStore();
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', specs: [{ label: '', value: '', unit: '' }] });

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Product name is required');
      return;
    }
    const cleanSpecs = form.specs.filter(s => s.label.trim());
    if (editing) {
      await updateProduct(editing.id, { name: form.name, specs: cleanSpecs });
      toast.success('Product updated');
    } else {
      await addProduct({
        id: uuidv4(),
        name: form.name,
        specs: cleanSpecs,
        createdAt: new Date().toISOString()
      });
      toast.success('Product added');
    }
    setEditing(null);
    setForm({ name: '', specs: [{ label: '', value: '', unit: '' }] });
  };

  const handleEdit = (product: any) => {
    setEditing(product);
    setForm({
      name: product.name,
      specs: product.specs?.length > 0 ? product.specs : [{ label: '', value: '', unit: '' }]
    });
  };

  const addSpec = () => {
    setForm(prev => ({ ...prev, specs: [...prev.specs, { label: '', value: '', unit: '' }] }));
  };

  const updateSpec = (index: number, field: string, value: string) => {
    const specs = [...form.specs];
    specs[index] = { ...specs[index], [field]: value };
    setForm(prev => ({ ...prev, specs }));
  };

  const removeSpec = (index: number) => {
    setForm(prev => ({ ...prev, specs: prev.specs.filter((_, i) => i !== index) }));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    await deleteProduct(id);
    toast.success('Product deleted');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500 mt-1">{products.length} products registered</p>
        </div>
      </div>

      {/* Product Form */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          {editing ? <Edit2 className="w-4 h-4 text-rose-600" /> : <Plus className="w-4 h-4 text-rose-600" />}
          <h3 className="font-semibold text-gray-900">{editing ? 'Edit Product' : 'Add Product'}</h3>
        </div>
        <div className="space-y-3">
          <input
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Product name (e.g., Cumin Seeds)"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
          />
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Specifications</p>
            {form.specs.map((spec, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={spec.label}
                  onChange={e => updateSpec(i, 'label', e.target.value)}
                  placeholder="Label (e.g., Grade)"
                  className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                />
                <input
                  value={spec.value}
                  onChange={e => updateSpec(i, 'value', e.target.value)}
                  placeholder="Value"
                  className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                />
                <input
                  value={spec.unit}
                  onChange={e => updateSpec(i, 'unit', e.target.value)}
                  placeholder="Unit"
                  className="w-24 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                />
                <button
                  onClick={() => removeSpec(i)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              onClick={addSpec}
              className="text-sm text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Specification
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              {editing ? 'Update' : 'Save'}
            </button>
            {editing && (
              <button
                onClick={() => { setEditing(null); setForm({ name: '', specs: [{ label: '', value: '', unit: '' }] }); }}
                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Products List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {products.map(product => (
          <div key={product.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-all group">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-gray-900">{product.name}</h3>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleEdit(product)}
                  className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {product.specs && product.specs.length > 0 && (
              <div className="space-y-1">
                {product.specs.map((spec: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">{spec.label}:</span>
                    <span className="font-medium text-gray-900">{spec.value} {spec.unit}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
