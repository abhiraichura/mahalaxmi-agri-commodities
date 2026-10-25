import React, { useState, useMemo } from 'react';
import { useMandiRates } from '../hooks/useMandiRates';
import { MandiRecord } from '../types/mandi';
import { Page, Button, Badge, EmptyState } from '../ui';

const getTodayDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function MandiLiveRates() {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const { data, isLoading, isError, error } = useMandiRates(selectedDate);
  
  const [selectedMarket, setSelectedMarket] = useState<string>('All');
  const [selectedCommodity, setSelectedCommodity] = useState<string>('All');

  const markets = useMemo<string[]>(() => {
    if (!data?.records) return [];
    return Array.from(new Set(data.records.map((r: MandiRecord) => r.market))).sort();
  }, [data]);

  const commodities = useMemo<string[]>(() => {
    if (!data?.records) return [];
    return Array.from(new Set(data.records.map((r: MandiRecord) => r.commodity))).sort();
  }, [data]);

  // Updated to use `.includes` so you can type partial names (like "Rajk" for Rajkot)
  const filteredRecords = useMemo<MandiRecord[]>(() => {
    if (!data?.records) return [];
    return data.records.filter((record: MandiRecord) => {
      const marketMatch = selectedMarket === 'All' || record.market.toLowerCase().includes(selectedMarket.toLowerCase());
      const commodityMatch = selectedCommodity === 'All' || record.commodity.toLowerCase().includes(selectedCommodity.toLowerCase());
      return marketMatch && commodityMatch;
    });
  }, [data, selectedMarket, selectedCommodity]);

  const mode = selectedDate === ''
    ? <Badge tone="green" icon={<span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" /></span>}>Live sync active</Badge>
    : <Badge tone="amber">Viewing historical data</Badge>;
  const qty = (r: MandiRecord) => r.arrival || r.arrivals || r.arrival_qtl || '-';

  return (
    <Page title="Mandi prices" subtitle="Arrivals and prices in APMC markets across India" actions={mode} width="wide">
      <div className="card p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div>
          <label htmlFor="date-filter" className="block text-sm font-medium text-gray-700 mb-1">Data date (past 7 days)</label>
          <div className="flex gap-2">
            <input
              type="date"
              id="date-filter"
              className="input-field"
              value={selectedDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedDate(e.target.value)}
              max={getTodayDate()}
            />
            {selectedDate && <Button variant="soft" onClick={() => setSelectedDate('')}>Live</Button>}
          </div>
        </div>

        <div>
          <label htmlFor="market-filter" className="block text-sm font-medium text-gray-700 mb-1">Search APMC market</label>
          <input
            type="text"
            list="markets-list"
            id="market-filter"
            placeholder="Type to search (e.g., Rajkot)..."
            className="input-field"
            value={selectedMarket === 'All' ? '' : selectedMarket}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedMarket(e.target.value || 'All')}
            disabled={isLoading}
          />
          <datalist id="markets-list">
            {markets.map((market: string) => (
              <option key={market} value={market} />
            ))}
          </datalist>
        </div>

        <div>
          <label htmlFor="commodity-filter" className="block text-sm font-medium text-gray-700 mb-1">Search commodity</label>
          <input
            type="text"
            list="commodity-list"
            id="commodity-filter"
            placeholder="Type to search (e.g., Cumin)..."
            className="input-field"
            value={selectedCommodity === 'All' ? '' : selectedCommodity}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedCommodity(e.target.value || 'All')}
            disabled={isLoading}
          />
          <datalist id="commodity-list">
            {commodities.map((commodity: string) => (
              <option key={commodity} value={commodity} />
            ))}
          </datalist>
        </div>
      </div>

      {isLoading ? (
        <div className="card flex justify-center items-center min-h-[320px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-700 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-500">Fetching market records from the server...</p>
          </div>
        </div>
      ) : isError ? (
        <div className="p-4 bg-red-50 rounded-2xl border border-red-200" role="alert">
          <h3 className="text-sm font-semibold text-red-800">Error loading rates</h3>
          <p className="mt-1 text-sm text-red-700">
            {error instanceof Error ? error.message : 'Please check your API key and connection.'}
          </p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="card"><EmptyState title="No arrivals found">Nothing matches the current filters.</EmptyState></div>
      ) : (
        <>
          {/* phone: one card per market */}
          <div className="lg:hidden space-y-2.5">
            {filteredRecords.map((record: MandiRecord, index: number) => (
              <div key={`m-${record.market}-${record.commodity}-${index}`} className="card p-3.5">
                <p className="text-sm font-semibold text-gray-900">{record.market}</p>
                <p className="text-xs text-gray-500">{record.commodity} ({record.variety}) · Arrivals {qty(record)}</p>
                <div className="mt-2.5 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-red-50 py-1.5"><p className="text-[11px] text-red-700">Min</p><p className="text-sm font-semibold text-red-700">{record.min_price}</p></div>
                  <div className="rounded-xl bg-rose-50 py-1.5"><p className="text-[11px] text-rose-700">Modal</p><p className="text-sm font-bold text-rose-700">{record.modal_price}</p></div>
                  <div className="rounded-xl bg-emerald-50 py-1.5"><p className="text-[11px] text-emerald-700">Max</p><p className="text-sm font-semibold text-emerald-700">{record.max_price}</p></div>
                </div>
              </div>
            ))}
            <p className="text-xs text-gray-500 text-center">Prices are Rs per quintal.</p>
          </div>

          <div className="hidden lg:block card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-6 pr-3 text-left text-sm font-semibold text-gray-900">APMC Market</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Commodity</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Arrivals (Qty)</th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Min Price (Rs/Qtl)</th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Max Price (Rs/Qtl)</th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-rose-700">Modal Price (Rs)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredRecords.map((record: MandiRecord, index: number) => (
                    <tr key={`${record.market}-${record.commodity}-${index}`} className="hover:bg-gray-50 transition-colors">
                      <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm font-medium text-gray-900">{record.market}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-600">
                        {record.commodity} <span className="text-xs text-gray-400">({record.variety})</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-700 bg-gray-50/50">{qty(record)}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-right text-red-600 font-medium">{record.min_price}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-right text-emerald-600 font-medium">{record.max_price}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-right text-rose-700 font-bold bg-rose-50/40">{record.modal_price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </Page>
  );
}
