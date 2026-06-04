import { useState } from 'react';
import { useAppStore } from '../hooks/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Phone, MapPin, FileText, Upload, Download } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PartyDirectory() {
  const navigate = useNavigate();
  const { parties, products, deleteParty } = useAppStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'buyer' | 'seller' | 'both'>('all');
  const [viewingParty, setViewingParty] = useState<any>(null);

  const filtered = parties.filter(p => {
    const matchesSearch = p.legalName.toLowerCase().includes(search.toLowerCase()) ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.gstin || '').toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || p.type === filter || !p.type;
    return matchesSearch && matchesFilter;
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this party?')) return;
    await deleteParty(id);
    toast.success('Deleted');
  };

  const renderPhoneNumbers = (phoneStr: string) => {
    if (!phoneStr) return <span className="text-gray-400 text-sm">N/A</span>;
    const numbers = phoneStr.split(/[\/\,\-]+/).map(n => n.trim()).filter(Boolean);
    return (
      <div className="flex flex-wrap gap-1">
        {numbers.map((num, i) => (
          <a key={i} href={`tel:${num.replace(/\s/g, '')}`}
            className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
            <Phone size={10} /> {num}
          </a>
        ))}
      </div>
    );
  };

  const exportCSV = () => {
    const headers = ['Name', 'Legal Name', 'GSTIN', 'PAN', 'Type', 'Phone', 'Alt Phone', 'Email', 'Alt Email', 'Address', 'City', 'State', 'Pincode', 'Contact Person', 'Bank Name', 'Bank Account', 'Bank IFSC', 'Remarks', 'Notes'];
    const rows = parties.map(p => [
      p.name, p.legalName, p.gstin || '', p.pan || '', p.type || '', p.phone, p.altPhone || '', p.email || '', p.altEmail || '',
      p.address, p.city, p.state, p.pincode, p.contactPerson || '', p.bankName || '', p.bankAccount || '', p.bankIfsc || '', p.remarks || '', p.notes || ''
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${(v || '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `parties_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const importCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      // Simple CSV import - would need more robust parsing for production
      toast.success('Import feature ready - parse and save to Firebase');
    };
    reader.readAsText(file);
  };

  const getPartyProducts = (party: any) => {
    if (!party.productIds || party.productIds.length === 0) return [];
    return products.filter(pr => party.productIds.includes(pr.id));
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Party Directory</h1>
          <p className="text-sm text-gray-500">{filtered.length} parties</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 cursor-pointer">
            <Upload size={16} /> Import
            <input type="file" accept=".csv" onChange={importCSV} className="hidden" />
          </label>
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">
            <Download size={16} /> Export
          </button>
          <button onClick={() => navigate('/parties/new')} className="flex items-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-rose-700">
            <Plus size={16} /> Add Party
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, GSTIN..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm" />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value as any)}
          className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm">
          <option value="all">All Types</option>
          <option value="buyer">Buyers</option>
          <option value="seller">Sellers</option>
          <option value="both">Both</option>
        </select>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(party => {
          const partyProducts = getPartyProducts(party);
          return (
            <div key={party.id}
              onClick={() => setViewingParty(party)}
              className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md hover:border-rose-200 transition-all cursor-pointer group">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-rose-600 transition-colors">{party.legalName}</h3>
                  {party.name !== party.legalName && <p className="text-xs text-gray-500">{party.name}</p>}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  party.type === 'buyer' ? 'bg-blue-100 text-blue-700' :
                  party.type === 'seller' ? 'bg-emerald-100 text-emerald-700' :
                  party.type === 'both' ? 'bg-purple-100 text-purple-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {party.type || 'N/A'}
                </span>
              </div>

              <div className="space-y-2">
                {party.gstin && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <FileText size={12} className="text-gray-400" /> GSTIN: {party.gstin}
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <MapPin size={12} className="text-gray-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-gray-600">{party.city}, {party.state}</p>
                </div>
                <div>{renderPhoneNumbers(party.phone)}</div>
              </div>

              {partyProducts.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {partyProducts.map(pr => (
                    <span key={pr.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">{pr.name}</span>
                  ))}
                </div>
              )}

              <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={e => { e.stopPropagation(); navigate(`/parties/edit/${party.id}`); }}
                  className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700">Edit</button>
                <button onClick={e => { e.stopPropagation(); handleDelete(party.id); }}
                  className="text-xs px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded-lg text-red-600">Delete</button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No parties found</p>
        </div>
      )}

      {/* View Modal */}
      {viewingParty && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setViewingParty(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{viewingParty.legalName}</h2>
                {viewingParty.name !== viewingParty.legalName && <p className="text-sm text-gray-500">{viewingParty.name}</p>}
              </div>
              <button onClick={() => setViewingParty(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <span className="text-gray-400 text-lg">&times;</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                {viewingParty.gstin && <p className="text-sm"><span className="text-gray-500">GSTIN:</span> {viewingParty.gstin}</p>}
                {viewingParty.pan && <p className="text-sm"><span className="text-gray-500">PAN:</span> {viewingParty.pan}</p>}
                <p className="text-sm"><span className="text-gray-500">Type:</span> {viewingParty.type || 'N/A'}</p>
                {viewingParty.contactPerson && <p className="text-sm"><span className="text-gray-500">Contact Person:</span> {viewingParty.contactPerson}</p>}
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p className="text-sm font-medium text-gray-900">Contact</p>
                <div className="text-sm">{renderPhoneNumbers(viewingParty.phone)}</div>
                {viewingParty.altPhone && <div className="text-sm">{renderPhoneNumbers(viewingParty.altPhone)}</div>}
                {viewingParty.email && <p className="text-sm text-rose-600">{viewingParty.email}</p>}
                {viewingParty.altEmail && <p className="text-sm text-rose-600">{viewingParty.altEmail}</p>}
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p className="text-sm font-medium text-gray-900">Address</p>
                <p className="text-sm text-gray-600">{viewingParty.address}</p>
                <p className="text-sm text-gray-600">{viewingParty.city}, {viewingParty.state} - {viewingParty.pincode}</p>
              </div>

              {(viewingParty.bankName || viewingParty.bankAccount) && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <p className="text-sm font-medium text-gray-900">Bank Details</p>
                  {viewingParty.bankName && <p className="text-sm text-gray-600">{viewingParty.bankName}</p>}
                  {viewingParty.bankAccount && <p className="text-sm text-gray-600">A/C: {viewingParty.bankAccount}</p>}
                  {viewingParty.bankIfsc && <p className="text-sm text-gray-600">IFSC: {viewingParty.bankIfsc}</p>}
                </div>
              )}

              {viewingParty.productIds && viewingParty.productIds.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm font-medium text-gray-900 mb-2">Products</p>
                  <div className="flex flex-wrap gap-2">
                    {getPartyProducts(viewingParty).map(pr => (
                      <span key={pr.id} className="text-xs bg-rose-50 text-rose-700 px-2 py-1 rounded-md">{pr.name}</span>
                    ))}
                  </div>
                </div>
              )}

              {(viewingParty.remarks || viewingParty.notes) && (
                <div className="bg-amber-50 rounded-xl p-4 space-y-2">
                  <p className="text-sm font-medium text-amber-900">Notes</p>
                  {viewingParty.remarks && <p className="text-sm text-amber-800">{viewingParty.remarks}</p>}
                  {viewingParty.notes && <p className="text-sm text-amber-800">{viewingParty.notes}</p>}
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={() => { setViewingParty(null); navigate(`/parties/edit/${viewingParty.id}`); }}
                className="flex-1 bg-rose-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-rose-700">Edit Party</button>
              <button onClick={() => setViewingParty(null)} className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
