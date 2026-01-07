import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  IconButton,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  FormControlLabel,
  Paper,
} from '@mui/material';
import { Close, Add, Delete } from '@mui/icons-material';
import type { InputSource } from '../InputModule/InputModule';

interface NewColumn {
  id: string;
  name: string;
  dataType: string;
}

interface AddColumnDialogProps {
  open: boolean;
  onClose: () => void;
  selectedInputSources: InputSource[];
  onSave: (columns: NewColumn[]) => void;
}

const DATA_TYPES = [
  'String',
  'Integer',
  'Float',
  'Boolean',
  'Date',
  'DateTime',
  'Text',
];

// Predefined field sets for quick population
const PREDEFINED_FIELDS = {
  address: [
    { name: 'Cass_Address1', dataType: 'String' },
    { name: 'Cass_Address2', dataType: 'String' },
    { name: 'Cass_Address3', dataType: 'String' },
    { name: 'Cass_Address4', dataType: 'String' },
    { name: 'Cass_Address5', dataType: 'String' },
  ],
  email: [
    { name: 'Email', dataType: 'String' },
    { name: 'email_id', dataType: 'String' },
    { name: 'EmailId', dataType: 'String' },
  ],
  profileId: [
    { name: 'Profile', dataType: 'String' },
    { name: 'ProfileId', dataType: 'String' },
    { name: 'profile_id', dataType: 'String' },
  ],
  md5: [
    { name: 'MD5_Hash', dataType: 'String' },
    { name: 'MD5_Email', dataType: 'String' },
    { name: 'MD5_Profile', dataType: 'String' },
  ],
};

