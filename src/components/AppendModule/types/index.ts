import type { InputSource } from '../../InputModule/InputModule';
import type { RequestInputsResponse } from '../../../services/api';

export interface AppendConfig {
  id: string;
  inputSources: string[];
  appendOnFields: string[];
  appendSources: string[];
  appendFields: string[];
  fieldMappings?: Array<{
    id: string;
    fieldName: string;
    selectedSources: string[];
    selectedColumns: string[];
  }>;
}

export interface AppendModuleProps {
  availableInputSources: InputSource[];
  onCreateVersionedSource?: (
    sourceModule: 'Match' | 'Append' | 'Suppress',
    baseInputSources: string[],
    operationSources: string[],
    operationFields?: string[],
    fieldMappings?: any[]
  ) => void;
  initialConfigs?: AppendConfig[];
  apiSources?: RequestInputsResponse | null;
  sourcesLoading?: boolean;
  versionedSources?: any[]; // Versioned sources for display
  getSourceNameById?: (sourceId: string) => string; // Helper function to get source names
  onUpdateVersionName?: (versionId: string, newName: string) => void;
  onUpdateVersion?: (versionId: string, updatedVersion: any) => void; // Update full version configuration
  // Shared custom sources across all modules
  sharedCustomSources?: InputSource[];
  onAddSharedCustomSource?: (source: InputSource, moduleId?: string) => void;
  onEditSharedCustomSource?: (source: InputSource) => void;
  onDeleteSharedCustomSource?: (id: string) => void;
  // Configuration tracking for dependency validation
  onConfigurationsChange?: (configs: AppendConfig[]) => void;
}

export interface PredefinedSource {
  id: string;
  name: string;
  description?: string;
  fields: string[];
}
