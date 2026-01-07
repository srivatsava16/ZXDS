import { useState, useCallback } from 'react';
import type { InputSource } from '../../../../components/InputModule/InputModule';
import type { StatsConfiguration, OutputConfig, SuppressConfig, VersionedSource } from '../types';
import { generateId } from '../../../../utils/idGenerator';

export const useRequestFormState = () => {
  // Request metadata
  const [requestName, setRequestName] = useState('');
  const [requestNameError, setRequestNameError] = useState('');

  // Module states
  const [inputSources, setInputSources] = useState<InputSource[]>([]);
  const [appendConfigs, setAppendConfigs] = useState<any[]>([]);
  const [suppressConfigurations, setSuppressConfigurations] = useState<SuppressConfig[]>([]);
  const [matchConfigs, setMatchConfigs] = useState<any[]>([]);
  const [statsConfigurations, setStatsConfigurations] = useState<StatsConfiguration[]>([]);
  const [outputConfigurations, setOutputConfigurations] = useState<OutputConfig[]>([]);

  // Schedule state
  const [scheduleType, setScheduleType] = useState<'adhoc' | 'recurring'>('adhoc');
  const [recurrenceUnit, setRecurrenceUnit] = useState<'hours' | 'days' | 'weeks' | 'months'>('days');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [emailNotification, setEmailNotification] = useState<'none' | 'on-completion' | 'on-failure' | 'always'>('none');
  const [emailRecipients, setEmailRecipients] = useState<string[]>([]);

  // Versioned sources
  const [versionedSources, setVersionedSources] = useState<VersionedSource[]>([]);
  const [versionCounter, setVersionCounter] = useState(1);

  // UI state
  const [expanded, setExpanded] = useState<string[]>(['input']);
  const [isStepperView, setIsStepperView] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Handlers
  const handleAccordionChange = useCallback((panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(prev => isExpanded ? [...prev, panel] : prev.filter(p => p !== panel));
  }, []);

  const toggleViewMode = useCallback(() => {
    setIsStepperView(prev => !prev);
  }, []);

  const handleStepChange = useCallback((step: number) => {
    setActiveStep(step);
  }, []);

  const resetForm = useCallback(() => {
    setRequestName('');
    setRequestNameError('');
    setInputSources([]);
    setAppendConfigs([]);
    setSuppressConfigurations([]);
    setMatchConfigs([]);
    setStatsConfigurations([]);
    setOutputConfigurations([]);
    setVersionedSources([]);
    setVersionCounter(1);
    setExpanded(['input']);
    setActiveStep(0);
    setSaveError('');
  }, []);

  // Versioned source management
  const createVersionedSource = useCallback((
    sourceModule: 'Match' | 'Append' | 'Suppress',
    baseInputSources: string[],
    operationSources: string[],
    operationFields?: string[]
  ) => {
    const newVersionedSources: VersionedSource[] = [];

    baseInputSources.forEach(baseSourceId => {
      operationSources.forEach(opSourceId => {
        const baseSource = inputSources.find(s => s.id === baseSourceId);
        if (!baseSource) return;

        const versionLabel = `${baseSource.sourceName}_${sourceModule}_${opSourceId}`;
        const newVersion: VersionedSource = {
          ...baseSource,
          id: generateId(),
          sourceName: versionLabel,
          sourceType: 'Version',
          isVersioned: true,
          versionNumber: versionCounter,
          versionLabel,
          sourceModule,
          createdByModuleId: generateId(),
          baseInputSources: [baseSourceId],
          operationSources: [opSourceId],
          operationFields,
          combinedHeaders: baseSource.headers || [],
        };

        newVersionedSources.push(newVersion);
      });
    });

    setVersionedSources(prev => [...prev, ...newVersionedSources]);
    setVersionCounter(prev => prev + 1);
    return newVersionedSources;
  }, [inputSources, versionCounter]);

  return {
    // State
    requestName,
    requestNameError,
    inputSources,
    appendConfigs,
    suppressConfigurations,
    matchConfigs,
    statsConfigurations,
    outputConfigurations,
    scheduleType,
    recurrenceUnit,
    recurrenceInterval,
    startDate,
    endDate,
    emailNotification,
    emailRecipients,
    versionedSources,
    expanded,
    isStepperView,
    activeStep,
    saveLoading,
    saveError,

    // Setters
    setRequestName,
    setRequestNameError,
    setInputSources,
    setAppendConfigs,
    setSuppressConfigurations,
    setMatchConfigs,
    setStatsConfigurations,
    setOutputConfigurations,
    setScheduleType,
    setRecurrenceUnit,
    setRecurrenceInterval,
    setStartDate,
    setEndDate,
    setEmailNotification,
    setEmailRecipients,
    setVersionedSources,
    setSaveLoading,
    setSaveError,

    // Handlers
    handleAccordionChange,
    toggleViewMode,
    handleStepChange,
    resetForm,
    createVersionedSource,
  };
};
