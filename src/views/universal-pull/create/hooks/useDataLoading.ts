import { useState, useEffect, useRef } from 'react';
import { getRequestInputs, getTableDictionary, type RequestInputsResponse, type TableDictionaryResponse } from '../../../../services/api';

/**
 * Custom hook for loading API data sources for the request creation form
 * Handles fetching file sources, database sources, preconfigured tables, and table dictionary
 */
export const useDataLoading = () => {
  const [apiSources, setApiSources] = useState<RequestInputsResponse | null>(null);
  const [tableDictionary, setTableDictionary] = useState<TableDictionaryResponse | null>(null);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate API calls (especially in React StrictMode)
    if (hasLoadedRef.current) {
      return;
    }

    const loadApiSources = async () => {
      try {
        hasLoadedRef.current = true;
        setSourcesLoading(true);

        // Call both APIs in parallel
        const [sourcesResponse, dictionaryResponse] = await Promise.all([
          getRequestInputs(),
          getTableDictionary()
        ]);

        setApiSources(sourcesResponse);
        setTableDictionary(dictionaryResponse);
      } catch (error) {
        console.error('=== API Error ===', error);
        // Fallback to default sources if API call fails
        setApiSources(null);
        setTableDictionary(null);
      } finally {
        setSourcesLoading(false);
      }
    };

    loadApiSources();
  }, []);

  return { apiSources, tableDictionary, sourcesLoading };
};
