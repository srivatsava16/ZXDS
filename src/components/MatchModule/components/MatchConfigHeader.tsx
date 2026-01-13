import { Box, Button, Typography, Chip, Tooltip, IconButton } from '@mui/material';
import { Add, AccountTree } from '@mui/icons-material';
import type { FieldMapping } from '../../AppendModule/FieldMappingDialog';

interface MatchConfigHeaderProps {
  editingConfigId: string | null;
  fieldMappings: FieldMapping[];
  onFieldMappingClick: () => void;
  onAddCustomSourceClick: () => void;
  onCreateVersion?: () => void;
  canCreateVersion: boolean;
}

const MatchConfigHeader: React.FC<MatchConfigHeaderProps> = ({
  editingConfigId,
  fieldMappings,
  onFieldMappingClick,
  onAddCustomSourceClick,
  onCreateVersion,
  canCreateVersion,
}) => {

  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '1rem', color: '#2D3748' }}>
          {editingConfigId ? 'Edit Match Configuration' : 'Create Match Configuration'}
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
            borderColor: '#F59E0B',
            color: '#F59E0B',
            '&:hover': {
              borderColor: '#D97706',
              backgroundColor: 'rgba(245, 158, 11, 0.04)',
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
                backgroundColor: '#FCD34D',
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
              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
              backgroundColor: '#FDE68A',
              color: '#fff',
              '&:hover': {
                backgroundColor: '#FCD34D',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
              },
            }}
          >
            Add Custom Match Source
          </Button>
          <Tooltip title="Create Version" arrow>
            <span>
              <IconButton
                size="small"
                onClick={onCreateVersion}
                disabled={!canCreateVersion}
                sx={{
                  color: '#F59E0B',
                  border: '2px solid #F59E0B',
                  borderRadius: 1,
                  '&:hover': {
                    backgroundColor: 'rgba(245, 158, 11, 0.08)',
                    borderColor: '#D97706',
                  },
                  '&:disabled': {
                    color: 'rgba(245, 158, 11, 0.4)',
                    borderColor: 'rgba(245, 158, 11, 0.4)',
                  },
                }}
              >
                <AccountTree fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
};

export default MatchConfigHeader;
