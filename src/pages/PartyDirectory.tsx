import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../hooks/useAuthStore';
import { Search, Plus, Phone, MapPin, Edit2, Trash2, Eye, Download, Upload, Package } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PartyDirectory() {
  const navigate = useNavigate();
  const { parties, products, deleteParty } = useAppStore();
  const [search, setSearch] = useState('');
  const [selectedParty, setSelectedParty] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filtered = parties.filter(p => {
    const q = search.toLowerCase();
    return (
      p.legalName?.toLowerCase().includes(q) ||
      p.name?.toLowerCase().includes(q) ||
      p.gstin?.toLowerCase().includes(q) ||
      p.city?.toLowerCase().includes(q) ||
      p.phone?.toLowerCase().includes(q)
    );
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this party?')) return;
    await deleteParty(id);
    toast.success('Party deleted');
  };

  const getProductNames = (productIds: string[] = []) => {
    return productIds.map(id => products.find(p => p.id === id)?.name).filter(Boolean);
  };

  const parsePhoneNumbers = (phone: string = '') => {
    return phone.split('/').map(n => n.trim()).filter(Boolean);
  };

  const exportCSV = () => {
    const headers = ['Legal Name', 'Display Name', 'GSTIN', 'Address', 'City', 'State', 'Pincode', 'Phone', 'Email', 'Products'];
    const rows = parties.map(p => [
      p.legalName,
      p.name || '',
      p.gstin || '',
      p.address,
      p.city,
      p.state,
      p.pincode || '',
      p.phone || '',
      p.email || '',
      getProductNames(p.products).join('; ')
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `parties_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported to CSV');
  };

  const importCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
            let imported = 0;
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        if (values.length < 4) continue;
        const party = {
          id: crypto.randomUUID(),
          legalName: values[0] || '',
          name: values[1] || '',
          gstin: values[2] || '',
          address: values[3] || '',
          city: values[4] || '',
          state: values[5] || '',
          pincode: values[6] || '',
          phone: values[7] || '',
          email: values[8] || '',
          products: [] as string[],
          createdAt: new Date().toISOString()
        };
        if (party.legalName) {
          await useAppStore.getState().addParty(party);
          imported++;
        }
      }
      toast.success(`Imported ${imported} parties`);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Party Directory</h1>
          <p className="text-sm text-gray-500 mt-1">{parties.length} parties registered</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept=".csv"
            onChange={importCSV}
            className="hidden"
            id="csv-import"
          />
          <label
            htmlFor="csv-import"
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import
          </label>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => navigate('/parties/new')}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Party
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, GSTIN, city, phone..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No parties found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(party => {
            const phones = parsePhoneNumbers(party.phone || '');
            const productNames = getProductNames(party.products);
            return (
              <div
                key={party.id}
                onClick={() => setSelectedParty(party)}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-rose-200 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{party.legalName}</h3>
                    {party.name && party.name !== party.legalName && (
                      <p className="text-xs text-gray-500">{party.name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={e => { e.stopPropagation(); navigate(`/parties/edit/${party.id}`); }}
                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(party.id); }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {party.gstin && (
                    <p className="text-gray-600"><span className="text-gray-400">GST:</span> {party.gstin}</p>
                  )}
                  <div className="flex items-start gap-1.5 text-gray-600">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 text-gray-400 shrink-0" />
                    <span className="line-clamp-2">{party.address}, {party.city}, {party.state}</span>
                  </div>
                  {phones.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      {phones.map((num, i) => (
                        <span key={i}>
                          <a
                            href={`tel:+91${num.replace(/\s/g, '')}`}
                            className="text-rose-600 hover:text-rose-700 hover:underline"
                            onClick={e => e.stopPropagation()}
                          >
                            {num}
                          </a>
                          {i < phones.length - 1 && <span className="text-gray-400 mx-1">/</span>}
                        </span>
                      ))}
                    </div>
                  )}
                  {productNames.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <Package className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      {productNames.slice(0, 3).map((name, i) => (
                        <span key={i} className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">{name}</span>
                      ))}
                      {productNames.length > 3 && (
                        <span className="text-xs text-gray-400">+{productNames.length - 3} more</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Party Detail Modal */}
      {selectedParty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setSelectedParty(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedParty.legalName}</h2>
                  {selectedParty.name && selectedParty.name !== selectedParty.legalName && (
                    <p className="text-sm text-gray-500">{selectedParty.name}</p>
                  )}
                </div>
                <button onClick={() => setSelectedParty(null)} className="p-1 text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="space-y-4 text-sm">
                {selectedParty.gstin && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 w-20 shrink-0">GSTIN</span>
                    <span className="font-medium text-gray-900">{selectedParty.gstin}</span>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <span className="text-gray-400 w-20 shrink-0">Address</span>
                  <span className="text-gray-900">{selectedParty.address}, {selectedParty.city}, {selectedParty.state} {selectedParty.pincode || ''}</span>
                </div>
                {selectedParty.phone && (
                  <div className="flex items-start gap-2">
                    <span className="text-gray-400 w-20 shrink-0">Phone</span>
                    <div className="flex flex-wrap gap-2">
                      {parsePhoneNumbers(selectedParty.phone).map((num, i) => (
                        <a
                          key={i}
                          href={`tel:+91${num.replace(/\s/g, '')}`}
                          className="px-3 py-1.5 bg-rose-50 text-rose-700 rounded-lg font-medium hover:bg-rose-100 transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5 inline mr-1" />
                          {num}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {selectedParty.email && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 w-20 shrink-0">Email</span>
                    <a href={`mailto:${selectedParty.email}`} className="text-rose-600 hover:underline">{selectedParty.email}</a>
                  </div>
                )}
                {getProductNames(selectedParty.products).length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-gray-400 w-20 shrink-0">Products</span>
                    <div className="flex flex-wrap gap-1.5">
                      {getProductNames(selectedParty.products).map((name, i) => (
                        <span key={i} className="px-2.5 py-1 bg-gray-100 rounded-lg text-xs font-medium text-gray-700">{name}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={() => { setSelectedParty(null); navigate(`/parties/edit/${selectedParty.id}`); }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => setSelectedParty(null)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Users(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  );
}
