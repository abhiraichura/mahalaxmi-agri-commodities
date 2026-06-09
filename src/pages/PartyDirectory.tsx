import { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../hooks/useAuthStore';
import { Party } from '../types';
import { Search, Plus, Phone, Mail, MapPin, Edit2, Trash2, Download, Upload, X, ChevronRight, ChevronDown, Check, User, Users, AlertTriangle, CheckSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import ExportPartyModal from '../components/ExportPartyModal';

export default function PartyDirectory() {
  const navigate = useNavigate();
  const { parties, products, deleteParty, loadParties, addParty } = useAppStore();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'buyer' | 'seller' | 'bothtransformedPartiesForExport'>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const [viewingParty, setViewingParty] = useState<Party | null>(null);
  
  // Bulk Selection States
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);

  // Export Pop-up Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const productDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (productDropdownRef.current && !productDropdownRef.current.contains(e.target as Node)) {
        setProductDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cancel selection mode cleanly
  const cancelSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedIds([]);
    setDeleteStep(0);
  };

  const filtered = useMemo(() => {
    let result = parties.filter(p => {
      const searchLower = search.toLowerCase().trim();

      const partyProducts = (p.productIds || [])
        .map(pid => products.find(prod => prod.id === pid)?.name?.toLowerCase() || '')
        .filter(Boolean);

      const otherContactDetails = (p.otherContacts || [])
        .map(c => `${c.name || ''} ${c.role || ''} ${c.phone || ''} ${c.email || ''}`.toLowerCase());

      const searchableText = [
        p.legalName?.toLowerCase() || '',
        p.name?.toLowerCase() || '',
        p.city?.toLowerCase() || '',
        p.phone?.toLowerCase() || '',
        p.contactPerson?.toLowerCase() || '',
        ...partyProducts,
        ...otherContactDetails,
        p.gstin?.toLowerCase() || ''
      ].join(' ');

      const matchesSearch = !searchLower || searchableText.includes(searchLower);
      
      const matchesType = filterType === 'all' || 
        (filterType === 'buyer' && (p.type === 'buyer' || p.type === 'both')) ||
        (filterType === 'seller' && (p.type === 'seller' || p.type === 'both')) ||
        (filterType === 'both' && p.type === 'both');
      
      const matchesProduct = productFilter === 'all' || (p.productIds || []).includes(productFilter);
      return matchesSearch && matchesType && matchesProduct;
    });

    result.sort((a, b) => a.legalName.localeCompare(b.legalName));
    return result;
  }, [parties, products, search, filterType, productFilter]);

  // Bulk Selection Logic
  const handleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(p => p.id));
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]
    );
  };

  const handleCardClick = (party: Party) => {
    if (isSelectionMode) {
      toggleSelection(party.id);
    } else {
      setViewingParty(party);
    }
  };

  const executeBulkDelete = async () => {
    toast.loading('Deleting parties...');
    try {
      for (const id of selectedIds) {
        await deleteParty(id);
      }
      toast.dismiss();
      toast.success(`Successfully deleted ${selectedIds.length} parties`);
      cancelSelectionMode();
    } catch (error) {
      toast.dismiss();
      toast.error('Error deleting parties');
      setDeleteStep(0);
    }
  };

  const handleDeleteSingle = async (id: string) => {
    if (!confirm('Delete this party?')) return;
    await deleteParty(id);
    toast.success('Deleted');
  };

  const parsePhones = (phoneStr: string): string[] => {
    if (!phoneStr) return [];
    return phoneStr.split(/[\/,]/).map(s => s.trim()).filter(Boolean);
  };

  // Transform parties data with string array product names to match ExportPartyModal schema expectations
  // Transform parties data to match ExportPartyModal schema expectations
  const transformedPartiesForExport = useMemo(() => {
    return parties.map(p => ({
      id: p.id,
      name: p.legalName || p.name,
      type: p.type as 'buyer' | 'seller' | 'both',
      phone: p.phone,
      contactPerson: p.contactPerson || '', // Changed from email to contactPerson
      city: p.city,
      products: (p.productIds || [])
        .map(pid => products.find(prod => prod.id === pid)?.name || '')
        .filter(Boolean)
    }));
  }, [parties, products]);

  const importCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length < 2) {
        toast.error('CSV is empty');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      let count = 0;

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
        const row: any = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx] || '';
        });

        if (!row['Legal Name']) continue;
        const party: Party = {
          id: row['ID'] || crypto.randomUUID(),
          legalName: row['Legal Name'],
          name: row['Display Name'] || row['Legal Name'],
          gstin: row['GSTIN'] || '',
          type: (row['Type'] as any) || 'both',
          address: row['Address'] || '',
          city: row['City'] || '',
          state: row['State'] || 'Gujarat',
          pincode: row['Pincode'] || '',
          phone: row['Phone'] || '',
          email: row['Email'] || '',
          pan: row['PAN'] || '',
          productIds: [],
          contactPerson: row['Contact Person'] || '',
          alternatePhones: row['Alternate Phones'] ? row['Alternate Phones'].split(';').map((s: string) => s.trim()).filter(Boolean) : [],
          alternateEmails: row['Alternate Emails'] ? row['Alternate Emails'].split(';').map((s: string) => s.trim()).filter(Boolean) : [],
          otherContacts: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        try {
          await addParty(party);
          count++;
        } catch (err) {
          console.error('Import error:', err);
        }
      }

      toast.success(`Imported ${count} parties`);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Party Directory</h1>
            <p className="text-sm text-gray-500 mt-1">{parties.length} parties registered</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              onChange={importCSV}
              className="hidden"
            />
            
            {/* Selection Mode Toggles */}
            {isSelectionMode ? (
              <>
                <button
                  onClick={cancelSelectionMode}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  <X size={16} />
                  Cancel Selection
                </button>
                {selectedIds.length > 0 && (
                  <button
                    onClick={() => setDeleteStep(1)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors shadow-sm"
                  >
                    <Trash2 size={16} />
                    Delete Selected ({selectedIds.length})
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={() => setIsSelectionMode(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <CheckSquare size={16} />
                Select Multiple
              </button>
            )}

            {!isSelectionMode && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Upload size={16} />
                  Import
                </button>
                <button
                  onClick={() => setIsExportModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Download size={16} />
                  Export
                </button>
                <button
                  onClick={() => navigate('/parties/new')}
                  className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700"
                >
                  <Plus size={16} />
                  Add Party
                </button>
              </>
            )}
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200 mb-6 space-y-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, contact person, city, phone, or product..."
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              {/* Type Filter Buttons */}
              <div className="flex gap-2 flex-wrap">
                {(['all', 'buyer', 'seller', 'both'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${
                      filterType === type 
                        ? 'bg-rose-600 text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {type === 'all' ? 'All' : type === 'both' ? 'Both' : `${type}s`}
                  </button>
                ))}
              </div>

              {/* Custom Product Filter Dropdown */}
              <div className="relative w-full sm:max-w-xs" ref={productDropdownRef}>
                <button
                  type="button"
                  onClick={() => setProductDropdownOpen(!productDropdownOpen)}
                  className="w-full px-4 py-2.5 h-[36px] sm:h-auto bg-gray-50 border border-gray-200 rounded-xl text-sm flex items-center justify-between text-left transition-colors hover:bg-gray-100"
                >
                  <span className={productFilter !== 'all' ? 'text-gray-900 font-medium truncate pr-2' : 'text-gray-600'}>
                    {productFilter === 'all' ? 'All Products' : products.find(p => p.id === productFilter)?.name}
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
                    {products.map(p => (
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

            {/* Conditional Select All Toggle */}
            {isSelectionMode && filtered.length > 0 && (
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer whitespace-nowrap bg-rose-50 px-3 py-2 rounded-xl border border-rose-200 hover:bg-rose-100 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedIds.length === filtered.length && filtered.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-rose-600 rounded border-gray-300 focus:ring-rose-500"
                />
                <span className="font-medium text-rose-700">Select All</span>
              </label>
            )}
          </div>

          {search && (
            <p className="text-xs text-gray-500">
              Found {filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{search}"
            </p>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center">
            <Users size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No parties found</p>
            {search && <p className="text-sm text-gray-400 mt-1">Try a different search term</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(party => {
              const phones = parsePhones(party.phone);
              const partyProducts = (party.productIds || [])
                .map(pid => products.find(prod => prod.id === pid))
                .filter(Boolean);

              const isSelected = selectedIds.includes(party.id);

              return (
                <div
                  key={party.id}
                  onClick={() => handleCardClick(party)}
                  className={`bg-white border rounded-2xl p-5 transition-all cursor-pointer group ${
                    isSelected ? 'border-rose-500 shadow-md bg-rose-50/50 scale-[0.99]' : 'border-gray-200 hover:shadow-md hover:border-rose-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex gap-3 items-start w-full">
                      {isSelectionMode && (
                        <div onClick={(e) => e.stopPropagation()} className="pt-1 flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelection(party.id)}
                            className="w-4 h-4 text-rose-600 rounded border-gray-300 focus:ring-rose-500 cursor-pointer"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 group-hover:text-rose-700 transition-colors line-clamp-1">
                          {party.legalName}
                        </h3>
                        {party.name !== party.legalName && (
                          <p className="text-xs text-gray-500 truncate">{party.name}</p>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${
                        party.type === 'buyer' ? 'bg-blue-50 text-blue-600' :
                        party.type === 'seller' ? 'bg-green-50 text-green-600' :
                        'bg-purple-50 text-purple-600'
                      }`}>
                        {party.type}
                      </span>
                    </div>
                  </div>

                  <div className={isSelectionMode ? "pl-7" : ""}>
                    {party.contactPerson && (
                      <div className="flex items-center gap-1.5 text-sm text-gray-700 mb-2">
                        <User size={14} className="text-gray-400" />
                        <span className="font-medium truncate">{party.contactPerson}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-2">
                      <MapPin size={14} className="flex-shrink-0" />
                      <span className="truncate">{party.city}, {party.state}</span>
                    </div>

                    {phones.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {phones.map((phone, idx) => (
                          <a
                            key={idx}
                            href={`tel:${phone.replace(/\s/g, '')}`}
                            onClick={e => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-sm text-rose-600 hover:text-rose-700 bg-rose-50 px-2 py-1 rounded-lg"
                          >
                            <Phone size={12} />
                            {phone}
                          </a>
                        ))}
                      </div>
                    )}

                    {partyProducts.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {partyProducts.map(prod => (
                          <span key={prod!.id} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-lg whitespace-nowrap">
                            {prod!.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* View Party Modal */}
        {viewingParty && !isSelectionMode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setViewingParty(null)}>
             <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">{viewingParty.legalName}</h2>
                <button onClick={() => setViewingParty(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3 text-sm">
                {viewingParty.name !== viewingParty.legalName && (
                  <p className="text-gray-500">Display Name: {viewingParty.name}</p>
                )}

                {viewingParty.contactPerson && (
                  <div className="flex items-center gap-2 p-3 bg-rose-50 rounded-xl">
                    <User size={16} className="text-rose-600" />
                    <div>
                      <p className="font-medium text-gray-900">{viewingParty.contactPerson}</p>
                      <p className="text-xs text-gray-500">Primary Contact Person</p>
                    </div>
                  </div>
                )}

                {viewingParty.otherContacts && viewingParty.otherContacts.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-500">Other Contacts:</p>
                    {viewingParty.otherContacts.map((contact, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                            <Users size={14} className="text-gray-500" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900">{contact.name}</p>
                              {contact.phone && (
                                <span className="text-sm text-gray-600">{contact.phone}</span>
                              )}
                            </div>
                            {contact.role && <p className="text-xs text-gray-500">{contact.role}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {contact.phone && (
                            <a href={`tel:${contact.phone.replace(/\s/g, '')}`} className="p-1.5 bg-white rounded-lg text-rose-600 hover:bg-rose-50 shadow-sm border border-gray-100">
                              <Phone size={14} />
                            </a>
                          )}
                          {contact.email && (
                            <a href={`mailto:${contact.email}`} className="p-1.5 bg-white rounded-lg text-blue-600 hover:bg-blue-50 shadow-sm border border-gray-100">
                              <Mail size={14} />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {viewingParty.gstin && <p className="text-gray-600">GSTIN: {viewingParty.gstin}</p>}
                {viewingParty.pan && <p className="text-gray-600">PAN: {viewingParty.pan}</p>}

                <div className="grid grid-cols-2 gap-2">
                  <p><span className="text-gray-500">Type:</span> <span className="capitalize">{viewingParty.type}</span></p>
                  <p><span className="text-gray-500">City:</span> {viewingParty.city}, {viewingParty.state}</p>
                </div>
                <p className="text-gray-600">Address: {viewingParty.address}</p>
                <p className="text-gray-600">{viewingParty.city}, {viewingParty.state} - {viewingParty.pincode}</p>

                {viewingParty.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-gray-400" />
                    <span className="text-gray-600">Phone:</span>
                    <div className="flex flex-wrap gap-2">
                      {parsePhones(viewingParty.phone).map((phone, idx) => (
                        <a key={idx} href={`tel:${phone.replace(/\s/g, '')}`} className="text-rose-600 hover:underline">
                          {phone}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {viewingParty.productIds && viewingParty.productIds.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs font-medium text-gray-500 mb-2">Products They Trade:</p>
                    <div className="flex flex-wrap gap-2">
                      {viewingParty.productIds.map((pid: string) => {
                        const prod = products.find(p => p.id === pid);
                        return prod ? (
                          <span key={pid} className="text-xs px-3 py-1.5 bg-rose-50 text-rose-700 rounded-lg font-medium">
                            {prod.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={() => {
                    setViewingParty(null);
                    navigate(`/parties/edit/${viewingParty.id}`);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200"
                >
                  <Edit2 size={16} />
                  Edit
                </button>
                <button
                  onClick={() => {
                    handleDeleteSingle(viewingParty.id);
                    setViewingParty(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Double Confirmation Bulk Delete Modal */}
        {deleteStep > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center shadow-xl">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} className="text-red-600" />
              </div>
              
              {deleteStep === 1 ? (
                <>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Delete {selectedIds.length} Parties?</h3>
                  <p className="text-gray-500 mb-6">
                    Are you sure you want to delete the selected parties from your directory?
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setDeleteStep(0)}
                      className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => setDeleteStep(2)}
                      className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700"
                    >
                      Yes, Proceed
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-bold text-red-600 mb-2">Final Confirmation</h3>
                  <p className="text-gray-600 mb-6">
                    This action is <strong>irreversible</strong>. You are about to permanently delete {selectedIds.length} records. Please confirm again.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setDeleteStep(0)}
                      className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={executeBulkDelete}
                      className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700"
                    >
                      Permanently Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Export Party Pop-up Modal */}
      <ExportPartyModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        parties={transformedPartiesForExport}
      />
    </div>
  );
}
