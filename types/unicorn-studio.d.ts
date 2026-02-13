/**
 * Unicorn Studio TypeScript Declarations
 * Extends the Window interface to include UnicornStudio global
 */

interface UnicornStudioConfig {
  projectId?: string;
  [key: string]: any;
}

interface UnicornStudioInstance {
  init?: (config?: UnicornStudioConfig) => void;
  destroy?: () => void;
  render?: () => void;
  [key: string]: any;
}

declare global {
  interface Window {
    unicornStudio?: UnicornStudioInstance;
    US_SCRIPT_LOADED?: boolean;
  }
}

export {}
