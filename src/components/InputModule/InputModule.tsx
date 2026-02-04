import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Typography,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Description,
  List,
} from '@mui/icons-material';
import SourceConfigDialog from './SourceConfigDialog';
import InputVersionModal from './InputVersionModal';
import { type RequestInputsResponse } from '../../services/api';

export interface InputSource {
  id: string;
  sourceType: 'File' | 'Database' | 'Self' | 'Version';
  sourceName: string;
  subSourceType: string;
  fileSource?: string; // The preconfigured source name (BO3 SFTP, ZXDS SFTP, etc.)
  fileSourceId?: number; // The preconfigured source ID for proper restoration
  filePath?: string;
  fileName?: string;
  delimiter?: string;
  hasHeader?: boolean;
  isHeader?: 0 | 1; // For API payload: 0 = No header, 1 = Has header
  customHeaders?: string; // Comma-separated string of header names for file type
  headers?: string[]; // All available headers from the data source (never filtered)
  selectedHeaders?: string[]; // User-selected subset of headers (for processing)
  dataTypes?: Record<string, string>;
  previewData?: any[];
  contentPreview?: string; // Raw delimited content from Get Sample Recods (for file sources)
  filterQuery?: string; // Store the generated filter query
  filterJson?: any; // Store the filter configuration (groups, conditions, etc.)
  isVersioned?: boolean; // Indicates if this source was created through versioning
  database?: string;
  schema?: string;
  table?: string;
  originalTableName?: string; // For preconfigured tables: stores the original table name for restoration
  tableSourceId?: number; // For preconfigured database tables: stores the tableId for proper restoration
  sourceOption?: string; // Database source option (for preconfigured sources)
  customTableMetadata?: {
    source: string;
    database: string;
    schema: string;
    tableName: string;
    tableSourceName: string;
  };
  versionConfig?: {
    selectedSources: string[];
    combineAs: 'merge' | 'union' | 'intersect';
    fieldMappings: any[];
  };
  // Self source specific fields
  isSelfSource?: boolean; // Indicates if this is a self source (for tier generation, etc.)
  selfConfig?: {
    input_source_names: string[]; // Array of input source names (not IDs)
    generated_column: string; // The column name to generate
    generated_datatype: string; // Data type of the generated column
    assignment_sets: Array<{
      value_to_assign: string; // Value to assign when condition matches
      filter_sql: string; // SQL filter condition
    }>;
    tiering_on: string; // Comma-separated list of field names used for tiering
  };
  createdByModuleId?: string; // Track which module created this custom source (for order-aware filtering)
  apiFormat?: any; // Cached API format for submission (only for File sources)
}

interface InputModuleProps {
  hideButton?: boolean;
  onAddClick?: () => void;
  onSourcesChange?: (sources: InputSource[]) => void;
  initialSources?: InputSource[];
  apiSources?: RequestInputsResponse | null;
  sourcesLoading?: boolean;
  versionCounters?: { Input: number; Match: number; Append: number; Suppress: number };
  onUpdateVersionCounter?: (module: 'Input', increment: number) => void;
  sharedCustomSources?: InputSource[]; // Sources from Append/Match/Suppress modules for validation
  tableDictionary?: any; // Table dictionary data from dictionary.php API
}

