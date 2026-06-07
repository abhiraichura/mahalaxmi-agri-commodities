import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../hooks/useAuthStore';
import { Search, Plus, Phone, Mail, MapPin, Building2, Filter, X, ChevronDown } from 'lucide-react';

export default function PartyDirectory() {
  const navigate = useNavigate();
  const { parties, products } = useAppStore();
  const [search, setSearch] = useState('');

  // NEW: Buyer/Seller toggle (not dropdown)
  const [partyTypeFilter, setPartyTypeFilter] = useState<'all' | 'buyer' | 'seller'>('all');

  // NEW: Product-wise filter dropdown
  const [selectedProduct, setSelectedProduct] = useState<string>('all');

  const [showFilters, setShowFilters] = useState(false);

  // Get all unique product IDs from parties
  const productOptions = useMemo(() => {
    const productIds = new Set<string>();
    parties.forEach(p => {
      p.productIds?.forEach(pid => productIds.add(pid));
    });
    return products.filter(p => productIds.has(p.id));
  }, [parties, products]);

  const filtered = useMemo(() => {
    let result = [...parties];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.legalName.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        p.gstin.toLowerCase().includes(q)
      );
    }

    // Buyer/Seller toggle filter
    if (partyTypeFilter !== 'all') {
      result = result.filter(p => p.type === partyTypeFilter || p.type === 'both');
    }

    // Product filter
    if (selectedProduct !== 'all') {
      result = result.filter(p => p.productIds?.includes(selectedProduct));
    }

    // DEFAULT SORT: Alphabetical by company name
    result.sort((a, b) => a.legalName.toLowerCase().localeCompare(b.legalName.toLowerCase()));

    return result;
  }, [parties, search, partyTypeFilter, selectedProduct]);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'buyer': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'seller': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'both': return 'bg-purple-50 text-purple-700 border-purple-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'buyer': return 'Buyer';
      case 'seller': return 'Seller';
      case 'both': return 'Both';
      default: return type;
    }
  };

  return (
    <div className="max-w-5xl mx-auto pt-16 lg:pt-8 px-4 lg:px-8 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Party Directory</h1>
          <p className="text-sm text-gray-500 mt-1">{filtered.length} parties found</p>
        </div>
        <button
          onClick={() => navigate('/parties/new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700"
        >
          <Plus className="w-4 h-4" /> Add Party
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, city, phone, GSTIN..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Buyer/Seller Toggle Buttons (below search bar) */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setPartyTypeFilter('all')}
          className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
            partyTypeFilter === 'all' 
              ? 'bg-rose-600 text-white border-rose-600' 
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setPartyTypeFilter('buyer')}
          className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
            partyTypeFilter === 'buyer' 
              ? 'bg-blue-600 text-white border-blue-600' 
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          Buyers
        </button>
        <button
          onClick={() => setPartyTypeFilter('seller')}
          className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
            partyTypeFilter === 'seller' 
              ? 'bg-amber-600 text-white border-amber-600' 
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          Sellers
        </button>
      </div>

      {/* Product Filter Dropdown */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <select
            value={selectedProduct}
            onChange={e => setSelectedProduct(e.target.value)}
            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="all">All Products</option>
            {productOptions.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
        {selectedProduct !== 'all' && (
          <button 
            onClick={() => setSelectedProduct('all')}
            className="text-sm text-gray-500 hover:text-rose-600"
          >
            Clear filter
          </button>
        )}
      </div>

      {/* Active Filters Summary */}
      {(partyTypeFilter !== 'all' || selectedProduct !== 'all') && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-gray-500">Active filters:</span>
          {partyTypeFilter !== 'all' && (
            <span className="px-2 py-1 bg-gray-100 rounded-lg text-xs text-gray-700 flex items-center gap-1">
              {getTypeLabel(partyTypeFilter)}
              <button onClick={() => setPartyTypeFilter('all')}><X className="w-3 h-3" /></button>
            </span>
          )}
          {selectedProduct !== 'all' && (
            <span className="px-2 py-1 bg-gray-100 rounded-lg text-xs text-gray-700 flex items-center gap-1">
              {products.find(p => p.id === selectedProduct)?.name}
              <button onClick={() => setSelectedProduct('all')}><X className="w-3 h-3" /></button>
            </span>
          )}
        </div>
      )}

      {/* Party Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
          <Building2 className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No parties found</p>
          {(search || partyTypeFilter !== 'all' || selectedProduct !== 'all') && (
            <button 
              onClick={() => { setSearch(''); setPartyTypeFilter('all'); setSelectedProduct('all'); }}
              className="mt-2 text-sm text-rose-600 hover:text-rose-700"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(party => (
            <div
              key={party.id}
              onClick={() => navigate(`/parties/${party.id}`)}
              className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg">{party.legalName}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getTypeBadge(party.type)}`}>
                      {getTypeLabel(party.type)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">{party.name}</p>

                  <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                    {party.phone && (
                      <a 
                        href={`tel:${party.phone}`} 
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1 hover:text-rose-600"
                      >
                        <Phone className="w-3.5 h-3.5" /> {party.phone}
                      </a>
                    )}
                    {party.email && (
                      <a 
                        href={`mailto:${party.email}`}
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1 hover:text-rose-600"
                      >
                        <Mail className="w-3.5 h-3.5" /> {party.email}
                      </a>
                    )}
                    {(party.city || party.state) && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> {party.city}{party.state ? `, ${party.state}` : ''}
                      </span>
                    )}
                  </div>

                  {/* Products */}
                  {party.productIds && party.productIds.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {party.productIds.map(pid => {
                        const prod = products.find(p => p.id === pid);
                        return prod ? (
                          <span key={pid} className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                            {prod.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>

                <div className="text-right text-sm text-gray-500">
                  {party.gstin && <p>GST: {party.gstin}</p>}
                  {party.pan && <p>PAN: {party.pan}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