const AddColumnDialog: React.FC<AddColumnDialogProps> = ({
  open,
  onClose,
  selectedInputSources,
  onSave,
}) => {
  const [columns, setColumns] = useState<NewColumn[]>([]);
  const [columnName, setColumnName] = useState('');
  const [columnDataType, setColumnDataType] = useState('String');

  // Predefined field selection states
  const [selectedAddress, setSelectedAddress] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState(false);
  const [selectedMD5, setSelectedMD5] = useState(false);

  // Auto-populate fields when predefined options are checked
  useEffect(() => {
    const newColumns: NewColumn[] = [];

    if (selectedAddress) {
      PREDEFINED_FIELDS.address.forEach(field => {
        if (!columns.find(col => col?.name === field?.name)) {
          newColumns.push({
            id: `${Date.now()}-${field?.name}`,
            name: field?.name,
            dataType: field?.dataType,
          });
        }
      });
    }

    if (selectedEmail) {
      PREDEFINED_FIELDS.email.forEach(field => {
        if (!columns.find(col => col?.name === field?.name)) {
          newColumns.push({
            id: `${Date.now()}-${field?.name}`,
            name: field?.name,
            dataType: field?.dataType,
          });
        }
      });
    }

    if (selectedProfileId) {
      PREDEFINED_FIELDS.profileId.forEach(field => {
        if (!columns.find(col => col?.name === field?.name)) {
          newColumns.push({
            id: `${Date.now()}-${field?.name}`,
            name: field?.name,
            dataType: field?.dataType,
          });
        }
      });
    }

    if (selectedMD5) {
      PREDEFINED_FIELDS.md5.forEach(field => {
        if (!columns.find(col => col?.name === field?.name)) {
          newColumns.push({
            id: `${Date.now()}-${field?.name}`,
            name: field?.name,
            dataType: field?.dataType,
          });
        }
      });
    }

    if (newColumns.length > 0) {
      setColumns(prev => [...prev, ...newColumns]);
    }
  }, [selectedAddress, selectedEmail, selectedProfileId, selectedMD5]);

  const handleAddColumn = () => {
    if (!columnName.trim()) {
      alert('Please enter a field name');
      return;
    }

    const newColumn: NewColumn = {
      id: Date.now().toString(),
      name: columnName.trim(),
      dataType: columnDataType,
    };

    setColumns([...columns, newColumn]);
    setColumnName('');
    setColumnDataType('String');
  };

  const handleDeleteColumn = (id: string) => {
    setColumns(columns.filter(col => col?.id !== id));
  };

  const handleSave = () => {
    onSave(columns);
    setColumns([]);
    setColumnName('');
    setColumnDataType('String');
    setSelectedAddress(false);
    setSelectedEmail(false);
    setSelectedProfileId(false);
    setSelectedMD5(false);
    onClose();
  };

  const handleCancel = () => {
    setColumns([]);
    setColumnName('');
    setColumnDataType('String');
    setSelectedAddress(false);
    setSelectedEmail(false);
    setSelectedProfileId(false);
    setSelectedMD5(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          py: 2,
          px: 3,
        }}
      >
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '1.25rem', color: '#2D3748' }}>
            Add Custom Fields
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', mt: 0.5 }}>
            Use predefined field sets or define custom fields
          </Typography>
        </Box>
        <IconButton onClick={handleCancel} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ py: 3, px: 3 }}>
        {/* Selected Input Sources Display */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: '#2D3748', fontSize: '0.9rem' }}>
            Selected Input Sources
          </Typography>
          {selectedInputSources.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', fontStyle: 'italic' }}>
              No input sources selected
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {selectedInputSources.map((source) => (
                <Chip
                  key={source?.id}
                  label={source?.sourceName}
                  size="small"
                  color="primary"
                  sx={{ fontWeight: 600 }}
                />
              ))}
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Predefined Field Sets */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: '#2D3748', fontSize: '0.9rem' }}>
            Quick Add - Predefined Fields
          </Typography>
          <Paper
            sx={{
              p: 2,
              backgroundColor: '#F8FAFB',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5, fontSize: '0.8rem' }}>
              Select predefined field sets to auto-populate common fields
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedAddress}
                    onChange={(e) => setSelectedAddress(e.target.checked)}
                    size="small"
                    sx={{ color: '#10B981', '&.Mui-checked': { color: '#10B981' } }}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                      Address
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                      {PREDEFINED_FIELDS.address.length} fields
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedEmail}
                    onChange={(e) => setSelectedEmail(e.target.checked)}
                    size="small"
                    sx={{ color: '#3B82F6', '&.Mui-checked': { color: '#3B82F6' } }}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                      Email
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                      {PREDEFINED_FIELDS.email.length} fields
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedProfileId}
                    onChange={(e) => setSelectedProfileId(e.target.checked)}
                    size="small"
                    sx={{ color: '#F59E0B', '&.Mui-checked': { color: '#F59E0B' } }}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                      ProfileId
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                      {PREDEFINED_FIELDS.profileId.length} fields
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedMD5}
                    onChange={(e) => setSelectedMD5(e.target.checked)}
                    size="small"
                    sx={{ color: '#8B5CF6', '&.Mui-checked': { color: '#8B5CF6' } }}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                      MD5
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                      {PREDEFINED_FIELDS.md5.length} fields
                    </Typography>
                  </Box>
                }
              />
            </Box>
          </Paper>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Add New Column Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: '#2D3748', fontSize: '0.9rem' }}>
            Add Custom Field
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
            <TextField
              label="Field Name"
              value={columnName}
              onChange={(e) => setColumnName(e.target.value)}
              size="small"
              fullWidth
              placeholder="Enter field name"
              sx={{ flex: 1 }}
            />
            <FormControl size="small" sx={{ flex: 1 }}>
              <InputLabel>Data Type</InputLabel>
              <Select
                value={columnDataType}
                onChange={(e) => setColumnDataType(e.target.value)}
                label="Data Type"
              >
                {DATA_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <IconButton
              onClick={handleAddColumn}
              sx={{
                backgroundColor: '#10B981',
                color: 'white',
                width: 40,
                height: 40,
                '&:hover': {
                  backgroundColor: '#059669',
                },
              }}
            >
              <Add />
            </IconButton>
          </Box>
        </Box>

        {/* Added Columns List */}
        {columns.length > 0 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2D3748', fontSize: '0.9rem' }}>
                Added Fields
              </Typography>
              <Chip
                label={`${columns.length} field${columns.length !== 1 ? 's' : ''}`}
                size="small"
                color="success"
                sx={{ fontWeight: 600 }}
              />
            </Box>
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <List disablePadding>
                {columns.map((column, index) => (
                  <ListItem
                    key={column?.id}
                    sx={{
                      py: 1,
                      px: 2,
                      borderBottom: index < columns.length - 1 ? '1px solid' : 'none',
                      borderColor: 'divider',
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.02)',
                      },
                    }}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => handleDeleteColumn(column?.id)}
                        sx={{
                          color: 'error.main',
                          '&:hover': {
                            backgroundColor: 'rgba(239, 68, 68, 0.12)',
                          },
                        }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    }
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {column?.name}
                          </Typography>
                          <Chip
                            label={column?.dataType}
                            size="small"
                            sx={{
                              backgroundColor: '#F3F4F6',
                              color: '#6B7280',
                              fontSize: '0.7rem',
                              height: 20,
                            }}
                          />
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          </Box>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button
          variant="outlined"
          onClick={handleCancel}
          sx={{
            px: 3,
            py: 0.75,
            textTransform: 'none',
            fontSize: '0.875rem',
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={columns.length === 0}
          sx={{
            px: 3,
            py: 0.75,
            textTransform: 'none',
            fontSize: '0.875rem',
            boxShadow: '0 4px 16px rgba(41, 102, 149, 0.3)',
          }}
        >
          Save Fields ({columns.length})
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddColumnDialog;
