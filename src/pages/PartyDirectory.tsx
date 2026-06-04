import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Phone, MapPin, Building2, UserCircle, Trash2, Edit2, Eye, X, Banknote, Mail, MessageSquare } from 'lucide-react';
import { useAppStore } from '../hooks/useAuthStore';
import toast from 'react-hot-toast';

export default function PartyDirectory() {
  const navigate = useNavigate();
  const { parties, loadParties, deleteParty } = useAppStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'buyer' | 'seller'>('all');
  const [loading, setLoading] = useState(true);
  const [viewingParty, setViewingParty] = useState<any>(null);

  useEffect(() => { loadParties().then(() => setLoading(false)); }, []);

  const filtered = parties.filter(p => {
    const matches = p.legalName.toLowerCase().includes(search.toLowerCase()) ||
      p.gstin.toLowerCase().includes(search.toLowerCase()) ||
      p.city.toLowerCase().includes(search.toLowerCase());
    const typeMatch = filter === 'all' || p.type === filter || p.type === 'both';
    return matches && typeMatch;
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this party?')) return;
    try { await deleteParty(id); toast.success('Deleted'); } catch (e) { toast.error('Failed'); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Party Directory</h1>
          <p className="text-sm text-gray-500 mt-1">{filtered.length} parties</p>
        </div>
        <button onClick={() => navigate('/party/new')}
          className="px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Party
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, GSTIN, city..."
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
        </div>
        <div className="flex gap-2">
          {(['all', 'buyer', 'seller'] as const).map(t => (
            <button key={t} onClick={() => setFilter(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === t ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-gray-50 text-gray-600 border border-gray-200'}`}>
              {t === 'all' ? 'All' : t === 'buyer' ? 'Buyers' : 'Sellers'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(party => (
          <div key={party.id} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-all group">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  party.type === 'buyer' ? 'bg-rose-50 text-rose-600' :
                  party.type === 'seller' ? 'bg-gray-100 text-gray-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  {party.type === 'buyer' ? <Building2 className="w-5 h-5" /> :
                   party.type === 'seller' ? <UserCircle className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{party.legalName}</h3>
                  <p className="text-xs text-gray-500">{party.gstin}</p>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setViewingParty(party)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-rose-600" title="View Details">
                  <Eye className="w-4 h-4" />
                </button>
                <button onClick={() => navigate(`/party/${party.id}/edit`)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-rose-600" title="Edit">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(party.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="truncate">{party.address}, {party.city}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                <span>{party.phone || 'N/A'}</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                party.type === 'both' ? 'bg-gray-100 text-gray-700' :
                party.type === 'buyer' ? 'bg-rose-50 text-rose-700' : 'bg-gray-100 text-gray-700'
              }`}>
                {party.type === 'both' ? 'Buyer & Seller' : party.type === 'buyer' ? 'Buyer' : 'Seller'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* View Party Details Modal */}
      {viewingParty && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Party Details</h3>
              <button onClick={() => setViewingParty(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  viewingParty.type === 'buyer' ? 'bg-rose-50 text-rose-600' :
                  viewingParty.type === 'seller' ? 'bg-gray-100 text-gray-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  {viewingParty.type === 'buyer' ? <Building2 className="w-6 h-6" /> :
                   viewingParty.type === 'seller' ? <UserCircle className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{viewingParty.legalName}</h4>
                  <p className="text-sm text-gray-500">{viewingParty.gstin}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <h5 className="text-xs font-bold text-gray-500 uppercase">Public Details</h5>
                <DetailRow icon={<MapPin className="w-4 h-4" />} label="Address" value={`${viewingParty.address}, ${viewingParty.city}, ${viewingParty.state} - ${viewingParty.pincode}`} />
                <DetailRow icon={<Phone className="w-4 h-4" />} label="Phone" value={viewingParty.phone || 'N/A'} />
                <DetailRow icon={<Mail className="w-4 h-4" />} label="Email" value={viewingParty.email || 'N/A'} />
                <DetailRow icon={<Banknote className="w-4 h-4" />} label="PAN" value={viewingParty.pan || 'N/A'} />
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-2 border border-gray-200">
                <h5 className="text-xs font-bold text-gray-500 uppercase">Private Details (Not on Contract)</h5>
                <DetailRow icon={<UserCircle className="w-4 h-4" />} label="Contact Person" value={viewingParty.contactPerson || 'N/A'} />
                <DetailRow icon={<Phone className="w-4 h-4" />} label="Alt. Phone" value={viewingParty.altPhone || 'N/A'} />
                <DetailRow icon={<Mail className="w-4 h-4" />} label="Alt. Email" value={viewingParty.altEmail || 'N/A'} />
                <DetailRow icon={<MessageSquare className="w-4 h-4" />} label="Remarks" value={viewingParty.remarks || 'N/A'} />
                <DetailRow icon={<MessageSquare className="w-4 h-4" />} label="Notes" value={viewingParty.notes || 'N/A'} />
                <DetailRow icon={<Banknote className="w-4 h-4" />} label="Bank" value={`${viewingParty.bankName || ''} ${viewingParty.bankAccount ? 'A/c: ' + viewingParty.bankAccount : ''} ${viewingParty.bankIfsc ? 'IFSC: ' + viewingParty.bankIfsc : ''}`} />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setViewingParty(null)} className="px-4 py-2 text-gray-600 font-medium">Close</button>
              <button onClick={() => { setViewingParty(null); navigate(`/party/${viewingParty.id}/edit`); }}
                className="px-6 py-2 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700 flex items-center gap-2">
                <Edit2 className="w-4 h-4" /> Edit Party
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-gray-400 shrink-0 mt-0.5">{icon}</span>
      <div>
        <span className="text-gray-500">{label}:</span>{' '}
        <span className="text-gray-900">{value}</span>
      </div>
    </div>
  );
}
