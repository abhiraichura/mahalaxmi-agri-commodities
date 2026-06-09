import { useState, useEffect } from 'react';
import { OGDResponse } from '../types/mandi';

// Replace 'YOUR_API_KEY' with your actual API key from data.gov.in
const API_KEY = '579b464db66ec23bdd00000186a23df6177b4d5d44f38edfa3e9b287'; 
const RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070'; 
const LIMIT = '3000'; 

export const useMandiRates = () => {
  const [data, setData] = useState<OGDResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchMandiRates = async () => {
      try {
        const url = `https://api.data.gov.in/resource/${RESOURCE_ID}?api-key=${API_KEY}&format=json&limit=${LIMIT}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error('Failed to fetch Mandi rates');
        }
        
        const json: OGDResponse = await response.json();
        setData(json);
        setIsError(false);
      } catch (err) {
        setIsError(true);
        setError(err instanceof Error ? err : new Error('An unknown error occurred'));
      } finally {
        setIsLoading(false);
      }
    };

    // Initial load
    fetchMandiRates();

    // Auto-refresh continuously every 15 minutes (900000ms)
    const interval = setInterval(fetchMandiRates, 900000);

    return () => clearInterval(interval);
  }, []);

  return { data, isLoading, isError, error };
};
