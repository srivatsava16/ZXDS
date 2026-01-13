import { Box, Typography, Button, Chip, IconButton } from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import type { StatsConfiguration } from '../types';

interface StatsSectionProps {
  statsConfigurations: StatsConfiguration[];
  onAddConfig: () => void;
  onEditConfig: (config: StatsConfiguration) => void;
  onDeleteConfig: (configId: string) => void;
}

const StatsSection: React.FC<StatsSectionProps> = ({
  statsConfigurations,
  onAddConfig,
  onEditConfig,
  onDeleteConfig,
}) => {
  if (statsConfigurations.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          No statistics configurations added yet. Click below to add your first configuration.
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={onAddConfig} size="small">
          Add Stats Configuration
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Statistics Configurations ({statsConfigurations.length})
        </Typography>
        <Button variant="outlined" startIcon={<Add />} onClick={onAddConfig} size="small">
          Add Configuration
        </Button>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {statsConfigurations.map((config) => (
          <Box
            key={config.id}
            sx={{
              p: 2,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              backgroundColor: 'background.paper',
              '&:hover': {
                borderColor: 'primary.main',
                boxShadow: '0 2px 8px rgba(41, 102, 149, 0.1)',
              },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Input Sources:
                  </Typography>
                  {config.inputSources.map((source) => (
                    <Chip key={source} label={source} size="small" />
                  ))}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Count On:
                  </Typography>
                  {config.countsOn.map((countOn) => (
                    <Chip
                      key={countOn.field}
                      label={`${countOn.field}${countOn.isDistinct ? ' (D)' : ''}`}
                      size="small"
                      color={countOn.isDistinct ? 'success' : 'primary'}
                      variant="outlined"
                    />
                  ))}
                </Box>
                {config.breakdownBy.length > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Breakdown By:
                    </Typography>
                    {config.breakdownBy.map((field) => (
                      <Chip key={field} label={field} size="small" color="secondary" variant="outlined" />
                    ))}
                  </Box>
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <IconButton size="small" onClick={() => onEditConfig(config)} color="primary">
                  <Edit fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => onDeleteConfig(config.id)} color="error">
                  <Delete fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default StatsSection;
