import { useState } from 'react';
import { validateRequestName } from '../utils/requestValidators';
import type { InputSource } from '../../../../components/InputModule/InputModule';

/**
 * Custom hook for managing form validation state and logic
 * Handles request name validation and other form validations
 */
export const useFormValidation = () => {
  const [requestNameError, setRequestNameError] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  /**
   * Validates the request name
   * @param requestName - The name to validate
   * @returns true if valid, false otherwise
   */
  const validateName = (requestName: string): boolean => {
    const nameError = validateRequestName(requestName);
    setRequestNameError(nameError || '');
    return !nameError;
  };

  /**
   * Validates the input sources
   * @param inputSources - The input sources to validate
   * @returns true if valid, false otherwise
   */
  const validateInputSources = (inputSources: InputSource[]): boolean => {
    if (inputSources?.length === 0) {
      setSaveError('Please add at least one input source');
      return false;
    }
    return true;
  };

  /**
   * Validates the entire form for the current step
   * @param step - The current step number
   * @param requestName - The request name
   * @param inputSources - The input sources
   * @returns true if valid, false otherwise
   */
  const validateStep = (
    step: number,
    requestName: string,
    inputSources: InputSource[]
  ): boolean => {
    // Validation for Step 1 (Input Module)
    if (step === 0) {
      const isNameValid = validateName(requestName);
      const areSourcesValid = validateInputSources(inputSources);
      return isNameValid && areSourcesValid;
    }
    return true;
  };

  /**
   * Clears all validation errors
   */
  const clearErrors = () => {
    setRequestNameError('');
    setSaveError('');
  };

  /**
   * Clears success messages
   */
  const clearSuccess = () => {
    setSaveSuccess('');
  };

  return {
    // State
    requestNameError,
    saveLoading,
    saveSuccess,
    saveError,

    // Setters
    setRequestNameError,
    setSaveLoading,
    setSaveSuccess,
    setSaveError,

    // Validation functions
    validateName,
    validateInputSources,
    validateStep,
    clearErrors,
    clearSuccess,
  };
};
