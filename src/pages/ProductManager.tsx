import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Package, Trash2, Edit2, GripVertical } from 'lucide-react';
import { useAppStore } from '../hooks/useAuthStore';
import { ProductSpec, SpecField } from '../types';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

export default function ProductManager() {
  const navigate = useNavigate();
  const { products, addProduct, updateProduct, deleteProduct, loadProducts } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ProductSpec | null>(null);
  const [name, setName] = useState('');
  const [specs, setSpecs] = useState<SpecField[]>([{ id: '1', label: '', value: '', unit: '', order: 1 }]);
  const [brokerage, setBrokerage] = useState(0.5);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadProducts().then(() => setLoading(false)); }, []);

  const addSpec = () => setSpecs([...specs, { id: uuidv4(), label: '', value: '', unit: '', order: specs.length + 1 }]);
  const updateSpec = (i: number, field: keyof SpecField, val: string) => {
    const n = [...specs]; n[i] = { ...n[i], [field]: val }; setSpecs(n);
  };
  const removeSpec = (i: number) => setSpecs(specs.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Product name required'); return; }
    const product: ProductSpec = {
      id: editing?.id || uuidv4(),
      name,
      specs: specs.filter(s => s.label.trim()),
      defaultBrokerage: brokerage,
      createdAt: editing?.createdAt || new Date()
    };
    try {
      if (editing) { await updateProduct(product.id, product); toast.success('Updated!'); }
      else { await addProduct(product); toast.success('Added!'); }
      reset();
    } catch (e) { toast.error('Failed'); }
  };

  const reset = () => { setShowForm(false); setEditing(null); setName(''); setSpecs([{ id: uuidv4(), label: '', value: '', unit: '', order: 1 }]); setBrokerage(0.5); };

  const handleEdit = (p: ProductSpec) => { setEditing(p); setName(p.name); setSpecs(p.specs); setBrokerage(p.defaultBrokerage); setShowForm(true); };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    try { await deleteProduct(id); toast.success('Deleted'); } catch (e) { toast.error('Failed'); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500 mt-1">{products.length} products</p>
        </div>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      <div className="space-y-4">
        {products.map(p => (
          <div key={p.id} className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center"><Package className="w-5 h-5 text-rose-600" /></div>
                <div>
                  <h3 className="font-semibold text-gray-900">{p.name}</h3>
                  <p className="text-sm text-gray-500">Brokerage: {p.defaultBrokerage}%</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(p)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(p.id)} className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {p.specs.map(s => (
                  <div key={s.id} className="flex items-center gap-2 text-sm">
                    <GripVertical className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-700">{s.label}:</span>
                    <span className="text-gray-600">{s.value} {s.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">{editing ? 'Edit Product' : 'Add New Product'}</h3>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Product Name *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Coriander Seeds" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Default Brokerage (%)</label>
                <input type="number" step="0.01" value={brokerage} onChange={e => setBrokerage(parseFloat(e.target.value))} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700">Specifications</label>
                  <button onClick={addSpec} className="text-sm text-rose-600 font-medium">+ Add Spec</button>
                </div>
                <div className="space-y-3">
                  {specs.map((s, i) => (
                    <div key={s.id} className="flex gap-2">
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <input value={s.label} onChange={e => updateSpec(i, 'label', e.target.value)} placeholder="Label" className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                        <input value={s.value} onChange={e => updateSpec(i, 'value', e.target.value)} placeholder="Value" className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                        <input value={s.unit} onChange={e => updateSpec(i, 'unit', e.target.value)} placeholder="Unit" className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                      </div>
                      <button onClick={() => removeSpec(i)} className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={reset} className="px-4 py-2 text-gray-600 font-medium">Cancel</button>
              <button onClick={handleSave} className="px-6 py-2 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700">{editing ? 'Update' : 'Save'} Product</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
