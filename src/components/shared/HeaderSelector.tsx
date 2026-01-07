import React from 'react';
import {
  Box,
  Typography,
  FormControl,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  Chip,
} from '@mui/material';

interface HeaderSelectorProps {
  availableHeaders: string[];
  selectedHeaders: string[];
  onHeadersChange: (headers: string[]) => void;
  disabled?: boolean;
}

const HeaderSelector: React.FC<HeaderSelectorProps> = ({
  availableHeaders,
  selectedHeaders,
  onHeadersChange,
  disabled = false,
}) => {
  // Ensure selectedHeaders only contains valid headers from availableHeaders
  const validSelectedHeaders = selectedHeaders.filter(header =>
    availableHeaders.includes(header)
  );

  const handleChange = (event: any) => {
    const value = event.target.value;

    // Ensure we always have a clean array and filter out any invalid values
    const newSelectedHeaders = typeof value === 'string' ? value.split(',') : value;
    // Filter to ensure only valid headers are included
    const validSelectedHeaders = newSelectedHeaders.filter((header: string) =>
      availableHeaders.includes(header)
    );

    onHeadersChange(validSelectedHeaders);
  };

  const handleSelectAll = () => {
    if (validSelectedHeaders.length === availableHeaders.length) {
      // Deselect all
      onHeadersChange([]);
    } else {
      // Select all
      onHeadersChange([...availableHeaders]);
    }
  };

  const isAllSelected = validSelectedHeaders.length === availableHeaders.length && availableHeaders.length > 0;

  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
          Select Headers
          <Typography component="span" sx={{ color: 'text.secondary', fontSize: '0.8rem', ml: 1 }}>
            ({validSelectedHeaders.length} of {availableHeaders.length} selected)
          </Typography>
        </Typography>
        {availableHeaders.length > 0 && (
          <Typography
            variant="body2"
            sx={{
              color: 'primary.main',
              cursor: 'pointer',
              fontSize: '0.8rem',
              textDecoration: 'underline',
              '&:hover': {
                textDecoration: 'underline',
              },
            }}
            onClick={handleSelectAll}
          >
            {isAllSelected ? 'Deselect All' : 'Select All'}
          </Typography>
        )}
      </Box>

      {availableHeaders.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
          No headers available. Please fetch records first.
        </Typography>
      ) : (
        <>
          <FormControl fullWidth size="small" disabled={disabled}>
            <Select
              multiple
              value={validSelectedHeaders}
              onChange={handleChange}
              displayEmpty
              renderValue={(selected) => {
                if (selected.length === 0) {
                  return <em>Select headers...</em>;
                }
                return (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.slice(0, 3).map((value) => (
                      <Chip
                        key={value}
                        label={value}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.75rem',
                          backgroundColor: 'primary.main',
                          color: 'white',
                          '& .MuiChip-deleteIcon': {
                            color: 'white',
                          },
                        }}
                      />
                    ))}
                    {selected.length > 3 && (
                      <Chip
                        label={`+${selected.length - 3} more`}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.75rem',
                          backgroundColor: 'text.secondary',
                          color: 'white',
                        }}
                      />
                    )}
                  </Box>
                );
              }}
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 300,
                    width: 350,
                  },
                },
              }}
            >
              {availableHeaders.map((header) => (
                <MenuItem key={header} value={header}>
                  <Checkbox
                    checked={validSelectedHeaders.indexOf(header) > -1}
                    size="small"
                    sx={{ mr: 1 }}
                  />
                  <ListItemText
                    primary={header}
                    primaryTypographyProps={{
                      fontSize: '0.85rem',
                    }}
                  />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {validSelectedHeaders.length > 0 && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                Selected headers will be included in the data source. Unselected headers will be excluded from processing.
              </Typography>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default HeaderSelector;