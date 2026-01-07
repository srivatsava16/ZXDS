import type { InputSource } from '../../../../components/InputModule/InputModule';
import type { StatsConfiguration, OutputConfig } from '../types';

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate request name
 */
export const validateRequestName = (requestName: string): string | null => {
  if (!requestName || !requestName.trim()) {
    return 'Request name is required';
  }

  if (requestName.length < 3) {
    return 'Request name must be at least 3 characters';
  }

  if (requestName.length > 100) {
    return 'Request name must be less than 100 characters';
  }

  // Check for invalid characters
  const invalidChars = /[<>:"/\\|?*]/;
  if (invalidChars.test(requestName)) {
    return 'Request name contains invalid characters';
  }

  return null;
};

/**
 * Validate input sources
 */
export const validateInputSources = (inputSources: InputSource[]): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!inputSources || inputSources.length === 0) {
    errors.push({
      field: 'inputSources',
      message: 'At least one input source is required',
    });
  }

  inputSources.forEach((source, index) => {
    if (!source.sourceName) {
      errors.push({
        field: `inputSources[${index}].sourceName`,
        message: `Input source ${index + 1} must have a name`,
      });
    }

    if (source.sourceType === 'File' && !source.filePath) {
      errors.push({
        field: `inputSources[${index}].filePath`,
        message: `Input source "${source.sourceName}" must have a file path`,
      });
    }

    if (source.sourceType === 'Database' && (!source.database || !source.table)) {
      errors.push({
        field: `inputSources[${index}].database`,
        message: `Input source "${source.sourceName}" must have database and table`,
      });
    }
  });

  return errors;
};

/**
 * Validate stats configurations
 */
export const validateStatsConfigurations = (
  statsConfigurations: StatsConfiguration[]
): ValidationError[] => {
  const errors: ValidationError[] = [];

  statsConfigurations.forEach((config, index) => {
    if (!config.inputSources || config.inputSources.length === 0) {
      errors.push({
        field: `stats[${index}].inputSources`,
        message: `Stats configuration ${index + 1} must have at least one input source`,
      });
    }

    if (!config.countsOn || config.countsOn.length === 0) {
      errors.push({
        field: `stats[${index}].countsOn`,
        message: `Stats configuration ${index + 1} must have at least one count field`,
      });
    }
  });

  return errors;
};

/**
 * Validate output configurations
 */
export const validateOutputConfigurations = (
  outputConfigurations: OutputConfig[]
): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (outputConfigurations.length === 0) {
    errors.push({
      field: 'outputConfigurations',
      message: 'At least one output configuration is required',
    });
    return errors;
  }

  outputConfigurations.forEach((config, index) => {
    if (!config.inputSources || config.inputSources.length === 0) {
      errors.push({
        field: `output[${index}].inputSources`,
        message: `Output configuration ${index + 1} must have at least one input source`,
      });
    }

    if (!config.outputFields || config.outputFields.length === 0) {
      errors.push({
        field: `output[${index}].outputFields`,
        message: `Output configuration ${index + 1} must have at least one output field`,
      });
    }

    if (!config.destinations || config.destinations.length === 0) {
      errors.push({
        field: `output[${index}].destinations`,
        message: `Output configuration ${index + 1} must have at least one destination`,
      });
    }
  });

  return errors;
};

/**
 * Validate schedule configuration
 */
export const validateScheduleConfiguration = (
  scheduleType: 'adhoc' | 'recurring',
  recurrenceUnit: string,
  recurrenceInterval: number,
  startDate: string,
  endDate: string
): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (scheduleType === 'recurring') {
    if (!recurrenceUnit) {
      errors.push({
        field: 'recurrenceUnit',
        message: 'Recurrence unit is required for scheduled requests',
      });
    }

    if (!recurrenceInterval || recurrenceInterval < 1) {
      errors.push({
        field: 'recurrenceInterval',
        message: 'Recurrence interval must be at least 1',
      });
    }

    if (!startDate) {
      errors.push({
        field: 'startDate',
        message: 'Start date is required for scheduled requests',
      });
    }

    if (endDate && new Date(endDate) < new Date(startDate)) {
      errors.push({
        field: 'endDate',
        message: 'End date must be after start date',
      });
    }
  }

  return errors;
};

/**
 * Validate entire request
 */
export const validateRequest = (
  requestName: string,
  inputSources: InputSource[],
  statsConfigurations: StatsConfiguration[],
  outputConfigurations: OutputConfig[],
  scheduleType: 'adhoc' | 'recurring',
  recurrenceUnit: string,
  recurrenceInterval: number,
  startDate: string,
  endDate: string
): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Validate request name
  const nameError = validateRequestName(requestName);
  if (nameError) {
    errors.push({ field: 'requestName', message: nameError });
  }

  // Validate input sources
  errors.push(...validateInputSources(inputSources));

  // Validate stats
  errors.push(...validateStatsConfigurations(statsConfigurations));

  // Validate output
  errors.push(...validateOutputConfigurations(outputConfigurations));

  // Validate schedule
  errors.push(...validateScheduleConfiguration(
    scheduleType,
    recurrenceUnit,
    recurrenceInterval,
    startDate,
    endDate
  ));

  return errors;
};
