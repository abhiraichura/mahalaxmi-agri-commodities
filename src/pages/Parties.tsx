// src/pages/Parties.tsx
import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../hooks/useAuthStore';
import { Search, MapPin, User, Phone, Check, ChevronDown, BookOpen, X } from 'lucide-react';
import { getColData } from '../utils/firebase';
import { Page, Button, Badge, Segmented, EmptyState } from '../ui';

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

    return combined.sort((a, b) => (a.companyName || '').localeCompare(b.companyName || ''));
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
    <Page title="Global Contact Search" subtitle="Search across all your directories simultaneously." width="wide">
      {/* Global Search & Filters */}
      <div className="card p-4 mb-4 space-y-3">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search any company, contact, city, phone, or product..."
            aria-label="Search all directories"
            className="input-field pl-10 pr-10"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 rounded-full"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          {/* Type Filter */}
          <div className="min-w-0 lg:flex-1">
            <Segmented<'all' | 'buyer' | 'seller' | 'both'>
              value={filterType}
              onChange={setFilterType}
              label="Party type"
              options={[
                { value: 'all', label: 'All types' },
                { value: 'buyer', label: 'Buyers' },
                { value: 'seller', label: 'Sellers' },
                { value: 'both', label: 'Both' },
              ]}
            />
          </div>

          {/* Product Filter */}
          <div className="relative w-full lg:max-w-xs" ref={productDropdownRef}>
            <button
              type="button"
              onClick={() => setProductDropdownOpen(!productDropdownOpen)}
              aria-label="Filter by product"
              aria-expanded={productDropdownOpen}
              className="input-field flex items-center justify-between text-left"
            >
              <span className={productFilter !== 'all' ? 'text-gray-900 font-medium truncate pr-2' : 'text-gray-600'}>
                {productFilter === 'all' ? 'All Products' : sortedProducts.find(p => p.id === productFilter)?.name}
              </span>
              <ChevronDown size={16} className={`text-gray-400 shrink-0 transition-transform ${productDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {productDropdownOpen && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto py-1">
                <button
                  onClick={() => { setProductFilter('all'); setProductDropdownOpen(false); }}
                  className={`w-full px-4 py-2.5 min-h-[44px] text-left text-sm flex items-center justify-between hover:bg-gray-50 ${productFilter === 'all' ? 'bg-rose-50 text-rose-700 font-medium' : 'text-gray-700'}`}
                >
                  <span>All Products</span>
                  {productFilter === 'all' && <Check size={14} className="text-rose-600" />}
                </button>
                {sortedProducts.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setProductFilter(p.id); setProductDropdownOpen(false); }}
                    className={`w-full px-4 py-2.5 min-h-[44px] text-left text-sm flex items-center justify-between hover:bg-gray-50 ${productFilter === p.id ? 'bg-rose-50 text-rose-700 font-medium' : 'text-gray-700'}`}
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

      {/* Search Results Metadata */}
      <p className="mb-3 text-sm text-gray-500 font-medium">
        Found {filtered.length} total result{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Unified Results Grid */}
      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState icon={<BookOpen size={24} />} title="No contacts found matching your global search.">
            Try clearing filters or adjusting your keywords.
          </EmptyState>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4">
          {filtered.map(contact => (
            <div
              key={`${contact.source}-${contact.id}`}
              className="card p-4 hover:border-rose-200 transition-colors flex flex-col justify-between min-w-0"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-gray-900 line-clamp-2 flex-1 min-w-0">
                    {contact.companyName}
                  </h3>
                  {/* Badge indicating Source */}
                  <Badge tone={contact.source === 'party_dir' ? 'violet' : 'green'} className="shrink-0">
                    {contact.source === 'party_dir' ? 'Main Party' : 'Gulfood'}
                  </Badge>
                </div>

                {contact.displayName && contact.displayName !== contact.companyName && (
                  <p className="text-xs text-gray-500 truncate mt-0.5">{contact.displayName}</p>
                )}

                <div className="space-y-2 text-sm mt-3">
                  {contact.contactPerson && (
                    <div className="flex items-center gap-1.5 text-gray-700">
                      <User size={14} className="text-gray-400 shrink-0" />
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
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {contact.productIds.map(pid => {
                        const prod = products.find(p => p.id === pid);
                        return prod ? <Badge key={pid}>{prod.name}</Badge> : null;
                      })}
                    </div>
                  )}

                  {contact.source === 'gulfood_dir' && contact.profileText && (
                    <p className="pt-1 text-xs text-gray-600 line-clamp-2">{contact.profileText}</p>
                  )}
                </div>
              </div>

              <Button
                variant="soft"
                className="mt-4 w-full"
                onClick={() => openDirectory(contact.source, contact.id)}
              >
                Open in Directory
              </Button>
            </div>
          ))}
        </div>
      )}
    </Page>
  );
}
