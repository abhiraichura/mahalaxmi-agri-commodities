import React, { useState, useMemo } from 'react';

export interface Party {
  id: string;
  name: string;
  type: 'buyer' | 'seller' | 'both';
  phone?: string;
  email?: string;
  city?: string;
  products: string[]; // Array of product names handled by the party
}

interface ExportPartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  parties: Party[];
}

export default function ExportPartyModal({ isOpen, onClose, parties }: ExportPartyModalProps) {
  const [selectedProduct, setSelectedProduct] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');

  // Extract a unique list of all products from all parties for the filter dropdown
  const allProducts = useMemo(() => {
    const productsSet = new Set<string>();
    parties.forEach((party) => {
      if (Array.isArray(party.products)) {
        party.products.forEach((product) => productsSet.add(product));
      }
    });
    return ['All', ...Array.from(productsSet).sort()];
  }, [parties]);

  if (!isOpen) return null;

  const handleExport = () => {
    // 1. Filter the parties based on selection
    const filteredParties = parties.filter((party) => {
      const typeMatch = selectedType === 'All' || party.type === selectedType || party.type === 'both';
      const productMatch = selectedProduct === 'All' || (Array.isArray(party.products) && party.products.includes(selectedProduct));
      return typeMatch && productMatch;
    });

    // 2. Define headers for the CSV
    const headers = ['Party Name', 'Type', 'Phone', 'Email', 'City', 'Associated Products'];

    // 3. Map records to CSV rows with proper comma escaping
    const csvRows = filteredParties.map((party) => {
      const rowData = [
        party.name,
        party.type.toUpperCase(),
        party.phone || '',
        party.email || '',
        party.city || '',
        Array.isArray(party.products) ? party.products.join(', ') : '',
      ];

      return rowData
        .map((value) => {
          const escaped = String(value).replace(/"/g, '""');
          return escaped.includes(',') || escaped.includes('\n') || escaped.includes('"') ? `"${escaped}"` : escaped;
        })
        .join(',');
    });

    // 4. Combine headers and rows
    const csvContent = [headers.join(','), ...csvRows].join('\n');

    // 5. Trigger download via browser blob
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    const fileName = `Parties_Export_${selectedProduct.replace(/\s+/g, '_')}_${selectedType}.csv`;
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900 bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <h3 className="text-lg font-bold text-gray-900">Export Parties</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none text-xl font-semibold"
          >
            &times;
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="modal-product" className="block text-sm font-semibold text-gray-700 mb-1">
              Filter by Product
            </label>
            <select
              id="modal-product"
              className="block w-full rounded-lg border-gray-300 py-2.5 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm shadow-sm"
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
            >
              {allProducts.map((product) => (
                <option key={product} value={product}>{product}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="modal-type" className="block text-sm font-semibold text-gray-700 mb-1">
              Filter by Party Type
            </label>
            <select
              id="modal-type"
              className="block w-full rounded-lg border-gray-300 py-2.5 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm shadow-sm"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="All">All Types</option>
              <option value="buyer">Buyers Only</option>
              <option value="seller">Sellers Only</option>
              <option value="both">Both (Buyer & Seller)</option>
            </select>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Download CSV
          </button>
        </div>
      </div>
    </div>
  );
}
