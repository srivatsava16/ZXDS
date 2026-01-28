import { useState, useEffect, useRef } from 'react';
import { getRequestInputs, type RequestInputsResponse } from '../../../../services/api';

/**
 * Custom hook for loading API data sources for the request creation form
 * Handles fetching file sources, database sources, and preconfigured tables
 */
export const useDataLoading = () => {
  const [apiSources, setApiSources] = useState<RequestInputsResponse | null>(null);
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
        console.log('=== Calling requestinputs.php API ===');
        const response = await getRequestInputs();
        console.log('=== requestinputs.php API Response ===', response);
        setApiSources(response);
      } catch (error) {
        console.error('=== requestinputs.php API Error ===', error);
        // Fallback to default sources if API call fails
        setApiSources(null);
      } finally {
        setSourcesLoading(false);
      }
    };

    loadApiSources();
  }, []);

  return { apiSources, sourcesLoading };
};
