import type { InputSource } from '../../../../components/InputModule/InputModule';
import type { StatsConfiguration, OutputConfig, SuppressConfig } from '../types';

/**
 * Transform input sources to API format
 */
export const transformInputSourcesToAPI = (inputSources: InputSource[]) => {
  return inputSources.map((source, index) => {
    const baseTransform = {
      source_id: source.sourceName,
      source_type: source.sourceType,
      sub_source_type: source.subSourceType,
    };

    // File source specific fields
    if (source.sourceType === 'File') {
      return {
        ...baseTransform,
        file_source: source.fileSource || '',
        file_path: source.filePath || '',
        file_name: source.fileName || '',
        delimiter: source.delimiter || ',',
        is_header: source.hasHeader ? 1 : 0,
        custom_headers: source.customHeaders || '',
        headers: source.headers || [],
        selected_headers: source.selectedHeaders || source.headers || [],
        data_types: source.dataTypes || {},
      };
    }

    // Database source specific fields
    if (source.sourceType === 'Database') {
      return {
        ...baseTransform,
        database: source.database || '',
        schema: source.schema || '',
        table: source.table || '',
        query: source.filterQuery || '',
        headers: source.headers || [],
        selected_headers: source.selectedHeaders || source.headers || [],
      };
    }

    // Self source specific fields
    if (source.sourceType === 'Self') {
      return {
        ...baseTransform,
        headers: source.headers || [],
        selected_headers: source.selectedHeaders || source.headers || [],
        records: source.previewData || [],
      };
    }

    return baseTransform;
  });
};

/**
 * Transform stats configurations to API format
 */
export const transformStatsToAPI = (statsConfigurations: StatsConfiguration[]) => {
  if (!statsConfigurations || statsConfigurations.length === 0) {
    return null;
  }

  return statsConfigurations.map(config => {
    // Create counts array with per-field distinct configuration
    const counts = config.countsOn.map(countOn => ({
      field: countOn.field,
      is_distinct: countOn.isDistinct
    }));

    return {
      input_sources: config.inputSources,
      generate_counts_config: {
        counts: counts
      },
      breakdown_by: config.breakdownBy,
    };
  });
};

/**
 * Transform output configurations to API format
 */
export const transformOutputToAPI = (
  outputConfigurations: OutputConfig[],
  allAvailableInputSources: InputSource[]
) => {
  if (!outputConfigurations || outputConfigurations.length === 0) {
    return null;
  }

  const outputConfig = outputConfigurations[0]; // For now, handle first config

  const outputInputSources = (outputConfig.inputSources as string[])
    .map((sourceName: string, index: number) => {
      let source = allAvailableInputSources.find(s => s.sourceName === sourceName);

      if (!source) {
        source = allAvailableInputSources.find(s => s.id === sourceName);
      }

      if (!source) {
        return null;
      }

      // Get the columns for this source
      const columns = source?.selectedHeaders || source?.headers || [];

      return {
        source_id: source.sourceName,
        columns: columns,
        priority: index + 1,
      };
    })
    .filter((item: any): item is { source_id: string; columns: string[]; priority: number } => item !== null);

  return {
    input_sources: outputInputSources,
    output_fields: outputConfig?.outputFields || [],
    combine_sources: outputConfig?.combineSources || false,
    field_priority: outputConfig?.fieldPriority || [],
    limitations: {
      limit_records: outputConfig?.limitCount || null,
      shuffle_records: outputConfig?.random || false,
    },
    destinations: outputConfig?.destinations || [],
  };
};

/**
 * Transform suppress configurations to API format
 */
export const transformSuppressToAPI = (
  suppressConfigurations: SuppressConfig[],
  allAvailableInputSources: InputSource[]
) => {
  if (!suppressConfigurations || suppressConfigurations.length === 0) {
    return null;
  }

  return suppressConfigurations.map(config => ({
    input_sources: config?.inputSources?.map((sourceId: string) => {
      const source = allAvailableInputSources.find(s => s?.id === sourceId);

      if (!source) {
        return null;
      }

      // Get the columns for this source
      const columns = source?.selectedHeaders || source?.headers || [];

      return {
        source_id: source.sourceName,
        columns: columns
      };
    }).filter(Boolean),
    suppress_on_fields: config?.suppressOnFields || [],
    suppress_sources: (config?.suppressSources || []).map((sourceId: string) => {
      // Find the source and return its name
      const source = allAvailableInputSources.find(s => s?.id === sourceId);
      return source?.sourceName || '';
    }).filter(Boolean) // Remove any empty strings
  }));
};

/**
 * Transform schedule configuration to API format
 */
export const transformScheduleToAPI = (
  scheduleType: 'adhoc' | 'recurring',
  recurrenceUnit: 'hours' | 'days' | 'weeks' | 'months',
  recurrenceInterval: number,
  startDate: string,
  endDate: string,
  emailNotification: 'none' | 'on-completion' | 'on-failure' | 'always',
  emailRecipients: string[]
) => {
  return {
    type: scheduleType,
    recurrence: scheduleType === 'recurring' ? {
      unit: recurrenceUnit,
      interval: recurrenceInterval,
      start_date: startDate,
      end_date: endDate,
    } : undefined,
    notifications: {
      email: {
        when: emailNotification,
        recipients: emailRecipients,
      },
    },
  };
};

/**
 * Build complete API payload
 */
export const buildRequestPayload = (
  requestName: string,
  currentUser: string,
  adminUser: string,
  scheduleType: 'adhoc' | 'recurring',
  inputSources: InputSource[],
  statsConfigurations: StatsConfiguration[],
  outputConfigurations: OutputConfig[],
  suppressConfigurations: SuppressConfig[],
  recurrenceUnit: 'hours' | 'days' | 'weeks' | 'months',
  recurrenceInterval: number,
  startDate: string,
  endDate: string,
  emailNotification: 'none' | 'on-completion' | 'on-failure' | 'always',
  emailRecipients: string[]
) => {
  const allAvailableInputSources = [...inputSources];

  const requestDetails = {
    requestName,
    createdBy: currentUser,
    updatedBy: adminUser,
    requestType: scheduleType === 'adhoc' ? 'A' : 'S',
  };

  const transformedInputSources = transformInputSourcesToAPI(inputSources);

  return {
    requestDetails,
    inputSources: transformedInputSources,
    ...(statsConfigurations.length > 0 && {
      stats: transformStatsToAPI(statsConfigurations)
    }),
    ...(outputConfigurations.length > 0 && {
      output: transformOutputToAPI(outputConfigurations, allAvailableInputSources)
    }),
    ...(suppressConfigurations.length > 0 && {
      suppress: transformSuppressToAPI(suppressConfigurations, allAvailableInputSources)
    }),
    schedule: transformScheduleToAPI(
      scheduleType,
      recurrenceUnit,
      recurrenceInterval,
      startDate,
      endDate,
      emailNotification,
      emailRecipients
    ),
  };
};
