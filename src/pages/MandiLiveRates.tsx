import React, { useState, useMemo } from 'react';
import { useMandiRates } from '../hooks/useMandiRates';
import { MandiRecord } from '../types/mandi';

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

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">APMC Arrivals & Prices</h1>
          <p className="mt-1 text-sm text-gray-500">Search current and historical market data across India.</p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-2 text-sm font-medium">
          {selectedDate === '' ? (
            <>
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <span className="text-green-600">Live Sync Active</span>
            </>
          ) : (
            <span className="text-amber-600">Viewing Historical Data</span>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="date-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Data Date (Past 7 Days)
          </label>
          <div className="flex gap-2">
            <input
              type="date"
              id="date-filter"
              className="block w-full rounded-md border-gray-300 py-2 px-3 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              value={selectedDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedDate(e.target.value)}
              max={getTodayDate()}
            />
            {selectedDate && (
              <button 
                onClick={() => setSelectedDate('')}
                className="px-3 py-2 bg-indigo-50 text-indigo-600 text-sm font-medium rounded-md hover:bg-indigo-100 transition-colors whitespace-nowrap"
              >
                Live
              </button>
            )}
          </div>
        </div>
        
        {/* Upgraded to Searchable Datalist */}
        <div>
          <label htmlFor="market-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Search APMC Market
          </label>
          <input
            type="text"
            list="markets-list"
            id="market-filter"
            placeholder="Type to search (e.g., Rajkot)..."
            className="block w-full rounded-md border-gray-300 py-2 px-3 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
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

        {/* Upgraded to Searchable Datalist */}
        <div>
          <label htmlFor="commodity-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Search Commodity
          </label>
          <input
            type="text"
            list="commodity-list"
            id="commodity-filter"
            placeholder="Type to search (e.g., Cumin)..."
            className="block w-full rounded-md border-gray-300 py-2 px-3 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
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
        <div className="flex justify-center items-center min-h-[400px] bg-white shadow-sm ring-1 ring-gray-200 sm:rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-500">Fetching market records from the server...</p>
          </div>
        </div>
      ) : isError ? (
        <div className="p-4 bg-red-50 rounded-md ring-1 ring-red-200">
          <h3 className="text-sm font-medium text-red-800">Error loading rates</h3>
          <p className="mt-2 text-sm text-red-700">
            {error instanceof Error ? error.message : 'Please check your API key and connection.'}
          </p>
        </div>
      ) : (
        <div className="bg-white shadow-sm ring-1 ring-gray-200 sm:rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">APMC Market</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Commodity</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Arrivals (Qty)</th>
                  <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Min Price (Rs/Qtl)</th>
                  <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Max Price (Rs/Qtl)</th>
                  <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-indigo-600">Modal Price (Rs)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredRecords.length > 0 ? (
                  filteredRecords.map((record: MandiRecord, index: number) => (
                    <tr key={`${record.market}-${record.commodity}-${index}`} className="hover:bg-gray-50 transition-colors">
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        {record.market}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-600">
                        {record.commodity} <span className="text-xs text-gray-400">({record.variety})</span>
                      </td>
                      {/* Added Arrivals Data Column */}
                      <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-700 bg-gray-50/50">
                        {record.arrival || record.arrivals || record.arrival_qtl || '-'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-right text-red-600 font-medium">
                        {record.min_price}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-right text-green-600 font-medium">
                        {record.max_price}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-right text-indigo-600 font-bold bg-indigo-50/30">
                        {record.modal_price}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <div className="text-sm text-gray-500">No arrivals found matching the current filters.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
