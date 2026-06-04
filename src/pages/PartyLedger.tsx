import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppStore } from '../hooks/useAuthStore';
import { ArrowLeft, FileText, TrendingUp, TrendingDown } from 'lucide-react';
import { Contract } from '../types';

export default function PartyLedger() {
  const { id } = useParams();
  const { parties, contracts, settings } = useAppStore();
  const [filter, setFilter] = useState<'all' | 'buyer' | 'seller'>('all');

  const party = parties.find((p: any) => p.id === id);

  const partyContracts = useMemo(() => {
    return contracts.filter((c: Contract) => {
      const sellerId = c.seller?.id || (c as any).sellerId;
      const buyerId = c.buyer?.id || (c as any).buyerId;
      const isSeller = sellerId === id;
      const isBuyer = buyerId === id;
      if (filter === 'seller') return isSeller;
      if (filter === 'buyer') return isBuyer;
      return isSeller || isBuyer;
    });
  }, [contracts, id, filter]);

  const stats = useMemo(() => {
    const asSeller = partyContracts.filter((c: Contract) => {
      const sellerId = c.seller?.id || (c as any).sellerId;
      return sellerId === id;
    });
    const asBuyer = partyContracts.filter((c: Contract) => {
      const buyerId = c.buyer?.id || (c as any).buyerId;
      return buyerId === id;
    });
    const totalValue = partyContracts.reduce((sum: number, c: Contract) => sum + (c.quantity * c.price), 0);
    return { asSeller: asSeller.length, asBuyer: asBuyer.length, totalValue };
  }, [partyContracts, id]);

  if (!party) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-gray-900">Party not found</h2>
        <Link to="/parties" className="text-red-600 hover:underline mt-2 inline-block">Back to parties</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/parties" className="p-2 hover:bg-gray-100 rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{party.legalName}</h1>
          <p className="text-sm text-gray-500">{party.gstin}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.asSeller}</p>
              <p className="text-sm text-gray-500">As Seller</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.asBuyer}</p>
              <p className="text-sm text-gray-500">As Buyer</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">₹{stats.totalValue.toLocaleString('en-IN')}</p>
              <p className="text-sm text-gray-500">Total Value</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(['all', 'seller', 'buyer'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium rounded-xl ${
              filter === f ? 'bg-red-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f === 'all' ? 'All Contracts' : f === 'seller' ? 'As Seller' : 'As Buyer'}
          </button>
        ))}
      </div>

      {/* Contracts */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {partyContracts.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No contracts found</h3>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {partyContracts.map((c: Contract) => {
              const isSeller = (c.seller?.id || (c as any).sellerId) === id;
              return (
                <Link
                  key={c.id}
                  to={`/contracts/${c.id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isSeller ? 'bg-blue-50' : 'bg-green-50'
                    }`}>
                      {isSeller ? <TrendingUp className="w-5 h-5 text-blue-600" /> : <TrendingDown className="w-5 h-5 text-green-600" />}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Contract #{c.contractNo}</div>
                      <div className="text-sm text-gray-500">
                        {isSeller ? 'Sold to' : 'Bought from'} {isSeller ? c.buyer?.legalName : c.seller?.legalName}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      ₹{(c.quantity * c.price).toLocaleString('en-IN')}
                    </div>
                    <div className="text-xs text-gray-500">{c.date}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
