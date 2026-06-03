import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Package, Trash2, Edit2, GripVertical } from 'lucide-react';
import { useAppStore } from '../hooks/useAuthStore';
import { ProductSpec, SpecField } from '../types';
import toast from 'react-hot-toast';

export default function ProductManager() {
  const navigate = useNavigate();
  const { products, addProduct, updateProduct, deleteProduct } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductSpec | null>(null);
  const [productName, setProductName] = useState('');
  const [specs, setSpecs] = useState<SpecField[]>([
    { id: '1', label: 'Quality', value: 'Eagle Plus', unit: '', order: 1 },
    { id: '2', label: 'Clean', value: 'Machine and Destoner Clean', unit: '', order: 2 },
    { id: '3', label: 'Split', value: '5', unit: '% Maximum', order: 3 },
    { id: '4', label: 'Admixture', value: '1', unit: '% Maximum', order: 4 },
    { id: '5', label: 'Moisture', value: '9', unit: '% Maximum', order: 5 },
  ]);
  const [defaultBrokerage, setDefaultBrokerage] = useState(0.5);

  // Mock products if none exist
  const displayProducts = products.length > 0 ? products : [
    {
      id: '1',
      name: 'Coriander Seeds',
      specs: [
        { id: '1', label: 'Quality', value: 'Eagle Plus', unit: '', order: 1 },
        { id: '2', label: 'Clean', value: 'Machine and Destoner Clean', unit: '', order: 2 },
        { id: '3', label: 'Split', value: '5', unit: '% Maximum', order: 3 },
        { id: '4', label: 'Admixture', value: '1', unit: '% Maximum', order: 4 },
        { id: '5', label: 'Moisture', value: '9', unit: '% Maximum', order: 5 },
      ],
      defaultBrokerage: 0.5,
      createdAt: new Date()
    },
    {
      id: '2',
      name: 'Cumin Seeds',
      specs: [
        { id: '1', label: 'Quality', value: 'Singapore Quality', unit: '', order: 1 },
        { id: '2', label: 'Clean', value: 'Machine Clean', unit: '', order: 2 },
        { id: '3', label: 'Purity', value: '99', unit: '% Minimum', order: 3 },
        { id: '4', label: 'Admixture', value: '0.5', unit: '% Maximum', order: 4 },
        { id: '5', label: 'Moisture', value: '8', unit: '% Maximum', order: 5 },
      ],
      defaultBrokerage: 0.75,
      createdAt: new Date()
    }
  ];

  const handleSave = () => {
    if (!productName.trim()) {
      toast.error('Product name is required');
      return;
    }

    const product: ProductSpec = {
      id: editingProduct?.id || crypto.randomUUID(),
      name: productName,
      specs: specs.filter(s => s.label.trim()),
      defaultBrokerage,
      createdAt: editingProduct?.createdAt || new Date()
    };

    if (editingProduct) {
      updateProduct(product.id, product);
      toast.success('Product updated!');
    } else {
      addProduct(product);
      toast.success('Product added!');
    }

    resetForm();
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingProduct(null);
    setProductName('');
    setSpecs([
      { id: crypto.randomUUID(), label: '', value: '', unit: '', order: 1 }
    ]);
    setDefaultBrokerage(0.5);
  };

  const addSpec = () => {
    setSpecs([...specs, { 
      id: crypto.randomUUID(), 
      label: '', 
      value: '', 
      unit: '', 
      order: specs.length + 1 
    }]);
  };

  const updateSpec = (index: number, field: keyof SpecField, value: string) => {
    const newSpecs = [...specs];
    newSpecs[index] = { ...newSpecs[index], [field]: value };
    setSpecs(newSpecs);
  };

  const removeSpec = (index: number) => {
    setSpecs(specs.filter((_, i) => i !== index));
  };

  const handleEdit = (product: ProductSpec) => {
    setEditingProduct(product);
    setProductName(product.name);
    setSpecs(product.specs);
    setDefaultBrokerage(product.defaultBrokerage);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage products and their specifications
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* Product List */}
      <div className="space-y-4">
        {displayProducts.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center">
                  <Package className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{product.name}</h3>
                  <p className="text-sm text-gray-500">
                    Default Brokerage: {product.defaultBrokerage}%
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(product)}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    deleteProduct(product.id);
                    toast.success('Product deleted');
                  }}
                  className="p-2 hover:bg-red-50 rounded-lg text-gray-500 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Specifications</h4>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {product.specs.map((spec) => (
                  <div key={spec.id} className="flex items-center gap-2 text-sm">
                    <GripVertical className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-700">{spec.label}:</span>
                    <span className="text-gray-600">{spec.value} {spec.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Product Name *</label>
                <input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g., Coriander Seeds"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Default Brokerage (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={defaultBrokerage}
                  onChange={(e) => setDefaultBrokerage(parseFloat(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700">Specifications</label>
                  <button
                    type="button"
                    onClick={addSpec}
                    className="text-sm text-rose-600 hover:text-rose-700 font-medium"
                  >
                    + Add Specification
                  </button>
                </div>

                <div className="space-y-3">
                  {specs.map((spec, index) => (
                    <div key={spec.id} className="flex gap-2 items-start">
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <input
                          value={spec.label}
                          onChange={(e) => updateSpec(index, 'label', e.target.value)}
                          placeholder="Label (e.g., Quality)"
                          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                        />
                        <input
                          value={spec.value}
                          onChange={(e) => updateSpec(index, 'value', e.target.value)}
                          placeholder="Value"
                          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                        />
                        <input
                          value={spec.unit}
                          onChange={(e) => updateSpec(index, 'unit', e.target.value)}
                          placeholder="Unit (e.g., % Maximum)"
                          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                        />
                      </div>
                      <button
                        onClick={() => removeSpec(index)}
                        className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={resetForm}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700"
              >
                {editingProduct ? 'Update Product' : 'Save Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
