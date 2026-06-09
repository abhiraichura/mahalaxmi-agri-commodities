import { useState, useEffect } from 'react';
import { OGDResponse, MandiRecord } from '../types/mandi';

// Replace 'YOUR_API_KEY' with your actual API key from data.gov.in
const API_KEY = '579b464db66ec23bdd00000186a23df6177b4d5d44f38edfa3e9b287'; 
const RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070'; 

export const useMandiRates = () => {
  const [data, setData] = useState<OGDResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchMandiRates = async () => {
      try {
        let allRecords: MandiRecord[] = [];
        let offset = 0;
        const BATCH_SIZE = 2000;
        const MAX_RECORDS = 15000; // Cap to prevent infinite loops, safely covers all daily data

        // Fetch in batches to prevent API timeouts or hard limits
        while (offset < MAX_RECORDS) {
          const url = `https://api.data.gov.in/resource/${RESOURCE_ID}?api-key=${API_KEY}&format=json&limit=${BATCH_SIZE}&offset=${offset}`;
          const response = await fetch(url);
          
          if (!response.ok) {
            throw new Error(`Government API failed with status: ${response.status}`);
          }
          
          const json = await response.json();
          const records = json.records || [];
          allRecords = [...allRecords, ...records];
          
          // If we received fewer records than the batch size, we have hit the end of today's data
          if (records.length < BATCH_SIZE) {
            break;
          }
          
          offset += BATCH_SIZE; // Increment to get the next chunk
        }
        
        if (isMounted) {
          setData({
            records: allRecords,
            total: allRecords.length,
            count: allRecords.length,
            limit: MAX_RECORDS.toString(),
            offset: "0"
          });
          setIsError(false);
        }
      } catch (err) {
        if (isMounted) {
          setIsError(true);
          setError(err instanceof Error ? err : new Error('An unknown error occurred while fetching'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchMandiRates();
    
    // Refresh silently in the background every 15 minutes (900000ms)
    const interval = setInterval(fetchMandiRates, 900000); 
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return { data, isLoading, isError, error };
};
