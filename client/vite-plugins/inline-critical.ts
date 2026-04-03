/**
 * Vite plugin to inline critical CSS and JS into HTML
 * Builds critical.ts through Vite, then inlines the output
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { build as viteBuild, Plugin, ResolvedConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function inlineCritical(): Plugin {
    let config: ResolvedConfig;
    let criticalJsBundle: string | null = null;

    return {
        name: 'inline-critical',

        configResolved(resolvedConfig) {
            config = resolvedConfig;
        },

        async buildStart() {
            // Build critical.ts for both dev and production
            console.log('[inline-critical] Building critical.ts...');

            const criticalPath = resolve(__dirname, '../src/critical/critical.ts');

            if (!existsSync(criticalPath)) {
                throw new Error(`[inline-critical] critical.ts not found at ${criticalPath}`);
            }

            try {
                // Build critical.ts as a standalone bundle
                const result = await viteBuild({
                    configFile: false,
                    build: {
                        write: false,
                        minify: config.command === 'build' ? 'esbuild' : false,
                        lib: {
                            entry: criticalPath,
                            formats: ['iife'],
                            name: '__critical__',
                        },
                        rollupOptions: {
                            output: {
                                inlineDynamicImports: true,
                            },
                        },
                    },
                    logLevel: 'warn',
                });

                // viteBuild with write: false returns RollupOutput or RollupOutput[]
                const outputs = Array.isArray(result) ? result : [result];

                for (const output of outputs) {
                    if ('output' in output) {
                        const chunk = output.output.find((chunk) => chunk.type === 'chunk');
                        if (chunk && chunk.type === 'chunk') {
                            // Keep the IIFE wrapper - it's fine for inline scripts
                            criticalJsBundle = chunk.code;
                            const mode = config.command === 'build' ? 'minified' : 'unminified';
                            console.log(`[inline-critical] ✓ critical.ts built (${mode})`);
                            break;
                        }
                    }
                }

                if (!criticalJsBundle) {
                    throw new Error('[inline-critical] Failed to extract bundle from build result');
                }
            } catch (error) {
                console.error('[inline-critical] Failed to build critical.ts:', error);
                throw error;
            }
        },

        transformIndexHtml: {
            order: 'pre',
            handler(html) {
                if (!criticalJsBundle) {
                    console.error('[inline-critical] Critical JS bundle not available');
                    throw new Error('[inline-critical] Critical JS bundle was not built');
                }

                try {
                    const criticalCss = readFileSync(
                        resolve(__dirname, '../src/critical/critical.scss'),
                        'utf-8'
                    );

                    // Inject critical CSS in <head>
                    html = html.replace(
                        '</head>',
                        `  <style id="critical-css">${criticalCss}</style>\n  </head>`
                    );

                    // Inject critical JS at start of <body>
                    html = html.replace(
                        '</body>',
                        `<script id="critical-js">${criticalJsBundle}</script>\n</body>`
                    );

                    return html;
                } catch (error) {
                    console.error('[inline-critical] Failed to inline critical resources:', error);
                    throw error;
                }
            },
        },
    };
}
