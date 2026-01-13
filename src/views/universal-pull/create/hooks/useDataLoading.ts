import { useState, useEffect } from 'react';
import { getRequestInputs, type RequestInputsResponse } from '../../../../services/api';

/**
 * Custom hook for loading API data sources for the request creation form
 * Handles fetching file sources, database sources, and preconfigured tables
 */
export const useDataLoading = () => {
  const [apiSources, setApiSources] = useState<RequestInputsResponse | null>(null);
  const [sourcesLoading, setSourcesLoading] = useState(true);

  useEffect(() => {
    const loadApiSources = async () => {
      try {
        setSourcesLoading(true);
        const response = await getRequestInputs();
        setApiSources(response);
      } catch (error) {
        // Fallback to default sources if API call fails
        setApiSources({
          fileSource: {
            sftpSources: [
              { id: 1, name: 'BO3 SFTP' },
              { id: 2, name: 'ZXDS SFTP' },
              { id: 3, name: 'DC SFTP' }
            ],
            nfsSources: [
              { id: 4, name: 'NFS Server 1' },
              { id: 5, name: 'NFS Server 2' },
              { id: 6, name: 'NFS Server 3' }
            ],
            awsSources: [
              { id: 7, name: 'ZXDS AWS' },
              { id: 8, name: 'DC AWS' }
            ]
          },
          dbSource: {
            preconfiguredTables: {
              input: [
                {
                  tableName: 'permission',
                  tableId: 1,
                  description: 'Permission based data',
                  columns: [
                    { name: 'EMAIL', type: 'STRING' },
                    { name: 'PROFILE_ID', type: 'STRING' }
                  ]
                },
                {
                  tableName: 'nonPermission',
                  tableId: 2,
                  description: 'Non-permission based data',
                  columns: [
                    { name: 'EMAIL', type: 'STRING' },
                    { name: 'PROFILE_ID', type: 'STRING' }
                  ]
                }
              ],
              suppress: [
                {
                  tableName: 'DNS_SUPPRESSION_LIST',
                  tableId: 1,
                  description: 'DNS suppression list',
                  columns: [
                    { name: 'EMAIL_MD5', type: 'STRING' },
                    { name: 'SUPPRESSION_DATE', type: 'DATE' }
                  ]
                }
              ],
              match: [
                {
                  tableName: 'CUSTOMER_MASTER_MATCH',
                  tableId: 1,
                  description: 'Master customer database',
                  columns: [
                    { name: 'CUSTOMER_ID', type: 'INTEGER' },
                    { name: 'EMAIL_MD5', type: 'STRING' }
                  ]
                }
              ],
              output: ['SFTP Export', 'Email Export', 'S3 Export'],
              append: [
                {
                  tableName: 'PROFILE',
                  tableId: 1,
                  description: 'Profile details for all channels',
                  columns: [
                    { name: 'PROFILE_ID', type: 'INTEGER' },
                    { name: 'EMAIL_ADDRESS_MD5', type: 'STRING' }
                  ]
                }
              ]
            },
            dataDictionary: {}
          }
        });
      } finally {
        setSourcesLoading(false);
      }
    };

    loadApiSources();
  }, []);

  return { apiSources, sourcesLoading };
};
