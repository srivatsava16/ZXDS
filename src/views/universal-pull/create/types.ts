import type { InputSource } from '../../../components/InputModule/InputModule';

export interface StatsConfiguration {
  id: string;
  inputSources: string[];
  countsOn: string[];
  isDistinct: boolean;
  breakdownBy: string[];
}

export interface VersionedSource extends InputSource {
  isVersioned: true;
  versionNumber: number;
  versionLabel: string;
  sourceModule: 'Match' | 'Append' | 'Suppress';
  createdByModuleId: string;
  baseInputSources: string[];
  operationSources: string[];
  operationFields?: string[];
  combinedHeaders?: string[];
}

export interface ModuleConfig {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  isDraggable: boolean;
}

export interface SortableAccordionItemProps {
  module: ModuleConfig;
  index: number;
  expanded: string[];
  onChange: (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => void;
  renderContent: (moduleId: string) => React.ReactNode;
  isDraggable: boolean;
  onDuplicate?: (moduleId: string) => void;
  onDelete?: (moduleId: string) => void;
}

export interface OutputConfig {
  id: string;
  inputSources: string[];
  outputFields: string[];
  destinations: string[];
  combineSources: boolean;
  combineSourcesList?: string[];
  priorityOrder?: string[];
  fieldPriority?: string[];
  limitation: boolean;
  limitCount?: number;
  random: boolean;
}

export interface SuppressConfig {
  id: string;
  inputSources: string[];
  suppressOnFields: string[];
  suppressSources: string[];
}

export type ScheduleType = 'adhoc' | 'recurring';
export type RecurrenceUnit = 'hours' | 'days' | 'weeks' | 'months';
export type EmailNotification = 'none' | 'on-completion' | 'on-failure' | 'always';
