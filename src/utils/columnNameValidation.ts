/**
 * Column Name Validation Utility
 *
 * Enforces SQL column naming conventions for custom headers and column names.
 * These rules ensure compatibility with SQL databases and prevent SQL injection risks.
 */

/**
 * Common SQL reserved keywords to prevent naming conflicts
 * This is a subset of commonly reserved words across major databases
 */
const SQL_RESERVED_KEYWORDS = new Set([
  'ADD', 'ALL', 'ALTER', 'AND', 'ANY', 'AS', 'ASC', 'BACKUP', 'BETWEEN', 'BY',
  'CASE', 'CHECK', 'COLUMN', 'CONSTRAINT', 'CREATE', 'DATABASE', 'DEFAULT', 'DELETE',
  'DESC', 'DISTINCT', 'DROP', 'EXEC', 'EXISTS', 'FOREIGN', 'FROM', 'FULL', 'GROUP',
  'HAVING', 'IN', 'INDEX', 'INNER', 'INSERT', 'INTO', 'IS', 'JOIN', 'KEY', 'LEFT',
  'LIKE', 'LIMIT', 'NOT', 'NULL', 'ON', 'OR', 'ORDER', 'OUTER', 'PRIMARY', 'PROCEDURE',
  'RIGHT', 'ROWNUM', 'SELECT', 'SET', 'TABLE', 'TOP', 'TRUNCATE', 'UNION', 'UNIQUE',
  'UPDATE', 'VALUES', 'VIEW', 'WHERE', 'WITH'
]);

/**
 * Configuration for column name validation
 */
export interface ColumnNameValidationConfig {
  maxLength?: number;
  checkReservedKeywords?: boolean;
  allowLeadingUnderscore?: boolean;
  customInvalidPatterns?: RegExp[];
}

/**
 * Result of column name validation
 */
export interface ColumnNameValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates a single column name against SQL naming conventions
 *
 * Rules enforced:
 * 1. Must start with a letter (a-z, A-Z) or underscore (if allowed)
 * 2. Can only contain letters, numbers, and underscores
 * 3. No spaces or special characters
 * 4. Cannot exceed max length (default: 64 characters)
 * 5. Cannot be an SQL reserved keyword (if checking enabled)
 *
 * @param columnName - The column name to validate
 * @param config - Optional configuration for validation rules
 * @returns Validation result with isValid flag and error messages
 */
