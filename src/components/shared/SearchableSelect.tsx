import { useState, useMemo } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box,
  ListSubheader,
  Checkbox,
  ListItemText,
  Chip,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { Search } from '@mui/icons-material';

interface SearchableSelectProps {
  label: string;
  value: string | string[];
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
  error?: boolean;
  helperText?: string;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  renderValue?: (selected: string | string[]) => React.ReactNode;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  value,
  options,
  onChange,
  multiple = false,
  disabled = false,
  placeholder,
  required = false,
  error = false,
  helperText,
  fullWidth = true,
  size = 'small',
  renderValue,
}) => {
  const [searchText, setSearchText] = useState('');

  const filteredOptions = useMemo(() => {
    if (!searchText) return options;
    const lowerSearch = searchText.toLowerCase();
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(lowerSearch) ||
        option.value.toLowerCase().includes(lowerSearch)
    );
  }, [options, searchText]);

  const handleChange = (event: SelectChangeEvent<string | string[]>) => {
    const newValue = event.target.value;
    onChange(typeof newValue === 'string' ? newValue : newValue);
  };

  const defaultRenderValue = (selected: string | string[]) => {
    if (!selected || (Array.isArray(selected) && selected.length === 0)) {
      return <em style={{ color: '#999' }}>{placeholder || 'Select...'}</em>;
    }

    if (Array.isArray(selected)) {
      if (selected.length <= 2) {
        return (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {selected.map((val) => {
              const option = options.find((opt) => opt.value === val);
              return (
                <Chip
                  key={val}
                  label={option?.label || val}
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: '0.75rem',
                    backgroundColor: 'primary.main',
                    color: 'white',
                  }}
                />
              );
            })}
          </Box>
        );
      }
      return `${selected.length} selected`;
    }

    const option = options.find((opt) => opt.value === selected);
    return option?.label || selected;
  };

  return (
    <FormControl
      fullWidth={fullWidth}
      size={size}
      disabled={disabled}
      required={required}
      error={error}
    >
      {label && <InputLabel>{label}</InputLabel>}
      <Select
        value={value}
        onChange={handleChange}
        label={label}
        multiple={multiple}
        displayEmpty
        renderValue={renderValue || defaultRenderValue}
        MenuProps={{
          autoFocus: false,
          PaperProps: {
            style: {
              maxHeight: 400,
            },
          },
        }}
        onClose={() => setSearchText('')}
      >
        <ListSubheader>
          <TextField
            size="small"
            autoFocus
            placeholder="Type to search..."
            fullWidth
            InputProps={{
              startAdornment: <Search sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />,
            }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Escape') {
                e.stopPropagation();
              }
            }}
            sx={{ mb: 1 }}
          />
        </ListSubheader>

        {filteredOptions.length === 0 ? (
          <MenuItem disabled>
            <em>No options found</em>
          </MenuItem>
        ) : (
          filteredOptions.map((option) => (
            <MenuItem key={option.value} value={option.value} disabled={option.disabled}>
              {multiple && (
                <Checkbox
                  checked={Array.isArray(value) && value.indexOf(option.value) > -1}
                  size="small"
                />
              )}
              <ListItemText
                primary={option.label}
                primaryTypographyProps={{ fontSize: '0.875rem' }}
              />
            </MenuItem>
          ))
        )}
      </Select>
      {helperText && (
        <Box sx={{ mt: 0.5, fontSize: '0.75rem', color: error ? 'error.main' : 'text.secondary' }}>
          {helperText}
        </Box>
      )}
    </FormControl>
  );
};

export default SearchableSelect;
