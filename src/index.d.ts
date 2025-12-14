

declare module "dc:*" {
    const Component: (props: { comp: string } & Record<string, any>) => any;
    export default Component;
}

declare module "astro-dynamic-component" {
  import type { AstroIntegration } from 'astro';
  /**
   * Integration options
   */
  export interface DynamicComponentOptions {
    /**
     * Default client directive to use when not specified in the import path.
     * @default 'load'
     * @example 'idle', 'visible', 'media=(min-width: 768px)'
     */
    defaultClientDirective?: string;
  }

  /**
   * Astro Dynamic Component Integration
   *
   * Enables dynamic component imports using glob patterns with client directive support.
   *
   * @param options - Integration options
   *
   * @example
   * ```javascript
   * // astro.config.mjs
   * import dynamicComponent from 'astro-dynamic-component';
   *
   * export default defineConfig({
   *   integrations: [
   *     dynamicComponent({
   *       defaultClientDirective: 'idle' // Change default from 'load' to 'idle'
   *     })
   *   ],
   * });
   * ```
   *
   * @example
   * ```astro
   * ---
   * // In your .astro file
   * import Button from "dc:load:./components/buttons/*.vue";
   * ---
   *
   * <Button comp="PrimaryButton" text="Click me" />
   * ```
   */
  export default function dynamicComponentIntegration(options?: DynamicComponentOptions): AstroIntegration;
}

