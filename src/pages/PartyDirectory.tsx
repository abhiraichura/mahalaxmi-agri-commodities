import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Plus, 
  Phone, 
  MapPin, 
  Filter,
  Building2,
  UserCircle,
  ArrowRight
} from 'lucide-react';
import { useAppStore } from '../hooks/useAuthStore';

export default function PartyDirectory() {
  const navigate = useNavigate();
  const { parties } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'buyer' | 'seller'>('all');

  // Mock data for demo
  const mockParties = parties.length > 0 ? parties : [
    { id: '1', name: 'K.V. Agro', legalName: 'K.V. Agro Products', gstin: '24AAOFK1278N1ZT', type: 'buyer', city: 'Unjha', state: 'Gujarat', phone: '98765 43210', address: 'Unjha-Siddhpur Highway, Near Sahara Hotel, Maktupur' },
    { id: '2', name: 'Krishna Agri', legalName: 'Krishna Agribrokers', gstin: '24ACEPR5988A1ZH', type: 'seller', city: 'Rajkot', state: 'Gujarat', phone: '99244 00990', address: 'Office No.408, Star Plaza, Phoolchhab Chowk' },
    { id: '3', name: 'Patel Traders', legalName: 'Patel Trading Co.', gstin: '24AABCP1234A1Z5', type: 'both', city: 'Ahmedabad', state: 'Gujarat', phone: '98250 12345', address: 'New Market Yard, Rajkot Morbi Highway, Bedi' },
  ];

  const filteredParties = mockParties.filter(party => {
    const matchesSearch = 
      party.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      party.legalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      party.gstin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      party.city.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = filterType === 'all' || party.type === filterType || party.type === 'both';

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Party Directory</h1>
          <p className="text-sm text-gray-500 mt-1">
            {filteredParties.length} parties in your network
          </p>
        </div>
        <button
          onClick={() => navigate('/party/new')}
          className="px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Party
        </button>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, GSTIN, city..."
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
          />
        </div>

        <div className="flex gap-2">
          {(['all', 'buyer', 'seller'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterType === type
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              {type === 'all' ? 'All Parties' : type === 'buyer' ? 'Buyers' : 'Sellers'}
            </button>
          ))}
        </div>
      </div>

      {/* Party Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredParties.map((party) => (
          <div
            key={party.id}
            onClick={() => navigate(`/party/${party.id}/edit`)}
            className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  party.type === 'buyer' ? 'bg-blue-50 text-blue-600' :
                  party.type === 'seller' ? 'bg-green-50 text-green-600' :
                  'bg-purple-50 text-purple-600'
                }`}>
                  {party.type === 'buyer' ? <Building2 className="w-5 h-5" /> :
                   party.type === 'seller' ? <UserCircle className="w-5 h-5" /> :
                   <Building2 className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{party.legalName}</h3>
                  <p className="text-xs text-gray-500">{party.gstin}</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="truncate">{party.address}, {party.city}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="w-4 h-4 text-gray-400" />
                <span>{party.phone}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2">
              <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                party.type === 'buyer' ? 'bg-blue-50 text-blue-700' :
                party.type === 'seller' ? 'bg-green-50 text-green-700' :
                'bg-purple-50 text-purple-700'
              }`}>
                {party.type === 'both' ? 'Buyer & Seller' : party.type === 'buyer' ? 'Buyer' : 'Seller'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
