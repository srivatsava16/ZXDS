import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Card,
  CardContent,
  Chip,
  Stack,
  Divider,
  IconButton,
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Delete,
  Refresh,
  Download,
} from '@mui/icons-material';

interface RequestDetails {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  description?: string;
}

const UniversalPullRequestViewPage: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Mock data - replace with actual API call
  const requestDetails: RequestDetails = {
    id: requestId || '1',
    name: `Universal Pull Request #${requestId}`,
    status: 'completed',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T14:30:00Z',
    description: 'Comprehensive data pull request with enhanced filtering and processing capabilities.',
  };

  const handleBack = () => {
    navigate('/universal-pull');
  };

  const handleEdit = () => {
    navigate(`/universal-pull/edit/${requestId}`);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'processing':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <IconButton onClick={handleBack} sx={{ mr: 1 }}>
          <ArrowBack />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Request Details
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View and manage universal pull request
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<Edit />}
            onClick={handleEdit}
            size="small"
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            size="small"
          >
            Download
          </Button>
        </Stack>
      </Stack>

      {/* Request Details Card */}
      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Request Information
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Request Name
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {requestDetails.name}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip
                    label={requestDetails.status.toUpperCase()}
                    color={getStatusColor(requestDetails.status) as any}
                    size="small"
                    sx={{ mt: 0.5 }}
                  />
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Description
                  </Typography>
                  <Typography variant="body1">
                    {requestDetails.description || 'No description provided.'}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={4}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Created At
                    </Typography>
                    <Typography variant="body1">
                      {new Date(requestDetails.createdAt).toLocaleString()}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Last Updated
                    </Typography>
                    <Typography variant="body1">
                      {new Date(requestDetails.updatedAt).toLocaleString()}
                    </Typography>
                  </Box>
                </Stack>
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Processing Details
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Additional processing information and logs would appear here.
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default UniversalPullRequestViewPage;