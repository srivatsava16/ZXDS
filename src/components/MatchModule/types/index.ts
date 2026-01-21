import type { InputSource } from '../../InputModule/InputModule';
import type { RequestInputsResponse } from '../../../services/api';

export interface MatchConfig {
  id: string;
  inputSources: string[];
  matchOnFields: string[];
  matchSources: string[];
  expand: boolean;
  matchType: 'full' | 'any';
  addFields?: string[]; // Fields to add when expand is true
  createdAt?: number; // Timestamp for sorting by creation order
}

interface AppendConfig {
  id: string;
  inputSources: string[];
  appendFields?: string[];
}

export interface MatchModuleProps {
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
}

export interface PredefinedSource {
  id: string;
  name: string;
  description?: string;
}
