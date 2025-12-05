import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {resolve} from 'path';
import {loadEnv} from "@prosopo/dotenv";

loadEnv()

export default defineConfig({
    plugins: [react()],
    root: '.',
    base: '/',
    server: {
        port: 9233,
        host: true,
        cors: true,
    },
    preview: {
        port: 9233,
    },
    build: {
        outDir: 'dist/frontend',
        emptyOutDir: true,
        sourcemap: true,
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
        },
    },
    optimizeDeps: {
        exclude: ['@prosopo/dotenv'],
    },
    define: {
        'process.env': {
            ...(process.env.PROSOPO_SITE_KEY && {
                "process.env.PROSOPO_SITE_KEY": JSON.stringify(
                    process.env.PROSOPO_SITE_KEY,
                ),
            }),
        },
        'import.meta.env.VITE_RENDER_SCRIPT_URL': JSON.stringify(
            process.env.VITE_RENDER_SCRIPT_URL || process.env.VITE_BUNDLE_URL || 'http://localhost:9269/procaptcha.bundle.js'
        ),
        'import.meta.env.VITE_RENDER_SCRIPT_ID': JSON.stringify(
            process.env.VITE_RENDER_SCRIPT_ID || 'procaptcha-script'
        ),
    },
    css: {
        postcss: './postcss.config.ts',
    },
});
