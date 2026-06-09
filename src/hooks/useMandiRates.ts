import { useState, useEffect } from 'react';
import { OGDResponse, MandiRecord } from '../types/mandi';

// Replace 'YOUR_API_KEY' with your actual API key from data.gov.in
const API_KEY = '579b464db66ec23bdd00000186a23df6177b4d5d44f38edfa3e9b287'; 
const RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070'; 

export const useMandiRates = (dateFilter: string = '') => {
  const [data, setData] = useState<OGDResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    // Show loading spinner when the user changes the date
    setIsLoading(true);

    const fetchMandiRates = async () => {
      try {
        let allRecords: MandiRecord[] = [];
        let offset = 0;
        const BATCH_SIZE = 2000;
        const MAX_RECORDS = 15000; 

        // Apply date filter if the user selected a past date
        let dateQuery = '';
        if (dateFilter) {
          // HTML dates are YYYY-MM-DD. The API expects DD/MM/YYYY
          const [year, month, day] = dateFilter.split('-');
          dateQuery = `&filters[arrival_date]=${day}/${month}/${year}`;
        }

        while (offset < MAX_RECORDS) {
          const url = `https://api.data.gov.in/resource/${RESOURCE_ID}?api-key=${API_KEY}&format=json&limit=${BATCH_SIZE}&offset=${offset}${dateQuery}`;
          const response = await fetch(url);
          
          if (!response.ok) {
            throw new Error(`Government API failed with status: ${response.status}`);
          }
          
          const json = await response.json();
          const records = json.records || [];
          allRecords = [...allRecords, ...records];
          
          // Stop looping if we've collected all records for the requested day
          if (records.length < BATCH_SIZE) {
            break;
          }
          
          offset += BATCH_SIZE; 
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
    
    // Auto-refresh continuously every 15 minutes
    const interval = setInterval(fetchMandiRates, 900000); 
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [dateFilter]); // This ensures the hook reruns whenever the date changes

  return { data, isLoading, isError, error };
};
