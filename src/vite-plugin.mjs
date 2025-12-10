// @ts-check
import path from 'node:path';
import fg from 'fast-glob';
import crypto from 'node:crypto';
import { getTsconfig } from 'get-tsconfig';

const DC_PREFIX = 'dc:';

/**
 * Calculate MD5 hash of a string (first 8 characters)
 * @param {string} str
 * @returns {string}
 */
function md5(str) {
    return crypto.createHash('md5').update(str).digest('hex').slice(0, 8);
}

/**
 * Normalize path separators to POSIX style
 * @param {string} p
 * @returns {string}
 */
function normalizePath(p) {
    return p.replace(/\\/g, '/');
}

/**
 * Extract the base directory from a glob pattern (non-glob part)
 * @param {string} pattern
 * @returns {string}
 */
function getGlobBase(pattern) {
    // Find the position of the first glob special character
    const globChars = ['*', '?', '[', '{'];
    let firstGlobIndex = pattern.length;

    for (const char of globChars) {
        const index = pattern.indexOf(char);
        if (index !== -1 && index < firstGlobIndex) {
            firstGlobIndex = index;
        }
    }

    // Extract the directory part before the glob character
    const base = pattern.slice(0, firstGlobIndex);
    // Return the part before the last / as the base directory
    const lastSlash = base.lastIndexOf('/');
    return lastSlash !== -1 ? base.slice(0, lastSlash) : '.';
}

/**
 * Parse dc: import path, extract client directive and actual path
 *
 * Supported formats:
 * - dc:load:./path/*.*         → client:load
 * - dc:idle:./path/*.*         → client:idle
 * - dc:visible:./path/*.*      → client:visible
 * - dc:only=vue:./path/*.vue   → client:only="vue"
 * - dc::./path/*.astro         → null (SSR only)
 * - dc:./path/*.*              → uses defaultClientDirective
 *
 * @param {string} source - Complete import path (including dc: prefix)
 * @param {string} defaultClientDirective - Default client directive to use
 * @returns {{ clientDirective: string | null, pattern: string }}
 */
function parseDcImport(source, defaultClientDirective = 'load') {
    // Remove dc: prefix
    const withoutPrefix = source.slice(DC_PREFIX.length);

    // Find the path part (starting with ./ or ../ or / or letter)
    // Format: dc:client:./path or dc:client=value:./path or dc::./path
    const pathMatch = withoutPrefix.match(/^(.*?):(\.{0,2}\/.*|[a-zA-Z@].*)$/);

    if (pathMatch) {
        const clientPart = pathMatch[1]; // Client directive part
        const pattern = pathMatch[2];     // Path part

        if (clientPart === '') {
            // dc::path format, no client directive
            return { clientDirective: null, pattern };
        }

        // Parse client directive: load, idle, visible, only=vue, etc.
        // Convert to client:load, client:idle, client:only="vue", etc.
        if (clientPart.includes('=')) {
            // client=value format, e.g., only=vue
            const [name, value] = clientPart.split('=');
            return { clientDirective: `client:${name}="${value}"`, pattern };
        } else {
            // Simple format, e.g., load, idle, visible
            return { clientDirective: `client:${clientPart}`, pattern };
        }
    }

    // No path format matched, treat entire string as path
    // Use default client directive
    return { clientDirective: `client:${defaultClientDirective}`, pattern: withoutPrefix };
}

/**
 * Generate virtual Astro component code
 * @param {string} pattern - Original glob pattern path
 * @param {string} baseDir - Base directory of the glob pattern (absolute path)
 * @param {string | null} clientDirective - Client directive, e.g., "client:load" or null
 * @param {Array<{ importName: string, compName: string, filePath: string, isAstro: boolean }>} components - Component list
 * @param {boolean} isPathAlias - Whether the pattern uses path aliases
 * @param {string} srcDirAbsolute - Absolute path to srcDir
 * @returns {string} Astro component source code
 */