export const validateColumnName = (
  columnName: string,
  config: ColumnNameValidationConfig = {}
): ColumnNameValidationResult => {
  const {
    maxLength = 64,
    checkReservedKeywords = true,
    allowLeadingUnderscore = true,
    customInvalidPatterns = []
  } = config;

  const errors: string[] = [];
  const trimmedName = columnName?.trim();

  // Check if empty
  if (!trimmedName || trimmedName.length === 0) {
    errors.push('Column name cannot be empty');
    return { isValid: false, errors };
  }

  // Check length
  if (trimmedName.length > maxLength) {
    errors.push(`Column name exceeds maximum length of ${maxLength} characters`);
  }

  // Check if starts with a letter or underscore (based on config)
  const startsWithPattern = allowLeadingUnderscore ? /^[a-zA-Z_]/ : /^[a-zA-Z]/;
  if (!startsWithPattern.test(trimmedName)) {
    const allowedStart = allowLeadingUnderscore ? 'a letter (a-z, A-Z) or underscore (_)' : 'a letter (a-z, A-Z)';
    errors.push(`Column name must start with ${allowedStart}`);
  }

  // Check if contains only valid characters (letters, numbers, underscores)
  const validCharactersPattern = /^[a-zA-Z0-9_]+$/;
  if (!validCharactersPattern.test(trimmedName)) {
    errors.push('Column name can only contain letters, numbers, and underscores (no spaces or special characters)');
  }

  // Check for spaces specifically (provides clearer error message)
  if (/\s/.test(trimmedName)) {
    errors.push('Column name cannot contain spaces');
  }

  // Check against SQL reserved keywords
  if (checkReservedKeywords && SQL_RESERVED_KEYWORDS.has(trimmedName.toUpperCase())) {
    errors.push(`"${trimmedName}" is an SQL reserved keyword and cannot be used as a column name`);
  }

  // Check custom invalid patterns
  for (const pattern of customInvalidPatterns) {
    if (pattern.test(trimmedName)) {
      errors.push(`Column name matches invalid pattern: ${pattern.toString()}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates a comma-separated list of column names
 * Used for Custom Headers textarea input
 *
 * @param customHeadersInput - Comma-separated string of column names
 * @param expectedCount - Expected number of columns (optional)
 * @param config - Optional configuration for validation rules
 * @returns Validation result with detailed error messages
 */
export const validateCustomHeaders = (
  customHeadersInput: string,
  expectedCount?: number,
  config: ColumnNameValidationConfig = {}
): ColumnNameValidationResult => {
  const errors: string[] = [];
  const trimmedInput = customHeadersInput?.trim();

  // Check if empty
  if (!trimmedInput || trimmedInput.length === 0) {
    return { isValid: true, errors: [] }; // Empty is valid (means no custom headers)
  }

  // Split by comma and trim each header
  const headersList = trimmedInput
    .split(',')
    .map(h => h?.trim())
    .filter(h => h.length > 0);

  // Check count matches expected count (if provided)
  if (expectedCount !== undefined && headersList.length !== expectedCount) {
    errors.push(
      `Expected ${expectedCount} header${expectedCount !== 1 ? 's' : ''}, but got ${headersList.length}. ` +
      `You must enter exactly ${expectedCount} comma-separated custom header${expectedCount !== 1 ? 's' : ''}.`
    );
  }

  // Check for duplicate names (case-insensitive)
  const uniqueNames = new Set<string>();
  const duplicates = new Set<string>();

  headersList.forEach(header => {
    const upperHeader = header.toUpperCase();
    if (uniqueNames.has(upperHeader)) {
      duplicates.add(header);
    } else {
      uniqueNames.add(upperHeader);
    }
  });

  if (duplicates.size > 0) {
    errors.push(`Duplicate column names found: ${Array.from(duplicates).join(', ')}`);
  }

  // Validate each individual header
  const invalidHeaders: Array<{ name: string; errors: string[] }> = [];

  headersList.forEach((header) => {
    const validation = validateColumnName(header, config);
    if (!validation.isValid) {
      invalidHeaders.push({
        name: header,
        errors: validation.errors
      });
    }
  });

  // Add detailed error messages for invalid headers
  if (invalidHeaders.length > 0) {
    invalidHeaders.forEach(({ name, errors: headerErrors }) => {
      errors.push(`Column "${name}": ${headerErrors.join('; ')}`);
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Sanitizes a column name by removing/replacing invalid characters
 * Useful for auto-correcting user input
 *
 * @param columnName - The column name to sanitize
 * @param config - Optional configuration
 * @returns Sanitized column name
 */
export const sanitizeColumnName = (
  columnName: string,
  config: ColumnNameValidationConfig = {}
): string => {
  const { allowLeadingUnderscore = true } = config;

  let sanitized = columnName?.trim();

  if (!sanitized) return '';

  // Replace spaces and special characters with underscores
  sanitized = sanitized.replace(/[^a-zA-Z0-9_]/g, '_');

  // Remove consecutive underscores
  sanitized = sanitized.replace(/_+/g, '_');

  // Ensure starts with letter or underscore
  if (!/^[a-zA-Z_]/.test(sanitized)) {
    if (allowLeadingUnderscore) {
      sanitized = '_' + sanitized;
    } else {
      // If leading underscore not allowed and doesn't start with letter, prepend 'col_'
      sanitized = 'col_' + sanitized;
    }
  }

  // Remove trailing underscores
  sanitized = sanitized.replace(/_+$/, '');

  return sanitized;
};

/**
 * Validates and provides suggestions for fixing invalid column names
 *
 * @param columnName - The column name to validate
 * @param config - Optional configuration
 * @returns Validation result with suggested fix if invalid
 */
export const validateWithSuggestion = (
  columnName: string,
  config: ColumnNameValidationConfig = {}
): ColumnNameValidationResult & { suggestion?: string } => {
  const validation = validateColumnName(columnName, config);

  if (!validation.isValid) {
    const suggestion = sanitizeColumnName(columnName, config);
    return {
      ...validation,
      suggestion: suggestion !== columnName ? suggestion : undefined
    };
  }

  return validation;
};

/**
 * Get a user-friendly error message for custom headers validation
 *
 * @param validationResult - Result from validateCustomHeaders
 * @returns Single concatenated error message suitable for display
 */
export const getCustomHeadersErrorMessage = (
  validationResult: ColumnNameValidationResult
): string => {
  if (validationResult.isValid) {
    return '';
  }

  // Return first error for simplicity, or join all errors
  if (validationResult.errors.length === 1) {
    return validationResult.errors[0];
  }

  return validationResult.errors.join('\n');
};

/**
 * Example usage patterns
 */
export const EXAMPLES = {
  valid: [
    'CustomerName',
    'customer_name',
    'Email_Address',
    'Phone123',
    '_internal_id'
  ],
  invalid: [
    '123Invalid',      // Starts with number
    'First Name',      // Contains space
    'Email@Address',   // Contains special character
    'Price$',          // Contains special character
    'SELECT',          // SQL reserved keyword
    'User-Name',       // Contains hyphen
    'column#1',        // Contains hash
    'Test!Column'      // Contains exclamation
  ]
};
