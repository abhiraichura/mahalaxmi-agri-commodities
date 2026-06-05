import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../hooks/useAuthStore';
import {
  Search, Plus, Phone, MapPin, Edit2, Trash2, Eye, Upload, Download,
  ChevronDown, X, FileSpreadsheet
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function PartyDirectory() {
  const navigate = useNavigate();
  const { parties, products, deleteParty, addParty } = useAppStore();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'buyer' | 'seller' | 'both'>('all');
  const [viewingParty, setViewingParty] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = parties.filter(p => {
    const matchesSearch =
      (p.legalName || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.gstin || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.city || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.phone || '').toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || p.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this party?')) return;
    await deleteParty(id);
    toast.success('Deleted');
  };

  // Parse phone numbers - split by / or ,
  const parsePhones = (phoneStr: string): string[] => {
    if (!phoneStr) return [];
    return phoneStr.split(/[/,]/).map(s => s.trim()).filter(Boolean);
  };

  // Export to CSV
  const exportCSV = () => {
    const headers = ['ID', 'Legal Name', 'Display Name', 'GSTIN', 'Type', 'Address', 'City', 'State', 'Pincode', 'Phone', 'Email', 'PAN', 'Brokerage %', 'Brokerage Fixed', 'Products'];
    const rows = parties.map(p => [
      p.id,
      p.legalName,
      p.name,
      p.gstin,
      p.type,
      p.address,
      p.city,
      p.state,
      p.pincode,
      p.phone,
      p.email,
      p.pan,
      p.brokeragePercent,
      p.brokerageFixed,
      (p.productIds || []).map(pid => products.find(prod => prod.id === pid)?.name || pid).join('; ')
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `parties_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported to CSV');
  };

  // Import from CSV
  const importCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) {
        toast.error('CSV is empty');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      const imported: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
        const row: any = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx] || '';
        });
        imported.push(row);
      }

      let count = 0;
      for (const row of imported) {
        if (!row['Legal Name']) continue;
        const party = {
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
          brokeragePercent: parseFloat(row['Brokerage %']) || 0,
          brokerageFixed: parseFloat(row['Brokerage Fixed']) || 0,
          productIds: [],
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
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Party Directory</h1>
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            onChange={importCSV}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50"
          >
            <Upload className="w-4 h-4" /> Import CSV
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={() => navigate('/parties/new')}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700"
          >
            <Plus className="w-4 h-4" /> Add Party
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, GSTIN, city, phone..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm"
          />
        </div>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value as any)}
          className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm"
        >
          <option value="all">All Types</option>
          <option value="buyer">Buyers</option>
          <option value="seller">Sellers</option>
          <option value="both">Both</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileSpreadsheet className="w-12 h-12 mx-auto mb-3" />
          <p>No parties found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(party => {
            const phones = parsePhones(party.phone);
            const partyProducts = (party.productIds || []).map(pid => products.find(prod => prod.id === pid)).filter(Boolean);

            return (
              <div
                key={party.id}
                onClick={() => setViewingParty(party)}
                className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md hover:border-rose-200 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{party.legalName}</h3>
                    {party.name !== party.legalName && (
                      <p className="text-xs text-gray-500">{party.name}</p>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                    party.type === 'buyer' ? 'bg-blue-50 text-blue-700' :
                    party.type === 'seller' ? 'bg-amber-50 text-amber-700' :
                    'bg-purple-50 text-purple-700'
                  }`}>
                    {party.type}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  {party.gstin && (
                    <p className="text-gray-600">GSTIN: {party.gstin}</p>
                  )}
                  <div className="flex items-start gap-2 text-gray-600">
                    <MapPin className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
                    <span>{party.city}, {party.state}</span>
                  </div>

                  {/* Clickable phone numbers */}
                  {phones.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Phone className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
                      <div className="flex flex-wrap gap-2">
                        {phones.map((phone, idx) => (
                          <a
                            key={idx}
                            href={`tel:+91${phone.replace(/\D/g, '')}`}
                            onClick={e => e.stopPropagation()}
                            className="text-rose-600 hover:text-rose-800 hover:underline"
                          >
                            {phone}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Product tags */}
                  {partyProducts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {partyProducts.map(prod => (
                        <span key={prod!.id} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md">
                          {prod!.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setViewingParty(party);
                    }}
                    className="p-2 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                    title="View"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      navigate(`/parties/edit/${party.id}`);
                    }}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleDelete(party.id);
                    }}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg ml-auto"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View Party Modal */}
      {viewingParty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setViewingParty(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{viewingParty.legalName}</h2>
              <button onClick={() => setViewingParty(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              {viewingParty.name !== viewingParty.legalName && (
                <p><span className="text-gray-500">Display Name:</span> {viewingParty.name}</p>
              )}
              {viewingParty.gstin && <p><span className="text-gray-500">GSTIN:</span> {viewingParty.gstin}</p>}
              {viewingParty.pan && <p><span className="text-gray-500">PAN:</span> {viewingParty.pan}</p>}
              <p><span className="text-gray-500">Type:</span> <span className="capitalize">{viewingParty.type}</span></p>
              <p><span className="text-gray-500">Address:</span> {viewingParty.address}</p>
              <p><span className="text-gray-500">City:</span> {viewingParty.city}, {viewingParty.state} - {viewingParty.pincode}</p>

              {viewingParty.phone && (
                <div>
                  <span className="text-gray-500">Phone:</span>{' '}
                  <div className="inline-flex flex-wrap gap-2 mt-1">
                    {parsePhones(viewingParty.phone).map((phone, idx) => (
                      <a key={idx} href={`tel:+91${phone.replace(/\D/g, '')}`} className="text-rose-600 hover:underline">
                        {phone}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {viewingParty.email && <p><span className="text-gray-500">Email:</span> {viewingParty.email}</p>}
              <p><span className="text-gray-500">Brokerage:</span> {viewingParty.brokeragePercent}% {viewingParty.brokerageFixed > 0 ? `+ Rs.${viewingParty.brokerageFixed}` : ''}</p>

              {viewingParty.productIds && viewingParty.productIds.length > 0 && (
                <div>
                  <span className="text-gray-500">Products:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {viewingParty.productIds.map((pid: string) => {
                      const prod = products.find(p => p.id === pid);
                      return prod ? (
                        <span key={pid} className="px-2 py-1 bg-rose-50 text-rose-700 text-xs rounded-lg">{prod.name}</span>
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
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700"
              >
                <Edit2 className="w-4 h-4" /> Edit
              </button>
              <button
                onClick={() => setViewingParty(null)}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
