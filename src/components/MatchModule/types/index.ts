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
}

export interface MatchModuleProps {
  availableInputSources: InputSource[];
  onCreateVersionedSource?: (
    sourceModule: 'Match' | 'Append' | 'Suppress',
    baseInputSources: string[],
    operationSources: string[],
    operationFields?: string[]
  ) => void;
  initialConfigs?: MatchConfig[];
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
  onConfigurationsChange?: (configs: MatchConfig[]) => void;
}

export interface PredefinedSource {
  id: string;
  name: string;
  description?: string;
}
