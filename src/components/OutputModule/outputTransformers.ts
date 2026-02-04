import type { OutputConfig } from './OutputModule';
import type { InputSource } from '../InputModule/InputModule';
import type { OutputDestination } from './OutputDestinationDialog';
import type { FieldMapping } from '../AppendModule/FieldMappingDialog';
import type { RequestInputsResponse } from '../../services/api';

/**
 * Custom destination configuration based on type
 */
export type DestinationConfig =
  | {
      // Custom SFTP destination
      type: 'SFTP';
      hostname: string;
      port: number;
      path: string;
      username: string;
      password: string;
    }
  | {
      // Custom AWS S3 destination
      type: 'S3';
      bucketname: string;
      region: string;
      path: string;
      accesskey: string;
      secretkey?: string;
    }
  | {
      // Custom NFS destination
      type: 'NFS';
      hostserver: string;
      mountpath: string;
    };

/**
 * API format for single output configuration (NEW FORMAT)
 */
export interface OutputConfigPayload {
  id?: string | number; // Optional ID for existing output configs (for update payload)
  config: {
    input_sources: string[];  // Array of source names
    output_fields: string[];
    field_mappings: {
      field_name: string;
      source_mappings: string;
    }[];
    combine_sources: boolean;
    field_priority: string[];
  };
  destinationType: 'custom' | 'preconfigured';
  destinationConfig?: DestinationConfig;  // Only if destinationType is "custom"
  destinationName?: string;               // Only if destinationType is "preconfigured"
  limitations: {
    limit_records: number | null;
    shuffle_records: boolean;
  };
}

/**
 * Output payload is an array of configurations
 */
export type OutputAPIPayload = OutputConfigPayload[];

/**
 * Transform OutputConfig to API format (NEW FORMAT with config wrapper)
 */