function generateVirtualAstroComponent(pattern, baseDir, clientDirective, components, isPathAlias = false, srcDirAbsolute = '') {
    // Generate import statements
    const imports = components
        .map(c => {
            let importPath;
            if (isPathAlias) {
                // For path aliases, preserve the alias in the import path
                const patternDir = pattern.replace(/\/?\*.*$/, '');
                const relativePath = normalizePath(path.relative(baseDir, c.filePath));
                importPath = patternDir + '/' + relativePath;
            } else {
                // For relative paths, convert to absolute path from srcDir
                // Virtual file is at ${srcDir}/_generate/_virtual_dc_xxx.astro
                // Need to calculate relative path from _generate/ to the actual file
                const relativePath = normalizePath(path.relative(srcDirAbsolute, c.filePath));
                // From _generate/ directory, go up one level and then to the file
                importPath = '../' + relativePath;
            }
            return `import ${c.importName} from "${importPath}";`;
        })
        .join('\n');

    // Generate comp type for Props interface
    const compTypes = components.map(c => `"${c.compName}"`).join(' | ');

    // Generate conditional render expressions
    const conditionalRenders = components
        .map(c => {
            // For .astro components, ignore client directives (they're already SSR)
            const clientAttr = (c.isAstro || !clientDirective) ? '' : ` ${clientDirective}`;
            return `{ Astro.props.comp === "${c.compName}" && <${c.importName}${clientAttr} {...rest} /> }`;
        })
        .join('\n');

    return `---
${imports}

interface Props {
    comp: ${compTypes};
    [key: string]: any;
}

const { comp, ...rest } = Astro.props;
---

${conditionalRenders}
`;
}

/**
 * Resolve path alias using both Vite's alias config and tsconfig paths
 * @param {string} aliasPath - Path that may contain an alias
 * @param {any} viteConfig - Vite configuration object
 * @param {string} cwd - Current working directory
 * @returns {string | null} Resolved path or null if no alias matches
 */
function resolveAlias(aliasPath, viteConfig, cwd) {
    // Try Vite alias first
    if (viteConfig?.resolve?.alias) {
        const aliases = viteConfig.resolve.alias;
        const aliasArray = Array.isArray(aliases) ? aliases : Object.entries(aliases).map(([find, replacement]) => ({ find, replacement }));

        for (const alias of aliasArray) {
            const find = typeof alias.find === 'string' ? alias.find : alias.find?.source;
            if (!find) continue;

            if (aliasPath.startsWith(find)) {
                const replacement = typeof alias.replacement === 'string' ? alias.replacement : alias.replacement;
                return aliasPath.replace(find, replacement);
            }
        }
    }

    // Try TypeScript paths from tsconfig.json
    const tsconfig = getTsconfig(cwd);
    if (tsconfig?.config?.compilerOptions?.paths) {
        const paths = tsconfig.config.compilerOptions.paths;
        const baseUrl = tsconfig.config.compilerOptions.baseUrl || '.';
        const baseUrlResolved = path.resolve(path.dirname(tsconfig.path), baseUrl);

        // Iterate through all path mappings
        for (const [pattern, mappings] of Object.entries(paths)) {
            // Convert tsconfig pattern to match format
            // e.g., "@/*" -> "@/"
            const prefix = pattern.replace(/\/?\*$/, '');

            if (aliasPath.startsWith(prefix)) {
                // Get the first mapping (usually there's only one)
                const mapping = mappings[0];
                if (!mapping) continue;

                // Replace the pattern part with the mapping
                // e.g., "@/components" with mapping "src/*" -> "src/components"
                const suffix = aliasPath.slice(prefix.length);
                const resolvedPath = mapping.replace(/\/?\*$/, '') + suffix;

                // Resolve relative to baseUrl
                return path.resolve(baseUrlResolved, resolvedPath);
            }
        }
    }

    return null;
}

/**
 * Create Vite plugin for dynamic component imports
 *
 * @param {Object} options - Plugin options
 * @param {string} [options.defaultClientDirective='load'] - Default client directive
 * @param {any} [options.logger] - Astro logger instance
 * @param {string} [options.srcDir] - Astro source directory
 * @returns { Required<import('astro').AstroConfig["vite"]>["plugins"][number]}
 */
