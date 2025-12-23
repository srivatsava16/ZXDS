import { Box, Typography, Container, Stack, Link } from '@mui/material';
import { Favorite } from '@mui/icons-material';

const Footer: React.FC = () => {
  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 2,
        mt: 'auto',
        backgroundColor: 'white',
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Container maxWidth={false}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems="center"
          spacing={2}
        >
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} Record Level Processing Tool. All rights reserved.
          </Typography>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Typography variant="body2" color="text.secondary">
              Made with
            </Typography>
            <Favorite sx={{ fontSize: 16, color: '#EF4444' }} />
            <Typography variant="body2" color="text.secondary">
              by the RLTP Team
            </Typography>
          </Stack>
          <Stack direction="row" spacing={3}>
            <Link
              href="#"
              underline="hover"
              color="text.secondary"
              sx={{
                fontSize: '0.875rem',
                transition: 'color 0.2s ease',
                '&:hover': {
                  color: 'primary.main',
                },
              }}
            >
              Privacy Policy
            </Link>
            <Link
              href="#"
              underline="hover"
              color="text.secondary"
              sx={{
                fontSize: '0.875rem',
                transition: 'color 0.2s ease',
                '&:hover': {
                  color: 'primary.main',
                },
              }}
            >
              Terms of Service
            </Link>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
};

export default Footer;
