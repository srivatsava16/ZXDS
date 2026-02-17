import type { InputSource } from '../../InputModule/InputModule';
import type { RequestInputsResponse } from '../../../services/api';

export interface MatchConfig {
  id: string;
  inputSources: string[];
  matchOnFields: string[];  // Fields from INPUT sources to match on (becomes match_keys in API)
  matchSources: string[];
  expand: boolean;
  matchType: 'full' | 'any';
  addFields?: string[];  // Fields from MATCH sources to add to output (becomes add_fields in API)
  fieldMappings?: Array<{
    id: string;
    fieldName: string;
    selectedSources: string[];
    selectedColumns: string[];
  }>;
  createdAt?: number; // Timestamp for sorting by creation order
  createdByModuleId?: string; // Track which module instance created this config
  stepOrder?: number; // Module position in workflow (1-based)
  internalStepOrder?: number; // Order within the module (1-based)
  hasExistingId?: boolean; // Flag to indicate if this has an existing ID from API (for update payload)
  workflowItemId?: string; // Store original workflow item ID if exists
}

interface AppendConfig {
  id: string;
  inputSources: string[];
  appendFields?: string[];
}

export interface MatchModuleProps {
  moduleId?: string; // ID of the module instance (e.g., 'panel4', 'panel4_1')
  availableInputSources: InputSource[];
  onCreateVersionedSource?: (
    sourceModule: 'Match' | 'Append' | 'Suppress',
    baseInputSources: string[],
    operationSources: string[],
    operationFields?: string[],
    addFields?: string[]  // Add Fields for Match module
  ) => void;
  initialConfigs?: MatchConfig[];
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
  onConfigurationsChange?: (configs: MatchConfig[]) => void;
  appendConfigurations?: AppendConfig[]; // To track appended fields
  modules?: Array<{ id: string; type: string }>; // All modules in workflow for position-based filtering
  // Module-level field mappings (shared across all configs/versions in this module)
  moduleFieldMappings?: any[];
  onModuleFieldMappingsChange?: (mappings: any[]) => void;
  // Table dictionary data from dictionary.php API
  tableDictionary?: any;
}

export interface PredefinedSource {
  id: string;
  name: string;
  description?: string;
  fields?: string[];
}
