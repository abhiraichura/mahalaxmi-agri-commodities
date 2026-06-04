import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../hooks/useAuthStore';
import { Search, Plus, Phone, Mail, MapPin, Download, Upload } from 'lucide-react';
import { Party } from '../types';

export default function PartyDirectory() {
  const { parties } = useAppStore();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filtered = parties.filter((p: Party) => {
    const searchLower = search.toLowerCase();
    const nameMatch = (p.name || '').toLowerCase().includes(searchLower);
    const legalNameMatch = (p.legalName || '').toLowerCase().includes(searchLower);
    const gstinMatch = (p.gstin || '').toLowerCase().includes(searchLower);
    const cityMatch = (p.city || '').toLowerCase().includes(searchLower);
    const matchesSearch = nameMatch || legalNameMatch || gstinMatch || cityMatch;
    const matchesType = typeFilter === 'all' || !p.type || p.type === typeFilter || p.type === 'both';
    return matchesSearch && matchesType;
  });

  const handleExportCSV = () => {
    const csvRows = [
      ['Name', 'Legal Name', 'GSTIN', 'Type', 'Phone', 'Email', 'Address', 'City', 'State', 'PAN', 'Alt Phone', 'Alt Email', 'Contact Person', 'Bank Name', 'Bank Account', 'Bank IFSC', 'Remarks', 'Notes'].join(','),
      ...parties.map((p: Party) => [
        p.name || '',
        p.legalName || '',
        p.gstin || '',
        p.type || '',
        p.phone || '',
        p.email || '',
        `"${(p.address || '').replace(/"/g, '""')}"`,
        p.city || '',
        p.state || '',
        p.pan || '',
        p.altPhone || '',
        p.altEmail || '',
        p.contactPerson || '',
        p.bankName || '',
        p.bankAccount || '',
        p.bankIfsc || '',
        `"${(p.remarks || '').replace(/"/g, '""')}"`,
        `"${(p.notes || '').replace(/"/g, '""')}"`,
      ].join(','))
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `parties-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      console.log('CSV imported:', text);
      alert('CSV import feature - data logged to console');
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Party Directory</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your buyers and sellers</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          <label className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer">
            <Upload className="w-4 h-4 mr-2" />
            Import
            <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
          </label>
          <Link
            to="/parties/new"
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Party
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search parties..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <option value="all">All Types</option>
          <option value="seller">Sellers</option>
          <option value="buyer">Buyers</option>
          <option value="both">Both</option>
        </select>
      </div>

      {/* Party Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full bg-white border border-gray-200 rounded-2xl p-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No parties found</h3>
            <p className="text-sm text-gray-500 mt-1">Add your first party to get started</p>
          </div>
        ) : (
          filtered.map((party: Party) => (
            <Link
              key={party.id}
              to={`/parties/${party.id}`}
              className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{party.legalName}</h3>
                  <p className="text-sm text-gray-500">{party.name || party.legalName}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  !party.type || party.type === 'both' ? 'bg-purple-50 text-purple-700' :
                  party.type === 'seller' ? 'bg-blue-50 text-blue-700' :
                  'bg-green-50 text-green-700'
                }`}>
                  {party.type || 'both'}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center text-gray-600">
                  <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                  {party.city}, {party.state}
                </div>
                {party.phone && (
                  <div className="flex items-center text-gray-600">
                    <Phone className="w-4 h-4 mr-2 text-gray-400" />
                    <a href={`tel:${party.phone}`} className="hover:text-red-600">{party.phone}</a>
                  </div>
                )}
                {party.email && (
                  <div className="flex items-center text-gray-600">
                    <Mail className="w-4 h-4 mr-2 text-gray-400" />
                    <a href={`mailto:${party.email}`} className="hover:text-red-600">{party.email}</a>
                  </div>
                )}
                {party.gstin && (
                  <div className="text-gray-500">GSTIN: {party.gstin}</div>
                )}
                {party.pan && (
                  <div className="text-gray-500">PAN: {party.pan}</div>
                )}
              </div>

              {party.remarks && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500">{party.remarks}</p>
                </div>
              )}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
