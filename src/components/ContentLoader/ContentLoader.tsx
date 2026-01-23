import { Box, CircularProgress, Typography } from '@mui/material';

interface ContentLoaderProps {
  message?: string;
  minHeight?: string | number;
}

const ContentLoader: React.FC<ContentLoaderProps> = ({
  message = 'Loading...',
  minHeight = '400px'
}) => {
  return (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: minHeight,
        py: 8,
        gap: 2,
      }}
    >
      <CircularProgress size={50} thickness={4} sx={{ color: '#296695' }} />
      <Typography
        variant="body1"
        sx={{
          color: '#6B7280',
          fontWeight: 500,
          textAlign: 'center',
        }}
      >
        {message}
      </Typography>
    </Box>
  );
};

export default ContentLoader;
