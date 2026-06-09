import React, { useState, useMemo } from 'react';
import { useMandiRates } from '../hooks/useMandiRates';
import { MandiRecord } from '../types/mandi';

export default function MandiLiveRates() {
  const { data, isLoading, isError, error } = useMandiRates();
  
  const [selectedMarket, setSelectedMarket] = useState<string>('All');
  const [selectedCommodity, setSelectedCommodity] = useState<string>('All');

  const markets = useMemo<string[]>(() => {
    if (!data?.records) return ['All'];
    const uniqueMarkets = Array.from(new Set(data.records.map((r: MandiRecord) => r.market))).sort();
    return ['All', ...uniqueMarkets];
  }, [data]);

  const commodities = useMemo<string[]>(() => {
    if (!data?.records) return ['All'];
    const uniqueCommodities = Array.from(new Set(data.records.map((r: MandiRecord) => r.commodity))).sort();
    return ['All', ...uniqueCommodities];
  }, [data]);

  const filteredRecords = useMemo<MandiRecord[]>(() => {
    if (!data?.records) return [];
    return data.records.filter((record: MandiRecord) => {
      const marketMatch = selectedMarket === 'All' || record.market === selectedMarket;
      const commodityMatch = selectedCommodity === 'All' || record.commodity === selectedCommodity;
      return marketMatch && commodityMatch;
    });
  }, [data, selectedMarket, selectedCommodity]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 bg-red-50 rounded-md">
        <h3 className="text-sm font-medium text-red-800">Error loading live rates</h3>
        <p className="mt-2 text-sm text-red-700">
          {error instanceof Error ? error.message : 'Please check your API key and connection.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live APMC Arrivals & Rates</h1>
          <p className="mt-1 text-sm text-gray-500">Auto-updating market data directly from Agmarknet.</p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-2 text-sm text-green-600 font-medium">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span>Live Sync Active</span>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="market-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Filter by APMC
          </label>
          <select
            id="market-filter"
            className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
            value={selectedMarket}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedMarket(e.target.value)}
          >
            {markets.map((market: string) => (
              <option key={market} value={market}>{market}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="commodity-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Filter by Commodity
          </label>
          <select
            id="commodity-filter"
            className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
            value={selectedCommodity}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedCommodity(e.target.value)}
          >
            {commodities.map((commodity: string) => (
              <option key={commodity} value={commodity}>{commodity}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-8 bg-white shadow-sm ring-1 ring-gray-200 sm:rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">APMC Market</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Commodity</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Variety</th>
                <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Min Price (Rs/Quintal)</th>
                <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Max Price (Rs/Quintal)</th>
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
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-600">{record.commodity}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{record.variety}</td>
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
    </div>
  );
}
