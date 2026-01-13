import type { VersionedSource } from '../types';

/**
 * Get module type from module ID
 */
export const getModuleType = (moduleId: string): 'Match' | 'Append' | 'Suppress' | 'Input' => {
  if (moduleId === 'panel1' || moduleId.startsWith('panel1_')) return 'Input';
  if (moduleId === 'panel2' || moduleId.startsWith('panel2_')) return 'Append';
  if (moduleId === 'panel3' || moduleId.startsWith('panel3_')) return 'Suppress';
  if (moduleId === 'panel4' || moduleId.startsWith('panel4_')) return 'Match';
  return 'Append'; // fallback
};

/**
 * Get user-friendly module type name
 */
export const getModuleTypeName = (moduleId: string): string => {
  if (moduleId === 'panel1') return 'Input';
  if (moduleId === 'panel2' || moduleId.startsWith('panel2_')) return 'Append';
  if (moduleId === 'panel3' || moduleId.startsWith('panel3_')) return 'Suppress';
  if (moduleId === 'panel4' || moduleId.startsWith('panel4_')) return 'Match';
  if (moduleId === 'panel5') return 'Stats';
  if (moduleId === 'panel6') return 'Output';
  if (moduleId === 'panel7') return 'Schedule';
  return 'Unknown';
};

interface ModuleConfig {
  id: string;
  isDraggable?: boolean;
}

/**
 * Check if a module can be moved based on version dependencies
 */
export const validateModuleMove = (
  fromIndex: number,
  toIndex: number,
  modules: ModuleConfig[],
  versionedSources: VersionedSource[]
): { canMove: boolean; error?: string } => {
  const sourceModule = modules[fromIndex];

  // Only validate when moving a module up (to an earlier position)
  if (fromIndex <= toIndex) {
    return { canMove: true };
  }

  // Get versions created by the source module
  const sourceModuleType = getModuleType(sourceModule.id);
  const sourceModuleVersions = versionedSources.filter(version =>
    version.sourceModule === sourceModuleType && version.createdByModuleId === sourceModule.id
  );

  if (sourceModuleVersions.length === 0) {
    return { canMove: true };
  }

  // Track all dependencies found
  const dependencies: { sourceVersion: string; usingVersion: string; usingModule: string }[] = [];

  // Check modules that would come after the source module in the new order
  for (let i = toIndex + 1; i < modules.length; i++) {
    const moduleToCheck = modules[i];

    // Skip input module as it doesn't use versions from other modules
    if (moduleToCheck.id === 'panel1') continue;

    // Get versions created by this module
    const moduleType = getModuleType(moduleToCheck.id);
    const moduleVersions = versionedSources.filter(v =>
      v.sourceModule === moduleType && v.createdByModuleId === moduleToCheck.id
    );

    // Check if any version from this module uses versions created by the source module
    for (const moduleVersion of moduleVersions) {
      for (const sourceVersion of sourceModuleVersions) {
        // Check if the module version uses the source version as input
        if (moduleVersion.baseInputSources.includes(sourceVersion.id)) {
          dependencies.push({
            sourceVersion: sourceVersion.versionLabel,
            usingVersion: moduleVersion.versionLabel,
            usingModule: getModuleTypeName(moduleToCheck.id)
          });
        }
      }
    }
  }

  if (dependencies.length > 0) {
    const sourceModuleName = getModuleTypeName(sourceModule.id);

    if (dependencies.length === 1) {
      const dep = dependencies[0];
      return {
        canMove: false,
        error: `Cannot move ${sourceModuleName} module to this position.\n\nThe version "${dep.sourceVersion}" was created in the ${sourceModuleName} module and is being used by the version "${dep.usingVersion}" in the ${dep.usingModule} module.\n\nVersions must be created before they can be used by other modules.`
      };
    } else {
      const dependencyList = dependencies.map(dep =>
        `• "${dep.sourceVersion}" → used by "${dep.usingVersion}" in ${dep.usingModule} module`
      ).join('\n');

      return {
        canMove: false,
        error: `Cannot move ${sourceModuleName} module to this position.\n\nMultiple version dependencies detected:\n\n${dependencyList}\n\nVersions must be created before they can be used by other modules.`
      };
    }
  }

  return { canMove: true };
};

/**
 * Generate draggable IDs from modules
 */
export const getDraggableIds = (modules: ModuleConfig[]): string[] => {
  return modules
    .filter(module => module.isDraggable)
    .map(module => module.id);
};

/**
 * Check if a module can be moved based on custom source dependencies
 */
export const validateCustomSourceDependencies = (
  fromIndex: number,
  toIndex: number,
  modules: ModuleConfig[],
  sharedCustomSources: any[], // InputSource[] with createdByModuleId
  moduleConfigurations: {
    appendConfigs?: any[];
    matchConfigs?: any[];
    suppressConfigs?: any[];
  }
): { canMove: boolean; error?: string } => {
  const sourceModule = modules[fromIndex];

  // Only validate when moving a module up (to an earlier position)
  if (fromIndex <= toIndex) {
    return { canMove: true };
  }

  // Get custom sources created by the source module
  const customSourcesFromModule = sharedCustomSources.filter(
    source => source.createdByModuleId === sourceModule.id
  );

  if (customSourcesFromModule.length === 0) {
    return { canMove: true };
  }

  const customSourceIds = customSourcesFromModule.map(s => s.id);

  // Track all dependencies found
  const dependencies: { sourceName: string; usingModule: string }[] = [];

  // Check modules that would come BEFORE the source module in the new order
  // These are the modules between toIndex and fromIndex
  for (let i = toIndex; i < fromIndex; i++) {
    const moduleToCheck = modules[i];
    const moduleType = getModuleType(moduleToCheck.id);
    const moduleName = getModuleTypeName(moduleToCheck.id);

    // Get configurations for this module
    let configs: any[] = [];
    if (moduleType === 'Append') {
      configs = moduleConfigurations.appendConfigs || [];
    } else if (moduleType === 'Match') {
      configs = moduleConfigurations.matchConfigs || [];
    } else if (moduleType === 'Suppress') {
      configs = moduleConfigurations.suppressConfigs || [];
    }

    // Check if any config uses custom sources from the source module
    for (const config of configs) {
      const sourcesUsed = config.appendSources || config.matchSources || config.suppressSources || [];

      for (const sourceId of sourcesUsed) {
        if (customSourceIds.includes(sourceId)) {
          const customSource = customSourcesFromModule.find(s => s.id === sourceId);
          if (customSource && !dependencies.find(d => d.sourceName === customSource.sourceName)) {
            dependencies.push({
              sourceName: customSource.sourceName,
              usingModule: moduleName
            });
          }
        }
      }
    }
  }

  if (dependencies.length > 0) {
    const sourceModuleName = getModuleTypeName(sourceModule.id);

    if (dependencies.length === 1) {
      const dep = dependencies[0];
      return {
        canMove: false,
        error: `Cannot move ${sourceModuleName} module to this position.\n\nThe custom source "${dep.sourceName}" was created in the ${sourceModuleName} module and is being used in the ${dep.usingModule} module.\n\nCustom sources must be created before they can be used by other modules.`
      };
    } else {
      const dependencyList = dependencies.map(dep =>
        `• "${dep.sourceName}" → used in ${dep.usingModule} module`
      ).join('\n');

      return {
        canMove: false,
        error: `Cannot move ${sourceModuleName} module to this position.\n\nMultiple custom source dependencies detected:\n\n${dependencyList}\n\nCustom sources must be created before they can be used by other modules.`
      };
    }
  }

  return { canMove: true };
};