export const transformOutputToAPIFormat = (
  outputConfig: OutputConfig,
  availableInputSources: InputSource[],
  customDestinations: OutputDestination[],
  fieldMappings: FieldMapping[],
  apiSources?: RequestInputsResponse | null
): OutputConfigPayload | null => {
  if (!outputConfig) return null;

  // Ensure inputSources exists and is an array
  if (!outputConfig.inputSources || !Array.isArray(outputConfig.inputSources) || outputConfig.inputSources?.length === 0) {
    console.warn('Output transformation: No input sources found in outputConfig');
    return null;
  }

  // Helper function to get source by ID
  const getSourceById = (sourceId: string): InputSource | undefined => {
    return availableInputSources?.find(s => s.id === sourceId || s.sourceName === sourceId);
  };

  // Transform input sources to array of source names
  const transformedInputSources: string[] = (outputConfig.inputSources || [])
    .map((sourceId) => {
      const source = getSourceById(sourceId);
      if (!source) {
        console.warn(`Output transformation: Source "${sourceId}" not found`);
        return null;
      }
      return source.sourceName;
    })
    .filter((name): name is string => name !== null);

  // Transform field mappings
  const transformedFieldMappings: Array<{ field_name: string; source_mappings: string }> = [];

  if (fieldMappings && fieldMappings?.length > 0) {
    fieldMappings?.forEach((mapping: FieldMapping) => {
      const sourceMappingsArray: string[] = [];

      (mapping.selectedColumns || []).forEach((column: string) => {
        const [sourceId, originalField] = column?.split('::');

        if (!sourceId || !originalField) {
          console.warn(`Invalid column format in field mapping: ${column}`);
          return;
        }

        const source = getSourceById(sourceId);
        if (!source) {
          console.warn(`Source not found for field mapping: ${sourceId}`);
          return;
        }

        sourceMappingsArray?.push(`${source.sourceName}.${originalField}`);
      });

      if (sourceMappingsArray?.length > 0) {
        transformedFieldMappings?.push({
          field_name: mapping.fieldName,
          source_mappings: sourceMappingsArray?.join('|')
        });
      }
    });
  }

  // Determine destination type and configuration
  const isCustom = outputConfig.isCustomDestination === true;
  const destinationType: 'custom' | 'preconfigured' = isCustom ? 'custom' : 'preconfigured';

  // Build destination config or name based on type
  let destinationConfig: DestinationConfig | undefined = undefined;
  let destinationName: string | undefined = undefined;

  if (isCustom) {
    // Custom destination - build destinationConfig
    const destinationTypeUpper = (outputConfig.destinationType || '').toUpperCase();

    // Find custom destination details
    const customDest = customDestinations?.find(
      dest => parseInt(dest.id) === outputConfig.destinationId
    );

    if (destinationTypeUpper === 'SFTP') {
      destinationConfig = {
        type: 'SFTP',
        hostname: customDest?.host || '',
        port: parseInt(customDest?.port || '22', 10),
        path: customDest?.path || '',
        username: customDest?.username || '',
        password: customDest?.password || ''
      };
    } else if (destinationTypeUpper === 'AWS S3' || destinationTypeUpper === 'S3') {
      destinationConfig = {
        type: 'S3',
        bucketname: customDest?.bucket || '',
        region: customDest?.region || '',
        path: customDest?.path || '',
        accesskey: customDest?.accessKey || '',
        secretkey: customDest?.secretKey
      };
    } else if (destinationTypeUpper === 'NFS') {
      destinationConfig = {
        type: 'NFS',
        hostserver: customDest?.host || '',
        mountpath: customDest?.path || ''
      };
    }
  } else {
    // Preconfigured destination - use destinationName
    destinationName = outputConfig.destinationName || '';
  }

  // Build the configuration payload in NEW FORMAT
  const payload: OutputConfigPayload = {
    config: {
      input_sources: transformedInputSources,
      output_fields: outputConfig.outputFields || [],
      field_mappings: transformedFieldMappings,
      combine_sources: outputConfig.combineSources || false,
      field_priority: outputConfig.fieldPriority || []
    },
    destinationType: destinationType,
    ...(destinationConfig && { destinationConfig }),  // Only include if custom
    ...(destinationName && { destinationName }),      // Only include if preconfigured
    limitations: {
      limit_records: outputConfig.limitation ? (outputConfig.limitCount || null) : null,
      shuffle_records: outputConfig.random || false
    }
  };

  // Include ID if this is an existing output config (for update payload)
  if ((outputConfig as any).hasExistingId && outputConfig.id) {
    payload.id = outputConfig.id;
  }

  // Debug logging (commented out to prevent continuous output)
  // console.log('');
  // console.log('===============================================');
  // console.log('📤 OUTPUT TRANSFORMATION (NEW FORMAT)');
  // console.log('===============================================');
  // console.log('Output Config ID:', outputConfig.id);
  // console.log('Destination Type:', destinationType);
  // console.log('Input Sources:', transformedInputSources);
  // console.log('Output Fields:', outputConfig.outputFields?.length || 0);
  // console.log('Field Mappings:', transformedFieldMappings.length);
  // console.log('Combine Sources:', outputConfig.combineSources);
  // console.log('');
  // console.log('📦 TRANSFORMED PAYLOAD:');
  // console.log(JSON.stringify(payload, null, 2));
  // console.log('===============================================');
  // console.log('');

  return payload;
};

/**
 * Transform multiple OutputConfigs to API format with field mappings in each config
 */
export const transformOutputConfigurationsToAPI = (
  outputConfigurations: OutputConfig[],
  availableInputSources: InputSource[],
  customDestinations: OutputDestination[],
  moduleLevelFieldMappings: FieldMapping[],  // Module-level field mappings
  apiSources?: RequestInputsResponse | null
): OutputAPIPayload | null => {
  if (!outputConfigurations || outputConfigurations?.length === 0) {
    return null;
  }

  // Transform all output configurations with the same field mappings in each
  const transformedConfigs = (outputConfigurations || [])
    .map(config => transformOutputToAPIFormat(
      config,
      availableInputSources,
      customDestinations,
      moduleLevelFieldMappings,  // Pass the same field mappings to each config
      apiSources  // Pass API sources for destination details
    ))
    .filter((config): config is OutputConfigPayload => config !== null);

  if (transformedConfigs?.length === 0) {
    return null;
  }

  // Return array of configurations, each with the same field mappings
  return transformedConfigs;
};