const InputModule: React.FC<InputModuleProps> = ({
  hideButton = false,
  onAddClick,
  onSourcesChange,
  initialSources = [],
  apiSources = null,
  sourcesLoading = false,
  versionCounters = { Input: 0, Match: 0, Append: 0, Suppress: 0 },
  onUpdateVersionCounter,
  sharedCustomSources = [],
  tableDictionary = null
}) => {
  const [sources, setSources] = useState<InputSource[]>(initialSources || []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<InputSource | null>(null);
  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const [editingVersion, setEditingVersion] = useState<InputSource | null>(null);

  // Sync with prop changes
  useEffect(() => {
    setSources(initialSources || []);
  }, [initialSources]);

  const handleAddSource = () => {
    setEditingSource(null);
    setDialogOpen(true);
    if (onAddClick) {
      onAddClick?.();
    }
  };

  const handleEditSource = (source: InputSource) => {
    if (source?.isVersioned) {
      // Open version modal for versioned sources
      setEditingVersion(source);
      setVersionModalOpen(true);
    } else {
      // Open source config dialog for regular sources
      setEditingSource(source);
      setDialogOpen(true);
    }
  };

  const handleDeleteSource = (id: string) => {
    const newSources = sources?.filter(s => s?.id !== id) || [];
    setSources(newSources);
    if (onSourcesChange) {
      onSourcesChange?.(newSources);
    }
  };

  const handleSaveSource = (source: InputSource, shouldClose: boolean = true) => {
    let newSources: InputSource[];
    if (editingSource) {
      newSources = sources?.map(s => s?.id === source?.id ? source : s) || [];
    } else {
      newSources = [...(sources || []), { ...source, id: Date.now().toString() }];
    }
    setSources(newSources);

    // Only close the dialog if shouldClose is true
    if (shouldClose) {
      setDialogOpen(false);
      setEditingSource(null);
    } else {
      // Reset editingSource for "Add & Continue" to enable adding a new source
      setEditingSource(null);
    }

    if (onSourcesChange) {
      onSourcesChange?.(newSources);
    }
  };

  const handleVersionSave = (versionData: any) => {
    let newSources: InputSource[];

    // Extract data from the new format
    const { stepOrder, actionType, saveAsVersion, versionName, internalStepOrder, configJson } = versionData;
    const { operation, input_sources, added_fields } = configJson || {};

    // For UI display, extract headers from the first input source
    const allHeaders = input_sources?.[0]?.columns || [];

    // Extract source IDs/names from input_sources
    const selectedSourceNames = input_sources?.map((src: any) => src.source_name) || [];

    if (editingVersion) {
      // Update existing version
      const updatedSource: InputSource = {
        ...editingVersion,
        sourceName: versionName || editingVersion.sourceName, // Use new version name or keep existing
        headers: allHeaders,
        createdByModuleId: 'panel1', // Track that this version was created by Input module
        versionConfig: {
          selectedSources: selectedSourceNames,
          combineAs: operation === 'union' ? 'merge' : operation, // Map back to UI format
          fieldMappings: [], // Field mappings not in new format yet
        },
        // Store the full config for API submission
        ...(versionData as any)
      };

      newSources = sources?.map(s => s?.id === editingVersion?.id ? updatedSource : s) ?? [];
      setEditingVersion(null);
    } else {
      // Create a new versioned source using the provided version name
      const versionedSource: InputSource = {
        id: `version_${Date.now()}`,
        sourceType: 'Version',
        sourceName: versionName, // Use the version name from the modal
        subSourceType: '', // Empty for versions
        fileSource: '', // Empty for versions
        headers: allHeaders,
        isVersioned: true,
        createdByModuleId: 'panel1', // Track that this version was created by Input module
        versionConfig: {
          selectedSources: selectedSourceNames,
          combineAs: operation === 'union' ? 'merge' : operation, // Map back to UI format
          fieldMappings: [], // Field mappings not in new format yet
        },
        // Store the full config for API submission
        ...(versionData as any)
      };

      // Add the versioned source to existing sources
      newSources = [...sources, versionedSource];

      // Update version counter
      if (onUpdateVersionCounter) {
        onUpdateVersionCounter('Input', 1);
      }
    }

    setSources(newSources);
    if (onSourcesChange) {
      onSourcesChange(newSources);
    }
  };

  return (
    <Box>
      {/* Hidden trigger for external button */}
      {hideButton && (
        <>
          <button
            data-add-input-source
            onClick={handleAddSource}
            style={{ display: 'none' }}
            aria-hidden="true"
          />
          <button
            data-create-input-version
            onClick={() => setVersionModalOpen(true)}
            style={{ display: 'none' }}
            aria-hidden="true"
          />
        </>
      )}

      {/* Add Input Source Button */}
      {!hideButton && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-start', gap: 1, mb: 2 }}>
          <Button
            variant="contained"
            size="small"
            startIcon={<Add />}
            onClick={handleAddSource}
            sx={{
              px: 2,
              py: 0.5,
              textTransform: 'none',
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(41, 102, 149, 0.3)',
            }}
          >
            Add Input Source
          </Button>
          {sources?.length >= 1 && (
            <Tooltip title="Create Version" arrow>
              <IconButton
                size="small"
                onClick={() => setVersionModalOpen(true)}
                sx={{
                  color: '#6366F1',
                  border: '2px solid #6366F1',
                  borderRadius: 1,
                  '&:hover': {
                    backgroundColor: 'rgba(99, 102, 241, 0.08)',
                    borderColor: '#4F46E5',
                  },
                }}
              >
                <List fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      )}

      {/* Placeholder content when no sources */}
      {(sources?.length ?? 0) === 0 && (
        <Box
          sx={{
            p: 4,
            textAlign: 'center',
            backgroundColor: '#F8FAFB',
            borderRadius: 3,
            border: '1px dashed',
            borderColor: 'divider',
          }}
        >
          <Typography variant="body1" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
            No Input Sources Added Yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Click "Add Input Source" to import data from various sources including Files, SFTP servers, AWS S3, Databases, or create new tables
          </Typography>
        </Box>
      )}

      {/* Sources List Table */}
      {sources?.length > 0 && (
        <TableContainer
          component={Paper}
          sx={{
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#F8FAFB' }}>
                <TableCell sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Source Type</TableCell>
                <TableCell sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>User Source Name</TableCell>
                <TableCell sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>File Source</TableCell>
                <TableCell sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Sub Source Type</TableCell>
                <TableCell sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600, width: '200px' }}>Header</TableCell>
                <TableCell align="center" sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sources?.map((source) => {
                // Handle both UI format and API format
                // UI format: headers (array), selectedHeaders (array)
                // API format: columns (array), selectedColumns (comma-separated string)
                let displayHeaders: string[] = [];

                if (source?.selectedHeaders && Array.isArray(source?.selectedHeaders)) {
                  // UI format with selectedHeaders
                  displayHeaders = source.selectedHeaders;
                } else if ((source as any)?.selectedColumns && typeof (source as any)?.selectedColumns === 'string') {
                  // API format with selectedColumns (comma-separated string)
                  displayHeaders = (source as any).selectedColumns?.split(',').map((h: string) => h?.trim()).filter((h: string) => h?.length > 0);
                } else if (source?.headers && Array.isArray(source?.headers)) {
                  // UI format with headers (fallback)
                  displayHeaders = source.headers;
                } else if ((source as any)?.columns && Array.isArray((source as any)?.columns)) {
                  // API format with columns (fallback)
                  displayHeaders = (source as any).columns;
                }

                const headerText = displayHeaders?.join(', ') || '--';
                const headerCount = displayHeaders?.length || 0;
                return (
                  <TableRow
                    key={source.id}
                    hover
                    sx={{
                      '&:hover': {
                        backgroundColor: 'rgba(41, 102, 149, 0.04)',
                      },
                    }}
                  >
                    <TableCell sx={{ py: 0.75, px: 1.5 }}>
                      <Chip
                        icon={<Description />}
                        label={source.sourceType}
                        size="small"
                        color={source.sourceType === 'File' ? 'primary' : source.sourceType === 'Version' ? 'success' : 'secondary'}
                        sx={{ fontWeight: 600, height: 22, fontSize: '0.7rem' }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 0.75, px: 1.5, maxWidth: 250 }}>
                      <Tooltip title={source?.sourceName || '--'} arrow placement="top">
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {source?.sourceName || '--'}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ py: 0.75, px: 1.5, maxWidth: 250 }}>
                      <Tooltip
                        title={
                          source?.sourceType === 'File'
                            ? (source?.fileName || source?.filePath || '--')
                            : source?.sourceType === 'Version'
                            ? '--'
                            : (source?.sourceName || '--')
                        }
                        arrow
                        placement="top"
                      >
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            fontSize: '0.75rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {source?.sourceType === 'File'
                            ? (source?.fileName || source?.filePath || '--')
                            : source?.sourceType === 'Version'
                            ? '--'
                            : (source?.sourceName || '--')}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ py: 0.75, px: 1.5 }}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontSize: '0.75rem' }}
                        onClick={() => {
                          console.log('[subSourceType] Source clicked:', source?.sourceName);
                          console.log('[subSourceType] Full source object:', source);
                          console.log('[subSourceType] source.subSourceType:', source?.subSourceType);
                          console.log('[subSourceType] source.sourceType:', source?.sourceType);
                        }}
                      >
                        {source?.subSourceType || '--'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 0.75, px: 1.5, maxWidth: '200px' }}>
                      {headerCount > 0 ? (
                        <Tooltip
                          title={
                            <Box sx={{ maxWidth: 400 }}>
                              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                Selected Headers ({headerCount} columns):
                              </Typography>
                              <Typography variant="caption" sx={{ display: 'block' }}>
                                {headerText}
                              </Typography>
                            </Box>
                          }
                          arrow
                          placement="top"
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Chip
                              label={`${headerCount} columns`}
                              size="small"
                              color="info"
                              variant="outlined"
                              sx={{ fontWeight: 600, height: 20, fontSize: '0.65rem' }}
                            />
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                fontSize: '0.7rem',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {displayHeaders?.slice(0, 3).join(', ')}
                              {headerCount > 3 ? '...' : ''}
                            </Typography>
                          </Box>
                        </Tooltip>
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          --
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center" sx={{ py: 0.75, px: 1.5 }}>
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <IconButton
                          size="small"
                          onClick={() => handleEditSource(source)}
                          sx={{
                            color: 'info.main',
                            padding: '3px',
                            '&:hover': {
                              backgroundColor: 'rgba(59, 130, 246, 0.12)',
                            },
                          }}
                          title="Edit"
                        >
                          <Edit sx={{ fontSize: 16 }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteSource(source?.id)}
                          sx={{
                            color: 'error.main',
                            padding: '3px',
                            '&:hover': {
                              backgroundColor: 'rgba(239, 68, 68, 0.12)',
                            },
                          }}
                          title="Delete"
                        >
                          <Delete sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Source Configuration Dialog */}
      <SourceConfigDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSaveSource}
        initialSource={editingSource}
        existingSources={sources}
        allExistingSources={[...sources, ...sharedCustomSources]}
        apiSources={apiSources}
        sourcesLoading={sourcesLoading}
        tableDictionary={tableDictionary}
      />

      {/* Input Version Modal */}
      <InputVersionModal
        open={versionModalOpen}
        onClose={() => {
          setVersionModalOpen(false);
          setEditingVersion(null);
        }}
        availableSources={sources}
        apiSources={apiSources}
        onSave={handleVersionSave}
        editingVersion={editingVersion}
        currentVersionCount={sources?.filter(s => s.isVersioned).length}
      />
    </Box>
  );
};

export default InputModule;
