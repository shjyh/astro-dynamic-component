// @ts-check
import { fileURLToPath } from 'node:url';
import { createDynamicComponentVitePlugin } from './vite-plugin.mjs';

/**
 * Astro Dynamic Component Import Integration
 *
 * Usage:
 * 1. Import in astro files using the following formats:
 *    - `import Comp from "dc:load:./path/*.*"`       -> generates client:load (explicit)
 *    - `import Comp from "dc:./path/*.*"`            -> generates client:load (default, configurable)
 *    - `import Comp from "dc:idle:./path/*.*"`       -> generates client:idle
 *    - `import Comp from "dc:visible:./path/*.*"`    -> generates client:visible
 *    - `import Comp from "dc:only=vue:./path/*.vue"` -> generates client:only="vue"
 *    - `import Comp from "dc::./path/*.astro"`       -> no client directive (SSR only)
 *
 * 2. Render components using `<Comp comp={compName} ...props />`
 *
 * The plugin resolves dc:xxx to a virtual Astro component module
 * Supports .vue, .jsx, .svelte, .astro and other component files
 * Note: .astro components automatically ignore client directives (always SSR)
 *
 * @param {Object} [options] - Integration options
 * @param {string} [options.defaultClientDirective='load'] - Default client directive when not specified
 * @returns {import('astro').AstroIntegration}
 *
 * @example
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
 */
export default function dynamicComponentIntegration(options = {}) {
    const { defaultClientDirective = 'load' } = options;

    return {
        name: 'astro-dynamic-component',
        hooks: {
            'astro:config:setup': ({ config, updateConfig, logger }) => {
                logger.info('Dynamic component integration enabled');

                if (defaultClientDirective !== 'load') {
                    logger.info(`Default client directive: ${defaultClientDirective}`);
                }

                const srcDir = fileURLToPath(config.srcDir);

                updateConfig({
                    vite: {
                        plugins: [
                            createDynamicComponentVitePlugin({
                                defaultClientDirective,
                                logger,
                                srcDir
                            })
                        ]
                    }
                });
            }
        }
    };
}
