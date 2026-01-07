import { Box, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import type { InputSource } from '../../InputModule/InputModule';

interface ViewSourceDialogProps {
  source: InputSource | null;
  onClose: () => void;
}

const ViewSourceDialog: React.FC<ViewSourceDialogProps> = ({ source, onClose }) => {
  if (!source) return null;

  return (
    <Dialog open={true} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#296695' }}>
          Match Source Details
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
              Source Name
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {source.sourceName}
            </Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
              Source Type
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {source.sourceType}
            </Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
              Sub Source Type
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {source.subSourceType}
            </Typography>
          </Box>
          {source.fileName && (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                File Name
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {source.fileName}
              </Typography>
            </Box>
          )}
          {source.database && (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                Database
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {source.database}
              </Typography>
            </Box>
          )}
          {source.table && (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                Table
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {source.table}
              </Typography>
            </Box>
          )}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
              Available Fields ({(source.selectedHeaders || source.headers || []).length})
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
              {(source.selectedHeaders || source.headers || []).map((field) => (
                <Box
                  key={field}
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    backgroundColor: '#E0F2FE',
                    color: '#0369A1',
                    borderRadius: 1,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  {field}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose} variant="outlined" size="small">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ViewSourceDialog;
