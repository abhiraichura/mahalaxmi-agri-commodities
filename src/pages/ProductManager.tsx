import { useState } from 'react';
import { useAppStore } from '../hooks/useAuthStore';
import { Plus, Trash2, Edit2, Save, X, GripVertical } from 'lucide-react';
import { ProductSpec } from '../types';

interface SpecField {
  label: string;
  value: string;
  unit?: string;
  order?: number;
  id?: string;
}

export default function ProductManager() {
  const { products, addProduct, updateProduct, deleteProduct } = useAppStore();
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    specs: [] as SpecField[],
    defaultBrokerage: 0,
    buyerBrokerageType: 'percent' as 'percent' | 'fixed',
    sellerBrokerageType: 'percent' as 'percent' | 'fixed',
    buyerBrokeragePercent: 0,
    sellerBrokeragePercent: 0,
    buyerBrokerageFixed: 0,
    sellerBrokerageFixed: 0,
  });

  const resetForm = () => {
    setForm({
      name: '',
      specs: [],
      defaultBrokerage: 0,
      buyerBrokerageType: 'percent',
      sellerBrokerageType: 'percent',
      buyerBrokeragePercent: 0,
      sellerBrokeragePercent: 0,
      buyerBrokerageFixed: 0,
      sellerBrokerageFixed: 0,
    });
    setEditing(null);
  };

  const handleEdit = (product: ProductSpec) => {
    setEditing(product.id);
    setForm({
      name: product.name,
      specs: (product.specs || []).map((s: any, i: number) => ({
        ...s,
        order: s.order ?? i,
        id: s.id || `spec-${i}`,
      })),
      defaultBrokerage: product.defaultBrokerage || 0,
      buyerBrokerageType: product.buyerBrokerageType || 'percent',
      sellerBrokerageType: product.sellerBrokerageType || 'percent',
      buyerBrokeragePercent: product.buyerBrokeragePercent || 0,
      sellerBrokeragePercent: product.sellerBrokeragePercent || 0,
      buyerBrokerageFixed: product.buyerBrokerageFixed || 0,
      sellerBrokerageFixed: product.sellerBrokerageFixed || 0,
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    const productData = {
      ...form,
      specs: form.specs.map((s, i) => ({ ...s, order: s.order ?? i })),
      id: editing || `product-${Date.now()}`,
    } as ProductSpec;

    if (editing) {
      await updateProduct(editing, productData);
    } else {
      await addProduct(productData);
    }
    resetForm();
  };

  const addSpec = () => {
    setForm({
      ...form,
      specs: [...form.specs, { label: '', value: '', unit: '', order: form.specs.length }],
    });
  };

  const updateSpec = (index: number, field: keyof SpecField, value: string) => {
    const updated = [...form.specs];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, specs: updated });
  };

  const removeSpec = (index: number) => {
    setForm({ ...form, specs: form.specs.filter((_, i) => i !== index) });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    await deleteProduct(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Manager</h1>
          <p className="text-sm text-gray-500 mt-1">Manage products and specifications</p>
        </div>
      </div>

      {/* Add/Edit Form */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          {editing ? 'Edit Product' : 'Add New Product'}
        </h3>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Coriander Seeds"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default Brokerage (%)</label>
            <input
              type="number"
              step="0.01"
              value={form.defaultBrokerage}
              onChange={(e) => setForm({ ...form, defaultBrokerage: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
          </div>

          {/* Brokerage Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Buyer Brokerage</h4>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Type</label>
                <select
                  value={form.buyerBrokerageType}
                  onChange={(e) => setForm({ ...form, buyerBrokerageType: e.target.value as any })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                >
                  <option value="percent">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </div>
              {form.buyerBrokerageType === 'percent' ? (
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Percentage (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.buyerBrokeragePercent}
                    onChange={(e) => setForm({ ...form, buyerBrokeragePercent: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Fixed Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.buyerBrokerageFixed}
                    onChange={(e) => setForm({ ...form, buyerBrokerageFixed: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                  />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Seller Brokerage</h4>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Type</label>
                <select
                  value={form.sellerBrokerageType}
                  onChange={(e) => setForm({ ...form, sellerBrokerageType: e.target.value as any })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                >
                  <option value="percent">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </div>
              {form.sellerBrokerageType === 'percent' ? (
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Percentage (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.sellerBrokeragePercent}
                    onChange={(e) => setForm({ ...form, sellerBrokeragePercent: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Fixed Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.sellerBrokerageFixed}
                    onChange={(e) => setForm({ ...form, sellerBrokerageFixed: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Specifications */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700">Specifications</label>
              <button
                type="button"
                onClick={addSpec}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Spec
              </button>
            </div>

            <div className="space-y-3">
              {form.specs.map((spec, i) => (
                <div key={spec.id || i} className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
                  <GripVertical className="w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={spec.label}
                    onChange={(e) => updateSpec(i, 'label', e.target.value)}
                    placeholder="Label"
                    className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    value={spec.value}
                    onChange={(e) => updateSpec(i, 'value', e.target.value)}
                    placeholder="Value"
                    className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    value={spec.unit || ''}
                    onChange={(e) => updateSpec(i, 'unit', e.target.value)}
                    placeholder="Unit"
                    className="w-24 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeSpec(i)}
                    className="p-2 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {editing ? 'Update' : 'Save'}
            </button>
            {editing && (
              <button
                onClick={resetForm}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-xl hover:bg-gray-100"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Products List */}
      <div className="grid gap-4">
        {products.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
            <p className="text-gray-500">No products yet</p>
          </div>
        ) : (
          products.map((product: ProductSpec) => (
            <div key={product.id} className="bg-white border border-gray-200 rounded-2xl p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">{product.name}</h3>
                  {product.defaultBrokerage ? (
                    <p className="text-sm text-gray-500 mt-1">Default Brokerage: {product.defaultBrokerage}%</p>
                  ) : null}

                  {product.specs && product.specs.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
                      {product.specs.map((spec: any, i: number) => (
                        <div key={spec.id || i} className="bg-gray-50 rounded-lg p-2">
                          <p className="text-xs text-gray-500">{spec.label}</p>
                          <p className="text-sm font-medium">{spec.value} {spec.unit}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-4 mt-4 text-sm">
                    <div>
                      <span className="text-gray-500">Buyer: </span>
                      <span className="font-medium">
                        {product.buyerBrokerageType === 'percent' 
                          ? `${product.buyerBrokeragePercent || 0}%` 
                          : `₹${product.buyerBrokerageFixed || 0}`}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Seller: </span>
                      <span className="font-medium">
                        {product.sellerBrokerageType === 'percent' 
                          ? `${product.sellerBrokeragePercent || 0}%` 
                          : `₹${product.sellerBrokerageFixed || 0}`}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(product)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <Edit2 className="w-4 h-4 text-gray-500" />
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="p-2 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
