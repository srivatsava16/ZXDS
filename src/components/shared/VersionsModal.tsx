import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  IconButton,
  TextField,
} from '@mui/material';
import { Close, Edit, Save, Cancel } from '@mui/icons-material';
import type { InputSource } from '../InputModule/InputModule';

// Extended VersionedSource interface to ensure we have the needed properties
export interface VersionedSource extends InputSource {
  isVersioned: true;
  versionNumber: number;
  versionLabel: string;
  sourceModule: 'Match' | 'Append' | 'Suppress';
  createdByModuleId: string;
  baseInputSources: string[];
  operationSources: string[];
  operationFields?: string[];
}

interface VersionsModalProps {
  open: boolean;
  onClose: () => void;
  moduleType: 'Match' | 'Append' | 'Suppress';
  versionedSources: VersionedSource[];
  getSourceNameById: (sourceId: string) => string;
  onUpdateVersionName?: (versionId: string, newName: string) => void;
}

const VersionsModal: React.FC<VersionsModalProps> = ({
  open,
  onClose,
  moduleType,
  versionedSources,
  getSourceNameById,
  onUpdateVersionName,
}) => {
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Filter versions for the specific module type
  const moduleVersions = versionedSources.filter(vs => vs.sourceModule === moduleType);

  const handleStartEdit = (version: VersionedSource) => {
    setEditingVersionId(version?.id);
    setEditingName(version?.versionLabel);
  };

  const handleSaveEdit = () => {
    if (editingVersionId && onUpdateVersionName) {
      onUpdateVersionName(editingVersionId, editingName);
    }
    setEditingVersionId(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingVersionId(null);
    setEditingName('');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          minHeight: '60vh',
        }
      }}
    >
      <DialogTitle
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 2,
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#296695' }}>
            {moduleType} Module Versions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            All created versions from {moduleType.toLowerCase()} operations
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ color: 'text.secondary' }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {moduleVersions.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 8,
              textAlign: 'center',
            }}
          >
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              No Versions Created Yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create versions by selecting input sources and {moduleType.toLowerCase()} sources, then clicking the version icon.
            </Typography>
          </Box>
        ) : (
          <TableContainer
            component={Paper}
            sx={{
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              maxHeight: '60vh',
              overflow: 'auto',
            }}
          >
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      backgroundColor: '#f8f9fa',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      color: '#2d3748',
                    }}
                  >
                    Version Name
                  </TableCell>
                  <TableCell
                    sx={{
                      backgroundColor: '#f8f9fa',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      color: '#2d3748',
                    }}
                  >
                    Input Source
                  </TableCell>
                  <TableCell
                    sx={{
                      backgroundColor: '#f8f9fa',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      color: '#2d3748',
                    }}
                  >
                    {moduleType} Source
                  </TableCell>
                  <TableCell
                    sx={{
                      backgroundColor: '#f8f9fa',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      color: '#2d3748',
                    }}
                  >
                    {moduleType === 'Match' ? 'Match Keys' : 
                     moduleType === 'Append' ? 'Append On Fields' : 
                     'Suppress On Fields'}
                  </TableCell>
                  <TableCell
                    sx={{
                      backgroundColor: '#f8f9fa',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      color: '#2d3748',
                      width: '100px',
                    }}
                  >
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {moduleVersions.map((version, index) => (
                  <TableRow
                    key={version?.id}
                    sx={{
                      '&:nth-of-type(odd)': {
                        backgroundColor: 'rgba(0, 0, 0, 0.02)',
                      },
                      '&:hover': {
                        backgroundColor: 'rgba(41, 102, 149, 0.04)',
                      },
                    }}
                  >
                    <TableCell>
                      {editingVersionId === version?.id ? (
                        <TextField
                          size="small"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          sx={{
                            minWidth: '200px',
                            '& .MuiOutlinedInput-root': {
                              fontSize: '0.875rem',
                            },
                          }}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveEdit();
                            } else if (e.key === 'Escape') {
                              handleCancelEdit();
                            }
                          }}
                        />
                      ) : (
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            color: '#296695',
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            '&:hover': {
                              textDecoration: 'underline',
                            },
                          }}
                          onClick={() => handleStartEdit(version)}
                          title="Click to edit version name"
                        >
                          {version.versionLabel}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                        {version.baseInputSources.map(sourceId => getSourceNameById(sourceId)).join(', ')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                        {version.operationSources.map(sourceId => getSourceNameById(sourceId)).join(', ')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                        {version.operationFields && version.operationFields.length > 0 
                          ? version.operationFields.join(', ')
                          : 'N/A'
                        }
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {editingVersionId === version?.id ? (
                          <>
                            <IconButton
                              size="small"
                              onClick={handleSaveEdit}
                              sx={{
                                color: '#10B981',
                                '&:hover': {
                                  backgroundColor: 'rgba(16, 185, 129, 0.08)',
                                },
                              }}
                            >
                              <Save fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={handleCancelEdit}
                              sx={{
                                color: '#EF4444',
                                '&:hover': {
                                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                                },
                              }}
                            >
                              <Cancel fontSize="small" />
                            </IconButton>
                          </>
                        ) : (
                          <IconButton
                            size="small"
                            onClick={() => handleStartEdit(version)}
                            disabled={!onUpdateVersionName}
                            sx={{
                              color: '#F59E0B',
                              '&:hover': {
                                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                              },
                              '&.Mui-disabled': {
                                color: '#E5E7EB',
                              },
                            }}
                            title="Edit version name"
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {moduleVersions.length > 0 && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(41, 102, 149, 0.05)', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
              <strong>Total Versions:</strong> {moduleVersions.length} | 
              <strong> Generated by:</strong> {moduleVersions.length > 0 ? 
                `${moduleVersions[0].baseInputSources.length} input source(s) × ${moduleVersions[0].operationSources.length} ${moduleType.toLowerCase()} source(s)` : 
                'N/A'
              }
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            backgroundColor: '#296695',
            '&:hover': {
              backgroundColor: '#1e4d6f',
            },
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default VersionsModal;