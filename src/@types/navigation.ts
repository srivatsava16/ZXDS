import type { ComponentType } from 'react';

// New simplified navigation structure
export interface NavigationItem {
  title: string;
  path?: string;
  icon: ComponentType;
  children?: NavigationItem[];
}

export interface SimpleNavigationConfig {
  admin: NavigationItem[];
  public: NavigationItem[];
}

// Legacy navigation structure for compatibility
export interface LegacyNavigationItem {
  key: string
  path?: string
  title: string
  icon?: string
  type: 'item' | 'collapse' | 'group'
  children?: LegacyNavigationItem[]
  authority?: string[]
  disabled?: boolean
  meta?: {
    title?: string
    description?: string
    keywords?: string
  }
}

export interface NavigationConfig {
  main: LegacyNavigationItem[]
  admin: LegacyNavigationItem[]
  public: LegacyNavigationItem[]
}

export interface NavigationState {
  currentPath: string
  openKeys: string[]
  selectedKeys: string[]
}