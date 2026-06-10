// src/pages/Parties.tsx
import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../hooks/useAuthStore';
import { Search, MapPin, User, Phone, Check, ChevronDown, BookOpen, X } from 'lucide-react';
import { getColData } from '../utils/firebase';

// Unify type for our Global View
type UnifiedContact = {
  id: string;
  source: 'party_dir' | 'gulfood_dir';
  companyName: string;
  displayName: string;
  location: string;
  contactPerson: string;
  phone: string;
  email: string;
  type: string;
  profileText: string;
  productIds: string[];
};

export default function Parties() {
  const navigate = useNavigate();
  const { parties, products } = useAppStore();
  const [gulfoodMembers, setGulfoodMembers] = useState<any[]>([]);
  
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'buyer' | 'seller' | 'both'>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const productDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch Gulfood members from Firebase (like we do in the actual GulfFoodDirectory)
  useEffect(() => {
    const fetchGulfood = async () => {
      try {
        const fbData = await getColData('gulfood_members');
        if (fbData.length > 0) {
          setGulfoodMembers(fbData);
        } else {
          const localData = localStorage.getItem('gulfood_directory_members');
          if (localData) setGulfoodMembers(JSON.parse(localData));
        }
      } catch (err) {
        console.error('Error loading Gulfood for global search', err);
      }
    };
    fetchGulfood();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (productDropdownRef.current && !productDropdownRef.current.contains(e.target as Node)) {
        setProductDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Alphabetically sort products for the dropdown
  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [products]);

  // 1. Unify Data into a single array
  const unifiedData = useMemo<UnifiedContact[]>(() => {
    const combined: UnifiedContact[] = [];

    // Map Party Directory
    parties.forEach(p => {
      combined.push({
        id: p.id,
        source: 'party_dir',
        companyName: p.legalName,
        displayName: p.name || '',
        location: [p.city, p.state].filter(Boolean).join(', '),
        contactPerson: p.contactPerson || '',
        phone: p.phone || '',
        email: p.email || '',
        type: p.type || 'both',
        profileText: '',
        productIds: p.productIds || [],
      });
    });

    // Map Gulfood Directory
    gulfoodMembers.forEach(m => {
      combined.push({
        id: m.id,
        source: 'gulfood_dir',
        companyName: m.companyName,
        displayName: '',
        location: m.cityState || '',
        contactPerson: m.contactPerson || '',
        phone: m.contactNumber || '',
        email: m.email || '',
        type: 'all', // Gulfood members aren't strictly buyer/seller
        profileText: m.profile || '',
        productIds: [], // They use plain text profile instead of product IDs
      });
    });

    return combined.sort((a, b) => a.companyName.localeCompare(b.companyName));
  }, [parties, gulfoodMembers]);

  // 2. Global Filter Logic
  const filtered = useMemo(() => {
    return unifiedData.filter(contact => {
      const searchLower = search.toLowerCase().trim();

      // Product Names Lookup for this specific contact
      const mappedProductNames = contact.productIds
        .map(pid => products.find(prod => prod.id === pid)?.name?.toLowerCase() || '')
        .filter(Boolean);

      const searchableText = [
        contact.companyName.toLowerCase(),
        contact.displayName.toLowerCase(),
        contact.location.toLowerCase(),
        contact.contactPerson.toLowerCase(),
        contact.phone.toLowerCase(),
        contact.profileText.toLowerCase(),
        ...mappedProductNames
      ].join(' ');

      const matchesSearch = !searchLower || searchableText.includes(searchLower);

      // Type filtering (If 'buyer' or 'seller' is chosen, we filter out Gulfood since we don't know their type. 
      // If 'all', we show everything).
      let matchesType = true;
      if (filterType !== 'all') {
        if (contact.source === 'gulfood_dir') {
          matchesType = false; // Cannot guarantee buyer/seller status for Gulfood
        } else {
          matchesType = (filterType === 'buyer' && (contact.type === 'buyer' || contact.type === 'both')) ||
                        (filterType === 'seller' && (contact.type === 'seller' || contact.type === 'both')) ||
                        (filterType === 'both' && contact.type === 'both');
        }
      }

      // Product filtering: Works across ID arrays (Party Dir) and Plain Text Profiles (Gulfood)
      let matchesProduct = true;
      if (productFilter !== 'all') {
        const targetProduct = products.find(p => p.id === productFilter);
        if (contact.source === 'party_dir') {
          matchesProduct = contact.productIds.includes(productFilter);
        } else if (contact.source === 'gulfood_dir' && targetProduct) {
          // Check if Gulfood text profile mentions the product name
          matchesProduct = contact.profileText.toLowerCase().includes(targetProduct.name.toLowerCase());
        }
      }

      return matchesSearch && matchesType && matchesProduct;
    });
  }, [unifiedData, search, filterType, productFilter, products]);


  // Routing helper
  const openDirectory = (source: string, id: string) => {
    if (source === 'party_dir') {
      // Just go straight to the regular directory where they can search/edit this specific party
      navigate('/parties/directory'); 
    } else {
      navigate('/parties/gulfood');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-6xl mx-auto px-4 py-6">
        
        {/* Header Block */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Global Contact Search</h1>
          <p className="text-gray-500 mt-2">Search across all your directories simultaneously.</p>
        </div>

        {/* Global Search & Filters */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 mb-6 shadow-sm space-y-4">
          <div className="relative">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search any company, contact, city, phone, or product across all directories..."
              className="w-full pl-12 pr-10 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-rose-100 transition-shadow"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              
              {/* Type Filter */}
              <div className="flex gap-2 flex-wrap">
                {(['all', 'buyer', 'seller', 'both'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${
                      filterType === type 
                        ? 'bg-rose-600 text-white shadow-sm' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {type === 'all' ? 'All Types' : type === 'both' ? 'Both' : `${type}s`}
                  </button>
                ))}
              </div>

              {/* Product Filter */}
              <div className="relative w-full sm:max-w-xs" ref={productDropdownRef}>
                <button
                  type="button"
                  onClick={() => setProductDropdownOpen(!productDropdownOpen)}
                  className="w-full px-4 py-2.5 h-[36px] sm:h-auto bg-gray-50 border border-gray-200 rounded-xl text-sm flex items-center justify-between text-left transition-colors hover:bg-gray-100"
                >
                  <span className={productFilter !== 'all' ? 'text-gray-900 font-medium truncate pr-2' : 'text-gray-600'}>
                    {productFilter === 'all' ? 'All Products' : sortedProducts.find(p => p.id === productFilter)?.name}
                  </span>
                  <ChevronDown size={16} className={`text-gray-400 transition-transform ${productDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {productDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto py-1">
                    <button
                      onClick={() => { setProductFilter('all'); setProductDropdownOpen(false); }}
                      className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between hover:bg-gray-50 ${productFilter === 'all' ? 'bg-rose-50 text-rose-700 font-medium' : 'text-gray-700'}`}
                    >
                      <span>All Products</span>
                      {productFilter === 'all' && <Check size={14} className="text-rose-600" />}
                    </button>
                    {sortedProducts.map(p => (
                      <button
                        key={p.id}
                        onClick={() => { setProductFilter(p.id); setProductDropdownOpen(false); }}
                        className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between hover:bg-gray-50 ${productFilter === p.id ? 'bg-rose-50 text-rose-700 font-medium' : 'text-gray-700'}`}
                      >
                        <span className="truncate pr-2">{p.name}</span>
                        {productFilter === p.id && <Check size={14} className="text-rose-600 flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Search Results Metadata */}
        <div className="mb-4 text-sm text-gray-500 font-medium">
          Found {filtered.length} total result{filtered.length !== 1 ? 's' : ''} 
        </div>

        {/* Unified Results Grid */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center">
            <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No contacts found matching your global search.</p>
            <p className="text-sm text-gray-400 mt-1">Try clearing filters or adjusting your keywords.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(contact => (
              <div
                key={`${contact.source}-${contact.id}`}
                className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md hover:border-rose-200 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 line-clamp-1 flex-1 pr-2">
                      {contact.companyName}
                    </h3>
                    {/* Badge indicating Source */}
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full font-bold flex-shrink-0 ${
                      contact.source === 'party_dir' 
                        ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' 
                        : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    }`}>
                      {contact.source === 'party_dir' ? 'Main Party' : 'Gulfood'}
                    </span>
                  </div>
                  
                  {contact.displayName && contact.displayName !== contact.companyName && (
                    <p className="text-xs text-gray-500 truncate mb-3">{contact.displayName}</p>
                  )}

                  <div className="space-y-2 text-sm mt-3">
                    {contact.contactPerson && (
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <User size={14} className="text-gray-400" />
                        <span className="font-medium truncate">{contact.contactPerson}</span>
                      </div>
                    )}

                    {contact.location && (
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <MapPin size={14} className="flex-shrink-0" />
                        <span className="truncate">{contact.location}</span>
                      </div>
                    )}

                    {contact.phone && (
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <Phone size={14} className="text-gray-400 flex-shrink-0" />
                        <span className="truncate">{contact.phone}</span>
                      </div>
                    )}

                    {/* Show extracted Products or Profile Text depending on source */}
                    {contact.source === 'party_dir' && contact.productIds.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {contact.productIds.map(pid => {
                           const prod = products.find(p => p.id === pid);
                           return prod ? (
                             <span key={pid} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-lg whitespace-nowrap">
                               {prod.name}
                             </span>
                           ) : null;
                        })}
                      </div>
                    )}

                    {contact.source === 'gulfood_dir' && contact.profileText && (
                      <div className="pt-2">
                        <span className="inline-block text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-lg line-clamp-2">
                          {contact.profileText}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  onClick={() => openDirectory(contact.source, contact.id)}
                  className="mt-4 w-full py-2 bg-gray-50 text-gray-600 text-xs font-semibold uppercase tracking-wider rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-colors"
                >
                  Open in Directory
                </button>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
