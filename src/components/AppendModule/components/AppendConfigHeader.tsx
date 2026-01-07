import { Box, Button, Typography, Chip, Tooltip, IconButton, Menu, MenuItem } from '@mui/material';
import { Add, AccountTree, Visibility, List } from '@mui/icons-material';
import { useState } from 'react';
import type { FieldMapping } from '../FieldMappingDialog';

interface AppendConfigHeaderProps {
  editingConfigId: string | null;
  fieldMappings: FieldMapping[];
  addedCustomColumns: any[];
  onFieldMappingClick: () => void;
  onAddColumnClick: () => void;
  onAddCustomSourceClick: () => void;
  onCreateVersion?: () => void;
  onViewVersions?: () => void;
  canCreateVersion: boolean;
}

const AppendConfigHeader: React.FC<AppendConfigHeaderProps> = ({
  editingConfigId,
  fieldMappings,
  addedCustomColumns,
  onFieldMappingClick,
  onAddColumnClick,
  onAddCustomSourceClick,
  onCreateVersion,
  onViewVersions,
  canCreateVersion,
}) => {
  const [versionMenuAnchorEl, setVersionMenuAnchorEl] = useState<null | HTMLElement>(null);
  const versionMenuOpen = Boolean(versionMenuAnchorEl);

  const handleVersionMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setVersionMenuAnchorEl(event.currentTarget);
  };

  const handleVersionMenuClose = () => {
    setVersionMenuAnchorEl(null);
  };

  const handleCreateVersion = () => {
    setVersionMenuAnchorEl(null);
    onCreateVersion?.();
  };

  const handleViewVersions = () => {
    setVersionMenuAnchorEl(null);
    onViewVersions?.();
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '1rem', color: '#2D3748' }}>
          {editingConfigId ? 'Edit Append Configuration' : 'Create Append Configuration'}
        </Typography>
        {editingConfigId && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            Editing existing configuration - make changes and click Update
          </Typography>
        )}
      </Box>
      <Box sx={{ display: 'flex', gap: 1.5 }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<AccountTree />}
          onClick={onFieldMappingClick}
          sx={{
            textTransform: 'none',
            fontSize: '0.875rem',
            px: 2,
            py: 0.5,
            fontWeight: 600,
            borderColor: '#10B981',
            color: '#10B981',
            '&:hover': {
              borderColor: '#059669',
              backgroundColor: 'rgba(16, 185, 129, 0.04)',
            },
          }}
        >
          Field Mapping
          {fieldMappings.length > 0 && (
            <Chip
              label={fieldMappings.length}
              size="small"
              sx={{
                ml: 1,
                height: 18,
                fontSize: '0.65rem',
                backgroundColor: '#34D399',
                color: 'white',
                fontWeight: 700,
              }}
            />
          )}
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<List />}
          onClick={onAddColumnClick}
          sx={{
            textTransform: 'none',
            fontSize: '0.875rem',
            px: 2,
            py: 0.5,
            fontWeight: 600,
            borderColor: '#10B981',
            color: '#10B981',
            '&:hover': {
              borderColor: '#059669',
              backgroundColor: 'rgba(16, 185, 129, 0.04)',
            },
          }}
        >
          Add Column
          {addedCustomColumns.length > 0 && (
            <Chip
              label={addedCustomColumns.length}
              size="small"
              sx={{
                ml: 1,
                height: 18,
                fontSize: '0.65rem',
                backgroundColor: '#34D399',
                color: 'white',
                fontWeight: 700,
              }}
            />
          )}
        </Button>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            variant="contained"
            size="small"
            startIcon={<Add />}
            onClick={onAddCustomSourceClick}
            sx={{
              textTransform: 'none',
              fontSize: '0.875rem',
              px: 2,
              py: 0.5,
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
              backgroundColor: '#10B981',
              '&:hover': {
                backgroundColor: '#059669',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
              },
            }}
          >
            Add Custom Append Source
          </Button>
          <Tooltip title="Version Actions" arrow>
            <IconButton
              size="small"
              onClick={handleVersionMenuOpen}
              sx={{
                color: '#10B981',
                border: '2px solid #10B981',
                borderRadius: 1,
                '&:hover': {
                  backgroundColor: 'rgba(16, 185, 129, 0.08)',
                  borderColor: '#059669',
                },
              }}
            >
              <AccountTree fontSize="small" />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={versionMenuAnchorEl}
            open={versionMenuOpen}
            onClose={handleVersionMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
          >
            <MenuItem onClick={handleCreateVersion} disabled={!canCreateVersion}>
              <AccountTree sx={{ fontSize: 16, mr: 1 }} />
              Create Version
            </MenuItem>
            <MenuItem onClick={handleViewVersions}>
              <Visibility sx={{ fontSize: 16, mr: 1 }} />
              View Versions
            </MenuItem>
          </Menu>
        </Box>
      </Box>
    </Box>
  );
};

export default AppendConfigHeader;
