import type { InputSource } from '../../../components/InputModule/InputModule';

// Individual count field with its distinct flag
export interface CountOnField {
  field: string;
  isDistinct: boolean;
}

export interface StatsConfiguration {
  id: string;
  inputSources: string[];
  countsOn: CountOnField[];  // Array of fields with individual distinct flags
  breakdownBy: string[];
}

// API format for Stats
export interface StatsAPIFormat {
  input_sources: Array<{
    source_name: string;
    columns: string[];
  }>;
  generate_counts_config: {
    counts: Array<{
      field: string;
      is_distinct: boolean;
    }>;
  };
  breakdown_by: string[];
}

// Helper function to transform StatsConfiguration to API format
export const transformStatsConfigToAPI = (
  config: StatsConfiguration,
  allAvailableSources: InputSource[]
): StatsAPIFormat => {
  // Map input sources to the required format with source_name and columns
  const input_sources = config.inputSources
    .map((sourceId) => {
      const source = allAvailableSources.find(s => s.id === sourceId);
      if (!source) {
        return null;
      }

      // Get the columns for this source (use selectedHeaders if available, fallback to headers)
      const columns = source.selectedHeaders || source.headers || [];

      return {
        source_name: source.sourceName,
        columns: columns
      };
    })
    .filter((item): item is { source_name: string; columns: string[] } => item !== null);

  // Transform countsOn array to generate_counts_config with per-field distinct
  const counts = config.countsOn.map(countField => ({
    field: countField.field,
    is_distinct: countField.isDistinct
  }));

  return {
    input_sources,
    generate_counts_config: {
      counts: counts
    },
    breakdown_by: config.breakdownBy
  };
};

// Helper function to transform all stats configurations to API format
export const transformAllStatsToAPI = (
  configurations: StatsConfiguration[],
  allAvailableSources: InputSource[]
): StatsAPIFormat[] => {

  const result = configurations.map((config, index) => {
    const transformed = transformStatsConfigToAPI(config, allAvailableSources);
    return transformed;
  });

  return result;
};

export interface VersionedSource extends InputSource {
  isVersioned: true;
  versionNumber: number;
  versionLabel: string;
  sourceModule: 'Match' | 'Append' | 'Suppress';
  createdByModuleId: string;
  baseInputSources: string[];
  operationSources: string[];
  operationFields?: string[];
  appendFields?: string[];  // Fields to Append for Append module
  addFields?: string[];     // Add Fields for Match module
  combinedHeaders?: string[];
  createdAt?: number; // Timestamp for sorting by creation order
}

export interface ModuleConfig {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  isDraggable: boolean;
}

export interface SortableAccordionItemProps {
  module: ModuleConfig;
  index: number;
  expanded: string[];
  onChange: (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => void;
  renderContent: (moduleId: string) => React.ReactNode;
  isDraggable: boolean;
  onDuplicate?: (moduleId: string) => void;
  onDelete?: (moduleId: string) => void;
}

export interface OutputConfig {
  id: string;
  inputSources: string[];
  outputFields: string[];
  destinations: string[];
  combineSources: boolean;
  combineSourcesList?: string[];
  priorityOrder?: string[];
  fieldPriority?: string[];
  limitation: boolean;
  limitCount?: number;
  random: boolean;
}

export interface SuppressConfig {
  id: string;
  inputSources: string[];
  suppressOnFields: string[];
  suppressSources: string[];
}

export type ScheduleType = 'adhoc' | 'recurring';
export type RecurrenceUnit = 'hours' | 'days' | 'weeks' | 'months';
export type EmailNotification = 'none' | 'on-completion' | 'on-failure' | 'always';
