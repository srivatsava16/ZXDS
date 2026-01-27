import type { InputSource } from '../../InputModule/InputModule';
import type { RequestInputsResponse } from '../../../services/api';

export interface AppendConfig {
  id: string;
  inputSources: string[];
  appendOnFields: string[];
  appendSources: string[];
  appendFields: string[];
  // Note: fieldMappings are now managed at module level, not config level
  createdAt?: number; // Timestamp for sorting by creation order
  createdByModuleId?: string; // Track which module instance created this config
  stepOrder?: number; // Module position in workflow (1-based)
  internalStepOrder?: number; // Order within the module (1-based)
  hasExistingId?: boolean; // Flag to indicate if this has an existing ID from API (for update payload)
  workflowItemId?: string; // Store original workflow item ID if exists
}

export interface AppendModuleProps {
  moduleId?: string; // ID of the module instance (e.g., 'panel2', 'panel2_1')
  availableInputSources: InputSource[];
  onCreateVersionedSource?: (
    sourceModule: 'Match' | 'Append' | 'Suppress',
    baseInputSources: string[],
    operationSources: string[],
    operationFields?: string[],
    fieldMappings?: any[],
    appendFields?: string[]  // Fields to Append for Append module
  ) => void;
  initialConfigs?: AppendConfig[];
  apiSources?: RequestInputsResponse | null;
  sourcesLoading?: boolean;
  versionedSources?: any[]; // Versioned sources for display
  getSourceNameById?: (sourceId: string) => string; // Helper function to get source names
  onUpdateVersionName?: (versionId: string, newName: string) => void;
  onUpdateVersion?: (versionId: string, updatedVersion: any) => void; // Update full version configuration
  onDeleteVersion?: (versionId: string) => void; // Delete a version
  // Shared custom sources across all modules
  sharedCustomSources?: InputSource[];
  onAddSharedCustomSource?: (source: InputSource, moduleId?: string) => void;
  onEditSharedCustomSource?: (source: InputSource) => void;
  onDeleteSharedCustomSource?: (id: string) => void;
  // Configuration tracking for dependency validation
  onConfigurationsChange?: (configs: AppendConfig[]) => void;
  // Module-level field mappings (shared across all configs/versions)
  moduleFieldMappings?: any[];
  onModuleFieldMappingsChange?: (mappings: any[]) => void;
}

export interface PredefinedSource {
  id: string;
  name: string;
  description?: string;
  fields: string[];
}
