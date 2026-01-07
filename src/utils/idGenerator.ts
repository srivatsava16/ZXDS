import { nanoid } from 'nanoid';

/**
 * Generates a unique ID using nanoid
 * @param size - Optional size of the ID (default: 21 characters)
 * @returns A unique string ID
 */
export const generateId = (size?: number): string => {
  return nanoid(size);
};

/**
 * Generates a unique ID with a prefix
 * @param prefix - Prefix to add to the ID (e.g., 'user_', 'config_')
 * @param size - Optional size of the ID part (default: 10 characters)
 * @returns A unique string ID with prefix
 */
export const generateIdWithPrefix = (prefix: string, size: number = 10): string => {
  return `${prefix}${nanoid(size)}`;
};

/**
 * Generates a short unique ID (8 characters)
 * Useful for UI elements and temporary identifiers
 * @returns A short unique string ID
 */
export const generateShortId = (): string => {
  return nanoid(8);
};

/**
 * Generates a numeric-like ID for backward compatibility
 * Note: This is still a string but looks like a timestamp
 * @returns A timestamp-based string ID
 */
export const generateNumericId = (): string => {
  return Date.now().toString();
};
