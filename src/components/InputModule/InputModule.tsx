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
  Visibility,
  Edit,
  Delete,
  Description,
} from '@mui/icons-material';
import SourceConfigDialog from './SourceConfigDialog';

export interface InputSource {
  id: string;
  sourceType: 'File' | 'Database' | 'Self';
  sourceName: string;
  subSourceType: string;
  fileSource?: string; // The preconfigured source (BO3 SFTP, ZXDS SFTP, etc.)
  filePath?: string;
  fileName?: string;
  delimiter?: string;
  hasHeader?: boolean;
  headers?: string[];
  dataTypes?: Record<string, string>;
  previewData?: any[];
  isVersioned?: boolean; // Indicates if this source was created through versioning
}

interface InputModuleProps {
  hideButton?: boolean;
  onAddClick?: () => void;
  onSourcesChange?: (sources: InputSource[]) => void;
  initialSources?: InputSource[];
}

const InputModule: React.FC<InputModuleProps> = ({ hideButton = false, onAddClick, onSourcesChange, initialSources = [] }) => {
  const [sources, setSources] = useState<InputSource[]>(initialSources);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<InputSource | null>(null);

  // Sync with prop changes
  useEffect(() => {
    setSources(initialSources);
  }, [initialSources]);

  const handleAddSource = () => {
    setEditingSource(null);
    setDialogOpen(true);
    if (onAddClick) {
      onAddClick();
    }
  };

  const handleEditSource = (source: InputSource) => {
    setEditingSource(source);
    setDialogOpen(true);
  };

  const handleDeleteSource = (id: string) => {
    const newSources = sources.filter(s => s.id !== id);
    setSources(newSources);
    if (onSourcesChange) {
      onSourcesChange(newSources);
    }
  };

  const handleSaveSource = (source: InputSource, shouldClose: boolean = true) => {
    let newSources: InputSource[];
    if (editingSource) {
      newSources = sources.map(s => s.id === source.id ? source : s);
    } else {
      newSources = [...sources, { ...source, id: Date.now().toString() }];
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
      onSourcesChange(newSources);
    }
  };

  const handleViewSource = (source: InputSource) => {
    setEditingSource(source);
    setDialogOpen(true);
  };

  return (
    <Box>
      {/* Hidden trigger for external button */}
      {hideButton && (
        <button
          data-add-input-source
          onClick={handleAddSource}
          style={{ display: 'none' }}
          aria-hidden="true"
        />
      )}

      {/* Add Input Source Button */}
      {!hideButton && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
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
        </Box>
      )}

      {/* Placeholder content when no sources */}
      {sources.length === 0 && (
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
      {sources.length > 0 && (
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
              {sources.map((source) => {
                const headerText = source.headers?.join(', ') || '--';
                const headerCount = source.headers?.length || 0;
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
                        color={source.sourceType === 'File' ? 'primary' : 'secondary'}
                        sx={{ fontWeight: 600, height: 22, fontSize: '0.7rem' }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 0.75, px: 1.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                        {source.sourceName || '--'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 0.75, px: 1.5 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        {source.sourceType === 'File'
                          ? (source.fileName || source.filePath || '--')
                          : (source.sourceName || '--')}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 0.75, px: 1.5 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        {source.subSourceType}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 0.75, px: 1.5, maxWidth: '200px' }}>
                      {headerCount > 0 ? (
                        <Tooltip
                          title={
                            <Box sx={{ maxWidth: 400 }}>
                              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                File Headers ({headerCount} columns):
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
                              {source.headers?.slice(0, 3).join(', ')}
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
                          onClick={() => handleViewSource(source)}
                          sx={{
                            color: 'primary.main',
                            padding: '3px',
                            '&:hover': {
                              backgroundColor: 'rgba(41, 102, 149, 0.12)',
                            },
                          }}
                          title="View"
                        >
                          <Visibility sx={{ fontSize: 16 }} />
                        </IconButton>
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
                          onClick={() => handleDeleteSource(source.id)}
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
      />
    </Box>
  );
};

export default InputModule;
