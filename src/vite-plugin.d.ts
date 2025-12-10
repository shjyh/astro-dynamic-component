import type { Plugin } from 'vite';

/**
 * Options for the dynamic component Vite plugin
 */
export interface DynamicComponentVitePluginOptions {
  /**
   * Default client directive to use when not specified in the import path
   * @default 'load'
   */
  defaultClientDirective?: string;

  /**
   * Astro logger instance for logging
   */
  logger?: any;

  /**
   * Astro source directory path
   */
  srcDir?: string;
}

/**
 * Component metadata generated from glob pattern matching
 */
export interface ComponentMetadata {
  /**
   * Generated import name for the component
   */
  importName: string;

  /**
   * Component name derived from file path
   */
  compName: string;

  /**
   * Absolute file path to the component
   */
  filePath: string;

  /**
   * Whether the component is an Astro component
   */
  isAstro: boolean;
}

/**
 * Result of parsing a dc: import path
 */
export interface ParsedDcImport {
  /**
   * Parsed client directive (e.g., "client:load", "client:idle")
   * null if no client directive should be applied
   */
  clientDirective: string | null;

  /**
   * The glob pattern path extracted from the import
   */
  pattern: string;
}

/**
 * Create Vite plugin for dynamic component imports
 *
 * This plugin enables dynamic component imports using glob patterns with client directive support.
 *
 * @param options - Plugin options
 * @returns Vite plugin instance
 *
 * @example
 * ```javascript
 * import { createDynamicComponentVitePlugin } from 'astro-dynamic-component/vite-plugin';
 *
 * export default {
 *   plugins: [
 *     createDynamicComponentVitePlugin({
 *       defaultClientDirective: 'idle'
 *     })
 *   ]
 * };
 * ```
 */
export function createDynamicComponentVitePlugin(options?: DynamicComponentVitePluginOptions): Plugin;