export function createDynamicComponentVitePlugin(options = {}) {
    const { defaultClientDirective = 'load', logger, srcDir: astroSrcDir } = options;

    /**@type any */
    let viteConfig = null;
    let projectRoot = process.cwd();
    let srcDir = astroSrcDir || 'src';

    // Cache for generated code: virtualFilePath -> code
    const codeCache = new Map();

    return {
        name: 'vite-plugin-dynamic-component',

        /**
         * Store Vite config for alias resolution
         * @param {any} config - Resolved Vite config
         */
        configResolved(config) {
            viteConfig = config;
            projectRoot = config.root || process.cwd();
        },

        /**
         * Resolve dc: prefixed imports
         * @param {string} source - Import path
         * @param {string | undefined} importer - Importer file path
         */
        async resolveId(source, importer) {
            if (!source.startsWith(DC_PREFIX)) {
                return null;
            }

            if (!importer) {
                console.warn(`[dynamic-component] Cannot resolve "${source}" without importer`);
                return null;
            }

            // Parse dc: import, extract client directive and path
            const { clientDirective, pattern } = parseDcImport(source, defaultClientDirective);

            // Determine if pattern uses path alias
            const isPathAlias = !pattern.startsWith('./') && !pattern.startsWith('../') && !pattern.startsWith('/');

            let resolvedPattern;
            let baseDir;
            let patternBase;

            if (isPathAlias) {
                // For path aliases, resolve using Vite alias and tsconfig
                patternBase = getGlobBase(pattern);
                const resolvedBase = resolveAlias(patternBase, viteConfig, projectRoot);

                if (!resolvedBase) {
                    console.warn(`[dynamic-component] Cannot resolve path alias "${patternBase}".`);
                    return null;
                }

                baseDir = resolvedBase;
                const globPart = pattern.slice(patternBase.length);
                resolvedPattern = normalizePath(baseDir + globPart);
            } else {
                // For relative paths, resolve relative to importer
                const importerDir = path.dirname(importer);
                resolvedPattern = path.join(importerDir, pattern);
                resolvedPattern = normalizePath(resolvedPattern);
                patternBase = getGlobBase(pattern);
                baseDir = path.join(importerDir, patternBase);
            }

            // Use fast-glob to match files
            const files = await fg(resolvedPattern, {
                absolute: true,
                onlyFiles: true,
                ignore: ['**/node_modules/**']
            });

            if (files.length === 0) {
                console.warn(`[dynamic-component] No files matched for pattern "${pattern}"`);
                return null;
            }

            // Calculate relative paths from srcDir for hash generation
            const srcDirAbsolute = path.resolve(projectRoot, srcDir);
            const relativePaths = files
                .map(f => normalizePath(path.relative(srcDirAbsolute, f)))
                .sort(); // Sort alphabetically for consistent hash

            // Generate hash from sorted file paths
            const pathsString = relativePaths.join(',');
            const hash = md5(pathsString);

            // Generate component list
            const components = files.map(filePath => {
                const relativePath = normalizePath(path.relative(baseDir, filePath));
                const compName = relativePath.replace(/\.[^.]+$/, '');
                const importName = 'Com_' + md5(relativePath);
                const isAstro = filePath.endsWith('.astro');

                return { importName, compName, filePath, isAstro };
            });

            // Generate virtual file path: ${srcDir}/_generate_/_virtual_dc_{hash}.astro
            const virtualFilePath = path.resolve(projectRoot, srcDir, '_generate_', `_virtual_dc_${hash}.astro`);

            // Generate code if not cached
            if (!codeCache.has(virtualFilePath)) {
                const code = generateVirtualAstroComponent(pattern, baseDir, clientDirective, components, isPathAlias, srcDirAbsolute);
                codeCache.set(virtualFilePath, code);

                if (logger) {
                    logger.debug(`[dynamic-component] Generated virtual component at ${virtualFilePath} with ${components.length} components`);
                }
            }

            return virtualFilePath;
        },

        /**
         * Load virtual module content
         * @param {string} id - Module ID
         */
        load(id) {
            // Check if this is our generated virtual file
            const fileName = path.basename(id);
            if (!fileName.startsWith('_virtual_dc_') || !fileName.endsWith('.astro')) {
                return null;
            }

            // Return cached code
            const code = codeCache.get(id);
            if (code) {
                return code;
            }

            // If not in cache, it means resolveId didn't run or failed
            console.warn(`[dynamic-component] Code not found in cache for ${id}`);
            return null;
        }
    };
}
