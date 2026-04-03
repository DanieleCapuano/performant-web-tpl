import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';
import { VitePWA } from 'vite-plugin-pwa';
import { inlineCritical } from './vite-plugins/inline-critical';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        inlineCritical(),
        react(),

        // PWA Plugin with Service Worker
        VitePWA({
            strategies: 'injectManifest',
            srcDir: 'src/sw',
            filename: 'sw.ts',
            injectManifest: {
                globPatterns: ['**/*.{js,css,html,png,jpg,jpeg,svg,gif,webp}'],
                globIgnores: ['**/wasm/**', '**/wasm-pkg/**'],
                maximumFileSizeToCacheInBytes: 5000000,
            },
            manifestFilename: 'manifest.json',
            injectRegister: null, // We register manually in critical.ts
            manifest: {
                name: 'Performance Template',
                short_name: 'PerfTpl',
                description: 'High-performance web application',
                theme_color: '#ffffff',
                background_color: '#ffffff',
                display: 'standalone',
                icons: [
                    {
                        src: '/favicon.png',
                        sizes: '512x512',
                        type: 'image/png',
                    },
                ],
            },
            devOptions: {
                enabled: true,
                type: 'module',
            },
        }),

        // Gzip compression for production builds
        viteCompression({
            verbose: true,
            disable: false,
            threshold: 10240,
            algorithm: 'gzip',
            ext: '.gz',
        }),

        // Brotli compression
        viteCompression({
            verbose: true,
            disable: false,
            threshold: 10240,
            algorithm: 'brotliCompress',
            ext: '.br',
        }),

        // Bundle analyzer (runs only in analyze mode)
        // visualizer is now added in build.rollupOptions.plugins
    ],

    // Worker configuration for module support
    worker: {
        format: 'es',
        plugins: () => [],
        rollupOptions: {
            output: {
                entryFileNames: 'workers/[name].[hash].js',
                chunkFileNames: 'workers/chunks/[name].[hash].js',
                assetFileNames: 'workers/assets/[name].[hash].[ext]',
            },
        },
    },

    // Build optimizations
    build: {
        target: 'es2020',
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: false,
        minify: 'esbuild',

        // Chunk size warnings
        chunkSizeWarningLimit: 500,

        rollupOptions: {
            plugins: [
                // Bundle analyzer (runs only in analyze mode)
                process.env.ANALYZE === 'true' &&
                visualizer({
                    open: true,
                    gzipSize: true,
                    brotliSize: true,
                    filename: './dist/stats.html',
                }) as any,
            ].filter(Boolean),
            output: {
                manualChunks: {
                    // Split vendor chunks for better caching
                    'react-vendor': ['react', 'react-dom'],
                    'wasm-vendor': ['@/utils/wasm-loader'],
                },

                // Optimize chunk and asset naming
                chunkFileNames: 'js/[name].[hash].js',
                entryFileNames: 'js/[name].[hash].js',
                assetFileNames: (assetInfo) => {
                    const name = assetInfo.names[0];
                    const info = name.split('.');
                    const ext = info[info.length - 1];

                    if (/\.(png|jpe?g|svg|gif|webp|avif)$/i.test(name)) {
                        return `images/[name].[hash].${ext}`;
                    }

                    if (/\.css$/i.test(name)) {
                        return `css/[name].[hash].${ext}`;
                    }

                    if (/\.(woff2?|eot|ttf|otf)$/i.test(name)) {
                        return `fonts/[name].[hash].${ext}`;
                    }

                    return `assets/[name].[hash].${ext}`;
                },
            },
        },

        // CSS code splitting
        cssCodeSplit: true,

        // Optimize dependencies
        commonjsOptions: {
            transformMixedEsModules: true,
        },
    },

    // Optimization settings
    optimizeDeps: {
        include: ['react', 'react-dom', 'idb'],
        exclude: ['@/wasm'],
    },

    // Performance-focused dev server
    server: {
        port: 5173,
        host: '127.0.0.1',
        strictPort: false,
        open: false,

        // Required headers for SharedArrayBuffer support
        headers: {
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'require-corp',
        },

        // Proxy API requests to backend
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
            '/ws': {
                target: 'ws://localhost:3000',
                ws: true,
            },
        },
    },

    // Preview server config
    preview: {
        port: 4173,
        strictPort: false,
        host: true,
        open: false,
        headers: {
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'require-corp',
        },
    },

    // Path resolution
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@components': path.resolve(__dirname, './src/components'),
            '@workers': path.resolve(__dirname, './src/workers'),
            '@wasm': path.resolve(__dirname, './src/wasm'),
            '@styles': path.resolve(__dirname, './src/styles'),
            '@utils': path.resolve(__dirname, './src/utils'),
        },
    },

    // CSS preprocessing
    css: {
        modules: {
            localsConvention: 'camelCase',
        },
        preprocessorOptions: {
            scss: {
                additionalData: `@use "@/styles/variables.scss" as vars;`,
            },
        },
    },
});
