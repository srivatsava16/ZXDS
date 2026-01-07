import { Box, Typography } from '@mui/material';
import type { ModuleConfig } from '../types';

interface ModuleHeaderProps {
  module: ModuleConfig;
  children?: React.ReactNode;
}

const ModuleHeader: React.FC<ModuleHeaderProps> = ({ module, children }) => {
  const IconComponent = module.icon;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        mb: 3,
        pb: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: `${module.color}15`,
          flexShrink: 0,
        }}
      >
        <IconComponent sx={{ fontSize: 24, color: module.color }} />
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#2D3748', mb: 0.5 }}>
          {module.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
          {module.description}
        </Typography>
      </Box>
      {children}
    </Box>
  );
};

export default ModuleHeader;
