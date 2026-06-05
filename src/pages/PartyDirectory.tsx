import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Phone, MapPin, Building2, UserCircle, Trash2, Edit2, X, Mail, Users, Package } from 'lucide-react';
import { useAppStore } from '../hooks/useAuthStore';
import toast from 'react-hot-toast';
import type { Party } from '../types';

export default function PartyDirectory() {
  const navigate = useNavigate();
  const { parties, products, loadParties, loadProducts, deleteParty } = useAppStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'buyer' | 'seller'>('all');
  const [loading, setLoading] = useState(true);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);

  useEffect(() => {
    Promise.all([loadParties(), loadProducts()]).then(() => setLoading(false));
  }, []);

  const filtered = parties.filter(p => {
    const searchLower = search.toLowerCase();
    const matchesName = p.legalName.toLowerCase().includes(searchLower) ||
      (p.name || '').toLowerCase().includes(searchLower);
    const matchesCity = p.city.toLowerCase().includes(searchLower);
    const matchesContact = (p.contactPerson || '').toLowerCase().includes(searchLower);
    const matchesPhone = (p.phone || '').includes(search) ||
      (p.alternateNumbers || []).some(n => n.includes(search));
    // Product search: if search matches any product name, show parties that trade that product
    const matchesProduct = (p.products || []).some(prod => prod.name.toLowerCase().includes(searchLower));
    const matches = matchesName || matchesCity || matchesContact || matchesPhone || matchesProduct;
    const typeMatch = filter === 'all' || p.type === filter || p.type === 'both';
    return matches && typeMatch;
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this party?')) return;
    try { await deleteParty(id); toast.success('Deleted'); } catch (e) { toast.error('Failed'); }
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin" />
    </div>
  );

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
            placeholder="Search by name, city, contact person, phone, or product (e.g. sesame)..."
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
          <div key={party.id} 
            onClick={() => setSelectedParty(party)}
            className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-all group cursor-pointer">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  party.type === 'buyer' ? 'bg-blue-50 text-blue-600' :
                  party.type === 'seller' ? 'bg-green-50 text-green-600' : 'bg-purple-50 text-purple-600'
                }`}>
                  {party.type === 'buyer' ? <Building2 className="w-5 h-5" /> :
                     party.type === 'seller' ? <UserCircle className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{party.legalName}</h3>
                  <p className="text-xs text-gray-500">{party.city}</p>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                <button onClick={() => navigate(`/party/${party.id}/edit`)} 
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-600">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(party.id)} 
                  className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="truncate">{party.contactPerson || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                <a href={`tel:${party.phone}`} onClick={e => e.stopPropagation()} className="hover:text-rose-600 hover:underline">
                  {party.phone || 'N/A'}
                </a>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="truncate">{party.address}, {party.city}</span>
              </div>
              {(party.products || []).length > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Package className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="truncate">{(party.products || []).map(p => p.name).join(', ')}</span>
                </div>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                party.type === 'buyer' ? 'bg-blue-50 text-blue-700' :
                party.type === 'seller' ? 'bg-green-50 text-green-700' : 'bg-purple-50 text-purple-700'
              }`}>
                {party.type === 'both' ? 'Buyer & Seller' : party.type === 'buyer' ? 'Buyer' : 'Seller'}
              </span>
              <span className="text-xs text-gray-400">Click to view details</span>
            </div>
          </div>
        ))}
      </div>

      {/* Party Detail Modal */}
      {selectedParty && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedParty(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedParty.legalName}</h2>
                <p className="text-sm text-gray-500">{selectedParty.city}, {selectedParty.state}</p>
              </div>
              <button onClick={() => setSelectedParty(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-400 uppercase">GSTIN</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedParty.gstin}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 uppercase">PAN</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedParty.pan || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 uppercase">Address</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedParty.address}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 uppercase">Pincode</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedParty.pincode || 'N/A'}</p>
                </div>
              </div>

              {/* Contact Person */}
              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" /> Primary Contact
                </h3>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm font-medium text-gray-900">{selectedParty.contactPerson || 'N/A'}</p>
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                    <Phone className="w-4 h-4" />
                    <a href={`tel:${selectedParty.phone}`} className="hover:text-rose-600 hover:underline">
                      {selectedParty.phone || 'N/A'}
                    </a>
                  </div>
                  {selectedParty.email && (
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      <a href={`mailto:${selectedParty.email}`} className="hover:text-rose-600 hover:underline">
                        {selectedParty.email}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Alternate Numbers */}
              {(selectedParty.alternateNumbers || []).length > 0 && (
                <div className="border-t border-gray-100 pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Alternate Numbers</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedParty.alternateNumbers.map((num, i) => (
                      <a key={i} href={`tel:${num}`} 
                        className="px-3 py-1.5 bg-gray-50 rounded-lg text-sm text-gray-700 hover:bg-rose-50 hover:text-rose-700 transition-colors">
                        <Phone className="w-3 h-3 inline mr-1" />{num}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Alternate Emails */}
              {(selectedParty.alternateEmails || []).length > 0 && (
                <div className="border-t border-gray-100 pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Alternate Emails</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedParty.alternateEmails.map((em, i) => (
                      <a key={i} href={`mailto:${em}`}
                        className="px-3 py-1.5 bg-gray-50 rounded-lg text-sm text-gray-700 hover:bg-rose-50 hover:text-rose-700 transition-colors">
                        <Mail className="w-3 h-3 inline mr-1" />{em}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Other Contacts (Manager, Logistic Manager etc.) */}
              {(selectedParty.contacts || []).length > 0 && (
                <div className="border-t border-gray-100 pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Other Contacts</h3>
                  <div className="space-y-3">
                    {selectedParty.contacts.map((contact) => (
                      <div key={contact.id} className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                          <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full">{contact.designation}</span>
                        </div>
                        {contact.phone && (
                          <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                            <Phone className="w-4 h-4" />
                            <a href={`tel:${contact.phone}`} className="hover:text-rose-600 hover:underline">{contact.phone}</a>
                          </div>
                        )}
                        {contact.email && (
                          <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                            <Mail className="w-4 h-4" />
                            <a href={`mailto:${contact.email}`} className="hover:text-rose-600 hover:underline">{contact.email}</a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Products */}
              {(selectedParty.products || []).length > 0 && (
                <div className="border-t border-gray-100 pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4" /> Trading Products
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedParty.products.map((prod) => (
                      <span key={prod.id} className="px-3 py-1.5 bg-rose-50 text-rose-700 rounded-lg text-sm font-medium">
                        {prod.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="border-t border-gray-100 pt-4 flex gap-3">
                <button onClick={() => { setSelectedParty(null); navigate(`/party/${selectedParty.id}/edit`); }}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 flex items-center justify-center gap-2">
                  <Edit2 className="w-4 h-4" /> Edit Party
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
