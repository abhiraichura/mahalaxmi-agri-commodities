// src/pages/PartyDirectory.tsx
import { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../hooks/useAuthStore';
import { Party } from '../types';
import { Search, Plus, Phone, Mail, MapPin, Edit2, Trash2, Download, Upload, X, ChevronRight, ChevronDown, Check, User, Users, AlertTriangle, CheckSquare, FileText, Copy, ClipboardPaste } from 'lucide-react';
import toast from 'react-hot-toast';
import ExportPartyModal from '../components/ExportPartyModal';
import { Page, Button, Badge, Sheet, Segmented, EmptyState } from '../ui';

// A small icon-only button with a 44px tap area that does not make its row taller
const ICON_BTN = 'inline-flex items-center justify-center w-11 h-11 -my-2 -mr-2 shrink-0 text-gray-400 hover:text-rose-600 rounded-lg transition-colors';

export default function PartyDirectory() {
  const navigate = useNavigate();
  const { parties, products, deleteParty, loadParties, addParty } = useAppStore();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'buyer' | 'seller' | 'both'>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const [viewingParty, setViewingParty] = useState<Party | null>(null);
  
  // Bulk Selection States
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);

  // Export Filter Popup Modal State
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

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [products]);

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

  const handleCopy = async (text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch (err) {
      console.error('Failed to copy text: ', err);
      toast.error('Failed to copy');
    }
  };

  const handleCopyStructural = async (party: Party) => {
    const formattedData = `${party.legalName || party.name || ''}\n${party.gstin || ''}\n${party.address || ''}`;
    try {
      await navigator.clipboard.writeText(formattedData.trim());
      toast.success('Copied party details');
    } catch (err) {
      console.error('Failed to copy structural data: ', err);
      toast.error('Failed to copy');
    }
  };

  // Transform parties data to match specialized ExportPartyModal data mapping schema
  const transformedPartiesForExport = useMemo(() => {
    return parties.map(p => ({
      id: p.id,
      name: p.legalName || p.name,
      type: p.type as 'buyer' | 'seller' | 'both',
      phone: p.phone,
      contactPerson: p.contactPerson || '', // Mapped contact person name instead of email
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
          notes: row['Notes'] || '',
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
    <Page
      title="Party Directory"
      subtitle={`${parties.length} parties registered`}
      width="wide"
      actions={
        <>
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv"
            onChange={importCSV}
            className="hidden"
            aria-label="Import parties from CSV file"
          />

          {/* Selection Mode Toggles */}
          {isSelectionMode ? (
            <>
              <Button variant="secondary" icon={<X size={16} />} onClick={cancelSelectionMode}>Cancel Selection</Button>
              {selectedIds.length > 0 && (
                <Button variant="danger" icon={<Trash2 size={16} />} onClick={() => setDeleteStep(1)}>
                  Delete Selected ({selectedIds.length})
                </Button>
              )}
            </>
          ) : (
            <Button variant="secondary" icon={<CheckSquare size={16} />} onClick={() => setIsSelectionMode(true)}>Select Multiple</Button>
          )}

          {!isSelectionMode && (
            <>
              <Button variant="secondary" icon={<Upload size={16} />} onClick={() => fileInputRef.current?.click()}>Import</Button>
              <Button variant="secondary" icon={<Download size={16} />} onClick={() => setIsExportModalOpen(true)}>Export</Button>
              <Button variant="primary" className="order-first lg:order-last" icon={<Plus size={16} />} onClick={() => navigate('/parties/new')}>Add Party</Button>
            </>
          )}
        </>
      }
    >
      {/* Search & Filters */}
      <div className="card p-4 mb-4 space-y-3">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, contact person, city, phone, or product..."
            aria-label="Search parties"
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
                { value: 'all', label: 'All' },
                { value: 'buyer', label: 'Buyers' },
                { value: 'seller', label: 'Sellers' },
                { value: 'both', label: 'Both' },
              ]}
            />
          </div>

          {/* Custom Product Filter Dropdown */}
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

          {/* Conditional Select All Toggle */}
          {isSelectionMode && filtered.length > 0 && (
            <label className="flex items-center gap-2 min-h-[44px] text-sm text-gray-700 cursor-pointer whitespace-nowrap bg-rose-50 px-3 rounded-xl border border-rose-200 hover:bg-rose-100 transition-colors">
              <input
                type="checkbox"
                checked={selectedIds.length === filtered.length && filtered.length > 0}
                onChange={handleSelectAll}
                className="w-5 h-5 text-rose-600 rounded border-gray-300 focus:ring-rose-500"
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
        <div className="card">
          <EmptyState icon={<Users size={24} />} title="No parties found">
            {search ? 'Try a different search term' : undefined}
          </EmptyState>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4">
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
                className={`card p-4 transition-colors cursor-pointer group min-w-0 ${
                  isSelected ? '!border-rose-500 !bg-rose-50/50' : 'hover:border-rose-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {isSelectionMode && (
                    <label onClick={(e) => e.stopPropagation()} className="flex items-center justify-center w-11 h-11 -m-2.5 shrink-0 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelection(party.id)}
                        aria-label={`Select ${party.legalName}`}
                        className="w-5 h-5 text-rose-600 rounded border-gray-300 focus:ring-rose-500 cursor-pointer"
                      />
                    </label>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 group-hover:text-rose-700 transition-colors line-clamp-2">
                      {party.legalName}
                    </h3>
                    {party.name !== party.legalName && (
                      <p className="text-xs text-gray-500 truncate">{party.name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge tone={party.type === 'buyer' ? 'blue' : party.type === 'seller' ? 'green' : 'violet'} className="capitalize">
                      {party.type}
                    </Badge>
                    {!isSelectionMode && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCopyStructural(party); }}
                        className={`${ICON_BTN} hover:bg-rose-50`}
                        title="Copy Party Details Structurally"
                        aria-label="Copy party details"
                      >
                        <ClipboardPaste size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div className={`mt-3 space-y-2 ${isSelectionMode ? 'pl-8' : ''}`}>
                  {party.contactPerson && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-700">
                      <User size={14} className="text-gray-400 shrink-0" />
                      <span className="font-medium truncate">{party.contactPerson}</span>
                    </div>
                  )}

                  {party.gstin && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-500 min-h-[44px]">
                      <FileText size={14} className="flex-shrink-0" />
                      <span className="truncate flex-1">GST: {party.gstin}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCopy(party.gstin!); }}
                        className={ICON_BTN}
                        title="Copy GST"
                        aria-label="Copy GST number"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-sm text-gray-500 min-h-[44px]">
                    <MapPin size={14} className="flex-shrink-0" />
                    <span className="line-clamp-2 flex-1">
                      {party.address ? `${party.address}, ${party.city}, ${party.state}` : `${party.city}, ${party.state}`}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(party.address ? `${party.address}, ${party.city}, ${party.state}` : `${party.city}, ${party.state}`);
                      }}
                      className={ICON_BTN}
                      title="Copy Address"
                      aria-label="Copy address"
                    >
                      <Copy size={16} />
                    </button>
                  </div>

                  {phones.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {phones.map((phone, idx) => (
                        <div key={idx} className="inline-flex items-center bg-rose-50 rounded-xl">
                          <a
                            href={`tel:${phone.replace(/\s/g, '')}`}
                            onClick={e => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 pl-3 min-h-[44px] text-sm text-rose-700 hover:text-rose-800"
                          >
                            <Phone size={14} />
                            {phone}
                          </a>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCopy(phone); }}
                            className="inline-flex items-center justify-center w-11 h-11 text-rose-400 hover:text-rose-700 rounded-xl"
                            title="Copy Phone"
                            aria-label={`Copy phone ${phone}`}
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {partyProducts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {partyProducts.map(prod => (
                        <Badge key={prod!.id}>{prod!.name}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View Party Sheet */}
      {viewingParty && (
        <Sheet
          open={!isSelectionMode}
          onClose={() => setViewingParty(null)}
          title={viewingParty.legalName}
          wide
          footer={
            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                icon={<Edit2 size={16} />}
                onClick={() => {
                  setViewingParty(null);
                  navigate(`/parties/edit/${viewingParty.id}`);
                }}
              >
                Edit
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                icon={<Trash2 size={16} />}
                onClick={() => {
                  handleDeleteSingle(viewingParty.id);
                  setViewingParty(null);
                }}
              >
                Delete
              </Button>
            </div>
          }
        >
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <Badge tone={viewingParty.type === 'buyer' ? 'blue' : viewingParty.type === 'seller' ? 'green' : 'violet'} className="capitalize">{viewingParty.type}</Badge>
              <Button variant="soft" icon={<ClipboardPaste size={16} />} onClick={() => handleCopyStructural(viewingParty)} title="Copy Details">
                Copy details
              </Button>
            </div>

            {viewingParty.name !== viewingParty.legalName && (
              <p className="text-gray-500">Display Name: {viewingParty.name}</p>
            )}

            {viewingParty.contactPerson && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 rounded-xl">
                <User size={16} className="text-rose-600 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{viewingParty.contactPerson}</p>
                  <p className="text-xs text-gray-500">Primary Contact Person</p>
                </div>
              </div>
            )}

            {viewingParty.otherContacts && viewingParty.otherContacts.length > 0 && (
              <div className="space-y-2">
                <p className="section-label">Other Contacts</p>
                {viewingParty.otherContacts.map((contact, idx) => (
                  <div key={idx} className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <Users size={14} className="text-gray-500" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2">
                          <p className="font-medium text-gray-900">{contact.name}</p>
                          {contact.phone && (
                            <span className="text-sm text-gray-600">{contact.phone}</span>
                          )}
                        </div>
                        {contact.role && <p className="text-xs text-gray-500">{contact.role}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {contact.phone && (
                        <>
                          <a href={`tel:${contact.phone.replace(/\s/g, '')}`} aria-label={`Call ${contact.name}`} className="inline-flex items-center justify-center w-11 h-11 bg-white rounded-xl text-rose-600 hover:bg-rose-50 border border-gray-200">
                            <Phone size={16} />
                          </a>
                          <button onClick={() => handleCopy(contact.phone!)} aria-label={`Copy phone of ${contact.name}`} className="inline-flex items-center justify-center w-11 h-11 bg-white rounded-xl text-gray-500 hover:bg-rose-50 hover:text-rose-600 border border-gray-200">
                            <Copy size={16} />
                          </button>
                        </>
                      )}
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} aria-label={`Email ${contact.name}`} className="inline-flex items-center justify-center w-11 h-11 bg-white rounded-xl text-sky-700 hover:bg-sky-50 border border-gray-200">
                          <Mail size={16} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {viewingParty.gstin && (
              <div className="flex items-center gap-1 text-gray-600 min-h-[44px]">
                <span className="min-w-0 break-all">GSTIN: {viewingParty.gstin}</span>
                <button onClick={() => handleCopy(viewingParty.gstin!)} className={ICON_BTN} title="Copy GST" aria-label="Copy GST number">
                  <Copy size={16} />
                </button>
              </div>
            )}
            {viewingParty.pan && <p className="text-gray-600">PAN: {viewingParty.pan}</p>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <p><span className="text-gray-500">Type:</span> <span className="capitalize">{viewingParty.type}</span></p>
              <p><span className="text-gray-500">City:</span> {viewingParty.city}, {viewingParty.state}</p>
            </div>

            <div className="flex items-center gap-1 text-gray-600">
              <div className="flex-1 min-w-0">
                <p>Address: {viewingParty.address}</p>
                <p>{viewingParty.city}, {viewingParty.state} - {viewingParty.pincode}</p>
              </div>
              <button
                onClick={() => handleCopy(`${viewingParty.address ? viewingParty.address + '\n' : ''}${viewingParty.city}, ${viewingParty.state} - ${viewingParty.pincode}`)}
                className={ICON_BTN}
                title="Copy Address"
                aria-label="Copy address"
              >
                <Copy size={16} />
              </button>
            </div>

            {viewingParty.phone && (
              <div className="flex items-start gap-2">
                <div className="flex items-center gap-2 min-h-[44px]">
                  <Phone size={14} className="text-gray-400" />
                  <span className="text-gray-600">Phone:</span>
                </div>
                <div className="flex flex-wrap gap-2 flex-1">
                  {parsePhones(viewingParty.phone).map((phone, idx) => (
                    <div key={idx} className="inline-flex items-center bg-gray-50 rounded-xl border border-gray-100">
                      <a href={`tel:${phone.replace(/\s/g, '')}`} className="inline-flex items-center min-h-[44px] pl-3 text-rose-700 hover:underline text-sm">
                        {phone}
                      </a>
                      <button onClick={() => handleCopy(phone)} className="inline-flex items-center justify-center w-11 h-11 text-gray-400 hover:text-rose-600 rounded-xl" title="Copy Phone" aria-label={`Copy phone ${phone}`}>
                        <Copy size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {viewingParty.productIds && viewingParty.productIds.length > 0 && (
              <div className="pt-1">
                <p className="section-label mb-2">Products They Trade</p>
                <div className="flex flex-wrap gap-2">
                  {viewingParty.productIds.map((pid: string) => {
                    const prod = products.find(p => p.id === pid);
                    return prod ? <Badge key={pid} tone="rose">{prod.name}</Badge> : null;
                  })}
                </div>
              </div>
            )}

            {viewingParty.notes && (
              <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-xl">
                <div className="flex items-center gap-2 mb-2 text-rose-700">
                  <FileText size={16} />
                  <span className="font-semibold text-sm">Private Notes</span>
                </div>
                <p className="text-gray-700 text-sm whitespace-pre-wrap">{viewingParty.notes}</p>
              </div>
            )}
          </div>
        </Sheet>
      )}

      {/* Double Confirmation Bulk Delete Sheet */}
      <Sheet
        open={deleteStep > 0}
        onClose={() => setDeleteStep(0)}
        title={deleteStep === 1 ? `Delete ${selectedIds.length} Parties?` : <span className="text-red-600">Final Confirmation</span>}
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setDeleteStep(0)}>Cancel</Button>
            {deleteStep === 1 ? (
              <Button variant="danger" className="flex-1" onClick={() => setDeleteStep(2)}>Yes, Proceed</Button>
            ) : (
              <Button variant="danger" className="flex-1" onClick={executeBulkDelete}>Permanently Delete</Button>
            )}
          </div>
        }
      >
        <div className="flex items-start gap-3 pb-2">
          <span className="w-10 h-10 shrink-0 bg-red-50 rounded-full flex items-center justify-center">
            <AlertTriangle size={20} className="text-red-600" />
          </span>
          {deleteStep === 1 ? (
            <p className="text-sm text-gray-600 pt-2">
              Are you sure you want to delete the selected parties from your directory?
            </p>
          ) : (
            <p className="text-sm text-gray-600 pt-2">
              This action is <strong>irreversible</strong>. You are about to permanently delete {selectedIds.length} records. Please confirm again.
            </p>
          )}
        </div>
      </Sheet>

      {/* Export Party Pop-up Modal Component Link */}
      <ExportPartyModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        parties={transformedPartiesForExport}
      />
    </Page>
  );
}
