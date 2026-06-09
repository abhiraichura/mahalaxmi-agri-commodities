// src/hooks/useMandiRates.ts

import { useQuery } from '@tanstack/react-query';
import { OGDResponse } from '../types/mandi';

// Replace 'YOUR_API_KEY' with your actual API key from data.gov.in
const API_KEY = '579b464db66ec23bdd00000186a23df6177b4d5d44f38edfa3e9b287'; 
const RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070'; // Current active Agmarknet resource ID
const LIMIT = '3000'; // Fetches 3000 records per poll to populate filters

const fetchMandiRates = async (): Promise<OGDResponse> => {
  const url = `https://api.data.gov.in/resource/${RESOURCE_ID}?api-key=${API_KEY}&format=json&limit=${LIMIT}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error('Failed to fetch Mandi rates');
  }
  
  return response.json();
};

export const useMandiRates = () => {
  return useQuery({
    queryKey: ['mandiRates'],
    queryFn: fetchMandiRates,
    refetchInterval: 900000, // Refreshes automatically every 15 minutes (900000ms)
    staleTime: 300000, // Data remains fresh for 5 minutes
    retry: 2,
  });
};
