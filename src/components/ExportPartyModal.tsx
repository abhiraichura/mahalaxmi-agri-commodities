import React, { useState, useMemo } from 'react';

// Adjust this interface to perfectly match your Party schema in src/types/index.ts
interface Party {
  id?: string;
  name: string;
  type: 'buyer' | 'seller' | 'both';
  products: string[] | string; 
  phone?: string;
  email?: string;
  city?: string;
}

interface ExportPartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  parties: Party[];
}

export const ExportPartyModal: React.FC<ExportPartyModalProps> = ({ isOpen, onClose, parties }) => {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');

  // Dynamically extract unique products from the parties list for the dropdown
  const uniqueProducts = useMemo(() => {
    const productsSet = new Set<string>();
    parties.forEach((party) => {
      if (Array.isArray(party.products)) {
        party.products.forEach((p) => p && productsSet.add(p.trim()));
      } else if (typeof party.products === 'string') {
        party.products.split(',').forEach((p) => p && productsSet.add(p.trim()));
      }
    });
    return Array.from(productsSet).sort();
  }, [parties]);

  if (!isOpen) return null;

  const handleExport = () => {
    // 1. Filter parties array based on matching type and product
    const filteredParties = parties.filter((party) => {
      // Type handling: 'both' satisfies both buyer and seller requirements
      const matchesType =
        selectedType === 'all' ||
        party.type === selectedType ||
        (party.type === 'both' && (selectedType === 'buyer' || selectedType === 'seller'));

      // Product/Commodity handling
      let matchesProduct = selectedProduct === 'all';
      if (!matchesProduct) {
        if (Array.isArray(party.products)) {
          matchesProduct = party.products.some(
            (p) => p.trim().toLowerCase() === selectedProduct.toLowerCase()
          );
        } else if (typeof party.products === 'string') {
          matchesProduct = party.products
            .toLowerCase()
            .split(',')
            .map((p) => p.trim())
            .includes(selectedProduct.toLowerCase());
        }
      }

      return matchesType && matchesProduct;
    });

    if (filteredParties.length === 0) {
      alert('No parties match your selected filters.');
      return;
    }

    // 2. Generate and download CSV
    const headers = ['Name', 'Type', 'Products', 'Phone', 'Email', 'City'];
    const csvRows = [headers.join(',')];

    filteredParties.forEach((party) => {
      const formattedProducts = Array.isArray(party.products)
        ? party.products.join(', ')
        : party.products;

      const row = [
        `"${party.name.replace(/"/g, '""')}"`,
        `"${party.type}"`,
        `"${formattedProducts.replace(/"/g, '""')}"`,
        `"${party.phone || ''}"`,
        `"${party.email || ''}"`,
        `"${party.city || ''}"`,
      ];
      csvRows.push(row.join(','));
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    
    // Naming pattern: e.g., parties_seller_cummin_seeds.csv
    const fileProductPart = selectedProduct === 'all' ? 'all_products' : selectedProduct.toLowerCase().replace(/\s+/g, '_');
    link.setAttribute('download', `parties_${selectedType}_${fileProductPart}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800 border dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Export Party Directory
        </h3>

        {/* Type Filter */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Party Type
          </label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Types</option>
            <option value="buyer">Buyers Only</option>
            <option value="seller">Sellers Only</option>
            <option value="both">Both (Buyers & Sellers)</option>
          </select>
        </div>

        {/* Product Filter */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Product / Commodity
          </label>
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Products</option>
            {uniqueProducts.map((product) => (
              <option key={product} value={product}>
                {product}
              </option>
            ))}
          </select>
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none"
          >
            Download CSV
          </button>
        </div>
      </div>
    </div>
  );
};
