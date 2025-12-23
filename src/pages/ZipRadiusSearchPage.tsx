import { Box, Typography, Paper, Container } from '@mui/material';
import { Construction, MyLocation } from '@mui/icons-material';

const ZipRadiusSearchPage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: 'center',
            borderRadius: 4,
            border: '1px solid',
            borderColor: 'divider',
            backgroundColor: '#F8FAFB',
            maxWidth: 600,
          }}
        >
          {/* Icon */}
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 120,
              height: 120,
              borderRadius: '50%',
              backgroundColor: 'rgba(41, 102, 149, 0.1)',
              mb: 3,
            }}
          >
            <MyLocation sx={{ fontSize: 60, color: '#296695' }} />
          </Box>

          {/* Title */}
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: '#2D3748',
              mb: 2,
            }}
          >
            Zip Radius Search
          </Typography>

          {/* Coming Soon Badge */}
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              px: 3,
              py: 1,
              borderRadius: 3,
              backgroundColor: '#296695',
              color: 'white',
              mb: 3,
            }}
          >
            <Construction fontSize="small" />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Coming Soon
            </Typography>
          </Box>

          {/* Description */}
          <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
            This feature will be available soon. Stay tuned!
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default ZipRadiusSearchPage;
